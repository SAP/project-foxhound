# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import os
import re
from pathlib import Path


def extract_dll_methods(file: str, list_dll, list_rejects, windows_methods):
    accepted = {}
    rejected = {}
    with open(file, "rb") as f:
        data = f.read()
    pattern = re.compile(rb"[a-zA-Z]\w{2,}")
    for name in pattern.findall(data):
        str_name = name.decode("ascii")
        if str_name in windows_methods:
            accepted[str_name] = windows_methods[str_name]
        else:
            rejected[str_name] = 1
    if list_rejects:
        for name in sorted(rejected.keys()):
            print(f"{name}")
    elif list_dll:
        for name in sorted(accepted.keys()):
            print(f"{name} ({accepted[name]})")
    else:
        for name in sorted(accepted.keys()):
            print(f"{name}")


def extract_crate_methods(crate: str):
    methods = {}
    pattern = re.compile('link!\\("([\\w\\.-]+)".+?\\s+fn\\s+(\\w+)\\(')
    for dirpath, dirnames, filenames in os.walk(crate):
        for filename in filenames:
            with open(os.path.join(dirpath, filename)) as f:
                data = f.read()
            for method in pattern.findall(data):
                methods[method[1]] = method[0]
    return methods


def main():
    examples = """examples:
  python dom/media/tools/extractSystemCalls.py /path/to/widevinecdm.dll"""

    parser = argparse.ArgumentParser(
        description="Extract Windows system call usage from Windows DLL",
        epilog=examples,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "plugin",
        help="path to plugin",
    )
    parser.add_argument(
        "--list-rejects", action="store_true", help="output unknown strings instead"
    )
    parser.add_argument(
        "--list-dll", action="store_true", help="include the system dll name"
    )
    parser.add_argument(
        "--windows-sys-crate", help="alternate path to the rust windows-sys crate"
    )
    args = parser.parse_args()

    # Pull out a list of win32 APIs from one of our Rust crates that we can
    # cross reference against to filter out the unrelated strings.
    if args.windows_sys_crate is not None:
        crate_path = args.windows_sys_crate
    else:
        crate_path = (
            Path(__file__).parents[3].joinpath("third_party", "rust", "windows-sys")
        )
    windows_methods = extract_crate_methods(crate_path)

    # RtlGenRandom maps to SystemFunction036
    # https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-rtlgenrandom
    windows_methods["SystemFunction036"] = "advapi32.dll"

    extract_dll_methods(args.plugin, args.list_dll, args.list_rejects, windows_methods)


if __name__ == "__main__":
    main()
