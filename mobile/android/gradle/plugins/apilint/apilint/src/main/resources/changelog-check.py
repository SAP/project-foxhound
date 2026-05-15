#!/usr/bin/env python3

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import hashlib
import json
import re
import sys

API_VERSION_REGEX = re.compile(r"^\[api-version\]: ([a-f0-9]{40})$")


class MissingApiVersionError(Exception):
    pass


def findApiVersion(changelog):
    lineNumber = 0
    for l in changelog:
        lineNumber += 1
        match = API_VERSION_REGEX.match(l)
        if match:
            return (lineNumber, match.group(1))

    raise MissingApiVersionError


def readResultsJson(jsonFile):
    results = {}
    if args.result_json is None:
        return results

    jsonString = jsonFile.read()
    if len(jsonString) > 0:
        results = json.loads(jsonString)

    if "failures" not in results:
        results["failures"] = []
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Checks that the changelog file has been updated."
    )
    parser.add_argument(
        "--api-file",
        type=argparse.FileType("r", encoding="UTF-8"),
        help="Updated API file.",
    )
    parser.add_argument(
        "--changelog-file",
        type=argparse.FileType("r", encoding="UTF-8"),
        help="Changelog file of the API.",
    )
    parser.add_argument(
        "--result-json",
        type=argparse.FileType("r+", encoding="UTF-8"),
        help="Dump results in this file.",
    )
    args = parser.parse_args()

    sha1 = hashlib.sha1()
    sha1.update(args.api_file.read().encode("UTF-8"))

    currentApiVersion = sha1.hexdigest()
    results = readResultsJson(args.result_json)

    def dumpJsonError(info):
        if args.result_json is None:
            return
        if info is not None:
            results["failures"].append({
                "column": info["column"],
                "file": args.changelog_file.name,
                "line": info["line"],
                "msg": info["message"],
                "rule": info["rule"],
                "error": True,
            })
        args.result_json.seek(0)
        args.result_json.truncate(0)
        json.dump(results, args.result_json)

    try:
        (lineNumber, expectedApiVersion) = findApiVersion(args.changelog_file)
    except MissingApiVersionError:
        dumpJsonError({
            "column": 0,
            "line": 1,
            "message": "The api changelog file does not have a version pin. "
            "Please update the file and add the following line: "
            f"[api-version]: {currentApiVersion}",
            "rule": "missing_api_version",
        })
        print(
            "ERROR: The api changelog file does not have a version pin. Please update"
        )
        print("the file at")
        print("")
        print(args.changelog_file.name)
        print("")
        print("And add the following line:")
        print("")
        print(">>>>")
        print(f"[api-version]: {currentApiVersion}")
        print("<<<<")
        sys.exit(11)

    if currentApiVersion != expectedApiVersion:
        dumpJsonError({
            "column": 14,
            "line": lineNumber,
            "message": "The api changelog file is out of date. Please update the "
            "file and modify the [api-version] line as follows: "
            f"[api-version]: {currentApiVersion}",
            "rule": "wrong_api_version",
        })
        print("ERROR: The api changelog file is out of date. Please update the file at")
        print("")
        print(args.changelog_file.name)
        print("")
        print("and then modify the [api-version] line as following:")
        print("")
        print(">>>>")
        print(f"[api-version]: {currentApiVersion}")
        print("<<<<")
        sys.exit(10)

    # If we got here, everything succeeded
    dumpJsonError(None)
