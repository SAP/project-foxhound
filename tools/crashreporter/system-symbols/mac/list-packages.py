#!/usr/bin/env python

# Copyright 2015 Ted Mielczarek.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import os
import sys

from reposadolib import reposadocommon

reposadocommon.get_main_dir = lambda: "/usr/local/bin/"


def package_id_sort_key(package_id):
    try:
        prefix, suffix = package_id.split("-", 1)
        suffix, _, extra = suffix.partition("::")
        return int(prefix), int(suffix), int(extra or 0)
    except ValueError:
        return -1, -1, -1


products = reposadocommon.get_product_info()
args = []
for product_id, product in products.items():
    try:
        title = product["title"]
    except KeyError:
        print(f"Missing title in {product}, skipping", file=sys.stderr)
        continue

    try:
        major_version = int(product["version"].split(".")[0])
    except Exception:
        print(
            f"Cannot extract the major version number in {product}, skipping",
            file=sys.stderr,
        )
        continue

    if (
        title.startswith("OS X")
        or title.startswith("Mac OS X")
        or title.startswith("macOS")
    ):
        args.append(product_id)
    else:
        print(f"Skipping {title!r} for repo_sync", file=sys.stderr)

args.sort(key=package_id_sort_key, reverse=True)

if "JUST_ONE_PACKAGE" in os.environ:
    args = args[:1]

print("\n".join(args))
