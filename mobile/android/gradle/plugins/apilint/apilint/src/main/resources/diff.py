#!/usr/bin/env python3

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import difflib
import sys
import textwrap

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Prints the diff between the existing API and the local API."
    )
    parser.add_argument(
        "--existing",
        type=argparse.FileType("r", encoding="UTF-8"),
        help="Existing upstream API file.",
    )
    parser.add_argument(
        "--local",
        type=argparse.FileType("r", encoding="UTF-8"),
        help="Updated local API file.",
    )
    parser.add_argument(
        "--command",
        help="Suggested command to print if differences found",
        required=False,
    )
    args = parser.parse_args()

    lines = list(
        difflib.unified_diff(
            args.existing.readlines(),
            args.local.readlines(),
            fromfile="Existing API",
            tofile="Local API",
        )
    )

    sys.stdout.writelines(lines)

    if args.command and lines:
        print(
            textwrap.dedent(
                f"""
                    The API has been modified. If the changes look correct, please run

                    {args.command}

                    to update the API file.
                """
            )
        )

    sys.exit(1 if lines else 0)
