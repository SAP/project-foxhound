#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""Open a prefilled Bugzilla "enter bug" form in the default browser.

Each argument is a ``field=value`` pair naming a Bugzilla ``enter_bug.cgi`` query
field; the values are URL-encoded for you. Any field the form accepts works, so
there is nothing to update here when a bug needs an extra field. Examples:

    file-bug.py product=Core component=General bug_type=defect \\
        short_desc="Crash in foo" comment="Steps: ..."

    # blocking/depends/see_also and anything else are just more fields:
    file-bug.py product=Core component=General short_desc="..." comment="..." \\
        blocked=12345 dependson=67890 see_also=https://crash-stats.example/123

Beyond the core fields (product, component, bug_type, short_desc, comment), any
``enter_bug.cgi`` field works -- e.g. ``blocked`` (blocks), ``dependson`` (depends
on), ``see_also``. The same key may repeat to pass multiple values.

The URL is printed before opening so it is visible even if no browser is found.
``webbrowser`` is cross-platform, so this works on Linux, macOS, and Windows.
"""

import sys
import urllib.parse
import webbrowser

BASE = "https://bugzilla.mozilla.org/enter_bug.cgi"


def build_url(pairs):
    fields = []
    for arg in pairs:
        key, sep, value = arg.partition("=")
        if not sep:
            sys.exit(f"argument is not a field=value pair: {arg!r}")
        fields.append((key, value))
    return BASE + "?" + urllib.parse.urlencode(fields, quote_via=urllib.parse.quote)


def main(argv):
    if not argv:
        sys.exit(f"usage: {sys.argv[0]} field=value [field=value ...]")
    url = build_url(argv)
    print(url)
    webbrowser.open(url)


if __name__ == "__main__":
    main(sys.argv[1:])
