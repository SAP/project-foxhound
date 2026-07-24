#!/usr/bin/env python
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Helper library for creating a 2-QWACs TLS certificate binding given the details
of a signing certificate and a certificate to bind. See ETSI TS 119 411-5
V2.1.1 Annex B.

When run with an output file-like object and a path to a file containing
a specification, creates a TLS certificate binding from the given information
and writes it to the output object. The specification is as follows:

signingCertificate:
<certificate specification>
:end
certificateToBind:
<certificate specification>
:end

Where:
  <> indicates a required component of a field
  ":end" indicates the end of a multi-line specification

Currently only the algorithms RS256 (RSA PKCS#1v1.5 with SHA-256) and S256
(SHA-256) are supported.
"""

import base64
import hashlib
import json
from io import StringIO

import pycert
import pykey


def urlsafebase64(b):
    """Helper function that takes a bytes-like object and returns the
    urlsafebase64-encoded bytes without any trailing '='."""
    return base64.urlsafe_b64encode(b).decode().replace("=", "").encode("utf-8")


class Header:
    """Class representing a 2-QWACs TLS certificate binding header."""

    def __init__(self, signingCertificate, certificateToBind):
        self.signingCertificate = signingCertificate
        self.certificateToBind = certificateToBind

    def __str__(self):
        signingCertificateBase64 = base64.standard_b64encode(
            self.signingCertificate.toDER()
        ).decode()
        certificateToBindDER = self.certificateToBind.toDER()
        certificateToBindBase64Urlsafe = urlsafebase64(certificateToBindDER)
        certificateToBindHash = urlsafebase64(
            hashlib.sha256(certificateToBindBase64Urlsafe).digest()
        ).decode()
        header = {
            "alg": "RS256",
            "cty": "TLS-Certificate-Binding-v1",
            "x5c": [signingCertificateBase64],
            "sigD": {
                "mId": "http://uri.etsi.org/19182/ObjectIdByURIHash",
                "pars": [""],
                "hashM": "S256",
                "hashV": [certificateToBindHash],
            },
        }
        return json.dumps(header)


class TLSBinding:
    """Class representing a 2-QWACs TLS certificate binding."""

    def __init__(self, signingCertificate, certificateToBind):
        self.signingCertificate = signingCertificate
        self.certificateToBind = certificateToBind

    @staticmethod
    def fromSpecification(specStream):
        """Constructs a TLS certificate binding from a specification."""
        signingCertificateSpecification = StringIO()
        readingSigningCertificateSpecification = False
        certificateToBindSpecification = StringIO()
        readingCertificateToBindSpecification = False
        for line in specStream.readlines():
            lineStripped = line.strip()
            if readingSigningCertificateSpecification:
                if lineStripped == ":end":
                    readingSigningCertificateSpecification = False
                else:
                    print(lineStripped, file=signingCertificateSpecification)
            elif readingCertificateToBindSpecification:
                if lineStripped == ":end":
                    readingCertificateToBindSpecification = False
                else:
                    print(lineStripped, file=certificateToBindSpecification)
            elif lineStripped == "certificateToBind:":
                readingCertificateToBindSpecification = True
            elif lineStripped == "signingCertificate:":
                readingSigningCertificateSpecification = True
            else:
                raise pycert.UnknownParameterTypeError(lineStripped)
        signingCertificateSpecification.seek(0)
        signingCertificate = pycert.Certificate(signingCertificateSpecification)
        certificateToBindSpecification.seek(0)
        certificateToBind = pycert.Certificate(certificateToBindSpecification)
        return TLSBinding(signingCertificate, certificateToBind)

    def signAndEncode(self):
        """Returns a signed and encoded representation of the TLS certificate
        binding as bytes."""
        header = urlsafebase64(
            str(Header(self.signingCertificate, self.certificateToBind)).encode("utf-8")
        )
        signature = self.signingCertificate.subjectKey.sign(
            header + b".", pykey.HASH_SHA256
        )
        # signature will be of the form "'AABBCC...'H"
        return (
            header.decode()
            + ".."
            + urlsafebase64(bytes.fromhex(signature[1:-2])).decode()
        )


# The build harness will call this function with an output
# file-like object and a path to a file containing an SCT
# specification. This will read the specification and output
# the SCT as bytes.
def main(output, inputPath):
    with open(inputPath) as configStream:
        output.write(TLSBinding.fromSpecification(configStream).signAndEncode())
