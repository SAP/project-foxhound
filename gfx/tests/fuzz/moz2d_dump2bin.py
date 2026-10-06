#!/usr/bin/env python
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
from argparse import ArgumentParser
from pathlib import Path
from re import match
from tempfile import mkstemp


def main():
    aparse = ArgumentParser()
    aparse.add_argument(
        "stdout",
        type=Path,
        help="stdout file from Firefox run with MOZ2D_CAPTURE=1",
    )
    args = aparse.parse_args()

    with args.stdout.open() as dump:
        for line in dump:
            result = match(r"^<dump>([0-9A-Fa-f]+)</dump>\s*$", line)
            if result is not None:
                data = bytes.fromhex(result.group(1))
                fd, fn = mkstemp(prefix="moz2d-", suffix=".bin", dir=".")
                os.write(fd, data)
                os.close(fd)
                print(f"wrote {fn}")


if __name__ == "__main__":
    main()
