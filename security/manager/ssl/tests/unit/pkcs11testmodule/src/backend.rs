/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use pkcs11_bindings::*;
use rsclientcerts::cryptoki::*;
use rsclientcerts::manager::{ClientCertsBackend, CryptokiObject, Sign};
use rsclientcerts_util::error::Error;
use rsclientcerts_util::*;

use base64::prelude::*;
use libcrux_p256::{ecdsa_sign_p256_without_hash, validate_private_key};
use num_bigint::BigUint;
use rand::{thread_rng, RngCore};

#[derive(Clone)]
struct RSAKey {
    modulus: BigUint,
    private_exponent: BigUint,
}

#[derive(Clone)]
struct ECKey {
    private_key: Vec<u8>,
}

#[derive(Clone)]
enum PrivateKey {
    RSA(RSAKey),
    EC(ECKey),
}

#[derive(Clone)]
pub struct Key {
    cryptoki_key: CryptokiKey,
    private_key: PrivateKey,
}

impl Key {
    fn new(private_key_info: Vec<u8>, cert: Vec<u8>) -> Result<Key, Error> {
        let private_key_info = read_private_key_info(&private_key_info).unwrap();
        let (cryptoki_key, private_key) = match private_key_info {
            PrivateKeyInfo::RSA(rsa_private_key) => (
                CryptokiKey::new(Some(rsa_private_key.modulus.clone()), None, &cert).unwrap(),
                PrivateKey::RSA(RSAKey {
                    modulus: BigUint::from_bytes_be(rsa_private_key.modulus.as_ref()),
                    private_exponent: BigUint::from_bytes_be(
                        rsa_private_key.private_exponent.as_ref(),
                    ),
                }),
            ),
            PrivateKeyInfo::EC(ec_private_key) => (
                CryptokiKey::new(None, Some(ENCODED_OID_BYTES_SECP256R1.to_vec()), &cert).unwrap(),
                PrivateKey::EC(ECKey {
                    private_key: ec_private_key.private_key,
                }),
            ),
        };
        Ok(Key {
            cryptoki_key,
            private_key,
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

// Implements EMSA-PKCS1-v1_5-ENCODE as per RFC 8017 section 9.2, except that the message `M` has
// already been hashed and encoded into a `DigestInfo` with the appropriate digest algorithm.
fn emsa_pkcs1v1_5_encode(digest_info: &[u8], em_len: usize) -> Vec<u8> {
    assert!(em_len >= digest_info.len() + 11);
    let mut ps = vec![0xff; em_len - digest_info.len() - 3];
    let mut em = vec![0x00, 0x01];
    em.append(&mut ps);
    em.push(0x00);
    em.extend_from_slice(digest_info);
    em
}

impl Sign for Key {
    fn get_signature_length(
        &mut self,
        _data: &[u8],
        _params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<usize, Error> {
        match &self.private_key {
            PrivateKey::RSA(rsa_private_key) => Ok(((rsa_private_key.modulus.bits() + 7) / 8)
                .try_into()
                .unwrap()),
            PrivateKey::EC(_) => Ok(64), // currently, only secp256r1 is supported
        }
    }

    fn sign(
        &mut self,
        data: &[u8],
        params: &Option<CK_RSA_PKCS_PSS_PARAMS>,
    ) -> Result<Vec<u8>, Error> {
        match &self.private_key {
            PrivateKey::RSA(rsa_private_key) => {
                let encoded = if let Some(params) = params.as_ref() {
                    let em_bits = rsa_private_key.modulus.bits() - 1;
                    emsa_pss_encode(data, em_bits.try_into().unwrap(), params).unwrap()
                } else {
                    let em_len = ((rsa_private_key.modulus.bits() + 7) / 8)
                        .try_into()
                        .unwrap();
                    emsa_pkcs1v1_5_encode(data, em_len)
                };
                let message = BigUint::from_bytes_be(&encoded);
                // NB: Do not use this implementation where maintaining the secrecy of the private key is
                // important. In particular, the underlying exponentiation implementation may not be
                // constant-time and could leak information. This is intended to only be used in tests.
                // Additionally, the "private" key in use is already not at all a secret.
                let signature =
                    message.modpow(&rsa_private_key.private_exponent, &rsa_private_key.modulus);
                Ok(signature.to_bytes_be())
            }
            PrivateKey::EC(ec_private_key) => {
                Ok(ecdsa(data, ec_private_key.private_key.as_slice()))
            }
        }
    }
}

fn ecdsa(hash: &[u8], private_key: &[u8]) -> Vec<u8> {
    assert_eq!(hash.len(), 32);
    assert_eq!(private_key.len(), 32);
    assert!(validate_private_key(private_key));
    let mut signature = vec![0; 64];
    let nonce = loop {
        let mut nonce = [0u8; 32];
        thread_rng().fill_bytes(&mut nonce);
        if validate_private_key(&nonce) {
            break nonce;
        }
    };
    assert!(ecdsa_sign_p256_without_hash(
        signature.as_mut_slice(),
        hash.len().try_into().unwrap(),
        hash,
        private_key,
        nonce.as_slice(),
    ));
    signature
}

pub struct Backend {
    slot_description: &'static [u8; 64],
    token_label: &'static [u8; 32],
    slot_flags: CK_FLAGS,
    token_flags: CK_FLAGS,
    logged_in: bool,
    certs: Vec<CryptokiCert>,
    keys: Vec<Key>,
}

const TOKEN_MODEL_BYTES: &[u8; 16] = b"Test Model      ";
const TOKEN_SERIAL_NUMBER_BYTES: &[u8; 16] = b"0000000000000000";

impl Backend {
    pub fn new(
        slot_description: &'static [u8; 64],
        token_label: &'static [u8; 32],
        slot_flags: CK_FLAGS,
        token_flags: CK_FLAGS,
        certs_pem: Vec<&'static str>,
        keys_pem: Vec<&'static str>,
    ) -> Backend {
        let certs_der = certs_pem
            .into_iter()
            .map(pem_to_base64)
            .map(|base64| BASE64_STANDARD.decode(base64).unwrap());
        let keys_der = keys_pem
            .into_iter()
            .map(pem_to_base64)
            .map(|base64| BASE64_STANDARD.decode(base64).unwrap());
        let mut certs = Vec::new();
        let mut keys = Vec::new();
        for (cert_der, key_der) in std::iter::zip(certs_der, keys_der) {
            let cert = CryptokiCert::new(cert_der.to_vec(), b"test certificate".to_vec()).unwrap();
            certs.push(cert);
            let key = Key::new(key_der.to_vec(), cert_der.to_vec()).unwrap();
            keys.push(key);
        }
        Backend {
            slot_description,
            token_label,
            slot_flags,
            token_flags,
            logged_in: false,
            certs,
            keys,
        }
    }
}

fn pem_to_base64(pem: &str) -> String {
    let lines = pem.split('\n');
    let line_count = lines.clone().count();
    // Strip off "-----BEGIN CERTIFICATE-----" / "-----END CERTIFICATE-----"
    lines
        .skip(1)
        .take(line_count - 3)
        .collect::<Vec<&str>>()
        .join("")
}

impl ClientCertsBackend for Backend {
    type Key = Key;

    fn find_objects(&mut self) -> Result<(Vec<CryptokiCert>, Vec<Key>), Error> {
        Ok((self.certs.clone(), self.keys.clone()))
    }

    fn get_slot_info(&self) -> CK_SLOT_INFO {
        CK_SLOT_INFO {
            slotDescription: *self.slot_description,
            manufacturerID: *crate::MANUFACTURER_ID_BYTES,
            flags: self.slot_flags,
            ..Default::default()
        }
    }

    fn get_token_info(&self) -> CK_TOKEN_INFO {
        CK_TOKEN_INFO {
            label: *self.token_label,
            manufacturerID: *crate::MANUFACTURER_ID_BYTES,
            model: *TOKEN_MODEL_BYTES,
            serialNumber: *TOKEN_SERIAL_NUMBER_BYTES,
            flags: self.token_flags,
            ..Default::default()
        }
    }

    fn get_mechanism_list(&self) -> Vec<CK_MECHANISM_TYPE> {
        vec![CKM_ECDSA, CKM_RSA_PKCS, CKM_RSA_PKCS_PSS]
    }

    fn login(&mut self) {
        self.logged_in = true;
    }

    fn logout(&mut self) {
        self.logged_in = false;
    }

    fn is_logged_in(&self) -> bool {
        self.logged_in
    }
}
