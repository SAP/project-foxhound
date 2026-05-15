#!/usr/bin/env python

import pathlib
import subprocess
import sys

import buildconfig

from protoc_wrapper import protoc_binary

TOPSRCDIR = pathlib.Path(buildconfig.topsrcdir)


def run_protoc(*protos, cpp_out=".", includes=[]):
    subprocess.run(
        [
            protoc_binary(sys.argv[1] if len(sys.argv) > 1 else None),
            *[f"-I{TOPSRCDIR / include}" for include in includes],
            *["--cpp_out", TOPSRCDIR / cpp_out],
            *protos,
        ],
        check=True,
    )


if __name__ == "__main__":
    run_protoc(
        "CoreDump.proto",
        cpp_out="devtools/shared/heapsnapshot",
        includes=["devtools/shared/heapsnapshot"],
    )
    run_protoc(
        "csd.proto",
        cpp_out="toolkit/components/reputationservice/chromium/chrome/common/safe_browsing",
        includes=["toolkit/components/reputationservice/chromium/chrome/common/safe_browsing"],
    )
    run_protoc(
        "safebrowsing.proto",
        cpp_out="toolkit/components/url-classifier/chromium/",
        includes=["toolkit/components/url-classifier/chromium/"],
    )
    run_protoc(
        "safebrowsing_v5.proto",
        cpp_out="toolkit/components/url-classifier/chromium/",
        includes=["toolkit/components/url-classifier/chromium/"],
    )
    run_protoc(
        "analysis.proto",
        cpp_out="toolkit/components/contentanalysis/content_analysis/sdk/",
        includes=["third_party/content_analysis_sdk/proto/content_analysis/sdk"],
    )
