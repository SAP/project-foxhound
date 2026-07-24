#!/usr/bin/env python

import os
import sys
import platform
import subprocess
from pathlib import Path

import buildconfig
from mach.util import get_state_dir
from mozbuild.util import memoize
from mozbuild.vendor.moz_yaml import load_moz_yaml


TOPSRCDIR = Path(buildconfig.topsrcdir)
COMPONENT_DIR = Path(__file__).parent.parent


def protoc_binary(revision: None | str = None) -> Path:
    if not revision:
        revision = _get_protobuf_revision_from_moz_yaml()

    if not _get_protoc_dir(revision).exists():
        _download_protoc_binary(revision)

    return (
        _get_protoc_dir(revision)
        / "bin"
        / (f"protoc{'.exe' if platform.system() == 'Windows' else ''}")
    )


@memoize
def _get_protobuf_revision_from_moz_yaml():
    return load_moz_yaml(COMPONENT_DIR / "moz.yaml", verify=False, require_license_file=False)[
        "origin"
    ]["revision"]


def _get_protoc_dir(revision):
    return Path(get_state_dir()) / "protobuf" / f"protoc-{revision}"


def _download_protoc_binary(revision):
    import requests

    from tempfile import TemporaryFile
    from zipfile import ZipFile, ZipInfo

    with TemporaryFile() as temp:
        with requests.get(
            "https://github.com/protocolbuffers/protobuf/releases/download/"
            f"{revision}/protoc-{revision[1:]}-{_get_protoc_platform_ident()}.zip",
            stream=True,
        ) as r:
            r.raise_for_status()
            for chunk in r.iter_content(chunk_size=8192):
                temp.write(chunk)

        class ZipFileWithPermissions(ZipFile):
            """Custom ZipFile class handling file permissions."""

            def _extract_member(self, member, targetpath, pwd):
                if not isinstance(member, ZipInfo):
                    member = self.getinfo(member)

                targetpath = ZipFile._extract_member(self, member, targetpath, pwd)

                attr = member.external_attr >> 16
                if attr != 0:
                    os.chmod(targetpath, attr)
                return targetpath

        with ZipFileWithPermissions(temp) as protoc_bin_release:
            protoc_bin_release.extractall(_get_protoc_dir(revision))


def _get_protoc_platform_ident():
    system = platform.system()
    machine = platform.machine()
    if system == "Darwin":
        return "osx-universal_binary"
    elif system == "Linux":
        if machine == "x86_64":
            return "linux-x86_64"
        elif machine == "i686":
            return "linux-x86_32"
    elif system == "Windows":
        if machine == "AMD64":
            return "win64"
        elif machine == "i686":
            return "win32"
    raise Exception("Unsupported system")


if __name__ == "__main__":
    args = sys.argv[1:]

    # The protoc compiler has support to generate rust files but it's currently
    # highly experimental.
    #
    # This is a workaround for now
    if "--rust_out" in args:
        env = os.environ.copy()
        env["PROTOC"] = protoc_binary()
        env["TOPSRCDIR"] = buildconfig.topsrcdir
        subprocess.run(
            [
                "cargo",
                "run",
                "--locked",
                "--quiet",
                "--",
                *args,
            ],
            cwd=Path(__file__).parent,
            env=env,
            check=True,
        )
    else:
        subprocess.run([protoc_binary(), *args], check=True)
