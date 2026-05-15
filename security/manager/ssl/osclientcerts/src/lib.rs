/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#![allow(non_snake_case)]

#[cfg(any(target_os = "macos", target_os = "ios"))]
#[macro_use]
extern crate core_foundation;
#[macro_use]
extern crate cstr;
#[cfg(any(target_os = "macos", target_os = "ios"))]
#[macro_use]
extern crate lazy_static;
#[macro_use]
extern crate xpcom;

use log::{debug, error, trace, warn};
use nserror::{nsresult, NS_OK};
use pkcs11_bindings::*;
use rsclientcerts::manager::{IsSearchingForClientCerts, Manager};
use rsclientcerts::{
    declare_pkcs11_find_functions, declare_pkcs11_informational_functions,
    declare_pkcs11_session_functions, declare_pkcs11_sign_functions,
    declare_unsupported_pkcs11_functions, log_with_thread_id,
};
use std::convert::TryInto;
use std::os::raw::c_char;
use std::sync::Mutex;
use xpcom::interfaces::{nsIObserverService, nsISupports};

#[cfg(target_os = "android")]
mod backend_android;
#[cfg(any(target_os = "macos", target_os = "ios"))]
mod backend_macos;
#[cfg(all(target_os = "windows", not(target_arch = "aarch64")))]
mod backend_windows;

#[cfg(target_os = "android")]
use crate::backend_android::Backend;
#[cfg(any(target_os = "macos", target_os = "ios"))]
use crate::backend_macos::Backend;
#[cfg(all(target_os = "windows", not(target_arch = "aarch64")))]
use crate::backend_windows::Backend;

/// The singleton `Manager` that handles state with respect to PKCS#11. Only one thread may use it
/// at a time, but there is no restriction on which threads may use it. Note that the underlying OS
/// APIs may not necessarily be thread safe. For platforms where this is the case, the `Backend`
/// will synchronously run the relevant code on a background thread.
static MANAGER: Mutex<Option<Manager<Backend, IsGeckoSearchingForClientCerts>>> = Mutex::new(None);

// Obtaining a handle on the manager proxy is a two-step process. First the mutex must be locked,
// which (if successful), results in a mutex guard object. We must then get a mutable refence to the
// underlying manager proxy (if set - otherwise we return an error). This can't happen all in one
// macro without dropping a reference that needs to live long enough for this to be safe. In
// practice, this looks like:
//   let mut manager_guard = try_to_get_manager_guard!();
//   let manager = manager_guard_to_manager!(manager_guard);
macro_rules! try_to_get_manager_guard {
    () => {
        match MANAGER.lock() {
            Ok(maybe_manager) => maybe_manager,
            Err(poison_error) => {
                log_with_thread_id!(
                    error,
                    "previous thread panicked acquiring manager lock: {}",
                    poison_error
                );
                return CKR_DEVICE_ERROR;
            }
        }
    };
}

macro_rules! manager_guard_to_manager {
    ($manager_guard:ident) => {
        match $manager_guard.as_mut() {
            Some(manager) => manager,
            None => {
                log_with_thread_id!(error, "module state expected to be set, but it is not");
                return CKR_DEVICE_ERROR;
            }
        }
    };
}

#[xpcom(implement(nsIObserver), nonatomic)]
struct ShutdownObserver {}

impl ShutdownObserver {
    xpcom_method!(observe => Observe(_subject: *const nsISupports, topic: *const c_char, _data: *const u16));
    /// Ensure any OS-backed resources are released on the proper thread before all non-main
    /// threads are shut down. Also remove this observer.
    fn observe(
        &self,
        _subject: &nsISupports,
        topic: *const c_char,
        _data: *const u16,
    ) -> Result<(), nsresult> {
        // Ignore errors since we're shutting down and there's no sensible way to handle them.
        let _ = C_Finalize(std::ptr::null_mut());
        if let Ok(service) = xpcom::components::Observer::service::<nsIObserverService>() {
            let _ = unsafe { service.RemoveObserver(self.coerce(), topic) };
        }
        Ok(())
    }
}

extern "C" {
    fn IsGeckoSearchingForClientAuthCertificates() -> bool;
}

struct IsGeckoSearchingForClientCerts;

impl IsSearchingForClientCerts for IsGeckoSearchingForClientCerts {
    fn is_searching_for_client_certs() -> bool {
        unsafe { IsGeckoSearchingForClientAuthCertificates() }
    }
}

/// This gets called to initialize the module. For this implementation, this consists of
/// instantiating the `Manager`.
extern "C" fn C_Initialize(_pInitArgs: CK_VOID_PTR) -> CK_RV {
    // This will fail if this has already been called, but this isn't a problem because either way,
    // logging has been initialized.
    let _ = env_logger::try_init();

    #[cfg(target_os = "android")]
    {
        android_logger::init_once(
            android_logger::Config::default().with_max_level(log::LevelFilter::Trace),
        );
    }

    let backend = match Backend::new() {
        Ok(backend) => backend,
        Err(e) => {
            log_with_thread_id!(error, "C_Initialize: Backend::new() failed: {}", e);
            return CKR_DEVICE_ERROR;
        }
    };
    let mut manager_guard = try_to_get_manager_guard!();
    match manager_guard.replace(Manager::new(vec![backend])) {
        Some(_unexpected_previous_manager) => {
            log_with_thread_id!(
        warn,
        "C_Initialize: replacing previously set module state (this is expected on macOS but not on Windows)"
    );
        }
        None => {}
    }

    // Register an observer to release any OS-backed resources on the background thread at shutdown,
    // before the background thread goes away. Ideally this will have already happened due to
    // nsNSSComponent shutting down, but if there are any lingering network connections, this module
    // may not have been unloaded yet.
    if let Ok(main_thread) = moz_task::get_main_thread() {
        moz_task::spawn_onto("register shutdown observer", main_thread.coerce(), async {
            if let Ok(service) = xpcom::components::Observer::service::<nsIObserverService>() {
                let observer = ShutdownObserver::allocate(InitShutdownObserver {});
                unsafe {
                    let _ = service.AddObserver(
                        observer.coerce(),
                        cstr!("xpcom-shutdown").as_ptr(),
                        false,
                    );
                };
            }
        })
        .detach();
    }

    log_with_thread_id!(debug, "C_Initialize: CKR_OK");
    CKR_OK
}

extern "C" fn C_Finalize(_pReserved: CK_VOID_PTR) -> CK_RV {
    let mut manager_guard = try_to_get_manager_guard!();
    match manager_guard.take() {
        Some(_) => {
            log_with_thread_id!(debug, "C_Finalize: CKR_OK");
            CKR_OK
        }
        None => {
            log_with_thread_id!(debug, "C_Finalize: CKR_CRYPTOKI_NOT_INITIALIZED");
            CKR_CRYPTOKI_NOT_INITIALIZED
        }
    }
}

// The specification mandates that these strings be padded with spaces to the appropriate length.
// Since the length of fixed-size arrays in rust is part of the type, the compiler enforces that
// these byte strings are of the correct length.
const MANUFACTURER_ID_BYTES: &[u8; 32] = b"Mozilla Corporation             ";
const LIBRARY_DESCRIPTION_BYTES: &[u8; 32] = b"OS Client Cert Module           ";

declare_pkcs11_informational_functions!();
declare_pkcs11_session_functions!();
declare_pkcs11_find_functions!();
declare_pkcs11_sign_functions!();
declare_unsupported_pkcs11_functions!();

/// To be a valid PKCS #11 module, this list of functions must be supported. At least cryptoki 2.2
/// must be supported for this module to work in NSS.
static FUNCTION_LIST: CK_FUNCTION_LIST = CK_FUNCTION_LIST {
    version: CK_VERSION { major: 2, minor: 2 },
    C_Initialize: Some(C_Initialize),
    C_Finalize: Some(C_Finalize),
    C_GetInfo: Some(C_GetInfo),
    C_GetFunctionList: None,
    C_GetSlotList: Some(C_GetSlotList),
    C_GetSlotInfo: Some(C_GetSlotInfo),
    C_GetTokenInfo: Some(C_GetTokenInfo),
    C_GetMechanismList: Some(C_GetMechanismList),
    C_GetMechanismInfo: Some(C_GetMechanismInfo),
    C_InitToken: Some(C_InitToken),
    C_InitPIN: Some(C_InitPIN),
    C_SetPIN: Some(C_SetPIN),
    C_OpenSession: Some(C_OpenSession),
    C_CloseSession: Some(C_CloseSession),
    C_CloseAllSessions: Some(C_CloseAllSessions),
    C_GetSessionInfo: Some(C_GetSessionInfo),
    C_GetOperationState: Some(C_GetOperationState),
    C_SetOperationState: Some(C_SetOperationState),
    C_Login: Some(C_Login),
    C_Logout: Some(C_Logout),
    C_CreateObject: Some(C_CreateObject),
    C_CopyObject: Some(C_CopyObject),
    C_DestroyObject: Some(C_DestroyObject),
    C_GetObjectSize: Some(C_GetObjectSize),
    C_GetAttributeValue: Some(C_GetAttributeValue),
    C_SetAttributeValue: Some(C_SetAttributeValue),
    C_FindObjectsInit: Some(C_FindObjectsInit),
    C_FindObjects: Some(C_FindObjects),
    C_FindObjectsFinal: Some(C_FindObjectsFinal),
    C_EncryptInit: Some(C_EncryptInit),
    C_Encrypt: Some(C_Encrypt),
    C_EncryptUpdate: Some(C_EncryptUpdate),
    C_EncryptFinal: Some(C_EncryptFinal),
    C_DecryptInit: Some(C_DecryptInit),
    C_Decrypt: Some(C_Decrypt),
    C_DecryptUpdate: Some(C_DecryptUpdate),
    C_DecryptFinal: Some(C_DecryptFinal),
    C_DigestInit: Some(C_DigestInit),
    C_Digest: Some(C_Digest),
    C_DigestUpdate: Some(C_DigestUpdate),
    C_DigestKey: Some(C_DigestKey),
    C_DigestFinal: Some(C_DigestFinal),
    C_SignInit: Some(C_SignInit),
    C_Sign: Some(C_Sign),
    C_SignUpdate: Some(C_SignUpdate),
    C_SignFinal: Some(C_SignFinal),
    C_SignRecoverInit: Some(C_SignRecoverInit),
    C_SignRecover: Some(C_SignRecover),
    C_VerifyInit: Some(C_VerifyInit),
    C_Verify: Some(C_Verify),
    C_VerifyUpdate: Some(C_VerifyUpdate),
    C_VerifyFinal: Some(C_VerifyFinal),
    C_VerifyRecoverInit: Some(C_VerifyRecoverInit),
    C_VerifyRecover: Some(C_VerifyRecover),
    C_DigestEncryptUpdate: Some(C_DigestEncryptUpdate),
    C_DecryptDigestUpdate: Some(C_DecryptDigestUpdate),
    C_SignEncryptUpdate: Some(C_SignEncryptUpdate),
    C_DecryptVerifyUpdate: Some(C_DecryptVerifyUpdate),
    C_GenerateKey: Some(C_GenerateKey),
    C_GenerateKeyPair: Some(C_GenerateKeyPair),
    C_WrapKey: Some(C_WrapKey),
    C_UnwrapKey: Some(C_UnwrapKey),
    C_DeriveKey: Some(C_DeriveKey),
    C_SeedRandom: Some(C_SeedRandom),
    C_GenerateRandom: Some(C_GenerateRandom),
    C_GetFunctionStatus: Some(C_GetFunctionStatus),
    C_CancelFunction: Some(C_CancelFunction),
    C_WaitForSlotEvent: Some(C_WaitForSlotEvent),
};

/// # Safety
///
/// This is the only function this module exposes. NSS calls it to obtain the list of functions
/// comprising this module.
/// ppFunctionList must be a valid pointer.
#[no_mangle]
pub unsafe extern "C" fn OSClientCerts_C_GetFunctionList(
    ppFunctionList: CK_FUNCTION_LIST_PTR_PTR,
) -> CK_RV {
    if ppFunctionList.is_null() {
        return CKR_ARGUMENTS_BAD;
    }
    // CK_FUNCTION_LIST_PTR is a *mut CK_FUNCTION_LIST, but as per the
    // specification, the caller must treat it as *const CK_FUNCTION_LIST.
    *ppFunctionList = std::ptr::addr_of!(FUNCTION_LIST) as CK_FUNCTION_LIST_PTR;
    CKR_OK
}

#[cfg_attr(
    any(target_os = "macos", target_os = "ios"),
    link(name = "Security", kind = "framework")
)]
extern "C" {}
