/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pub mod error;

use byteorder::{BigEndian, ReadBytesExt};

use crate::error::{Error, ErrorType};

// The following OID_BYTES_* consist of the contents of the bytes of an ASN.1
// OBJECT IDENTIFIER specifying the indicated OID (in other words, just the
// value, and not the tag or length).
pub const OID_BYTES_SHA_256: &[u8] = &[0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01];
pub const OID_BYTES_SHA_384: &[u8] = &[0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x02];
pub const OID_BYTES_SHA_512: &[u8] = &[0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x03];
pub const OID_BYTES_SHA_1: &[u8] = &[0x2b, 0x0e, 0x03, 0x02, 0x1a];

const OID_BYTES_RSA_ENCRYPTION: &[u8] = &[0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];
const OID_BYTES_EC_PUBLIC_KEY: &[u8] = &[0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01];
const OID_BYTES_SECP256R1: &[u8] = &[0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];

/// Given a slice of DER bytes representing an RSA public key, extracts the bytes of the modulus
/// as an unsigned integer. Also verifies that the public exponent is present (again as an
/// unsigned integer). Finally verifies that reading these values consumes the entirety of the
/// slice.
/// RSAPublicKey ::= SEQUENCE {
///     modulus           INTEGER,  -- n
///     publicExponent    INTEGER   -- e
/// }
pub fn read_rsa_modulus(public_key: &[u8]) -> Result<Vec<u8>, Error> {
    let mut sequence = Sequence::new(public_key)?;
    let modulus_value = sequence.read_unsigned_integer()?;
    let _exponent = sequence.read_unsigned_integer()?;
    if !sequence.at_end() {
        return Err(error_here!(ErrorType::ExtraInput));
    }
    Ok(modulus_value.to_vec())
}

/// Given a slice of DER bytes representing a SubjectPublicKeyInfo, extracts
/// the bytes of the parameters of the algorithm. Does not verify that all
/// input is consumed.
/// PublicKeyInfo ::= SEQUENCE {
///   algorithm   AlgorithmIdentifier,
///   PublicKey   BIT STRING
/// }
///
/// AlgorithmIdentifier ::= SEQUENCE {
///   algorithm   OBJECT IDENTIFIER,
///   parameters  ANY DEFINED BY algorithm OPTIONAL
///  }
pub fn read_spki_algorithm_parameters(spki: &[u8]) -> Result<Vec<u8>, Error> {
    let mut public_key_info = Sequence::new(spki)?;
    let mut algorithm_identifier = public_key_info.read_sequence()?;
    let _algorithm = algorithm_identifier.read_oid()?;
    Ok(algorithm_identifier.read_rest().to_vec())
}

/// Given a slice of DER bytes representing a DigestInfo, extracts the bytes of
/// the OID of the hash algorithm and the digest.
/// DigestInfo ::= SEQUENCE {
///   digestAlgorithm DigestAlgorithmIdentifier,
///   digest Digest }
///
/// DigestAlgorithmIdentifier ::= AlgorithmIdentifier
///
/// AlgorithmIdentifier  ::=  SEQUENCE  {
///      algorithm               OBJECT IDENTIFIER,
///      parameters              ANY DEFINED BY algorithm OPTIONAL  }
///
/// Digest ::= OCTET STRING
pub fn read_digest_info(digest_info: &[u8]) -> Result<(&[u8], &[u8]), Error> {
    let mut sequence = Sequence::new(digest_info)?;
    let mut algorithm = sequence.read_sequence()?;
    let oid = algorithm.read_oid()?;
    algorithm.read_null()?;
    if !algorithm.at_end() {
        return Err(error_here!(ErrorType::ExtraInput));
    }
    let digest = sequence.read_octet_string()?;
    if !sequence.at_end() {
        return Err(error_here!(ErrorType::ExtraInput));
    }
    Ok((oid, digest))
}

/// Converts a slice of DER bytes representing an ECDSA signature to the concatenation of the bytes
/// of `r` and `s`, each 0-padded to `coordinate_width`. Also verifies that this consumes the
/// entirety of the slice.
///   Ecdsa-Sig-Value  ::=  SEQUENCE  {
///        r     INTEGER,
///        s     INTEGER  }
pub fn der_ec_sig_to_raw(encoded: &[u8], coordinate_width: usize) -> Result<Vec<u8>, Error> {
    let (r, s) = read_ec_sig_point(encoded)?;
    if r.len() > coordinate_width || s.len() > coordinate_width {
        return Err(error_here!(ErrorType::InvalidInput));
    }
    let mut raw_signature = Vec::with_capacity(2 * coordinate_width);
    raw_signature.resize(coordinate_width - r.len(), 0);
    raw_signature.extend_from_slice(r);
    raw_signature.resize((2 * coordinate_width) - s.len(), 0);
    raw_signature.extend_from_slice(s);
    Ok(raw_signature)
}

/// Given a slice of DER bytes representing an ECDSA signature, extracts the bytes of `r` and `s`
/// as unsigned integers. Also verifies that this consumes the entirety of the slice.
///   Ecdsa-Sig-Value  ::=  SEQUENCE  {
///        r     INTEGER,
///        s     INTEGER  }
fn read_ec_sig_point(signature: &[u8]) -> Result<(&[u8], &[u8]), Error> {
    let mut sequence = Sequence::new(signature)?;
    let r = sequence.read_unsigned_integer()?;
    let s = sequence.read_unsigned_integer()?;
    if !sequence.at_end() {
        return Err(error_here!(ErrorType::ExtraInput));
    }
    Ok((r, s))
}

/// Given a slice of DER bytes representing an X.509 certificate, extracts the encoded serial
/// number, issuer, and subject. Does not verify that the remainder of the certificate is in any
/// way well-formed.
///   Certificate  ::=  SEQUENCE  {
///           tbsCertificate       TBSCertificate,
///           signatureAlgorithm   AlgorithmIdentifier,
///           signatureValue       BIT STRING  }
///
///   TBSCertificate  ::=  SEQUENCE  {
///           version         [0]  EXPLICIT Version DEFAULT v1,
///           serialNumber         CertificateSerialNumber,
///           signature            AlgorithmIdentifier,
///           issuer               Name,
///           validity             Validity,
///           subject              Name,
///           ...
///
///   CertificateSerialNumber  ::=  INTEGER
///
///   Name ::= CHOICE { -- only one possibility for now --
///     rdnSequence  RDNSequence }
///
///   RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
///
///   Validity ::= SEQUENCE {
///        notBefore      Time,
///        notAfter       Time  }
#[allow(clippy::type_complexity)]
pub fn read_encoded_certificate_identifiers(
    certificate: &[u8],
) -> Result<(Vec<u8>, Vec<u8>, Vec<u8>), Error> {
    let mut certificate_sequence = Sequence::new(certificate)?;
    let mut tbs_certificate_sequence = certificate_sequence.read_sequence()?;
    let _version = tbs_certificate_sequence.read_optional_tagged_value(0)?;
    let serial_number = tbs_certificate_sequence.read_encoded_sequence_component(INTEGER)?;
    let _signature = tbs_certificate_sequence.read_sequence()?;
    let issuer =
        tbs_certificate_sequence.read_encoded_sequence_component(SEQUENCE | CONSTRUCTED)?;
    let _validity = tbs_certificate_sequence.read_sequence()?;
    let subject =
        tbs_certificate_sequence.read_encoded_sequence_component(SEQUENCE | CONSTRUCTED)?;
    Ok((serial_number, issuer, subject))
}

pub struct RSAPrivateKey {
    pub modulus: Vec<u8>,
    pub private_exponent: Vec<u8>,
}

pub struct ECPrivateKey {
    pub private_key: Vec<u8>,
}

pub enum PrivateKeyInfo {
    RSA(RSAPrivateKey),
    EC(ECPrivateKey),
}

/// PrivateKeyInfo ::= SEQUENCE {
///  version                   Version,
///  privateKeyAlgorithm       PrivateKeyAlgorithmIdentifier,
///  privateKey                PrivateKey,
///  attributes           [0]  IMPLICIT Attributes OPTIONAL }
///
/// Version ::= INTEGER
///
/// PrivateKeyAlgorithmIdentifier ::= AlgorithmIdentifier
///
/// PrivateKey ::= OCTET STRING
///
/// Attributes ::= SET OF Attribute
///
/// RSAPrivateKey ::= SEQUENCE {
///     version           Version,
///     modulus           INTEGER,  -- n
///     publicExponent    INTEGER,  -- e
///     privateExponent   INTEGER,  -- d
///     prime1            INTEGER,  -- p
///     prime2            INTEGER,  -- q
///     exponent1         INTEGER,  -- d mod (p-1)
///     exponent2         INTEGER,  -- d mod (q-1)
///     coefficient       INTEGER,  -- (inverse of q) mod p
///     otherPrimeInfos   OtherPrimeInfos OPTIONAL
/// }
///
///  ECPrivateKey ::= SEQUENCE {
///    version        INTEGER { ecPrivkeyVer1(1) } (ecPrivkeyVer1),
///    privateKey     OCTET STRING,
///    parameters [0] ECParameters {{ NamedCurve }} OPTIONAL,
///    publicKey  [1] BIT STRING OPTIONAL
/// }
pub fn read_private_key_info(private_key_info: &[u8]) -> Result<PrivateKeyInfo, Error> {
    let mut private_key_info = Sequence::new(private_key_info)?;
    let _version = private_key_info.read_unsigned_integer()?;
    let mut algorithm_identifier = private_key_info.read_sequence()?;
    let algorithm = algorithm_identifier.read_oid()?;
    let private_key_bytes = private_key_info.read_octet_string()?;
    let mut private_key = Sequence::new(private_key_bytes)?;
    if algorithm == OID_BYTES_RSA_ENCRYPTION {
        let _version = private_key.read_unsigned_integer()?;
        let modulus = private_key.read_unsigned_integer()?;
        let _public_exponent = private_key.read_unsigned_integer()?;
        let private_exponent = private_key.read_unsigned_integer()?;
        return Ok(PrivateKeyInfo::RSA(RSAPrivateKey {
            modulus: modulus.to_vec(),
            private_exponent: private_exponent.to_vec(),
        }));
    }
    if algorithm == OID_BYTES_EC_PUBLIC_KEY {
        let algorithm_parameters = algorithm_identifier.read_oid()?;
        // Currently, only secp256r1 is supported.
        if algorithm_parameters != OID_BYTES_SECP256R1 {
            return Err(error_here!(ErrorType::UnsupportedInput));
        }
        let _version = private_key.read_unsigned_integer()?;
        let private_key_bytes = private_key.read_octet_string()?;
        return Ok(PrivateKeyInfo::EC(ECPrivateKey {
            private_key: private_key_bytes.to_vec(),
        }));
    }
    Err(error_here!(ErrorType::UnsupportedInput))
}

/// Helper macro for reading some bytes from a slice while checking the slice is long enough.
/// Returns a pair consisting of a slice of the bytes read and a slice of the rest of the bytes
/// from the original slice.
macro_rules! try_read_bytes {
    ($data:ident, $len:expr) => {{
        if $data.len() < $len {
            return Err(error_here!(ErrorType::TruncatedInput));
        }
        $data.split_at($len)
    }};
}

/// ASN.1 tag identifying an integer.
const INTEGER: u8 = 0x02;
/// ASN.1 tag identifying an octet string.
const OCTET_STRING: u8 = 0x04;
/// ASN.1 tag identifying a null value.
const NULL: u8 = 0x05;
/// ASN.1 tag identifying an object identifier (OID).
const OBJECT_IDENTIFIER: u8 = 0x06;
/// ASN.1 tag identifying a sequence.
const SEQUENCE: u8 = 0x10;
/// ASN.1 tag modifier identifying an item as constructed.
const CONSTRUCTED: u8 = 0x20;
/// ASN.1 tag modifier identifying an item as context-specific.
const CONTEXT_SPECIFIC: u8 = 0x80;

/// A helper struct for reading items from a DER SEQUENCE (in this case, all sequences are
/// assumed to be CONSTRUCTED).
struct Sequence<'a> {
    /// The contents of the SEQUENCE.
    contents: Der<'a>,
}

impl<'a> Sequence<'a> {
    fn new(input: &'a [u8]) -> Result<Sequence<'a>, Error> {
        let mut der = Der::new(input);
        let (_, _, sequence_bytes) = der.read_tlv(SEQUENCE | CONSTRUCTED)?;
        // We're assuming we want to consume the entire input for now.
        if !der.at_end() {
            return Err(error_here!(ErrorType::ExtraInput));
        }
        Ok(Sequence {
            contents: Der::new(sequence_bytes),
        })
    }

    // TODO: we're not exhaustively validating this integer
    fn read_unsigned_integer(&mut self) -> Result<&'a [u8], Error> {
        let (_, _, bytes) = self.contents.read_tlv(INTEGER)?;
        if bytes.is_empty() {
            return Err(error_here!(ErrorType::InvalidInput));
        }
        // There may be a leading zero (we should also check that the first bit
        // of the rest of the integer is set).
        if bytes[0] == 0 && bytes.len() > 1 {
            let (_, integer) = bytes.split_at(1);
            Ok(integer)
        } else {
            Ok(bytes)
        }
    }

    fn read_octet_string(&mut self) -> Result<&'a [u8], Error> {
        let (_, _, bytes) = self.contents.read_tlv(OCTET_STRING)?;
        Ok(bytes)
    }

    fn read_oid(&mut self) -> Result<&'a [u8], Error> {
        let (_, _, bytes) = self.contents.read_tlv(OBJECT_IDENTIFIER)?;
        Ok(bytes)
    }

    fn read_null(&mut self) -> Result<(), Error> {
        let (_, _, bytes) = self.contents.read_tlv(NULL)?;
        if bytes.is_empty() {
            Ok(())
        } else {
            Err(error_here!(ErrorType::InvalidInput))
        }
    }

    fn read_sequence(&mut self) -> Result<Sequence<'a>, Error> {
        let (_, _, sequence_bytes) = self.contents.read_tlv(SEQUENCE | CONSTRUCTED)?;
        Ok(Sequence {
            contents: Der::new(sequence_bytes),
        })
    }

    fn read_optional_tagged_value(&mut self, tag: u8) -> Result<Option<&'a [u8]>, Error> {
        let expected = CONTEXT_SPECIFIC | CONSTRUCTED | tag;
        if self.contents.peek(expected) {
            let (_, _, tagged_value_bytes) = self.contents.read_tlv(expected)?;
            Ok(Some(tagged_value_bytes))
        } else {
            Ok(None)
        }
    }

    fn read_encoded_sequence_component(&mut self, tag: u8) -> Result<Vec<u8>, Error> {
        let (tag, length, value) = self.contents.read_tlv(tag)?;
        let mut encoded_component_bytes = length;
        encoded_component_bytes.insert(0, tag);
        encoded_component_bytes.extend_from_slice(value);
        Ok(encoded_component_bytes)
    }

    fn at_end(&self) -> bool {
        self.contents.at_end()
    }

    fn read_rest(&mut self) -> &[u8] {
        self.contents.read_rest()
    }
}

/// A helper struct for reading DER data. The contents are treated like a cursor, so its position
/// is updated as data is read.
struct Der<'a> {
    contents: &'a [u8],
}

impl<'a> Der<'a> {
    fn new(contents: &'a [u8]) -> Der<'a> {
        Der { contents }
    }

    // In theory, a caller could encounter an error and try another operation, in which case we may
    // be in an inconsistent state. As long as this implementation isn't exposed to code that would
    // use it incorrectly (i.e. it stays in this module and we only expose a stateless API), it
    // should be safe.
    /// Given an expected tag, reads the next (tag, lengh, value) from the contents. Most
    /// consumers will only be interested in the value, but some may want the entire encoded
    /// contents, in which case the returned tuple can be concatenated.
    fn read_tlv(&mut self, tag: u8) -> Result<(u8, Vec<u8>, &'a [u8]), Error> {
        let contents = self.contents;
        let (tag_read, rest) = try_read_bytes!(contents, 1);
        if tag_read[0] != tag {
            return Err(error_here!(ErrorType::InvalidInput));
        }
        let mut accumulated_length_bytes = Vec::with_capacity(4);
        let (length1, rest) = try_read_bytes!(rest, 1);
        accumulated_length_bytes.extend_from_slice(length1);
        let (length, to_read_from) = if length1[0] < 0x80 {
            (length1[0] as usize, rest)
        } else if length1[0] == 0x81 {
            let (length, rest) = try_read_bytes!(rest, 1);
            accumulated_length_bytes.extend_from_slice(length);
            if length[0] < 0x80 {
                return Err(error_here!(ErrorType::InvalidInput));
            }
            (length[0] as usize, rest)
        } else if length1[0] == 0x82 {
            let (mut lengths, rest) = try_read_bytes!(rest, 2);
            accumulated_length_bytes.extend_from_slice(lengths);
            let length = lengths
                .read_u16::<BigEndian>()
                .map_err(|_| error_here!(ErrorType::LibraryFailure))?;
            if length < 256 {
                return Err(error_here!(ErrorType::InvalidInput));
            }
            (length as usize, rest)
        } else {
            return Err(error_here!(ErrorType::UnsupportedInput));
        };
        let (contents, rest) = try_read_bytes!(to_read_from, length);
        self.contents = rest;
        Ok((tag, accumulated_length_bytes, contents))
    }

    fn at_end(&self) -> bool {
        self.contents.is_empty()
    }

    fn peek(&self, expected: u8) -> bool {
        Some(&expected) == self.contents.first()
    }

    fn read_rest(&mut self) -> &'a [u8] {
        let contents = self.contents;
        self.contents = &[];
        contents
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn der_test_empty_input() {
        let input = Vec::new();
        let mut der = Der::new(&input);
        assert!(der.read_tlv(INTEGER).is_err());
    }

    #[test]
    fn der_test_no_length() {
        let input = vec![INTEGER];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(INTEGER).is_err());
    }

    #[test]
    fn der_test_empty_sequence() {
        let input = vec![SEQUENCE, 0];
        let mut der = Der::new(&input);
        let read_result = der.read_tlv(SEQUENCE);
        assert!(read_result.is_ok());
        let (tag, length, sequence_bytes) = read_result.unwrap();
        assert_eq!(tag, SEQUENCE);
        assert_eq!(length, vec![0]);
        assert_eq!(sequence_bytes.len(), 0);
        assert!(der.at_end());
    }

    #[test]
    fn der_test_not_at_end() {
        let input = vec![SEQUENCE, 0, 1];
        let mut der = Der::new(&input);
        let read_result = der.read_tlv(SEQUENCE);
        assert!(read_result.is_ok());
        let (tag, length, sequence_bytes) = read_result.unwrap();
        assert_eq!(tag, SEQUENCE);
        assert_eq!(length, vec![0]);
        assert_eq!(sequence_bytes.len(), 0);
        assert!(!der.at_end());
    }

    #[test]
    fn der_test_wrong_tag() {
        let input = vec![SEQUENCE, 0];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(INTEGER).is_err());
    }

    #[test]
    fn der_test_truncated_two_byte_length() {
        let input = vec![SEQUENCE, 0x81];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn der_test_truncated_three_byte_length() {
        let input = vec![SEQUENCE, 0x82, 1];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn der_test_truncated_data() {
        let input = vec![SEQUENCE, 20, 1];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn der_test_sequence() {
        let input = vec![
            SEQUENCE, 20, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 0, 0,
        ];
        let mut der = Der::new(&input);
        let result = der.read_tlv(SEQUENCE);
        assert!(result.is_ok());
        let (tag, length, value) = result.unwrap();
        assert_eq!(tag, SEQUENCE);
        assert_eq!(length, vec![20]);
        assert_eq!(
            value,
            [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 0, 0]
        );
        assert!(der.at_end());
    }

    #[test]
    fn der_test_not_shortest_two_byte_length_encoding() {
        let input = vec![SEQUENCE, 0x81, 1, 1];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn der_test_not_shortest_three_byte_length_encoding() {
        let input = vec![SEQUENCE, 0x82, 0, 1, 1];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn der_test_indefinite_length_unsupported() {
        let input = vec![SEQUENCE, 0x80, 1, 2, 3, 0x00, 0x00];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn der_test_input_too_long() {
        // This isn't valid DER (the contents of the SEQUENCE are truncated), but it demonstrates
        // that we don't try to read too much if we're given a long length (and also that we don't
        // support lengths 2^16 and up).
        let input = vec![SEQUENCE, 0x83, 0x01, 0x00, 0x01, 1, 1, 1, 1];
        let mut der = Der::new(&input);
        assert!(der.read_tlv(SEQUENCE).is_err());
    }

    #[test]
    fn empty_input_fails() {
        let empty = Vec::new();
        assert!(read_rsa_modulus(&empty).is_err());
        assert!(read_ec_sig_point(&empty).is_err());
        assert!(read_encoded_certificate_identifiers(&empty).is_err());
    }

    #[test]
    fn empty_sequence_fails() {
        let empty = vec![SEQUENCE | CONSTRUCTED];
        assert!(read_rsa_modulus(&empty).is_err());
        assert!(read_ec_sig_point(&empty).is_err());
        assert!(read_encoded_certificate_identifiers(&empty).is_err());
    }

    #[test]
    fn test_der_ec_sig_to_raw() {
        let ec_sig_point = vec![
            0x30, 0x45, 0x02, 0x20, 0x5c, 0x75, 0x51, 0x9f, 0x13, 0x11, 0x50, 0xcd, 0x5d, 0x8a,
            0xde, 0x20, 0xa3, 0xbc, 0x06, 0x30, 0x91, 0xff, 0xb2, 0x73, 0x75, 0x5f, 0x31, 0x64,
            0xec, 0xfd, 0xcb, 0x42, 0x80, 0x0a, 0x70, 0xe6, 0x02, 0x21, 0x00, 0x85, 0xfb, 0xb4,
            0x75, 0x5d, 0xb5, 0x1c, 0x5f, 0x97, 0x52, 0x27, 0xd9, 0x71, 0x14, 0xc0, 0xbc, 0x67,
            0x10, 0x4f, 0x72, 0x2e, 0x37, 0xb2, 0x78, 0x54, 0xfd, 0xd0, 0x9d, 0x51, 0xd4, 0x9f,
            0xf2,
        ];
        let result = der_ec_sig_to_raw(&ec_sig_point, 32);
        assert!(result.is_ok());
        let expected = vec![
            0x5c, 0x75, 0x51, 0x9f, 0x13, 0x11, 0x50, 0xcd, 0x5d, 0x8a, 0xde, 0x20, 0xa3, 0xbc,
            0x06, 0x30, 0x91, 0xff, 0xb2, 0x73, 0x75, 0x5f, 0x31, 0x64, 0xec, 0xfd, 0xcb, 0x42,
            0x80, 0x0a, 0x70, 0xe6, 0x85, 0xfb, 0xb4, 0x75, 0x5d, 0xb5, 0x1c, 0x5f, 0x97, 0x52,
            0x27, 0xd9, 0x71, 0x14, 0xc0, 0xbc, 0x67, 0x10, 0x4f, 0x72, 0x2e, 0x37, 0xb2, 0x78,
            0x54, 0xfd, 0xd0, 0x9d, 0x51, 0xd4, 0x9f, 0xf2,
        ];
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn test_der_ec_sig_to_raw_long() {
        let ec_sig = vec![
            0x30, 0x45, 0x02, 0x20, 0x5c, 0x75, 0x51, 0x9f, 0x13, 0x11, 0x50, 0xcd, 0x5d, 0x8a,
            0xde, 0x20, 0xa3, 0xbc, 0x06, 0x30, 0x91, 0xff, 0xb2, 0x73, 0x75, 0x5f, 0x31, 0x64,
            0xec, 0xfd, 0xcb, 0x42, 0x80, 0x0a, 0x70, 0xe6, 0x02, 0x21, 0x00, 0x85, 0xfb, 0xb4,
            0x75, 0x5d, 0xb5, 0x1c, 0x5f, 0x97, 0x52, 0x27, 0xd9, 0x71, 0x14, 0xc0, 0xbc, 0x67,
            0x10, 0x4f, 0x72, 0x2e, 0x37, 0xb2, 0x78, 0x54, 0xfd, 0xd0, 0x9d, 0x51, 0xd4, 0x9f,
            0xf2,
        ];
        let result = der_ec_sig_to_raw(&ec_sig, 16);
        assert!(result.is_err());
    }

    #[test]
    fn test_der_ec_sig_to_raw_short() {
        let ec_sig_point = vec![
            0x30, 0x45, 0x02, 0x20, 0x5c, 0x75, 0x51, 0x9f, 0x13, 0x11, 0x50, 0xcd, 0x5d, 0x8a,
            0xde, 0x20, 0xa3, 0xbc, 0x06, 0x30, 0x91, 0xff, 0xb2, 0x73, 0x75, 0x5f, 0x31, 0x64,
            0xec, 0xfd, 0xcb, 0x42, 0x80, 0x0a, 0x70, 0xe6, 0x02, 0x21, 0x00, 0x85, 0xfb, 0xb4,
            0x75, 0x5d, 0xb5, 0x1c, 0x5f, 0x97, 0x52, 0x27, 0xd9, 0x71, 0x14, 0xc0, 0xbc, 0x67,
            0x10, 0x4f, 0x72, 0x2e, 0x37, 0xb2, 0x78, 0x54, 0xfd, 0xd0, 0x9d, 0x51, 0xd4, 0x9f,
            0xf2,
        ];
        let result = der_ec_sig_to_raw(&ec_sig_point, 48);
        assert!(result.is_ok());
        let expected = vec![
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x5c, 0x75, 0x51, 0x9f, 0x13, 0x11, 0x50, 0xcd, 0x5d, 0x8a, 0xde, 0x20,
            0xa3, 0xbc, 0x06, 0x30, 0x91, 0xff, 0xb2, 0x73, 0x75, 0x5f, 0x31, 0x64, 0xec, 0xfd,
            0xcb, 0x42, 0x80, 0x0a, 0x70, 0xe6, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x85, 0xfb, 0xb4, 0x75, 0x5d, 0xb5,
            0x1c, 0x5f, 0x97, 0x52, 0x27, 0xd9, 0x71, 0x14, 0xc0, 0xbc, 0x67, 0x10, 0x4f, 0x72,
            0x2e, 0x37, 0xb2, 0x78, 0x54, 0xfd, 0xd0, 0x9d, 0x51, 0xd4, 0x9f, 0xf2,
        ];
        assert_eq!(result.unwrap(), expected);
    }

    #[test]
    fn test_read_rsa_modulus() {
        let rsa_key = include_bytes!("../test/rsa.bin");
        let result = read_rsa_modulus(rsa_key);
        assert!(result.is_ok());
        let modulus = result.unwrap();
        assert_eq!(modulus, include_bytes!("../test/modulus.bin").to_vec());
    }

    #[test]
    fn test_read_certificate_identifiers() {
        let certificate = include_bytes!("../test/certificate.bin");
        let result = read_encoded_certificate_identifiers(certificate);
        assert!(result.is_ok());
        let (serial_number, issuer, subject) = result.unwrap();
        assert_eq!(
            serial_number,
            &[
                0x02, 0x14, 0x3f, 0xed, 0x7b, 0x43, 0x47, 0x8a, 0x53, 0x42, 0x5b, 0x0d, 0x50, 0xe1,
                0x37, 0x88, 0x2a, 0x20, 0x3f, 0x31, 0x17, 0x20
            ]
        );
        assert_eq!(
            issuer,
            &[
                0x30, 0x12, 0x31, 0x10, 0x30, 0x0e, 0x06, 0x03, 0x55, 0x04, 0x03, 0x0c, 0x07, 0x54,
                0x65, 0x73, 0x74, 0x20, 0x43, 0x41
            ]
        );
        assert_eq!(
            subject,
            &[
                0x30, 0x1a, 0x31, 0x18, 0x30, 0x16, 0x06, 0x03, 0x55, 0x04, 0x03, 0x0c, 0x0f, 0x54,
                0x65, 0x73, 0x74, 0x20, 0x45, 0x6e, 0x64, 0x2d, 0x65, 0x6e, 0x74, 0x69, 0x74, 0x79
            ]
        );
    }

    #[test]
    fn test_read_v1_certificate_identifiers() {
        let certificate = include_bytes!("../test/v1certificate.bin");
        let result = read_encoded_certificate_identifiers(certificate);
        assert!(result.is_ok());
        let (serial_number, issuer, subject) = result.unwrap();
        assert_eq!(
            serial_number,
            &[
                0x02, 0x14, 0x51, 0x6b, 0x24, 0xaa, 0xf2, 0x7f, 0x56, 0x13, 0x5f, 0xc3, 0x8b, 0x5c,
                0xa7, 0x00, 0x83, 0xa8, 0xee, 0xca, 0xad, 0xa0
            ]
        );
        assert_eq!(
            issuer,
            &[
                0x30, 0x12, 0x31, 0x10, 0x30, 0x0E, 0x06, 0x03, 0x55, 0x04, 0x03, 0x0C, 0x07, 0x54,
                0x65, 0x73, 0x74, 0x20, 0x43, 0x41
            ]
        );
        assert_eq!(
            subject,
            &[
                0x30, 0x12, 0x31, 0x10, 0x30, 0x0E, 0x06, 0x03, 0x55, 0x04, 0x03, 0x0C, 0x07, 0x56,
                0x31, 0x20, 0x43, 0x65, 0x72, 0x74
            ]
        );
    }

    #[test]
    fn test_read_digest() {
        // SEQUENCE
        //   SEQUENCE
        //     OBJECT IDENTIFIER 2.16.840.1.101.3.4.2.1 sha-256
        //       NULL
        //   OCTET STRING 1A7FCDB9A5F649F954885CFE145F3E93F0D1FA72BE980CC6EC82C70E1407C7D2
        let digest_info = [
            0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x1, 0x65, 0x03, 0x04, 0x02,
            0x01, 0x05, 0x00, 0x04, 0x20, 0x1a, 0x7f, 0xcd, 0xb9, 0xa5, 0xf6, 0x49, 0xf9, 0x54,
            0x88, 0x5c, 0xfe, 0x14, 0x5f, 0x3e, 0x93, 0xf0, 0xd1, 0xfa, 0x72, 0xbe, 0x98, 0x0c,
            0xc6, 0xec, 0x82, 0xc7, 0x0e, 0x14, 0x07, 0xc7, 0xd2,
        ];
        let result = read_digest_info(&digest_info);
        assert!(result.is_ok());
        let (oid, digest) = result.unwrap();
        assert_eq!(oid, &[0x60, 0x86, 0x48, 0x1, 0x65, 0x03, 0x04, 0x02, 0x01]);
        assert_eq!(
            digest,
            &[
                0x1a, 0x7f, 0xcd, 0xb9, 0xa5, 0xf6, 0x49, 0xf9, 0x54, 0x88, 0x5c, 0xfe, 0x14, 0x5f,
                0x3e, 0x93, 0xf0, 0xd1, 0xfa, 0x72, 0xbe, 0x98, 0x0c, 0xc6, 0xec, 0x82, 0xc7, 0x0e,
                0x14, 0x07, 0xc7, 0xd2
            ]
        );
    }

    #[test]
    fn test_read_spki_algorithm_parameters() {
        let spki = [
            0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06,
            0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00, 0x04, 0x4f,
            0xbf, 0xbb, 0xbb, 0x61, 0xe0, 0xf8, 0xf9, 0xb1, 0xa6, 0x0a, 0x59, 0xac, 0x87, 0x04,
            0xe2, 0xec, 0x05, 0x0b, 0x42, 0x3e, 0x3c, 0xf7, 0x2e, 0x92, 0x3f, 0x2c, 0x4f, 0x79,
            0x4b, 0x45, 0x5c, 0x2a, 0x69, 0xd2, 0x33, 0x45, 0x6c, 0x36, 0xc4, 0x11, 0x9d, 0x07,
            0x06, 0xe0, 0x0e, 0xed, 0xc8, 0xd1, 0x93, 0x90, 0xd7, 0x99, 0x1b, 0x7b, 0x2d, 0x07,
            0xa3, 0x04, 0xea, 0xa0, 0x4a, 0xa6, 0xc0,
        ];
        let result = read_spki_algorithm_parameters(&spki);
        assert!(result.is_ok());
        let parameters = result.unwrap();
        const ENCODED_OID_BYTES_SECP256R1: &[u8] =
            &[0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];
        assert_eq!(&parameters, ENCODED_OID_BYTES_SECP256R1);
    }

    #[test]
    fn test_read_private_key_info_rsa() {
        let private_key_info_rsa = include_bytes!("../test/private-key-info-rsa.bin");
        let result = read_private_key_info(private_key_info_rsa);
        assert!(result.is_ok());
        let private_key = result.unwrap();
        assert!(matches!(private_key, PrivateKeyInfo::RSA(_)));
        let PrivateKeyInfo::RSA(private_key_rsa) = private_key else {
            unreachable!()
        };
        let expected_modulus = [
            0xba, 0x88, 0x51, 0xa8, 0x44, 0x8e, 0x16, 0xd6, 0x41, 0xfd, 0x6e, 0xb6, 0x88, 0x06,
            0x36, 0x10, 0x3d, 0x3c, 0x13, 0xd9, 0xea, 0xe4, 0x35, 0x4a, 0xb4, 0xec, 0xf5, 0x68,
            0x57, 0x6c, 0x24, 0x7b, 0xc1, 0xc7, 0x25, 0xa8, 0xe0, 0xd8, 0x1f, 0xbd, 0xb1, 0x9c,
            0x06, 0x9b, 0x6e, 0x1a, 0x86, 0xf2, 0x6b, 0xe2, 0xaf, 0x5a, 0x75, 0x6b, 0x6a, 0x64,
            0x71, 0x08, 0x7a, 0xa5, 0x5a, 0xa7, 0x45, 0x87, 0xf7, 0x1c, 0xd5, 0x24, 0x9c, 0x02,
            0x7e, 0xcd, 0x43, 0xfc, 0x1e, 0x69, 0xd0, 0x38, 0x20, 0x29, 0x93, 0xab, 0x20, 0xc3,
            0x49, 0xe4, 0xdb, 0xb9, 0x4c, 0xc2, 0x6b, 0x6c, 0x0e, 0xed, 0x15, 0x82, 0x0f, 0xf1,
            0x7e, 0xad, 0x69, 0x1a, 0xb1, 0xd3, 0x02, 0x3a, 0x8b, 0x2a, 0x41, 0xee, 0xa7, 0x70,
            0xe0, 0x0f, 0x0d, 0x8d, 0xfd, 0x66, 0x0b, 0x2b, 0xb0, 0x24, 0x92, 0xa4, 0x7d, 0xb9,
            0x88, 0x61, 0x79, 0x90, 0xb1, 0x57, 0x90, 0x3d, 0xd2, 0x3b, 0xc5, 0xe0, 0xb8, 0x48,
            0x1f, 0xa8, 0x37, 0xd3, 0x88, 0x43, 0xef, 0x27, 0x16, 0xd8, 0x55, 0xb7, 0x66, 0x5a,
            0xaa, 0x7e, 0x02, 0x90, 0x2f, 0x3a, 0x7b, 0x10, 0x80, 0x06, 0x24, 0xcc, 0x1c, 0x6c,
            0x97, 0xad, 0x96, 0x61, 0x5b, 0xb7, 0xe2, 0x96, 0x12, 0xc0, 0x75, 0x31, 0xa3, 0x0c,
            0x91, 0xdd, 0xb4, 0xca, 0xf7, 0xfc, 0xad, 0x1d, 0x25, 0xd3, 0x09, 0xef, 0xb9, 0x17,
            0x0e, 0xa7, 0x68, 0xe1, 0xb3, 0x7b, 0x2f, 0x22, 0x6f, 0x69, 0xe3, 0xb4, 0x8a, 0x95,
            0x61, 0x1d, 0xee, 0x26, 0xd6, 0x25, 0x9d, 0xab, 0x91, 0x08, 0x4e, 0x36, 0xcb, 0x1c,
            0x24, 0x04, 0x2c, 0xbf, 0x16, 0x8b, 0x2f, 0xe5, 0xf1, 0x8f, 0x99, 0x17, 0x31, 0xb8,
            0xb3, 0xfe, 0x49, 0x23, 0xfa, 0x72, 0x51, 0xc4, 0x31, 0xd5, 0x03, 0xac, 0xda, 0x18,
            0x0a, 0x35, 0xed, 0x8d,
        ];
        assert_eq!(private_key_rsa.modulus, expected_modulus);
        let expected_private_exponent = [
            0x9e, 0xcb, 0xce, 0x38, 0x61, 0xa4, 0x54, 0xec, 0xb1, 0xe0, 0xfe, 0x8f, 0x85, 0xdd,
            0x43, 0xc9, 0x2f, 0x58, 0x25, 0xce, 0x2e, 0x99, 0x78, 0x84, 0xd0, 0xe1, 0xa9, 0x49,
            0xda, 0xa2, 0xc5, 0xac, 0x55, 0x9b, 0x24, 0x04, 0x50, 0xe5, 0xac, 0x9f, 0xe0, 0xc3,
            0xe3, 0x1c, 0x0e, 0xef, 0xa6, 0x52, 0x5a, 0x65, 0xf0, 0xc2, 0x21, 0x94, 0x00, 0x4e,
            0xe1, 0xab, 0x46, 0x3d, 0xde, 0x9e, 0xe8, 0x22, 0x87, 0xcc, 0x93, 0xe7, 0x46, 0xa9,
            0x19, 0x29, 0xc5, 0xe6, 0xac, 0x3d, 0x88, 0x75, 0x3f, 0x6c, 0x25, 0xba, 0x59, 0x79,
            0xe7, 0x3e, 0x5d, 0x8f, 0xb2, 0x39, 0x11, 0x1a, 0x3c, 0xda, 0xb8, 0xa4, 0xb0, 0xcd,
            0xf5, 0xf9, 0xca, 0xb0, 0x5f, 0x12, 0x33, 0xa3, 0x83, 0x35, 0xc6, 0x4b, 0x55, 0x60,
            0x52, 0x5e, 0x7e, 0x3b, 0x92, 0xad, 0x7c, 0x75, 0x04, 0xcf, 0x1d, 0xc7, 0xcb, 0x00,
            0x57, 0x88, 0xaf, 0xcb, 0xe1, 0xe8, 0xf9, 0x5d, 0xf7, 0x40, 0x2a, 0x15, 0x15, 0x30,
            0xd5, 0x80, 0x83, 0x46, 0x86, 0x4e, 0xb3, 0x70, 0xaa, 0x79, 0x95, 0x6a, 0x58, 0x78,
            0x62, 0xcb, 0x53, 0x37, 0x91, 0x30, 0x7f, 0x70, 0xd9, 0x1c, 0x96, 0xd2, 0x2d, 0x00,
            0x1a, 0x69, 0x00, 0x9b, 0x92, 0x3c, 0x68, 0x33, 0x88, 0xc9, 0xf3, 0x6c, 0xb9, 0xb5,
            0xeb, 0xe6, 0x43, 0x02, 0x04, 0x1c, 0x78, 0xd9, 0x08, 0x20, 0x6b, 0x87, 0x00, 0x9c,
            0xb8, 0xca, 0xba, 0xca, 0xd3, 0xdb, 0xdb, 0x27, 0x92, 0xfb, 0x91, 0x1b, 0x2c, 0xf4,
            0xdb, 0x66, 0x03, 0x58, 0x5b, 0xe9, 0xae, 0x0c, 0xa3, 0xb8, 0xe6, 0x41, 0x7a, 0xa0,
            0x4b, 0x06, 0xe4, 0x70, 0xea, 0x1a, 0x3b, 0x58, 0x1c, 0xa0, 0x3a, 0x67, 0x81, 0xc9,
            0x31, 0x5b, 0x62, 0xb3, 0x0e, 0x60, 0x11, 0xf2, 0x24, 0x72, 0x59, 0x46, 0xee, 0xc5,
            0x7c, 0x6d, 0x94, 0x41,
        ];
        assert_eq!(private_key_rsa.private_exponent, expected_private_exponent);
    }

    #[test]
    fn test_read_private_key_info_ecdsa() {
        let private_key_info_ecdsa = include_bytes!("../test/private-key-info-ecdsa.bin");
        let result = read_private_key_info(private_key_info_ecdsa);
        assert!(result.is_ok());
        let private_key = result.unwrap();
        assert!(matches!(private_key, PrivateKeyInfo::EC(_)));
        let PrivateKeyInfo::EC(private_key_ec) = private_key else {
            unreachable!()
        };
        let expected_private_key = [
            0x21, 0x91, 0x40, 0x3d, 0x57, 0x10, 0xbf, 0x15, 0xa2, 0x65, 0x81, 0x8c, 0xd4, 0x2e,
            0xd6, 0xfe, 0xdf, 0x09, 0xad, 0xd9, 0x2d, 0x78, 0xb1, 0x8e, 0x7a, 0x1e, 0x9f, 0xeb,
            0x95, 0x52, 0x47, 0x02,
        ];
        assert_eq!(private_key_ec.private_key, expected_private_key);
    }
}
