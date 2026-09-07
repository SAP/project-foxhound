#!/usr/bin/env python3
"""Generate a PKCS#7 SignedData DER blob for testing digest-array alignment.

Produces a valid PKCS#7 SignedData whose digestAlgorithms SET contains an
unrecognized OID followed by SHA-256.  The message has embedded content,
a self-signed P-256 certificate in `certificates`, and a single signerInfo
with a valid ECDSA-SHA256 signature (no authenticated attributes).

This exercises the full sec_pkcs7_verify_signature code path, including the
index-based digest lookup that was fixed in bug 1998526.

Usage:
    python3 generate_p7_verify_blob.py > blob_hex.txt

The script prints C-style hex bytes (0x30, 0x82, ...) suitable for pasting
into a test source file.  It also prints the raw certificate DER on stderr
so the test can import it separately if needed.

Requirements: pip install cryptography
"""

import sys
import struct
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography import x509
from cryptography.x509.oid import NameOID
import datetime


def der_len(length):
    """Encode an ASN.1 length in DER."""
    if length < 0x80:
        return bytes([length])
    elif length < 0x100:
        return bytes([0x81, length])
    elif length < 0x10000:
        return bytes([0x82, length >> 8, length & 0xFF])
    else:
        raise ValueError("length too large")


def der_tlv(tag, value):
    """Build a DER TLV (tag-length-value)."""
    return bytes([tag]) + der_len(len(value)) + value


def der_seq(contents):
    return der_tlv(0x30, contents)


def der_set(contents):
    return der_tlv(0x31, contents)


def der_oid(oid_bytes):
    return der_tlv(0x06, oid_bytes)


def der_int(val):
    """Encode a non-negative integer in DER."""
    if val == 0:
        return der_tlv(0x02, b'\x00')
    bs = val.to_bytes((val.bit_length() + 7) // 8, 'big')
    if bs[0] & 0x80:
        bs = b'\x00' + bs
    return der_tlv(0x02, bs)


def der_explicit(tag_num, value):
    return bytes([0xA0 | tag_num]) + der_len(len(value)) + value


def der_octet_string(data):
    return der_tlv(0x04, data)


# Well-known OID bytes (just the value, without the 0x06 tag+length)
OID_PKCS7_SIGNED_DATA = bytes([0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x07, 0x02])
OID_PKCS7_DATA = bytes([0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x07, 0x01])
OID_SHA256 = bytes([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])
OID_ECDSA_SHA256 = bytes([0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x04, 0x03, 0x02])
# id-ecPublicKey (1.2.840.10045.2.1) — used as digestEncryptionAlgorithm
# in PKCS#7 signerInfo for EC keys (NSS expects the key OID, not the
# combined signature OID like ecdsa-with-SHA256).
OID_EC_PUBLIC_KEY = bytes([0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01])
# Unrecognized OID: 1.3.6.1 (just "iso.identified-organization.dod.internet")
OID_UNKNOWN = bytes([0x2B, 0x06, 0x01])

# AlgorithmIdentifier for SHA-256 (with explicit NULL parameters)
ALG_SHA256 = der_seq(der_oid(OID_SHA256) + der_tlv(0x05, b''))
# AlgorithmIdentifier for the unknown OID (no parameters)
ALG_UNKNOWN = der_seq(der_oid(OID_UNKNOWN))
# AlgorithmIdentifier for ECDSA-SHA256 (no parameters per RFC 5758)
ALG_ECDSA_SHA256 = der_seq(der_oid(OID_ECDSA_SHA256))
# AlgorithmIdentifier for id-ecPublicKey (for digestEncryptionAlgorithm)
ALG_EC_PUBLIC_KEY = der_seq(der_oid(OID_EC_PUBLIC_KEY))


def build_issuer_and_serial(cert_der):
    """Extract issuer and serial from a DER certificate for signerInfo."""
    cert = x509.load_der_x509_certificate(cert_der)
    issuer_der = cert.issuer.public_bytes()
    serial = cert.serial_number
    return issuer_der, serial


def main():
    # --- Step 1: Generate key and self-signed certificate ---
    private_key = ec.generate_private_key(ec.SECP256R1())

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"PKCS7 Test"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime(2025, 1, 1, tzinfo=datetime.timezone.utc))
        .not_valid_after(datetime.datetime(2035, 1, 1, tzinfo=datetime.timezone.utc))
        .sign(private_key, hashes.SHA256())
    )
    cert_der = cert.public_bytes(serialization.Encoding.DER)

    # --- Step 2: Build the content ---
    content_bytes = b"test"

    # --- Step 3: Compute the SHA-256 digest of the content ---
    digest_obj = hashes.Hash(hashes.SHA256())
    digest_obj.update(content_bytes)
    content_digest = digest_obj.finalize()

    # --- Step 4: Sign the digest (no authenticated attributes) ---
    # Per PKCS#7 / RFC 2315 sect 9.4, without authenticated attributes,
    # the signature is the "encryption" (signing) of the digest.
    # VFY_VerifyDigestDirect expects: ECDSA signature over the raw digest.
    signature = private_key.sign(
        content_digest,
        ec.ECDSA(utils.Prehashed(hashes.SHA256()))
    )

    # --- Step 5: Build signerInfo ---
    issuer_der, serial = build_issuer_and_serial(cert_der)
    issuer_and_serial = der_seq(issuer_der + der_int(serial))

    signer_info = der_seq(
        der_int(1) +                    # version
        issuer_and_serial +              # issuerAndSerialNumber
        ALG_SHA256 +                     # digestAlgorithm
        # no authenticatedAttributes
        ALG_EC_PUBLIC_KEY +              # digestEncryptionAlgorithm (key OID)
        der_tlv(0x04, signature)         # encryptedDigest (OCTET STRING)
        # no unauthenticatedAttributes
    )

    # --- Step 6: Assemble SignedData ---
    # digestAlgorithms: SET { unknown, sha-256 }
    digest_algs = der_set(ALG_UNKNOWN + ALG_SHA256)

    # contentInfo: { contentType: data, content: [0] EXPLICIT OCTET STRING }
    content_info = der_seq(
        der_oid(OID_PKCS7_DATA) +
        der_explicit(0, der_octet_string(content_bytes))
    )

    # certificates: [0] IMPLICIT SET OF Certificate
    certificates = der_explicit(0, cert_der)

    # signerInfos: SET OF SignerInfo
    signer_infos = der_set(signer_info)

    signed_data = der_seq(
        der_int(1) +       # version
        digest_algs +      # digestAlgorithms
        content_info +     # contentInfo
        certificates +     # [0] certificates
        # no crls
        signer_infos       # signerInfos
    )

    # --- Step 7: Wrap in ContentInfo ---
    pkcs7 = der_seq(
        der_oid(OID_PKCS7_SIGNED_DATA) +
        der_explicit(0, signed_data)
    )

    # --- Output ---
    # Print C hex array to stdout
    hex_bytes = ', '.join(f'0x{b:02X}' for b in pkcs7)
    # Wrap at 12 bytes per line
    items = [f'0x{b:02X}' for b in pkcs7]
    lines = []
    for i in range(0, len(items), 12):
        lines.append('    ' + ', '.join(items[i:i+12]) + ',')
    print(f"// Total length: {len(pkcs7)} bytes")
    print(f"static const uint8_t p7_signed_mixed_algs[] = {{")
    for line in lines:
        print(line)
    print(f"}};")
    print(f"// Total length: {len(pkcs7)} bytes", file=sys.stderr)

    # Print cert DER as C hex array to stderr
    cert_items = [f'0x{b:02X}' for b in cert_der]
    cert_lines = []
    for i in range(0, len(cert_items), 12):
        cert_lines.append('    ' + ', '.join(cert_items[i:i+12]) + ',')
    print(f"\n// Certificate DER ({len(cert_der)} bytes):", file=sys.stderr)
    print(f"static const uint8_t p7_test_cert_der[] = {{", file=sys.stderr)
    for line in cert_lines:
        print(line, file=sys.stderr)
    print(f"}};", file=sys.stderr)


if __name__ == '__main__':
    main()
