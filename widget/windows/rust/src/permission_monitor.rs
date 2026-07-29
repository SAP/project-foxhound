/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::cell::RefCell;

use moz_task::RunnableBuilder;
use nserror::{NS_OK, nsresult};
use nsstring::{nsAString, nsString};
use windows::Foundation::TypedEventHandler;
use windows::Security::Authorization::AppCapabilityAccess::{
    AppCapability, AppCapabilityAccessChangedEventArgs,
};
use windows::core::Ref;
use xpcom::interfaces::nsIObserverService;
use xpcom::{xpcom, xpcom_method};

struct MonitorState {
    capability: AppCapability,
    token: i64,
}

#[xpcom(implement(nsIPermissionMonitor), nonatomic)]
struct PermissionMonitor {
    monitor_state: RefCell<Option<MonitorState>>,
}

impl PermissionMonitor {
    xpcom_method!(start_monitoring => StartMonitoring(capability_name: *const nsAString));
    fn start_monitoring(&self, capability_name: &nsAString) -> Result<(), nsresult> {
        if self.monitor_state.borrow().is_some() {
            return Ok(());
        }

        let capability =
            match AppCapability::Create(&windows::core::HSTRING::from_wide(&capability_name[..])) {
                Ok(c) => c,
                Err(_) => return Err(nserror::NS_ERROR_FAILURE),
            };

        let capability_name_nsstring = nsString::from(&capability_name[..]);

        let handler = TypedEventHandler::new(
            move |_: Ref<AppCapability>, _: Ref<AppCapabilityAccessChangedEventArgs>| {
                let name = capability_name_nsstring.clone();
                if let Ok(main_thread) = moz_task::get_main_thread() {
                    RunnableBuilder::new("PermissionMonitor::notify", move || {
                        if let Ok(obs_svc) =
                            xpcom::components::Observer::service::<nsIObserverService>()
                        {
                            unsafe {
                                obs_svc.NotifyObservers(
                                    std::ptr::null(),
                                    c"system-permission-changed".as_ptr(),
                                    name.as_ptr(),
                                );
                            }
                        }
                    })
                    .dispatch(main_thread.coerce())
                    .ok();
                }

                Ok(())
            },
        );

        let token = match capability.AccessChanged(&handler) {
            Ok(t) => t,
            Err(_) => return Err(nserror::NS_ERROR_FAILURE),
        };

        *self.monitor_state.borrow_mut() = Some(MonitorState { capability, token });
        Ok(())
    }

    fn stop_monitoring(&self) {
        if let Some(state) = self.monitor_state.borrow_mut().take() {
            let _ = state.capability.RemoveAccessChanged(state.token);
        }
    }
}

impl Drop for PermissionMonitor {
    fn drop(&mut self) {
        self.stop_monitoring();
    }
}

#[no_mangle]
pub extern "C" fn new_permission_monitor(
    iid: *const xpcom::nsIID,
    result: *mut *mut xpcom::reexports::libc::c_void,
) -> nsresult {
    let monitor = PermissionMonitor::allocate(InitPermissionMonitor {
        monitor_state: RefCell::new(None),
    });
    unsafe { monitor.QueryInterface(iid, result) }
}
