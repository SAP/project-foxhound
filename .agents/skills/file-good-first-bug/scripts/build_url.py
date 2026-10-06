#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

"""Build a prefilled Bugzilla enter_bug.cgi URL for a good-first-bug.

There is no MCP tool to create Bugzilla bugs: the user submits each bug by
clicking the generated URL.
"""

import argparse
import sys
from urllib.parse import urlencode


def build_url(
    title,
    comment,
    *,
    product="Developer Infrastructure",
    component="Lint and Formatting",
    tracker=None,
    keywords="good-first-bug",
    lang=None,
):
    params = {
        "product": product,
        "component": component,
        "short_desc": title,
        "comment": comment,
        "keywords": keywords,
        "bug_type": "task",
        "version": "unspecified",
        "rep_platform": "All",
        "op_sys": "All",
    }
    if tracker:
        params["blocked"] = tracker
    if lang:
        params["status_whiteboard"] = f"[lang={lang}]"
    return "https://bugzilla.mozilla.org/enter_bug.cgi?" + urlencode(params)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("title")
    parser.add_argument("comment")
    parser.add_argument("--product", default="Developer Infrastructure")
    parser.add_argument("--component", default="Lint and Formatting")
    parser.add_argument("--tracker")
    parser.add_argument("--keywords", default="good-first-bug")
    parser.add_argument("--lang")
    args = parser.parse_args(argv)
    print(
        build_url(
            args.title,
            args.comment,
            product=args.product,
            component=args.component,
            tracker=args.tracker,
            keywords=args.keywords,
            lang=args.lang,
        )
    )


if __name__ == "__main__":
    sys.exit(main())
