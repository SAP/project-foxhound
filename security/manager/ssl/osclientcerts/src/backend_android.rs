/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use pkcs11_bindings::*;
use rsclientcerts::cryptoki::*;
use rsclientcerts::manager::{ClientCertsBackend, CryptokiObject, Sign};
use rsclientcerts_util::error::{Error, ErrorType};
use rsclientcerts_util::*;
use std::ffi::{c_char, c_void, CString};

type FindObjectsCallback = Option<
    unsafe extern "C" fn(
        typ: u8,
        data_len: usize,
        data: *const u8,
        extra_len: usize,
        extra: *const u8,
        ctx: *mut c_void,
    ),
>;

// Wrapper of C AndroidDoFindObject function implemented in nsNSSIOLayer.cpp
fn AndroidDoFindObjectsWrapper(callback: FindObjectsCallback, ctx: &mut FindObjectsContext) {
    // `AndroidDoFindObjects` communicates with the
    // `ClientAuthCertificateManager` to find all available client
    // authentication certificates and corresponding keys and issuers.
    extern "C" {
        fn AndroidDoFindObjects(callback: FindObjectsCallback, ctx: *mut c_void);
    }

    unsafe {
        AndroidDoFindObjects(callback, ctx as *mut _ as *mut c_void);
    }
}

type SignCallback =
    Option<unsafe extern "C" fn(data_len: usize, data: *const u8, ctx: *mut c_void)>;

// Wrapper of C AndroidDoSign function implemented in nsNSSIOLayer.cpp
fn AndroidDoSignWrapper(
    cert_len: usize,
    cert: *const u8,
    data_len: usize,
    data: *const u8,
    algorithm: *const c_char,
    callback: SignCallback,
    ctx: &mut Vec<u8>,
) {
    // `AndroidDoSign` calls into `ClientAuthCertificateManager` to do the
    // actual work of creating signatures.
    extern "C" {
        fn AndroidDoSign(
            cert_len: usize,
            cert: *const u8,
            data_len: usize,
            data: *const u8,
            algorithm: *const c_char,
            callback: SignCallback,
            ctx: *mut c_void,
        );
    }

    unsafe {
        AndroidDoSign(
            cert_len,
            cert,
            data_len,
            data,
            algorithm,
            callback,
            ctx as *mut _ as *mut c_void,
        );
    }
}

fn new_cert(der: Vec<u8>) -> Result<CryptokiCert, Error> {
    CryptokiCert::new(der, b"android certificate".to_vec())
}

pub struct Key {
    cryptoki_key: CryptokiKey,
    cert: Vec<u8>,
}

impl Key {
    fn new(
        modulus: Option<Vec<u8>>,
        ec_params: Option<Vec<u8>>,
        cert: Vec<u8>,
    ) -> Result<Key, Error> {
        let (modulus, ec_params) = if modulus.is_some() {
            (modulus, None)
        } else if let Some(spki) = ec_params.as_ref() {
            // If this is an EC key, the frontend will have provided an SPKI.
            // Extract the parameters of the algorithm to get the curve.
            let ec_params = read_spki_algorithm_parameters(&spki)?;
            (None, Some(ec_params))
        } else {
            return Err(error_here!(ErrorType::LibraryFailure));
        };
        Ok(Key {
            cryptoki_key: CryptokiKey::new(modulus, ec_params, &cert)?,
            cert,
        })
    }
}

impl CryptokiObject for Key {
    fn matches(&self, attrs: &[(CK_ATTRIBUTE_TYPE, Vec<u8>)]) -> bool {
        self.cryptoki_key.matches(attrs)
    }

    fn get_attribute(&self, attribute: CK_ATTRIBUTE_TYPE) -> Option<&[u8]> {
        self.cryptoki_key.get_attribute(attribute)
    }
}

fn new_cstring(val: &str) -> Result<CString, Error> {
    CString::new(val).map_err(|_| error_here!(ErrorType::LibraryFailure))
}

impl Sign for Key {
    fn get_signature_length(
        &mut self,
        data: &[u8],
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<usize, Error> {
        // Unfortunately we don't have a way of getting the length of a signature without creating
        // one.
        let dummy_signature_bytes = self.sign(data, params)?;
        Ok(dummy_signature_bytes.len())
    }

    fn sign(
        &mut self,
        data: &[u8],
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<Vec<u8>, Error> {
        let (data, algorithm) = match params {
            Some(params) => {
                // `params` should only be `Some` if this is an RSA key.
                let Some(modulus) = self.cryptoki_key.modulus() else {
                    return Err(error_here!(ErrorType::LibraryFailure));
                };
                (
                    emsa_pss_encode(data, modulus_bit_length(modulus) - 1, &params)?,
                    new_cstring("raw")?,
                )
            }
            None if self.cryptoki_key.modulus().is_some() => {
                (data.to_vec(), new_cstring("NoneWithRSA")?)
            }
            None if self.cryptoki_key.ec_params().is_some() => {
                (data.to_vec(), new_cstring("NoneWithECDSA")?)
            }
            _ => return Err(error_here!(ErrorType::LibraryFailure)),
        };
        let mut signature = Vec::new();
        AndroidDoSignWrapper(
            self.cert.len(),
            self.cert.as_ptr(),
            data.len(),
            data.as_ptr(),
            algorithm.as_c_str().as_ptr(),
            Some(sign_callback),
            &mut signature,
        );
        if let KeyType::EC(coordinate_width) = self.cryptoki_key.key_type() {
            signature = der_ec_sig_to_raw(&signature, coordinate_width)?;
        }
        if signature.len() > 0 {
            Ok(signature)
        } else {
            Err(error_here!(ErrorType::LibraryFailure))
        }
    }
}

unsafe extern "C" fn sign_callback(data_len: usize, data: *const u8, ctx: *mut c_void) {
    let signature: &mut Vec<u8> = std::mem::transmute(ctx);
    signature.clear();
    if data_len != 0 {
        signature.extend_from_slice(std::slice::from_raw_parts(data, data_len));
    }
}

unsafe extern "C" fn find_objects_callback(
    typ: u8,
    data_len: usize,
    data: *const u8,
    extra_len: usize,
    extra: *const u8,
    ctx: *mut c_void,
) {
    let data = if data_len == 0 {
        &[]
    } else {
        std::slice::from_raw_parts(data, data_len)
    }
    .to_vec();
    let extra = if extra_len == 0 {
        &[]
    } else {
        std::slice::from_raw_parts(extra, extra_len)
    }
    .to_vec();
    let find_objects_context: &mut FindObjectsContext = std::mem::transmute(ctx);
    match typ {
        1 => match new_cert(data) {
            Ok(cert) => find_objects_context.certs.push(cert),
            Err(_) => {}
        },
        2 => match Key::new(Some(data), None, extra) {
            Ok(key) => find_objects_context.keys.push(key),
            Err(_) => {}
        },
        3 => match Key::new(None, Some(data), extra) {
            Ok(key) => find_objects_context.keys.push(key),
            Err(_) => {}
        },
        _ => {}
    }
}

struct FindObjectsContext {
    certs: Vec<CryptokiCert>,
    keys: Vec<Key>,
}

impl FindObjectsContext {
    fn new() -> FindObjectsContext {
        FindObjectsContext {
            certs: Vec::new(),
            keys: Vec::new(),
        }
    }
}

pub struct Backend {}

impl Backend {
    pub fn new() -> Result<Backend, Error> {
        Ok(Backend {})
    }
}

const SLOT_DESCRIPTION_BYTES: &[u8; 64] =
    b"OS Client Cert Slot                                             ";
const TOKEN_LABEL_BYTES: &[u8; 32] = b"OS Client Cert Token            ";
const TOKEN_MODEL_BYTES: &[u8; 16] = b"osclientcerts   ";
const TOKEN_SERIAL_NUMBER_BYTES: &[u8; 16] = b"0000000000000000";

impl ClientCertsBackend for Backend {
    type Key = Key;

    fn find_objects(&mut self) -> Result<(Vec<CryptokiCert>, Vec<Key>), Error> {
        let mut find_objects_context = FindObjectsContext::new();
        AndroidDoFindObjectsWrapper(Some(find_objects_callback), &mut find_objects_context);
        Ok((find_objects_context.certs, find_objects_context.keys))
    }

    fn get_slot_info(&self) -> CK_SLOT_INFO {
        CK_SLOT_INFO {
            slotDescription: *SLOT_DESCRIPTION_BYTES,
            manufacturerID: *crate::MANUFACTURER_ID_BYTES,
            flags: CKF_TOKEN_PRESENT,
            ..Default::default()
        }
    }

    fn get_token_info(&self) -> CK_TOKEN_INFO {
        CK_TOKEN_INFO {
            label: *TOKEN_LABEL_BYTES,
            manufacturerID: *crate::MANUFACTURER_ID_BYTES,
            model: *TOKEN_MODEL_BYTES,
            serialNumber: *TOKEN_SERIAL_NUMBER_BYTES,
            ..Default::default()
        }
    }

    fn get_mechanism_list(&self) -> Vec<CK_MECHANISM_TYPE> {
        vec![CKM_ECDSA, CKM_RSA_PKCS, CKM_RSA_PKCS_PSS]
    }
}
