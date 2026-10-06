#!/usr/bin/env python

import pathlib
import re
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


def update_gradle_protobuf_version(revision):
    # Map upstream's C++ release tag (e.g. "v34.1") to the Java/Maven release
    # prefix (e.g. "4.34.1") used by gradle/libs.versions.toml.
    java_version = "4." + revision.removeprefix("v").removeprefix("V")
    versions_toml = TOPSRCDIR / "gradle" / "libs.versions.toml"
    content = versions_toml.read_text()
    new_content = re.sub(
        r'^(protobuf\s*=\s*")[^"]*(")',
        rf"\g<1>{java_version}\g<2>",
        content,
        count=1,
        flags=re.MULTILINE,
    )
    if new_content != content:
        versions_toml.write_text(new_content)


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
    run_protoc(
        "opentelemetry/proto/common/v1/common.proto",
        "opentelemetry/proto/resource/v1/resource.proto",
        "opentelemetry/proto/trace/v1/trace.proto",
        "opentelemetry/proto/collector/trace/v1/trace_service.proto",
        cpp_out="third_party/opentelemetry-cpp/third_party/opentelemetry-proto",
        includes=["third_party/opentelemetry-cpp/third_party/opentelemetry-proto"],
    )

    if len(sys.argv) > 1:
        update_gradle_protobuf_version(sys.argv[1])
