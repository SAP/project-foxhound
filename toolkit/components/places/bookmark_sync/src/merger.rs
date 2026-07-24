/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::{cell::RefCell, fmt::Write, mem, sync::Arc};

use atomic_refcell::AtomicRefCell;
use dogear::Store;
use moz_task::{Task, TaskRunnable, ThreadPtrHandle, ThreadPtrHolder};
use nserror::{nsresult, NS_ERROR_NOT_AVAILABLE, NS_OK};
use nsstring::nsString;
use storage::Conn;
use xpcom::{
    interfaces::{
        mozIPlacesPendingOperation, mozIStorageConnection, mozISyncedBookmarksMirrorCallback,
        mozISyncedBookmarksMirrorProgressListener,
    },
    RefPtr, XpCom,
};

use crate::driver::{AbortController, Driver};
use crate::error;
use crate::store;

#[xpcom(implement(mozISyncedBookmarksMerger), nonatomic)]
pub struct SyncedBookmarksMerger {
    db: RefCell<Option<Conn>>,
}

impl SyncedBookmarksMerger {
    pub fn new() -> RefPtr<SyncedBookmarksMerger> {
        SyncedBookmarksMerger::allocate(InitSyncedBookmarksMerger {
            db: RefCell::default(),
        })
    }

    xpcom_method!(get_db => GetDb() -> *const mozIStorageConnection);
    fn get_db(&self) -> Result<RefPtr<mozIStorageConnection>, nsresult> {
        self.db
            .borrow()
            .as_ref()
            .map(|db| RefPtr::new(db.connection()))
            .ok_or(NS_OK)
    }

    xpcom_method!(set_db => SetDb(connection: *const mozIStorageConnection));
    fn set_db(&self, connection: Option<&mozIStorageConnection>) -> Result<(), nsresult> {
        self.db
            .replace(connection.map(|connection| Conn::wrap(RefPtr::new(connection))));
        Ok(())
    }

    xpcom_method!(
        merge => Merge(
            local_time_seconds: i64,
            remote_time_seconds: i64,
            callback: *const mozISyncedBookmarksMirrorCallback
        ) -> *const mozIPlacesPendingOperation
    );
    fn merge(
        &self,
        local_time_seconds: i64,
        remote_time_seconds: i64,
        callback: &mozISyncedBookmarksMirrorCallback,
    ) -> Result<RefPtr<mozIPlacesPendingOperation>, nsresult> {
        let callback = RefPtr::new(callback);
        let db = match *self.db.borrow() {
            Some(ref db) => db.clone(),
            None => return Err(NS_ERROR_NOT_AVAILABLE),
        };
        let async_thread = db.thread()?;
        let controller = Arc::new(AbortController::default());
        let task = MergeTask::new(
            &db,
            Arc::clone(&controller),
            local_time_seconds,
            remote_time_seconds,
            callback,
        )?;
        let runnable = TaskRunnable::new(
            "bookmark_sync::SyncedBookmarksMerger::merge",
            Box::new(task),
        )?;
        TaskRunnable::dispatch(runnable, &async_thread)?;
        let op = MergeOp::new(controller);
        Ok(RefPtr::new(op.coerce()))
    }

    xpcom_method!(reset => Reset());
    fn reset(&self) -> Result<(), nsresult> {
        mem::drop(self.db.borrow_mut().take());
        Ok(())
    }
}

struct MergeTask {
    db: Conn,
    controller: Arc<AbortController>,
    local_time_millis: i64,
    remote_time_millis: i64,
    progress: Option<ThreadPtrHandle<mozISyncedBookmarksMirrorProgressListener>>,
    callback: ThreadPtrHandle<mozISyncedBookmarksMirrorCallback>,
    result: AtomicRefCell<error::Result<store::ApplyStatus>>,
}

impl MergeTask {
    fn new(
        db: &Conn,
        controller: Arc<AbortController>,
        local_time_seconds: i64,
        remote_time_seconds: i64,
        callback: RefPtr<mozISyncedBookmarksMirrorCallback>,
    ) -> Result<MergeTask, nsresult> {
        let progress = callback
            .query_interface::<mozISyncedBookmarksMirrorProgressListener>()
            .and_then(|p| {
                ThreadPtrHolder::new(cstr!("mozISyncedBookmarksMirrorProgressListener"), p).ok()
            });
        Ok(MergeTask {
            db: db.clone(),
            controller,
            local_time_millis: local_time_seconds * 1000,
            remote_time_millis: remote_time_seconds * 1000,
            progress,
            callback: ThreadPtrHolder::new(cstr!("mozISyncedBookmarksMirrorCallback"), callback)?,
            result: AtomicRefCell::new(Err(error::Error::DidNotRun)),
        })
    }

    fn merge(&self) -> error::Result<store::ApplyStatus> {
        let mut db = self.db.clone();
        if db.transaction_in_progress()? {
            // If a transaction is already open, we can avoid an unnecessary
            // merge, since we won't be able to apply the merged tree back to
            // Places. This is common, especially if the user makes lots of
            // changes at once. In that case, our merge task might run in the
            // middle of a `Sqlite.sys.mjs` transaction, and fail when we try to
            // open our own transaction in `Store::apply`. Since the local
            // tree might be in an inconsistent state, we can't safely update
            // Places.
            return Err(error::Error::StorageBusy);
        }
        let driver = Driver::new(self.progress.clone());
        let mut store = store::Store::new(
            &mut db,
            &driver,
            &self.controller,
            self.local_time_millis,
            self.remote_time_millis,
        );
        store.validate()?;
        store.prepare()?;
        let status = store.merge_with_driver(&driver, &*self.controller)?;
        Ok(status)
    }
}

impl Task for MergeTask {
    fn run(&self) {
        *self.result.borrow_mut() = self.merge();
    }

    fn done(&self) -> Result<(), nsresult> {
        let callback = self.callback.get().unwrap();
        match mem::replace(&mut *self.result.borrow_mut(), Err(error::Error::DidNotRun)) {
            Ok(status) => unsafe { callback.HandleSuccess(status.into()) },
            Err(err) => {
                let mut message = nsString::new();
                write!(message, "{}", err).unwrap();
                unsafe { callback.HandleError(err.into(), &*message) }
            }
        }
        .to_result()
    }
}

#[xpcom(implement(mozIPlacesPendingOperation), atomic)]
pub struct MergeOp {
    controller: Arc<AbortController>,
}

impl MergeOp {
    pub fn new(controller: Arc<AbortController>) -> RefPtr<MergeOp> {
        MergeOp::allocate(InitMergeOp { controller })
    }

    xpcom_method!(cancel => Cancel());
    fn cancel(&self) -> Result<(), nsresult> {
        self.controller.abort();
        Ok(())
    }
}
