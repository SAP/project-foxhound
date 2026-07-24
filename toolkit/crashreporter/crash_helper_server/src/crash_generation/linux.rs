/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

use super::CrashGenerator;

use anyhow::Result;
use crash_helper_common::{
    messages::{self},
    Pid,
};
use minidump_writer::minidump_writer::DirectAuxvDumpInfo;
use once_cell::sync::Lazy;
use std::{collections::HashMap, sync::Mutex};

// Table holding the information about the auxiliary vector of potentially
// every process registered with the crash helper.
static AUXV_INFO_MAP: Lazy<Mutex<HashMap<Pid, DirectAuxvDumpInfo>>> = Lazy::new(Default::default);

impl CrashGenerator {
    pub(crate) fn register_auxv_info(&self, message: messages::RegisterAuxvInfo) -> Result<()> {
        let map = &mut AUXV_INFO_MAP.lock().unwrap();
        map.insert(message.pid, message.auxv_info);
        Ok(())
    }

    pub(crate) fn unregister_auxv_info(&self, message: messages::UnregisterAuxvInfo) -> Result<()> {
        let map = &mut AUXV_INFO_MAP.lock().unwrap();
        map.remove(&message.pid);
        Ok(())
    }
}

pub(crate) extern "C" fn get_auxv_info(pid: Pid, auxv_info_ptr: *mut DirectAuxvDumpInfo) -> bool {
    let map = &mut AUXV_INFO_MAP.lock().unwrap();

    if let Some(auxv_info) = map.get(&pid) {
        // SAFETY: The auxv_info_ptr is guaranteed to be valid by the caller.
        unsafe { auxv_info_ptr.write(auxv_info.to_owned()) };
        true
    } else {
        false
    }
}
