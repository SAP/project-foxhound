#!/usr/bin/env python
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import ast
import base64
import dataclasses
import hashlib
import itertools
import os
import random
import re
import subprocess
import sys
import threading

EXTERNAL_PSK = "0x783666676F55306932745A32303354442B394A3271735A7A30714B464B645943"
ECH_CONFIGS = "AEX+DQBBcQAgACDh4IuiuhhInUcKZx5uYcehlG9PQ1ZlzhvVZyjJl7dscQAEAAEAAQASY2xvdWRmbGFyZS1lY2guY29tAAA="

DEFAULT_TSTCLNT_ARGS = [
    "-o",  # Override bad server cert. Make it OK.
    "-D",  # Run without a cert database
    "-Q",  # Quit after handshake
    "-b",  # Load the default "builtins" root CA module
    "-CCC",  # Include PEM format certificate dumps
]

NS_CERT_HEADER = "-----BEGIN CERTIFICATE-----"
NS_CERT_TRAILER = "-----END CERTIFICATE-----"


@dataclasses.dataclass
class HandshakeData:
    client = b""
    server = b""
    certificates = []


def parse_strace_line(line):
    match = re.search(r"\"(\\x[a-f0-9]{2})+\"", line)
    if match is None:
        return b""

    data = ast.literal_eval("b" + match.group(0))
    return data


def parse_tstclnt_output(output):
    hs_data = HandshakeData()
    certificate = False

    for line in output.splitlines():
        if line.startswith("sendto("):
            hs_data.client += parse_strace_line(line)
            continue

        if line.startswith("recvfrom(") and hs_data.client:
            hs_data.server += parse_strace_line(line)
            continue

        if line == NS_CERT_HEADER:
            certificate = ""
            continue

        if line == NS_CERT_TRAILER:
            hs_data.certificates.append(base64.b64decode(certificate))
            certificate = False
            continue

        # Check if we are currently in a certificate block by abusing
        # ✦.✧̣̇˚. dynamic typing ˚.✦⋆.
        if isinstance(certificate, str):
            certificate += line
            continue

    return hs_data


def get_random_tstclnt_args():
    tstclnt_args = []

    # Use Encrypted Client Hello with the given Base64-encoded ECHConfigs.
    if random.randint(0, 1):
        tstclnt_args += ["-N", ECH_CONFIGS]

    # Configure a TLS 1.3 External PSK with the given hex string for a key.
    if random.randint(0, 1):
        tstclnt_args += ["-z", EXTERNAL_PSK]

    # Enable the session ticket extension.
    if random.randint(0, 1):
        tstclnt_args += ["-u"]

    # Enable the signed_certificate_timestamp extension.
    if random.randint(0, 1):
        tstclnt_args += ["-U"]

    # Enable the delegated credentials extension.
    if random.randint(0, 1):
        tstclnt_args += ["-B"]

    # Enable the extended master secret extension [RFC7627].
    if random.randint(0, 1):
        tstclnt_args += ["-G"]

    # Allow 0-RTT data (TLS 1.3 only).
    if random.randint(0, 1):
        tstclnt_args += ["-Z"]

    # Enable middlebox compatibility mode (TLS 1.3 only).
    if random.randint(0, 1):
        tstclnt_args += ["-e"]

    if random.randint(0, 1):
        tstclnt_args += ["--enable-rfc8701-grease"]

    if random.randint(0, 1):
        tstclnt_args += ["--enable-ch-extension-permutation"]

    if random.randint(0, 1):
        tstclnt_args += ["--zlib-certificate-compression"]

    return tstclnt_args


def brrrrr(hosts, args):
    tstclnt_bin = os.path.join(args.nss_build, "bin/tstclnt")
    ld_libary_path = os.path.join(args.nss_build, "lib")

    for host in hosts:
        tstclnt_args = get_random_tstclnt_args()
        try:
            result = subprocess.run([
                "strace", "-f", "-x", "-s", "65535", "-e", "trace=network",
                tstclnt_bin, "-h", host
            ] + DEFAULT_TSTCLNT_ARGS + tstclnt_args,
                                    env={
                                        "LD_LIBRARY_PATH": ld_libary_path,
                                    },
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE,
                                    timeout=2,
                                    text=True)
        except subprocess.TimeoutExpired:
            print("Getting handshake timed out for:", host, file=sys.stderr)
            continue

        hs_data = parse_tstclnt_output(result.stderr)

        if hs_data.client:
            filename = hashlib.sha1(hs_data.client).hexdigest()
            filepath = os.path.join(args.output, "tls-server-corpus", filename)
            with open(filepath, "wb") as f:
                f.write(hs_data.client)

        if hs_data.server:
            filename = hashlib.sha1(hs_data.server).hexdigest()
            filepath = os.path.join(args.output, "tls-client-corpus", filename)
            with open(filepath, "wb") as f:
                f.write(hs_data.server)

        for certificate in hs_data.certificates:
            filename = hashlib.sha1(certificate).hexdigest()
            filepath = os.path.join(args.output, "quickder-corpus", filename)
            with open(filepath, "wb") as f:
                f.write(certificate)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--nss-build",
                        required=True,
                        type=str,
                        help="e.g. /path/to/dist/Debug")
    parser.add_argument("--hosts", required=True, type=str)
    parser.add_argument("--threads", required=True, type=int)
    parser.add_argument("--output", required=True, type=str)

    args = parser.parse_args()

    with open(args.hosts, "r") as f:
        hosts = f.read().splitlines()

    # For use in automation (e.g. MozillaSecurity/orion), the output
    # corpus directories should follow the following scheme: $name-corpus.
    os.makedirs(os.path.join(args.output, "quickder-corpus"), exist_ok=True)
    os.makedirs(os.path.join(args.output, "tls-server-corpus"), exist_ok=True)
    os.makedirs(os.path.join(args.output, "tls-client-corpus"), exist_ok=True)

    batches = itertools.batched(hosts, len(hosts) // args.threads)
    threads = []

    while batch := next(batches, None):
        thread = threading.Thread(target=brrrrr, args=(
            batch,
            args,
        ))
        thread.daemon = True
        thread.start()

        threads.append(thread)

    for thread in threads:
        thread.join()


if __name__ == "__main__":
    main()
