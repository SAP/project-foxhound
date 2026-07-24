/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use byteorder::{NativeEndian, WriteBytesExt};
use digest::{Digest, DynDigest};
use pkcs11_bindings::*;
use rand::rngs::OsRng;
use rand::RngCore;
use rsclientcerts_util::error::{Error, ErrorType};
use rsclientcerts_util::{error_here, read_encoded_certificate_identifiers};
use std::convert::TryInto;
use std::iter::zip;

use crate::manager::CryptokiObject;

// The following ENCODED_OID_BYTES_* consist of the encoded bytes of an ASN.1
// OBJECT IDENTIFIER specifying the indicated OID (in other words, the full
// tag, length, and value).
pub const ENCODED_OID_BYTES_SECP256R1: &[u8] =
    &[0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];
pub const ENCODED_OID_BYTES_SECP384R1: &[u8] = &[0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22];
pub const ENCODED_OID_BYTES_SECP521R1: &[u8] = &[0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23];

// This is a helper function to take a value and lay it out in memory how
// PKCS#11 is expecting it.
pub fn serialize_uint<T: TryInto<u64>>(value: T) -> Result<Vec<u8>, Error> {
    let value_size = std::mem::size_of::<T>();
    let mut value_buf = Vec::with_capacity(value_size);
    let value_as_u64 = value
        .try_into()
        .map_err(|_| error_here!(ErrorType::ValueTooLarge))?;
    value_buf
        .write_uint::<NativeEndian>(value_as_u64, value_size)
        .map_err(|_| error_here!(ErrorType::LibraryFailure))?;
    Ok(value_buf)
}

fn make_hasher(params: &CK_RSA_PKCS_PSS_PARAMS) -> Result<Box<dyn DynDigest>, Error> {
    match params.hashAlg {
        CKM_SHA256 => Ok(Box::new(sha2::Sha256::new())),
        CKM_SHA384 => Ok(Box::new(sha2::Sha384::new())),
        CKM_SHA512 => Ok(Box::new(sha2::Sha512::new())),
        _ => Err(error_here!(ErrorType::LibraryFailure)),
    }
}

// Implements MGF1 as per RFC 8017 appendix B.2.1.
fn mgf(
    mgf_seed: &[u8],
    mask_len: usize,
    h_len: usize,
    params: &CK_RSA_PKCS_PSS_PARAMS,
) -> Result<Vec<u8>, Error> {
    // 1.  If maskLen > 2^32 hLen, output "mask too long" and stop.
    // (in practice, `mask_len` is going to be much smaller than this, so use a
    // smaller, fixed limit to avoid problems on systems where usize is 32
    // bits)
    if mask_len > 1 << 30 {
        return Err(error_here!(ErrorType::LibraryFailure));
    }
    // 2.  Let T be the empty octet string.
    let mut t = Vec::with_capacity(mask_len);
    // 3.  For counter from 0 to \ceil (maskLen / hLen) - 1, do the
    //     following:
    for counter in 0..mask_len.div_ceil(h_len) {
        // A.  Convert counter to an octet string C of length 4 octets:
        //     C = I2OSP (counter, 4)
        // (counter fits in u32 due to the length check earlier)
        let c = u32::to_be_bytes(counter.try_into().unwrap());
        // B.  Concatenate the hash of the seed mgfSeed and C to the octet
        //     string T: T = T || Hash(mgfSeed || C)
        let mut hasher = make_hasher(params)?;
        hasher.update(mgf_seed);
        hasher.update(&c);
        t.extend_from_slice(&mut hasher.finalize());
    }
    // 4.  Output the leading maskLen octets of T as the octet string mask.
    t.truncate(mask_len);
    Ok(t)
}

pub fn modulus_bit_length(modulus: &[u8]) -> usize {
    let mut bit_length = modulus.len() * 8;
    for byte in modulus {
        if *byte != 0 {
            // `byte` is a u8, so `leading_zeros()` will be at most 7.
            let leading_zeros: usize = byte.leading_zeros().try_into().unwrap();
            bit_length -= leading_zeros;
            return bit_length;
        }
        bit_length -= 8;
    }
    bit_length
}

// Implements EMSA-PSS-ENCODE as per RFC 8017 section 9.1.1.
// This is necessary because while Android does support RSA-PSS, it expects to
// be given the entire message to be signed, not just the hash of the message,
// which is what NSS gives us.
// Additionally, this is useful for tokens that do not support RSA-PSS.
pub fn emsa_pss_encode(
    m_hash: &[u8],
    em_bits: usize,
    params: &CK_RSA_PKCS_PSS_PARAMS,
) -> Result<Vec<u8>, Error> {
    let em_len = em_bits.div_ceil(8);
    let s_len: usize = params
        .sLen
        .try_into()
        .map_err(|_| error_here!(ErrorType::LibraryFailure))?;

    //  1.   If the length of M is greater than the input limitation for
    //       the hash function (2^61 - 1 octets for SHA-1), output
    //       "message too long" and stop.
    // 2.   Let mHash = Hash(M), an octet string of length hLen.

    // 1 and 2 can be skipped because the message is already hashed as m_hash.

    // 3.   If emLen < hLen + sLen + 2, output "encoding error" and stop.
    if em_len < m_hash.len() + s_len + 2 {
        return Err(error_here!(ErrorType::LibraryFailure));
    }

    // 4.   Generate a random octet string salt of length sLen; if sLen =
    //      0, then salt is the empty string.
    let salt = {
        let mut salt = vec![0u8; s_len];
        OsRng.fill_bytes(&mut salt);
        salt
    };

    // 5.   Let M' = (0x)00 00 00 00 00 00 00 00 || mHash || salt;
    //      M' is an octet string of length 8 + hLen + sLen with eight
    //      initial zero octets.
    // 6.   Let H = Hash(M'), an octet string of length hLen.
    let mut hasher = make_hasher(params)?;
    let h_len = hasher.output_size();
    hasher.update(&[0, 0, 0, 0, 0, 0, 0, 0]);
    hasher.update(m_hash);
    hasher.update(&salt);
    let h = hasher.finalize().to_vec();

    // 7.   Generate an octet string PS consisting of emLen - sLen - hLen
    //      - 2 zero octets.  The length of PS may be 0.
    // 8.   Let DB = PS || 0x01 || salt; DB is an octet string of length
    //      emLen - hLen - 1.
    // (7 and 8 are unnecessary as separate steps - see step 10)

    // 9.   Let dbMask = MGF(H, emLen - hLen - 1).
    let mut db_mask = mgf(&h, em_len - h_len - 1, h_len, params)?;

    // 10.  Let maskedDB = DB \xor dbMask.
    // (in practice, this means xoring `0x01 || salt` with the last `s_len + 1`
    // bytes of `db_mask`)
    let salt_index = db_mask.len() - s_len;
    db_mask[salt_index - 1] ^= 1;
    for (db_mask_byte, salt_byte) in zip(&mut db_mask[salt_index..], &salt) {
        *db_mask_byte ^= salt_byte;
    }
    let mut masked_db = db_mask;

    // 11.  Set the leftmost 8emLen - emBits bits of the leftmost octet
    //      in maskedDB to zero.
    // (bit_diff can only be 0 through 7, so it fits in u32)
    let bit_diff: u32 = ((8 * em_len) - em_bits).try_into().unwrap();
    // (again, bit_diff can only b 0 through 7, so the shift is sound)
    masked_db[0] &= 0xffu8.checked_shr(bit_diff).unwrap();

    // 12.  Let EM = maskedDB || H || 0xbc.
    let mut em = masked_db;
    em.extend_from_slice(&h);
    em.push(0xbc);

    Ok(em)
}

/// A `CryptokiCert` holds all relevant information for a `CryptokiObject` with class
/// `CKO_CERTIFICATE`.
#[derive(Clone)]
pub struct CryptokiCert {
    /// PKCS #11 object class. Will be `CKO_CERTIFICATE`.
    class: Vec<u8>,
    /// Whether or not this is on a token. Will be `CK_TRUE`.
    token: Vec<u8>,
    /// An identifier unique to this certificate. This must be the same as the ID for the private
    /// key, so for simplicity, this will be the sha256 hash of the bytes of the certificate.
    id: Vec<u8>,
    /// The bytes of a human-readable label for this certificate.
    label: Vec<u8>,
    /// The DER bytes of the certificate.
    value: Vec<u8>,
    /// The DER bytes of the issuer distinguished name of the certificate.
    issuer: Vec<u8>,
    /// The DER bytes of the serial number of the certificate.
    serial_number: Vec<u8>,
    /// The DER bytes of the subject distinguished name of the certificate.
    subject: Vec<u8>,
}

impl CryptokiCert {
    pub fn new(der: Vec<u8>, label: Vec<u8>) -> Result<CryptokiCert, Error> {
        let id = sha2::Sha256::digest(&der).to_vec();
        let (serial_number, issuer, subject) = read_encoded_certificate_identifiers(&der)?;
        Ok(CryptokiCert {
            class: serialize_uint(CKO_CERTIFICATE)?,
            token: serialize_uint(CK_TRUE)?,
            id,
            label,
            value: der,
            issuer,
            serial_number,
            subject,
        })
    }
}

impl CryptokiObject for CryptokiCert {
    fn matches(&self, attrs: &[(CK_ATTRIBUTE_TYPE, Vec<u8>)]) -> bool {
        for (attr_type, attr_value) in attrs {
            let comparison = match *attr_type {
                CKA_CLASS => &self.class,
                CKA_TOKEN => &self.token,
                CKA_LABEL => &self.label,
                CKA_ID => &self.id,
                CKA_VALUE => &self.value,
                CKA_ISSUER => &self.issuer,
                CKA_SERIAL_NUMBER => &self.serial_number,
                CKA_SUBJECT => &self.subject,
                _ => return false,
            };
            if attr_value.as_slice() != comparison {
                return false;
            }
        }
        true
    }

    fn get_attribute(&self, attribute: CK_ATTRIBUTE_TYPE) -> Option<&[u8]> {
        let result = match attribute {
            CKA_CLASS => &self.class,
            CKA_TOKEN => &self.token,
            CKA_LABEL => &self.label,
            CKA_ID => &self.id,
            CKA_VALUE => &self.value,
            CKA_ISSUER => &self.issuer,
            CKA_SERIAL_NUMBER => &self.serial_number,
            CKA_SUBJECT => &self.subject,
            _ => return None,
        };
        Some(result)
    }
}

#[allow(clippy::upper_case_acronyms)]
#[derive(Clone, Copy, Debug)]
pub enum KeyType {
    EC(usize),
    RSA,
}

/// A `CryptokiKey` holds all relevant information for a `CryptokiObject` with class
/// `CKO_PRIVATE_KEY`.
#[derive(Clone)]
pub struct CryptokiKey {
    /// PKCS #11 object class. Will be `CKO_PRIVATE_KEY`.
    class: Vec<u8>,
    /// Whether or not this is on a token. Will be `CK_TRUE`.
    token: Vec<u8>,
    /// An identifier unique to this key. This must be the same as the ID for a corresponding
    /// certificate, so for simplicity, this will be the sha256 hash of the bytes of the
    /// certificate.
    id: Vec<u8>,
    /// Whether or not this key is "private" (can it be exported?). Will be CK_TRUE (it can't be
    /// exported).
    private: Vec<u8>,
    /// PKCS #11 key type. Will be `CKK_EC` for EC, and `CKK_RSA` for RSA.
    key_type_attribute: Vec<u8>,
    /// If this is an RSA key, this is the value of the modulus as an unsigned integer.
    modulus: Option<Vec<u8>>,
    /// If this is an EC key, this is the DER bytes of the OID identifying the curve the key is on.
    ec_params: Option<Vec<u8>>,
    /// An enum identifying this key's type.
    key_type: KeyType,
}

impl CryptokiKey {
    pub fn new(
        modulus: Option<Vec<u8>>,
        ec_params: Option<Vec<u8>>,
        cert: &[u8],
    ) -> Result<CryptokiKey, Error> {
        let (key_type, key_type_attribute) = if modulus.is_some() {
            (KeyType::RSA, CKK_RSA)
        } else if let Some(ec_params) = ec_params.as_ref() {
            // Only secp256r1, secp384r1, and secp521r1 are supported.
            let coordinate_width = match ec_params.as_slice() {
                ENCODED_OID_BYTES_SECP256R1 => 32,
                ENCODED_OID_BYTES_SECP384R1 => 48,
                ENCODED_OID_BYTES_SECP521R1 => 66,
                _ => return Err(error_here!(ErrorType::UnsupportedInput)),
            };
            (KeyType::EC(coordinate_width), CKK_EC)
        } else {
            return Err(error_here!(ErrorType::LibraryFailure));
        };
        let id = sha2::Sha256::digest(cert).to_vec();
        Ok(CryptokiKey {
            class: serialize_uint(CKO_PRIVATE_KEY)?,
            token: serialize_uint(CK_TRUE)?,
            id,
            private: serialize_uint(CK_TRUE)?,
            key_type_attribute: serialize_uint(key_type_attribute)?,
            modulus,
            ec_params,
            key_type,
        })
    }

    pub fn modulus(&self) -> &Option<Vec<u8>> {
        &self.modulus
    }

    pub fn ec_params(&self) -> &Option<Vec<u8>> {
        &self.ec_params
    }

    pub fn key_type(&self) -> KeyType {
        self.key_type
    }
}

impl CryptokiObject for CryptokiKey {
    fn matches(&self, attrs: &[(CK_ATTRIBUTE_TYPE, Vec<u8>)]) -> bool {
        for (attr_type, attr_value) in attrs {
            let comparison = match *attr_type {
                CKA_CLASS => &self.class,
                CKA_TOKEN => &self.token,
                CKA_ID => &self.id,
                CKA_PRIVATE => &self.private,
                CKA_KEY_TYPE => &self.key_type_attribute,
                CKA_MODULUS => {
                    if let Some(modulus) = &self.modulus {
                        modulus
                    } else {
                        return false;
                    }
                }
                CKA_EC_PARAMS => {
                    if let Some(ec_params) = &self.ec_params {
                        ec_params
                    } else {
                        return false;
                    }
                }
                _ => return false,
            };
            if attr_value.as_slice() != comparison {
                return false;
            }
        }
        true
    }

    fn get_attribute(&self, attribute: CK_ATTRIBUTE_TYPE) -> Option<&[u8]> {
        match attribute {
            CKA_CLASS => Some(&self.class),
            CKA_TOKEN => Some(&self.token),
            CKA_ID => Some(&self.id),
            CKA_PRIVATE => Some(&self.private),
            CKA_KEY_TYPE => Some(&self.key_type_attribute),
            CKA_MODULUS => match &self.modulus {
                Some(modulus) => Some(modulus.as_slice()),
                None => None,
            },
            CKA_EC_PARAMS => match &self.ec_params {
                Some(ec_params) => Some(ec_params.as_slice()),
                None => None,
            },
            _ => None,
        }
    }
}
