# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json


def lookup_token(tokens, value):
    keys = value.split(".")
    key = keys[-1]
    for subkey in keys[:-1]:
        tokens = tokens[subkey]
        if not tokens:
            break
    if not tokens or key not in tokens:
        raise ValueError(f"Token not found: {value}")
    return tokens[key]


def process_colors(colors, tokens):
    for key, value in colors.items():
        if value.startswith("."):
            colors[key] = lookup_token(tokens, value[1:])


def process_tokens(output_manifest, input_manifest, tokens):
    tokens = json.loads(open(tokens).read())
    manifest = json.loads(open(input_manifest).read())

    for theme in ["theme", "dark_theme"]:
        if theme in manifest:
            process_colors(manifest[theme]["colors"], tokens)

    output_manifest.write(json.dumps(manifest, indent=2).encode("utf-8"))
