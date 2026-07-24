# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import subprocess as sp
import tempfile
import unittest

FOLDER = "src/test/resources/changelog-check-test"

MISSING_VERSION_CODE = 11
OUT_OF_DATE_CODE = 10
OK_CODE = 0

ERROR_CODE_MAP = {
    MISSING_VERSION_CODE: "missing_api_version",
    OUT_OF_DATE_CODE: "wrong_api_version",
}


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

        json_file = tempfile.NamedTemporaryFile(mode="w+", encoding="UTF-8")
        test.extend(["--result-json", json_file.name])
        with open(os.devnull, "w") as devnull:
            sp.call(test, stdout=devnull)

        json_file.seek(0)
        result = json.load(json_file)

        if expected == OK_CODE:
            self.assertEqual(len(result["failures"]), 0)
        else:
            self.assertEqual(len(result["failures"]), 1)
            self.assertEqual(result["failures"][0]["rule"], ERROR_CODE_MAP[expected])
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
