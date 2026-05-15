/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#![allow(non_upper_case_globals)]

use core_foundation::array::*;
use core_foundation::base::*;
use core_foundation::boolean::*;
use core_foundation::data::*;
use core_foundation::dictionary::*;
use core_foundation::error::*;
use core_foundation::number::*;
use core_foundation::string::*;
use libloading::{Library, Symbol};
use log::error;
use pkcs11_bindings::*;
use rsclientcerts::cryptoki::*;
use rsclientcerts::manager::{ClientCertsBackend, CryptokiObject, Sign};
use rsclientcerts_util::*;
use rsclientcerts_util::error::{Error, ErrorType};
use std::collections::BTreeMap;
use std::convert::TryInto;
use std::os::raw::c_void;
use std::time::{Duration, Instant};
use xpcom::interfaces::nsIEventTarget;
use xpcom::{RefPtr, XpCom};

// Normally we would generate this with a build script, but macos is
// cross-compiled on linux, and we'd have to figure out e.g. include paths,
// etc.. This is easier.
include!("bindings_macos.rs");

#[repr(C)]
pub struct __SecIdentity(c_void);
pub type SecIdentityRef = *const __SecIdentity;
declare_TCFType!(SecIdentity, SecIdentityRef);
impl_TCFType!(SecIdentity, SecIdentityRef, SecIdentityGetTypeID);

/// Safety: strictly speaking, it isn't safe to send `SecIdentity` across threads. The
/// implementation handles this by wrapping `SecIdentity` in `ThreadSpecificHandles`. However, in
/// order to implement `Drop` for `ThreadSpecificHandles`, the `SecIdentity` it holds must be sent
/// to the appropriate thread, hence this impl.
unsafe impl Send for SecIdentity {}

#[repr(C)]
pub struct __SecCertificate(c_void);
pub type SecCertificateRef = *const __SecCertificate;
declare_TCFType!(SecCertificate, SecCertificateRef);
impl_TCFType!(SecCertificate, SecCertificateRef, SecCertificateGetTypeID);

#[repr(C)]
pub struct __SecKey(c_void);
pub type SecKeyRef = *const __SecKey;
declare_TCFType!(SecKey, SecKeyRef);
impl_TCFType!(SecKey, SecKeyRef, SecKeyGetTypeID);

/// Safety: see the comment for the `Send` impl for `SecIdentity`.
unsafe impl Send for SecKey {}

#[repr(C)]
pub struct __SecPolicy(c_void);
pub type SecPolicyRef = *const __SecPolicy;
declare_TCFType!(SecPolicy, SecPolicyRef);
impl_TCFType!(SecPolicy, SecPolicyRef, SecPolicyGetTypeID);

#[repr(C)]
pub struct __SecTrust(c_void);
pub type SecTrustRef = *const __SecTrust;
declare_TCFType!(SecTrust, SecTrustRef);
impl_TCFType!(SecTrust, SecTrustRef, SecTrustGetTypeID);

type SecCertificateCopyKeyType = unsafe extern "C" fn(SecCertificateRef) -> SecKeyRef;
type SecTrustEvaluateWithErrorType =
    unsafe extern "C" fn(trust: SecTrustRef, error: *mut CFErrorRef) -> bool;

#[derive(Ord, Eq, PartialOrd, PartialEq)]
enum SecStringConstant {
    // These are available in macOS 10.13
    SecKeyAlgorithmRSASignatureDigestPSSSHA1,
    SecKeyAlgorithmRSASignatureDigestPSSSHA256,
    SecKeyAlgorithmRSASignatureDigestPSSSHA384,
    SecKeyAlgorithmRSASignatureDigestPSSSHA512,
}

/// This implementation uses security framework functions and constants that
/// are not provided by the version of the SDK we build with. To work around
/// this, we attempt to open and dynamically load these functions and symbols
/// at runtime. Unfortunately this does mean that if a user is not on a new
/// enough version of macOS, they will not be able to use client certificates
/// from their keychain in Firefox until they upgrade.
struct SecurityFramework<'a> {
    sec_certificate_copy_key: Symbol<'a, SecCertificateCopyKeyType>,
    sec_trust_evaluate_with_error: Symbol<'a, SecTrustEvaluateWithErrorType>,
    sec_string_constants: BTreeMap<SecStringConstant, String>,
}

lazy_static! {
    static ref SECURITY_LIBRARY: Result<Library, String> = unsafe {
        Library::new("/System/Library/Frameworks/Security.framework/Security")
            .map_err(|e| e.to_string())
    };
}

impl<'a> SecurityFramework<'a> {
    fn new() -> Result<SecurityFramework<'a>, Error> {
        let library = match &*SECURITY_LIBRARY {
            Ok(library) => library,
            Err(e) => return Err(error_here!(ErrorType::ExternalError, e.clone())),
        };
        let sec_certificate_copy_key = unsafe {
            library
                .get::<SecCertificateCopyKeyType>(b"SecCertificateCopyKey\0")
                .map_err(|e| error_here!(ErrorType::ExternalError, e.to_string()))?
        };
        let sec_trust_evaluate_with_error = unsafe {
            library
                .get::<SecTrustEvaluateWithErrorType>(b"SecTrustEvaluateWithError\0")
                .map_err(|e| error_here!(ErrorType::ExternalError, e.to_string()))?
        };
        let mut sec_string_constants = BTreeMap::new();
        let strings_to_load = vec![
            (
                b"kSecKeyAlgorithmRSASignatureDigestPSSSHA1\0".as_ref(),
                SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA1,
            ),
            (
                b"kSecKeyAlgorithmRSASignatureDigestPSSSHA256\0".as_ref(),
                SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA256,
            ),
            (
                b"kSecKeyAlgorithmRSASignatureDigestPSSSHA384\0".as_ref(),
                SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA384,
            ),
            (
                b"kSecKeyAlgorithmRSASignatureDigestPSSSHA512\0".as_ref(),
                SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA512,
            ),
        ];
        for (symbol_name, sec_string_constant) in strings_to_load {
            let cfstring_symbol = unsafe {
                library
                    .get::<*const CFStringRef>(symbol_name)
                    .map_err(|e| error_here!(ErrorType::ExternalError, e.to_string()))?
            };
            let cfstring = unsafe { CFString::wrap_under_create_rule(**cfstring_symbol) };
            sec_string_constants.insert(sec_string_constant, cfstring.to_string());
        }
        Ok(SecurityFramework {
            sec_certificate_copy_key,
            sec_trust_evaluate_with_error,
            sec_string_constants,
        })
    }
}

struct SecurityFrameworkHolder<'a> {
    framework: Result<SecurityFramework<'a>, Error>,
}

impl<'a> SecurityFrameworkHolder<'a> {
    fn new() -> SecurityFrameworkHolder<'a> {
        SecurityFrameworkHolder {
            framework: SecurityFramework::new(),
        }
    }

    /// SecCertificateCopyKey is available in macOS 10.14
    fn sec_certificate_copy_key(&self, certificate: &SecCertificate) -> Result<SecKey, Error> {
        match &self.framework {
            Ok(framework) => unsafe {
                let result =
                    (framework.sec_certificate_copy_key)(certificate.as_concrete_TypeRef());
                if result.is_null() {
                    return Err(error_here!(ErrorType::ExternalError));
                }
                Ok(SecKey::wrap_under_create_rule(result))
            },
            Err(e) => Err(e.clone()),
        }
    }

    /// SecTrustEvaluateWithError is available in macOS 10.14
    fn sec_trust_evaluate_with_error(&self, trust: &SecTrust) -> Result<bool, Error> {
        match &self.framework {
            Ok(framework) => unsafe {
                Ok((framework.sec_trust_evaluate_with_error)(
                    trust.as_concrete_TypeRef(),
                    std::ptr::null_mut(),
                ))
            },
            Err(e) => Err(e.clone()),
        }
    }

    fn get_sec_string_constant(
        &self,
        sec_string_constant: SecStringConstant,
    ) -> Result<CFString, Error> {
        match &self.framework {
            Ok(framework) => match framework.sec_string_constants.get(&sec_string_constant) {
                Some(string) => Ok(CFString::new(string)),
                None => Err(error_here!(ErrorType::ExternalError)),
            },
            Err(e) => Err(e.clone()),
        }
    }
}

lazy_static! {
    static ref SECURITY_FRAMEWORK: SecurityFrameworkHolder<'static> =
        SecurityFrameworkHolder::new();
}

fn sec_key_create_signature(
    key: &SecKey,
    algorithm: SecKeyAlgorithm,
    data: &CFData,
) -> Result<CFData, Error> {
    let mut error = std::ptr::null_mut();
    let signature = unsafe {
        SecKeyCreateSignature(
            key.as_concrete_TypeRef(),
            algorithm,
            data.as_concrete_TypeRef(),
            &mut error,
        )
    };
    if signature.is_null() {
        if error.is_null() {
            return Err(error_here!(ErrorType::ExternalError));
        }
        let error = unsafe { CFError::wrap_under_create_rule(error) };
        return Err(error_here!(
            ErrorType::ExternalError,
            error.description().to_string()
        ));
    }
    Ok(unsafe { CFData::wrap_under_create_rule(signature) })
}

fn sec_key_copy_attributes<T: TCFType>(key: &SecKey) -> Result<CFDictionary<CFString, T>, Error> {
    let attributes = unsafe { SecKeyCopyAttributes(key.as_concrete_TypeRef()) };
    if attributes.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    Ok(unsafe { CFDictionary::wrap_under_create_rule(attributes) })
}

fn sec_key_copy_external_representation(key: &SecKey) -> Result<CFData, Error> {
    let mut error = std::ptr::null_mut();
    let representation =
        unsafe { SecKeyCopyExternalRepresentation(key.as_concrete_TypeRef(), &mut error) };
    if representation.is_null() {
        if error.is_null() {
            return Err(error_here!(ErrorType::ExternalError));
        }
        let error = unsafe { CFError::wrap_under_create_rule(error) };
        return Err(error_here!(
            ErrorType::ExternalError,
            error.description().to_string()
        ));
    }
    Ok(unsafe { CFData::wrap_under_create_rule(representation) })
}

fn sec_identity_copy_certificate(identity: &SecIdentity) -> Result<SecCertificate, Error> {
    let mut certificate = std::ptr::null();
    let status =
        unsafe { SecIdentityCopyCertificate(identity.as_concrete_TypeRef(), &mut certificate) };
    if status != errSecSuccess {
        return Err(error_here!(ErrorType::ExternalError, status.to_string()));
    }
    if certificate.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    Ok(unsafe { SecCertificate::wrap_under_create_rule(certificate) })
}

fn sec_certificate_copy_subject_summary(certificate: &SecCertificate) -> Result<CFString, Error> {
    let result = unsafe { SecCertificateCopySubjectSummary(certificate.as_concrete_TypeRef()) };
    if result.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    Ok(unsafe { CFString::wrap_under_create_rule(result) })
}

fn sec_certificate_copy_data(certificate: &SecCertificate) -> Result<CFData, Error> {
    let result = unsafe { SecCertificateCopyData(certificate.as_concrete_TypeRef()) };
    if result.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    Ok(unsafe { CFData::wrap_under_create_rule(result) })
}

fn sec_identity_copy_private_key(identity: &SecIdentity) -> Result<SecKey, Error> {
    let mut key = std::ptr::null();
    let status = unsafe { SecIdentityCopyPrivateKey(identity.as_concrete_TypeRef(), &mut key) };
    if status != errSecSuccess {
        return Err(error_here!(ErrorType::ExternalError));
    }
    if key.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    Ok(unsafe { SecKey::wrap_under_create_rule(key) })
}

fn new_cert_from_identity(identity: &SecIdentity) -> Result<CryptokiCert, Error> {
    let certificate = sec_identity_copy_certificate(identity)?;
    new_cert_from_certificate(&certificate)
}

fn new_cert_from_certificate(certificate: &SecCertificate) -> Result<CryptokiCert, Error> {
    let der = sec_certificate_copy_data(certificate)?.bytes().to_vec();
    let label = sec_certificate_copy_subject_summary(certificate)?;
    CryptokiCert::new(der, label.to_string().into_bytes())
}

#[allow(clippy::upper_case_acronyms)]
enum SignParams<'a> {
    EC(CFString, &'a [u8]),
    RSA(CFString, &'a [u8]),
}

impl<'a> SignParams<'a> {
    fn new(
        key_type: KeyType,
        data: &'a [u8],
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<SignParams<'a>, Error> {
        match key_type {
            KeyType::EC(_) => SignParams::new_ec_params(data),
            KeyType::RSA => SignParams::new_rsa_params(params, data),
        }
    }

    fn new_ec_params(data: &'a [u8]) -> Result<SignParams<'a>, Error> {
        let algorithm = unsafe {
            CFString::wrap_under_get_rule(match data.len() {
                20 => kSecKeyAlgorithmECDSASignatureDigestX962SHA1,
                32 => kSecKeyAlgorithmECDSASignatureDigestX962SHA256,
                48 => kSecKeyAlgorithmECDSASignatureDigestX962SHA384,
                64 => kSecKeyAlgorithmECDSASignatureDigestX962SHA512,
                _ => {
                    return Err(error_here!(ErrorType::UnsupportedInput));
                }
            })
        };
        Ok(SignParams::EC(algorithm, data))
    }

    fn new_rsa_params(
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
        data: &'a [u8],
    ) -> Result<SignParams<'a>, Error> {
        if let Some(pss_params) = params {
            let algorithm = {
                let algorithm_id = match pss_params.hashAlg {
                    CKM_SHA_1 => SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA1,
                    CKM_SHA256 => SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA256,
                    CKM_SHA384 => SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA384,
                    CKM_SHA512 => SecStringConstant::SecKeyAlgorithmRSASignatureDigestPSSSHA512,
                    _ => {
                        return Err(error_here!(ErrorType::UnsupportedInput));
                    }
                };
                SECURITY_FRAMEWORK.get_sec_string_constant(algorithm_id)?
            };
            return Ok(SignParams::RSA(algorithm, data));
        }

        // Handle the case where `data` is a DigestInfo.
        if let Ok((digest_oid, hash)) = read_digest_info(data) {
            let algorithm = unsafe {
                CFString::wrap_under_create_rule(match digest_oid {
                    OID_BYTES_SHA_256 => kSecKeyAlgorithmRSASignatureDigestPKCS1v15SHA256,
                    OID_BYTES_SHA_384 => kSecKeyAlgorithmRSASignatureDigestPKCS1v15SHA384,
                    OID_BYTES_SHA_512 => kSecKeyAlgorithmRSASignatureDigestPKCS1v15SHA512,
                    OID_BYTES_SHA_1 => kSecKeyAlgorithmRSASignatureDigestPKCS1v15SHA1,
                    _ => return Err(error_here!(ErrorType::UnsupportedInput)),
                })
            };
            return Ok(SignParams::RSA(algorithm, hash));
        }

        // Handle the case where `data` is a TLS 1.0 MD5/SHA1 hash.
        if data.len() == 36 {
            let algorithm = unsafe {
                CFString::wrap_under_get_rule(kSecKeyAlgorithmRSASignatureDigestPKCS1v15Raw)
            };
            return Ok(SignParams::RSA(algorithm, data));
        }

        // Otherwise, `data` will be an emsa-pss-encoded digest that should be signed with raw RSA.
        Ok(SignParams::RSA(
            unsafe { CFString::wrap_under_create_rule(kSecKeyAlgorithmRSASignatureRaw) },
            data,
        ))
    }

    fn get_algorithm(&self) -> SecKeyAlgorithm {
        match self {
            SignParams::EC(algorithm, _) => algorithm.as_concrete_TypeRef(),
            SignParams::RSA(algorithm, _) => algorithm.as_concrete_TypeRef(),
        }
    }

    fn get_data_to_sign(&self) -> &'a [u8] {
        match self {
            SignParams::EC(_, data_to_sign) => data_to_sign,
            SignParams::RSA(_, data_to_sign) => data_to_sign,
        }
    }
}

/// Helper struct to hold onto OS-specific handles that must only be used on a particular thread.
struct ThreadSpecificHandles {
    /// The only thread that these handles may be used on.
    thread: RefPtr<nsIEventTarget>,
    /// OS handle on a certificate and corresponding private key.
    identity: Option<SecIdentity>,
    /// OS handle on a private key.
    key: Option<SecKey>,
}

impl ThreadSpecificHandles {
    fn new(identity: SecIdentity, thread: &nsIEventTarget) -> ThreadSpecificHandles {
        ThreadSpecificHandles {
            thread: RefPtr::new(thread),
            identity: Some(identity),
            key: None,
        }
    }

    fn sign(
        &mut self,
        key_type: KeyType,
        maybe_modulus: Option<Vec<u8>>,
        data: &[u8],
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<Vec<u8>, Error> {
        let Some(identity) = self.identity.take() else {
            return Err(error_here!(ErrorType::LibraryFailure));
        };
        let mut maybe_key = self.key.take();
        let thread = self.thread.clone();
        let data = data.to_vec();
        let params = params.clone();
        let task = moz_task::spawn_onto("sign", &thread, async move {
            let result = sign_internal(&identity, &mut maybe_key, key_type, &data, &params);
            if result.is_ok() {
                return (result, identity, maybe_key);
            }
            // Some devices appear to not work well when the key handle is held for too long or if a
            // card is inserted/removed while Firefox is running. Try refreshing the key handle.
            let _ = maybe_key.take();
            let result = sign_internal(&identity, &mut maybe_key, key_type, &data, &params);
            // If this succeeded, return the result.
            if result.is_ok() {
                return (result, identity, maybe_key);
            }
            // If signing failed and this is an RSA-PSS signature, perhaps the token the key is on does
            // not support RSA-PSS. In that case, emsa-pss-encode the data (hash, really) and try
            // signing with raw RSA.
            let Some(params) = params.as_ref() else {
                return (result, identity, maybe_key);
            };
            // `params` should only be `Some` if this is an RSA key.
            let Some(modulus) = maybe_modulus.as_ref() else {
                return (
                    Err(error_here!(ErrorType::LibraryFailure)),
                    identity,
                    maybe_key,
                );
            };
            let emsa_pss_encoded =
                match emsa_pss_encode(&data, modulus_bit_length(modulus) - 1, &params) {
                    Ok(emsa_pss_encoded) => emsa_pss_encoded,
                    Err(e) => return (Err(e), identity, maybe_key),
                };
            (
                sign_internal(
                    &identity,
                    &mut maybe_key,
                    key_type,
                    &emsa_pss_encoded,
                    &None,
                ),
                identity,
                maybe_key,
            )
        });
        let (signature_result, identity, maybe_key) = futures_executor::block_on(task);
        self.identity = Some(identity);
        self.key = maybe_key;
        signature_result
    }
}

fn sign_internal(
    identity: &SecIdentity,
    maybe_key: &mut Option<SecKey>,
    key_type: KeyType,
    data: &[u8],
    params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
) -> Result<Vec<u8>, Error> {
    // If this key hasn't been used for signing yet, there won't be a cached key handle. Obtain
    // and cache it if this is the case. Doing so can cause the underlying implementation to
    // show an authentication or pin prompt to the user. Caching the handle can avoid causing
    // multiple prompts to be displayed in some cases.
    if maybe_key.is_none() {
        let _ = maybe_key.replace(sec_identity_copy_private_key(identity)?);
    }
    let Some(key) = maybe_key.as_ref() else {
        return Err(error_here!(ErrorType::LibraryFailure));
    };
    let sign_params = SignParams::new(key_type, data, params)?;
    let signing_algorithm = sign_params.get_algorithm();
    let data_to_sign = CFData::from_buffer(sign_params.get_data_to_sign());
    let signature = sec_key_create_signature(key, signing_algorithm, &data_to_sign)?;
    let signature_value = match key_type {
        KeyType::EC(coordinate_width) => {
            // We need to convert the DER Ecdsa-Sig-Value to the
            // concatenation of r and s, the coordinates of the point on
            // the curve. r and s must be 0-padded to be coordinate_width
            // total bytes.
            der_ec_sig_to_raw(signature.bytes(), coordinate_width)?
        }
        KeyType::RSA => signature.bytes().to_vec(),
    };
    Ok(signature_value)
}

impl Drop for ThreadSpecificHandles {
    fn drop(&mut self) {
        // Ensure any OS handles are dropped on the appropriate thread.
        let identity = self.identity.take();
        let key = self.key.take();
        let thread = self.thread.clone();
        // It is possible that we're already on the appropriate thread (e.g. if an error was
        // encountered in `find_objects` and these handles are being released shortly after being
        // created).
        if moz_task::is_on_current_thread(&thread) {
            // `key` is obtained from `identity`, so drop it first, out of an abundance of caution.
            drop(key);
            drop(identity);
        } else {
            let task = moz_task::spawn_onto("drop", &thread, async move {
                drop(key);
                drop(identity);
            });
            futures_executor::block_on(task)
        }
    }
}

pub struct Key {
    handles: ThreadSpecificHandles,
    cryptoki_key: CryptokiKey,
}

impl Key {
    fn new(identity: &SecIdentity, thread: &nsIEventTarget) -> Result<Key, Error> {
        let certificate = sec_identity_copy_certificate(identity)?;
        let der = sec_certificate_copy_data(&certificate)?;
        let key = SECURITY_FRAMEWORK.sec_certificate_copy_key(&certificate)?;
        let key_type: CFString = get_key_attribute(&key, unsafe { kSecAttrKeyType })?;
        let key_size_in_bits: CFNumber = get_key_attribute(&key, unsafe { kSecAttrKeySizeInBits })?;
        let sec_attr_key_type_ec =
            unsafe { CFString::wrap_under_create_rule(kSecAttrKeyTypeECSECPrimeRandom) };
        let (modulus, ec_params) =
            if key_type.as_concrete_TypeRef() == unsafe { kSecAttrKeyTypeRSA } {
                let public_key = sec_key_copy_external_representation(&key)?;
                let modulus = read_rsa_modulus(public_key.bytes())?;
                (Some(modulus), None)
            } else if key_type == sec_attr_key_type_ec {
                // Assume all EC keys are secp256r1, secp384r1, or secp521r1. This
                // is wrong, but the API doesn't seem to give us a way to determine
                // which curve this key is on.
                // This might not matter in practice, because it seems all NSS uses
                // this for is to get the signature size.
                let key_size_in_bits = match key_size_in_bits.to_i64() {
                    Some(value) => value,
                    None => return Err(error_here!(ErrorType::ValueTooLarge)),
                };
                let ec_params = match key_size_in_bits {
                    256 => ENCODED_OID_BYTES_SECP256R1.to_vec(),
                    384 => ENCODED_OID_BYTES_SECP384R1.to_vec(),
                    521 => ENCODED_OID_BYTES_SECP521R1.to_vec(),
                    _ => return Err(error_here!(ErrorType::UnsupportedInput)),
                };
                (None, Some(ec_params))
            } else {
                return Err(error_here!(ErrorType::LibraryFailure));
            };

        Ok(Key {
            handles: ThreadSpecificHandles::new(identity.clone(), thread),
            cryptoki_key: CryptokiKey::new(modulus, ec_params, der.bytes())?,
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

    // The input data is a hash. What algorithm we use depends on the size of the hash.
    fn sign(
        &mut self,
        data: &[u8],
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<Vec<u8>, Error> {
        self.handles.sign(
            self.cryptoki_key.key_type(),
            self.cryptoki_key.modulus().clone(),
            data,
            params,
        )
    }
}

fn get_key_attribute<T: TCFType + Clone>(key: &SecKey, attr: CFStringRef) -> Result<T, Error> {
    let attributes: CFDictionary<CFString, T> = sec_key_copy_attributes(key)?;
    match attributes.find(attr as *const _) {
        Some(value) => Ok((*value).clone()),
        None => Err(error_here!(ErrorType::ExternalError)),
    }
}

// Given a SecIdentity, attempts to build as much of a path to a trust anchor as possible, gathers
// the CA certificates from that path, and returns them. The purpose of this function is not to
// validate the given certificate but to find CA certificates that gecko may need to do path
// building when filtering client certificates according to the acceptable CA list sent by the
// server during client authentication.
fn get_issuers(identity: &SecIdentity) -> Result<Vec<SecCertificate>, Error> {
    let certificate = sec_identity_copy_certificate(identity)?;
    let policy = unsafe { SecPolicyCreateSSL(false, std::ptr::null()) };
    if policy.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    let policy = unsafe { SecPolicy::wrap_under_create_rule(policy) };
    let mut trust = std::ptr::null();
    // Each of SecTrustCreateWithCertificates' input arguments can be either single items or an
    // array of items. Since we only want to specify one of each, we directly specify the arguments.
    let status = unsafe {
        SecTrustCreateWithCertificates(
            certificate.as_concrete_TypeRef(),
            policy.as_concrete_TypeRef(),
            &mut trust,
        )
    };
    if status != errSecSuccess {
        return Err(error_here!(ErrorType::ExternalError));
    }
    if trust.is_null() {
        return Err(error_here!(ErrorType::ExternalError));
    }
    let trust = unsafe { SecTrust::wrap_under_create_rule(trust) };
    // Disable AIA fetching so that SecTrustEvaluateWithError doesn't result in network I/O.
    let status = unsafe { SecTrustSetNetworkFetchAllowed(trust.as_concrete_TypeRef(), 0) };
    if status != errSecSuccess {
        return Err(error_here!(ErrorType::ExternalError));
    }
    // We ignore the return value here because we don't care if the certificate is trusted or not -
    // we're only doing this to build its issuer chain as much as possible.
    let _ = SECURITY_FRAMEWORK.sec_trust_evaluate_with_error(&trust)?;
    let certificate_count = unsafe { SecTrustGetCertificateCount(trust.as_concrete_TypeRef()) };
    let mut certificates = Vec::with_capacity(
        certificate_count
            .try_into()
            .map_err(|_| error_here!(ErrorType::ValueTooLarge))?,
    );
    for i in 1..certificate_count {
        let certificate = unsafe { SecTrustGetCertificateAtIndex(trust.as_concrete_TypeRef(), i) };
        if certificate.is_null() {
            error!("SecTrustGetCertificateAtIndex returned null certificate?");
            continue;
        }
        let certificate = unsafe { SecCertificate::wrap_under_get_rule(certificate) };
        certificates.push(certificate);
    }
    Ok(certificates)
}

pub struct Backend {
    /// A background thread that all OS API calls will be done on. This is to prevent issues with
    /// modules or implementations using thread-local state.
    thread: RefPtr<nsIEventTarget>,
    /// The last time a call to `find_objects` finished, to avoid searching for objects more than
    /// once every 3 seconds.
    last_scan_finished: Option<Instant>,
}

impl Backend {
    pub fn new() -> Result<Backend, Error> {
        let thread = moz_task::create_thread("osclientcerts").map_err(|nsresult| {
            error_here!(ErrorType::LibraryFailure, nsresult.error_name().to_string())
        })?;
        Ok(Backend {
            thread: thread
                .query_interface::<nsIEventTarget>()
                .ok_or(error_here!(ErrorType::LibraryFailure))?,
            last_scan_finished: None,
        })
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
        match self.last_scan_finished {
            Some(last_scan_finished) => {
                if Instant::now().duration_since(last_scan_finished) < Duration::new(3, 0) {
                    return Ok((Vec::new(), Vec::new()));
                }
            }
            None => {}
        }

        let thread = self.thread.clone();
        let task = moz_task::spawn_onto("find_objects", &self.thread, async move {
            find_objects(&thread)
        });
        let result = futures_executor::block_on(task);
        self.last_scan_finished = Some(Instant::now());
        result
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

fn find_objects(thread: &nsIEventTarget) -> Result<(Vec<CryptokiCert>, Vec<Key>), Error> {
    let mut certs = Vec::new();
    let mut keys = Vec::new();
    let identities = unsafe {
        let class_key = CFString::wrap_under_get_rule(kSecClass);
        let class_value = CFString::wrap_under_get_rule(kSecClassIdentity);
        let return_ref_key = CFString::wrap_under_get_rule(kSecReturnRef);
        let return_ref_value = CFBoolean::wrap_under_get_rule(kCFBooleanTrue);
        let match_key = CFString::wrap_under_get_rule(kSecMatchLimit);
        let match_value = CFString::wrap_under_get_rule(kSecMatchLimitAll);
        let vals = vec![
            (class_key.as_CFType(), class_value.as_CFType()),
            (return_ref_key.as_CFType(), return_ref_value.as_CFType()),
            (match_key.as_CFType(), match_value.as_CFType()),
        ];
        let dict = CFDictionary::from_CFType_pairs(&vals);
        let mut result = std::ptr::null();
        let status = SecItemCopyMatching(dict.as_CFTypeRef() as CFDictionaryRef, &mut result);
        if status == errSecItemNotFound {
            return Ok((certs, keys));
        }
        if status != errSecSuccess {
            return Err(error_here!(ErrorType::ExternalError, status.to_string()));
        }
        if result.is_null() {
            return Err(error_here!(ErrorType::ExternalError));
        }
        CFArray::<SecIdentityRef>::wrap_under_create_rule(result as CFArrayRef)
    };
    for identity in identities.get_all_values().iter() {
        let identity = unsafe { SecIdentity::wrap_under_get_rule(*identity as SecIdentityRef) };
        let cert = new_cert_from_identity(&identity);
        let key = Key::new(&identity, thread);
        if let (Ok(cert), Ok(key)) = (cert, key) {
            certs.push(cert);
            keys.push(key);
        } else {
            continue;
        }
        if let Ok(issuers) = get_issuers(&identity) {
            for issuer in issuers {
                if let Ok(cert) = new_cert_from_certificate(&issuer) {
                    certs.push(cert);
                }
            }
        }
    }
    Ok((certs, keys))
}
