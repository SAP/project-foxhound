#!/usr/bin/env python
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

import random
import string

ECH_CONFIGS = "AEX+DQBBcQAgACDh4IuiuhhInUcKZx5uYcehlG9PQ1ZlzhvVZyjJl7dscQAEAAEAAQASY2xvdWRmbGFyZS1lY2guY29tAAA="

VERSIONS = ["ssl3", "tls1.0", "tls1.1", "tls1.2", "tls1.3"]

NAMED_GROUPS = [
    "P256", "P384", "P521", "x25519",
    "FF2048", "FF3072", "FF4096", "FF6144", "FF8192",
    "xyber76800", "x25519mlkem768", "secp256r1mlkem768",
    "secp384r1mlkem1024",
]

SIGNATURE_SCHEMES = [
    "rsa_pkcs1_sha1", "rsa_pkcs1_sha256", "rsa_pkcs1_sha384",
    "rsa_pkcs1_sha512", "ecdsa_sha1", "ecdsa_secp256r1_sha256",
    "ecdsa_secp384r1_sha384", "ecdsa_secp521r1_sha512",
    "rsa_pss_rsae_sha256", "rsa_pss_rsae_sha384", "rsa_pss_rsae_sha512",
    "ed25519", "ed448",
    "rsa_pss_pss_sha256", "rsa_pss_pss_sha384", "rsa_pss_pss_sha512",
    "dsa_sha1", "dsa_sha256", "dsa_sha384", "dsa_sha512",
]

# Single-letter cipher codes accepted by tstclnt -c.
CIPHER_LETTERS = "cdeinopqrstuvwxyz"

# Hex cipher codes (TLS cipher suite values) for tstclnt -c.
CIPHER_HEX = [
    "C02B",  # TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
    "C02C",  # TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
    "C02F",  # TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    "C030",  # TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    "CCA8",  # TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
    "CCA9",  # TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256
    "1301",  # TLS_AES_128_GCM_SHA256
    "1302",  # TLS_AES_256_GCM_SHA384
    "1303",  # TLS_CHACHA20_POLY1305_SHA256
]


def main():
    tls13_included = True

    # Restrict TLS version range.
    if random.randint(0, 1):
        min_idx = random.randint(0, len(VERSIONS) - 1)
        max_idx = random.randint(min_idx, len(VERSIONS) - 1)
        tls13_included = max_idx == len(VERSIONS) - 1
        print(f"-V {VERSIONS[min_idx]}:{VERSIONS[max_idx]}")

    # Use Encrypted Client Hello with the given Base64-encoded ECHConfigs
    # or enable ECH GREASEing (mutually exclusive).
    ech_choice = random.randint(0, 2)
    if ech_choice == 1:
        print(f"-N {ECH_CONFIGS}")
    elif ech_choice == 2:
        print(f"-i {random.randint(1, 255)}")

    # Configure a TLS 1.3 External PSK with the given hex string for a key.
    if random.randint(0, 1):
        psk = f"0x{''.join(random.choices(string.hexdigits, k=16))}"
        if random.randint(0, 1):
            label = "".join(
                random.choices(string.ascii_letters, k=random.randint(4, 16))
            )
            psk += f":{label}"
        print(f"-z {psk}")

    # Restrict ciphers.
    if random.randint(0, 1):
        cipher_str = ""
        if random.randint(0, 1):
            letters = random.sample(
                CIPHER_LETTERS, k=random.randint(1, len(CIPHER_LETTERS))
            )
            cipher_str += "".join(letters)
        if random.randint(0, 1):
            hexcodes = random.sample(
                CIPHER_HEX, k=random.randint(1, len(CIPHER_HEX))
            )
            cipher_str += "".join(f":{c}" for c in hexcodes)
        if cipher_str:
            print(f"-c {cipher_str}")

    # Comma-separated list of enabled groups for TLS key exchange.
    if random.randint(0, 1):
        groups = random.sample(
            NAMED_GROUPS, k=random.randint(1, len(NAMED_GROUPS))
        )
        print(f"-I {','.join(groups)}")

    # Comma-separated list of signature schemes in preference order.
    if random.randint(0, 1):
        schemes = random.sample(
            SIGNATURE_SCHEMES, k=random.randint(1, len(SIGNATURE_SCHEMES))
        )
        print(f"-J {','.join(schemes)}")

    # Enable the session ticket extension.
    if random.randint(0, 1):
        print("-u")

    # Enable the cert_status extension (OCSP stapling).
    if random.randint(0, 1):
        print("-T")

    # Enable the signed_certificate_timestamp extension.
    if random.randint(0, 1):
        print("-U")

    # Enable the delegated credentials extension.
    if random.randint(0, 1):
        print("-B")

    # Enable the extended master secret extension [RFC7627].
    if random.randint(0, 1):
        print("-G")

    # Enable false start.
    if random.randint(0, 1):
        print("-g")

    # Send TLS_FALLBACK_SCSV.
    if random.randint(0, 1):
        print("-K")

    # Require the use of FFDHE supported groups [RFC7919].
    if random.randint(0, 1):
        print("-H")

    # Allow 0-RTT data (TLS 1.3 only).
    if tls13_included and random.randint(0, 1):
        print("-Z")

    # Enable middlebox compatibility mode (TLS 1.3 only).
    if tls13_included and random.randint(0, 1):
        print("-e")

    # Enable post-handshake authentication (TLS 1.3 only).
    if tls13_included and random.randint(0, 1):
        print("-E")

    # Renegotiate N times.
    if random.randint(0, 1):
        print(f"-r {random.randint(1, 5)}")

    # Use DTLS instead of TLS.
    if random.randint(0, 1):
        print("-P client")

    # Enable alt-server-hello mode.
    if random.randint(0, 1):
        print("-X alt-server-hello")

    if random.randint(0, 1):
        print("--enable-rfc8701-grease")

    if random.randint(0, 1):
        print("--enable-ch-extension-permutation")

    if random.randint(0, 1):
        print("--zlib-certificate-compression")


if __name__ == "__main__":
    main()
