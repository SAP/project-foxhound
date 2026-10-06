#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Re-assemble en_US-mozilla.dic after make-hunspell-dict, merging in the
suggestion exclusions (lines ending in '!') carried over from the previous
Mozilla dictionary.

make-hunspell-dict produces a UTF-8 .dic with a count line at the top
followed by sorted entries. This script:

  1. Reads the entries (stripping the count line) from the new dictionary.
  2. Reads the suggestion-exclusion entries (still in their munched form)
     from the file produced by make-new-dict.sh, decoded as ISO-8859-1
     because the upstream pipeline keeps that file in ISO-8859-1.
  3. Concatenates and re-sorts both lists.
  4. Writes the result back as UTF-8 with the updated count line.
"""

import argparse
import pathlib
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "dic_file",
        type=pathlib.Path,
        help="dictionary file (modified in place)",
    )
    parser.add_argument(
        "nosug_file",
        type=pathlib.Path,
        help="munched suggestion-exclusion list (ISO-8859-1)",
    )
    args = parser.parse_args(argv)

    new_entries = args.dic_file.read_text(encoding="utf-8").splitlines()[1:]
    nosug_entries = args.nosug_file.read_text(encoding="iso-8859-1").splitlines()
    combined = sorted(new_entries + nosug_entries)
    body = "\n".join(combined)
    args.dic_file.write_text(f"{len(combined)}\n{body}\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
