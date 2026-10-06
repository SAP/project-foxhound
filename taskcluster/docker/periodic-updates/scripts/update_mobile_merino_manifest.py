#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import json
import os
import ssl
import subprocess
import sys
import tempfile
from urllib.request import urlopen

import buildconfig
import certifi
import mozpack.path as mozpath
from redo import retry

MERINO_MANIFEST_URL = "https://merino.services.mozilla.com/api/v1/manifest"
MERINO_MANIFEST_PATH = mozpath.join(
    buildconfig.topsrcdir,
    "mobile/android/android-components/components/service/merino-manifest/src/main/assets/manifest/manifest.json",
)
MERINO_MANIFEST_DIFF_PATH = mozpath.join(
    os.environ.get("ARTIFACTS_DIR", "."),
    "merino_manifest.diff",
)
REQUEST_TIMEOUT_SECONDS = 30


def put_content_at_file(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def format_json(content: str) -> str:
    return json.dumps(json.loads(content), indent=2) + "\n"


def get_content_at_url(url: str, timeout_seconds: int) -> str:
    ssl_context = ssl.create_default_context(cafile=certifi.where())

    def fetch() -> str:
        with urlopen(url, context=ssl_context, timeout=timeout_seconds) as response:
            return response.read().decode("utf-8")

    try:
        return retry(fetch)
    except Exception as e:
        raise Exception(f"Failed to fetch content from: {url}\n{e}")


def create_diff_artifact(
    new_manifest_content: str, old_manifest_path: str, diff_output_path: str
) -> str:
    """
    Returns path to the new manifest file if changes are detected,
    otherwise returns an empty string.
    """
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=buildconfig.topsrcdir, delete=False
        ) as temp_file:
            temp_file.write(new_manifest_content)
            temp_path = temp_file.name

        result = subprocess.run(
            ["diff", "-u", old_manifest_path, temp_path],
            check=False,
            capture_output=True,
            text=True,
        )
        put_content_at_file(diff_output_path, result.stdout)

        if result.returncode == 0:
            # No changes detected
            os.unlink(temp_path)
            return ""
        if result.returncode == 1:
            # Changes detected
            return temp_path
        os.unlink(temp_path)
        raise Exception(result.stderr)
    except Exception as e:
        raise Exception(f"Failed to create diff artifact.\n{e}")


def run(args) -> int:
    """Fetch the Merino manifest and update the local file if contents changed."""
    try:
        new_manifest = get_content_at_url(
            args.manifest_url, args.request_timeout_seconds
        )
        new_manifest = format_json(new_manifest)

        temp_path = create_diff_artifact(
            new_manifest, args.manifest_path, args.diff_path
        )

        if temp_path:
            print("INFO: Manifest has changed, updating file.")
            os.replace(temp_path, args.manifest_path)
            print("INFO: Manifest updated successfully.")

            return 0
        else:
            print("INFO: Manifest has not changed, no update needed.")
            return 1
    except Exception as e:
        print(f"FATAL ERROR: {e}", file=sys.stderr)
        return 2


def parse_arguments_and_run():
    """Parse command line arguments and run the update."""
    parser = argparse.ArgumentParser(
        description="Fetch Merino manifest and update local file if changed.",
        epilog=f"Example: ./mach python {os.path.basename(sys.argv[0])}",
    )
    parser.add_argument(
        "--manifest-url",
        default=MERINO_MANIFEST_URL,
        help="Remote manifest URL to fetch.",
    )
    parser.add_argument(
        "--manifest-path",
        default=MERINO_MANIFEST_PATH,
        help="Absolute path to the manifest file.",
    )
    parser.add_argument(
        "--diff-path",
        default=MERINO_MANIFEST_DIFF_PATH,
        help="Path to write the generated diff file.",
    )
    parser.add_argument(
        "--request-timeout-seconds",
        type=int,
        default=REQUEST_TIMEOUT_SECONDS,
        help="Timeout for the manifest HTTP request.",
    )
    return run(parser.parse_args())


if __name__ == "__main__":
    sys.exit(parse_arguments_and_run())
