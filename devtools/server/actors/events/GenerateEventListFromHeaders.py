# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

"""
This script parses mozilla-central's EventNameList.inc and writes a JSON-formatted equivalent
in order to guess if a DOM Event name is implemented by Gecko:
  "devtools/server/event-list.json"

Run this script via

> ./mach python devtools/server/GenerateEventListFromHeaders.py dom/events/EventNameList.inc
"""

import re
import sys

from mozfile import json


def main(output_file, event_name_list_h):
    events = []
    with open(event_name_list_h, encoding="utf8") as f:
        text = f.read()
        # Match all lines following this syntax:
        #   xxx_EVENT(name, message, type, struct)
        #
        # "type" may include logical expression like "(EventNameType_HTMLXUL | EventNameType_SVGSVG)"
        matches = re.findall(
            r"^((\w+)?EVENT)\((\w+),\s+(\w+),\s+([(\\|\) \w]+),\s+(\w+)\)",
            text,
            re.MULTILINE,
        )
        for category, _, name, message, type, struct in matches:
            events.append(name)

    output_file.write(json.dumps(events, indent=2, sort_keys=True))

    print("Successfully generated event list for DevTools")


if __name__ == "__main__":
    main(sys.stdout, sys.argv[1])
