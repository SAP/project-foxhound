# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import json
import os
import subprocess as sp
import sys

TEST_DIR = "src/test/resources/apilint_test/"

ERROR_CODES = {
    "SUCCESS": 0,
    "API_CHANGE": 10,
    "API_WARNING": 0,
    "API_ERROR": 77,
    "INCOMPATIBLE": 131,
}

parser = argparse.ArgumentParser(description="Tests for apilint.py.")
parser.add_argument("--build-dir", help="Build directory location")
args = parser.parse_args()

with open(TEST_DIR + "tests.json") as f:
    tests = json.load(f)

for t in tests:
    print("Running {}, expected {}:".format(t["test"], t["expected"]))
    test_base = TEST_DIR + t["test"]
    check_compat = "check_compat" not in t or t["check_compat"]

    if check_compat:
        before_api = test_base + ".before.txt"
        after_api = test_base + ".after.txt"
    else:
        after_api = test_base + ".txt"

    if check_compat:
        sp.call([
            "python3",
            "src/main/resources/diff.py",
            "--existing",
            before_api,
            "--local",
            after_api,
        ])

    json_file = "{}/{}-result.json".format(args.build_dir, t["test"])
    test = [
        "python3",
        "src/main/resources/apilint.py",
        "--result-json",
        json_file,
        after_api,
    ]

    if check_compat:
        test += [before_api]

    test += ["--filter-errors", t["filter"] if "filter" in t else "NONE"]

    if "allowed_packages" in t:
        test += ["--allowed-packages"] + t["allowed_packages"]

    if "deprecation-annotation" in t:
        test += ["--deprecation-annotation", t["deprecation-annotation"]]

    if "library-version" in t:
        test += ["--library-version", str(t["library-version"])]

    api_map_file = after_api + ".map"
    if os.path.isfile(api_map_file):
        test += ["--api-map", after_api + ".map"]

    if check_compat:
        test += ["--show-noticed"]

    print("Command: {}".format(" ".join(test)))
    print("")

    error_code = sp.call(test)

    with open(json_file) as f:
        json_result = json.load(f)

    print(json.dumps(json_result, indent=2))

    expected_error_code = ERROR_CODES[t["expected"]]
    if error_code != expected_error_code:
        print(
            f"The following test is expected to fail with {expected_error_code} "
            f"but the error code is {error_code} "
        )
        print(" ".join(test))
        sys.exit(1)

    if t["expected"] != "API_ERROR" and t["expected"] != "API_WARNING":
        assert len(json_result["failures"]) == 0

    if t["expected"] == "INCOMPATIBLE":
        assert len(json_result["compat_failures"]) == 1
    else:
        assert len(json_result["compat_failures"]) == 0

    if t["expected"] == "API_CHANGE":
        assert (
            len(json_result["api_changes"]) > 0 or len(json_result["api_removed"]) > 0
        )

    if "file" in t:
        assert json_result["failures"][0]["file"] == t["file"]
    if "line" in t:
        assert json_result["failures"][0]["line"] == t["line"]
    if "column" in t:
        assert json_result["failures"][0]["column"] == t["column"]

    if t["expected"] == "API_ERROR":
        assert len(json_result["failures"]) > 0
        assert json_result["failure"]
        assert json_result["failures"][0]["rule"] == t["rule"]
        assert json_result["failures"][0]["error"]

    if t["expected"] == "API_WARNING":
        assert len(json_result["failures"]) > 0
        assert not json_result["failure"]
        assert json_result["failures"][0]["rule"] == t["rule"]
        assert not json_result["failures"][0]["error"]

    if t["expected"] == "SUCCESS":
        assert len(json_result["api_changes"]) == 0
        assert not json_result["failure"]
