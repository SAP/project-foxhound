#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Convert the SCOWLv2 affix file to the Mozilla-shipped ISO-8859-1 form.

SCOWLv2's affix file is UTF-8, includes ICONV rules pairing the curly
apostrophe (U+2019) with the ASCII apostrophe, and adds U+2019 to
WORDCHARS. Mozilla ships the file as ISO-8859-1, which can't represent
U+2019, so this script:

  1. Strips ICONV rules.
  2. Changes "SET UTF-8" to "SET ISO8859-1".
  3. Drops U+2019 from WORDCHARS.
  4. Rewrites the file in ISO-8859-1.
"""

import argparse
import pathlib
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "aff_file",
        type=pathlib.Path,
        help="affix file to convert in place (read as UTF-8, written as ISO-8859-1)",
    )
    args = parser.parse_args(argv)

    out_lines = []
    for line in args.aff_file.read_text(encoding="utf-8").splitlines():
        if line.startswith("ICONV"):
            continue
        if line == "SET UTF-8":
            out_lines.append("SET ISO8859-1")
        elif line.startswith("WORDCHARS"):
            out_lines.append(line.replace("’", ""))
        else:
            out_lines.append(line)
    args.aff_file.write_text("\n".join(out_lines) + "\n", encoding="iso-8859-1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
