/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Manage work across multiple threads.
//!
//! Each thread has thread-bound data which can be accessed in queued task functions.

use crate::thread_bound::ThreadBound;
use std::cell::RefCell;
use std::future::Future;
use std::panic::{catch_unwind, resume_unwind, UnwindSafe};
use std::pin::Pin;
use std::sync::{Arc, Weak};
use std::task::{Context, Poll};

pub type TaskFn<T> = Box<dyn FnOnce(&T) + Send + 'static>;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + 'a>>;

type AsyncTaskSend<T> = dyn Fn(TaskFn<T>) + Send + Sync;

pub enum AsyncTask<T> {
    Strong(Arc<AsyncTaskSend<T>>),
    Weak(Weak<AsyncTaskSend<T>>),
}

impl<T> Clone for AsyncTask<T> {
    fn clone(&self) -> Self {
        match self {
            Self::Strong(s) => Self::Strong(s.clone()),
            Self::Weak(w) => Self::Weak(w.clone()),
        }
    }
}

impl<T> AsyncTask<T> {
    pub fn new<F: Fn(TaskFn<T>) + Send + Sync + 'static>(send: F) -> Self {
        AsyncTask::Strong(Arc::new(send))
    }

    pub fn weak(&self) -> Self {
        match self {
            Self::Strong(s) => Self::Weak(Arc::downgrade(s)),
            Self::Weak(w) => Self::Weak(w.clone()),
        }
    }

    fn strong(&self) -> Option<Self> {
        match self {
            Self::Strong(s) => Some(Self::Strong(s.clone())),
            Self::Weak(w) => w.upgrade().map(Self::Strong),
        }
    }

    pub fn push<F: FnOnce(&T) + Send + 'static>(&self, f: F) {
        match self {
            Self::Strong(a) => a(Box::new(f)),
            Self::Weak(w) => {
                if let Some(a) = w.upgrade() {
                    a(Box::new(f));
                }
            }
        }
    }

    /// NOTE: any Wakers stored by futures will hold a reference to this AsyncTask, so if the
    /// AsyncTask lifetime is relevant, you must ensure the futures will call wake or be dropped by
    /// other means.
    pub fn push_async<F: for<'a> FnOnce(&'a T) -> BoxFuture<'a, ()> + Send + 'static>(&self, f: F)
    where
        T: 'static,
    {
        let Some(inner) = self.strong() else {
            return;
        };
        self.push(move |v| {
            let waker = FutWaker {
                task: inner,
                fut: ThreadBound::new(RefCell::new(f(v))),
            };
            // SAFETY: The future will only ever be polled on the same AsyncTask target thread, so
            // any references it has will remain valid. Any references it has must either be
            // `'static` or those from the thread-bound data. We change `T` to `()` because `T` also
            // needs to be static, but from this point on we don't use `T` anyway. This is safe to
            // do because it changes the `&T` reference (where `T: Sized`) passed to the function to
            // be `&()`, so the function still receives a pointer argument (we don't break any
            // calling convention stuff) and will do nothing with it.
            let waker = Arc::new(unsafe { std::mem::transmute::<_, FutWaker<'static, ()>>(waker) });
            waker.poll();
        });
    }

    pub fn wait<R: Send + 'static, F: FnOnce(&T) -> R + Send + 'static>(&self, f: F) -> R {
        let (tx, rx) = std::sync::mpsc::sync_channel(0);
        self.push(move |v| tx.send(f(v)).unwrap());
        rx.recv().unwrap()
    }
}

struct FutWaker<'a, T> {
    task: AsyncTask<T>,
    // The RefCell is technically unnecessary (poll() will only be called from a dedicated thread
    // that owns the data), but it avoids some unsafe code and this isn't performance-critical.
    fut: ThreadBound<RefCell<BoxFuture<'a, ()>>>,
}

impl FutWaker<'static, ()> {
    fn poll(self: Arc<Self>) {
        let waker = self.clone().into();
        let mut cx = Context::from_waker(&waker);
        // We don't need to know whether the poll returns pending or ready; if pending, the waker
        // will handle queueing things again.
        let _ = self.fut.borrow().borrow_mut().as_mut().poll(&mut cx);
    }
}

impl std::task::Wake for FutWaker<'static, ()> {
    fn wake(self: Arc<Self>) {
        let inner = self.clone();
        self.task.push(move |()| inner.poll());
    }
}

pub struct AsyncJoinHandle<'a, T>(Option<AsyncJoinHandleState<'a, T>>);

enum AsyncJoinHandleState<'a, T> {
    Start(Box<dyn FnOnce() -> T + UnwindSafe + Send + 'a>),
    Pending(std::thread::JoinHandle<T>),
}

impl<'a, T> Future for AsyncJoinHandle<'a, T>
where
    T: Send + 'static,
{
    type Output = T;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let me = self.get_mut();
        match me.0.take() {
            Some(AsyncJoinHandleState::Start(f)) => {
                let waker = cx.waker().clone();
                // SAFETY: The calling frame will suspend until the thread completes, so the
                // lifetimes will remain valid. AsyncJoinHandle will block joining the thread before
                // dropping, which also maintains validity of the references.
                let staticfn = unsafe {
                    std::mem::transmute::<
                        Box<dyn FnOnce() -> T + UnwindSafe + Send + 'a>,
                        Box<dyn FnOnce() -> T + UnwindSafe + Send + 'static>,
                    >(f)
                };
                #[cfg(mock)]
                let mock = crate::std::mock::SharedMockData::new();
                me.0 = Some(AsyncJoinHandleState::Pending(std::thread::spawn(
                    move || {
                        #[cfg(mock)]
                        unsafe {
                            mock.set()
                        };
                        let result = catch_unwind(staticfn);
                        waker.wake();
                        match result {
                            Ok(v) => v,
                            Err(e) => resume_unwind(e),
                        }
                    },
                )));
                Poll::Pending
            }
            // We assume there won't be a spurious poll(), and the only poll will be after the
            // thread waker.
            Some(AsyncJoinHandleState::Pending(jh)) => Poll::Ready(jh.join().unwrap()),
            None => panic!("future polled after complete"),
        }
    }
}

impl<'a, T> Drop for AsyncJoinHandle<'a, T> {
    fn drop(&mut self) {
        if let Some(AsyncJoinHandleState::Pending(h)) = self.0.take() {
            h.join().unwrap();
        }
    }
}

pub fn async_scoped_thread<'a, T, F>(f: F) -> AsyncJoinHandle<'a, T>
where
    F: FnOnce() -> T + UnwindSafe + Send + 'a,
    T: Send + 'static,
{
    AsyncJoinHandle(Some(AsyncJoinHandleState::Start(Box::new(f))))
}

pub fn block_on<Fut: Future>(f: Fut) -> Fut::Output {
    let mut f = std::pin::pin!(f);

    let current_thread = std::thread::current();
    let waker = Arc::new(ThreadWaker(current_thread)).into();
    let mut cx = Context::from_waker(&waker);
    loop {
        match f.as_mut().poll(&mut cx) {
            Poll::Pending => std::thread::park(),
            Poll::Ready(res) => break res,
        }
    }
}

struct ThreadWaker(std::thread::Thread);

impl std::task::Wake for ThreadWaker {
    fn wake(self: Arc<Self>) {
        self.0.unpark();
    }
}
