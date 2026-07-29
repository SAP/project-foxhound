# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import subprocess as sp
import tempfile
import unittest
from contextlib import contextmanager

FOLDER = "src/test/resources/changelog-check-test"

MISSING_VERSION_CODE = 11
OUT_OF_DATE_CODE = 10
OK_CODE = 0

ERROR_CODE_MAP = {
    MISSING_VERSION_CODE: "missing_api_version",
    OUT_OF_DATE_CODE: "wrong_api_version",
}


@contextmanager
def temp_file_path(suffix=""):
    fd, path = tempfile.mkstemp(suffix=suffix, text=True)
    os.close(fd)
    try:
        yield path
    finally:
        os.unlink(path)


class ChangelogCheckTest(unittest.TestCase):
    def t(self, changelog, api, expected):
        test = [
            "python3",
            "src/main/resources/changelog-check.py",
            "--changelog-file",
            f"{FOLDER}/{changelog}",
            "--api-file",
            f"{FOLDER}/{api}",
        ]
        with open(os.devnull, "w") as devnull:
            code = sp.call(test, stdout=devnull)
        self.assertEqual(code, expected)

        with temp_file_path(suffix=".json") as json_filename:
            test.extend(["--result-json", json_filename])
            with open(os.devnull, "w") as devnull:
                sp.call(test, stdout=devnull)

            with open(json_filename, encoding="UTF-8") as json_file:
                result = json.load(json_file)

            if expected == OK_CODE:
                self.assertEqual(len(result["failures"]), 0)
            else:
                self.assertEqual(len(result["failures"]), 1)
                self.assertEqual(
                    result["failures"][0]["rule"], ERROR_CODE_MAP[expected]
                )
                self.assertEqual(result["failures"][0]["error"], True)

    def test_changelogWithRightVersionNoError(self):
        self.t("changelog-with-right-version.md", "api-changelog.txt", OK_CODE)

    def test_changelogMissingVersionError(self):
        self.t(
            "changelog-without-version.md", "api-changelog.txt", MISSING_VERSION_CODE
        )

    def test_changelogWrongVersionError(self):
        self.t("changelog-with-wrong-version.md", "api-changelog.txt", OUT_OF_DATE_CODE)


if __name__ == "__main__":
    unittest.main()
