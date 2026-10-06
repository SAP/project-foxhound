# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import getpass
import json
import logging
import os
import re
import subprocess
import urllib.error
import urllib.request

import yaml
from mach.decorators import Command, CommandArgument
from mach.util import UserError

BUGZILLA_API_URL = "https://bugzilla.mozilla.org/rest/bug"
NSS_TRACKER_BUG = 1816499


def get_blocking_bug():
    securitydir = os.path.dirname(__file__)
    with open(os.path.join(securitydir, "nss", "moz.yaml")) as f:
        manifest = yaml.load(f, Loader=yaml.BaseLoader)
    if "updatebot" not in manifest:
        raise UserError("moz.yaml must have an updatebot section")
    updatebot = manifest["updatebot"]
    if "tasks" not in manifest["updatebot"]:
        raise UserError("updatebot section of moz.yaml must have tasks")
    tasks = updatebot["tasks"]
    vendoring_task = [
        task for task in tasks if "type" in task and task["type"] == "vendoring"
    ]
    if len(vendoring_task) != 1:
        raise UserError(
            "updatebot section of moz.yaml must have exactly one vendoring task"
        )
    vendoring_task = vendoring_task[0]
    if "blocking" not in vendoring_task:
        raise UserError(
            "vendoring task of updatebot section of moz.yaml must have a blocking bug"
        )
    return vendoring_task["blocking"]


def next_nss_version(tag):
    """Convert the NSS version tag to the next dotted version, e.g. 'NSS_3_123_RTM' to '3.124'."""
    if not (tag.startswith("NSS_") and tag.endswith("_RTM")):
        return None
    parts = tag[4:-4].rsplit("_", 1)  # ["3", "123"]
    if len(parts) != 2:
        return None
    try:
        return f"{parts[0]}.{int(parts[1]) + 1}"
    except ValueError:
        return None


def next_firefox_version():
    securitydir = os.path.dirname(__file__)
    version_path = os.path.join(securitydir, "..", "browser", "config", "version.txt")
    with open(version_path) as f:
        version = f.read().strip()
    return str(int(version.split(".")[0]) + 1)


def create_next_nss_uplift_bug(bug, api_key):
    data = json.dumps(bug).encode("utf-8")
    req = urllib.request.Request(BUGZILLA_API_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-BUGZILLA-API-KEY", api_key)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())["id"]
    except urllib.error.HTTPError as e:
        raise UserError(f"Bugzilla API error {e.code}: {e.read().decode()}") from e


def update_blocking_bug(old_bug_id, new_bug_id):
    securitydir = os.path.dirname(__file__)
    moz_yaml_path = os.path.join(securitydir, "nss", "moz.yaml")
    with open(moz_yaml_path) as f:
        content = f.read()
    updated = re.sub(
        rf"(blocking:\s*){re.escape(str(old_bug_id))}\b",
        rf"\g<1>{new_bug_id}",
        content,
    )
    if updated == content:
        raise UserError("Could not find blocking bug number in moz.yaml to update")
    with open(moz_yaml_path, "w") as f:
        f.write(updated)


@Command(
    "nss-uplift",
    category="devenv",
    description="Upgrade to a tagged release of NSS",
)
@CommandArgument(
    "tag",
    nargs=1,
    help="The tagged release or commit to upgrade to.",
)
def nss_uplift(command_context, tag):
    tag = tag[0]

    result = subprocess.run(
        ["git", "status", "--porcelain"], capture_output=True, text=True, check=True
    )
    if result.stdout.strip():
        raise UserError(
            "Working tree is not clean. Please commit or stash your changes."
        )

    result = subprocess.run(
        ["./mach", "vendor", "security/nss/moz.yaml", "--revision", tag], check=True
    )

    if tag.startswith("NSS_"):
        with open("security/nss/TAG-INFO", "w") as f:
            f.write(tag)

    result = subprocess.run(
        ["git", "status", "--porcelain"], capture_output=True, text=True, check=True
    )
    assert result.returncode == 0
    if ".def" in result.stdout:
        command_context.log(
            logging.WARNING,
            "nss_uplift",
            {},
            "Changes in .def. We might have to change security/nss.symbols then manually",
        )

    blocking_bug = get_blocking_bug()

    if "_RTM" in tag:
        nss_version = next_nss_version(tag)
        if nss_version is None:
            raise UserError(f"Could not parse NSS version from tag: {tag}")
        fx_version = next_firefox_version()
        bug = {
            "product": "Core",
            "component": "Security: PSM",
            "version": "unspecified",
            "summary": f"Upgrade Firefox {fx_version} to NSS {nss_version}",
            "type": "task",
            "priority": "P1",
            "severity": "N/A",
            "keywords": ["leave-open"],
            "blocks": [NSS_TRACKER_BUG],
        }
        print("\n" + "=" * 60)
        print(json.dumps(bug, indent=2))
        answer = input("Create this bug? [y/N] ").strip().lower()
        print("=" * 60 + "\n")
        if answer not in ("y", "yes"):
            command_context.log(
                logging.WARNING,
                "nss_uplift",
                {},
                "Create a bug for the next release, update the blocking bug for updatebot in security/nss/moz.yaml, and commit your changes",
            )
            return 0
        print(
            "Get an API key from https://bugzilla.mozilla.org/userprefs.cgi?tab=apikey"
        )
        api_key = getpass.getpass("Bugzilla API key: ")
        if not api_key:
            command_context.log(
                logging.WARNING, "nss_uplift", {}, "No API key provided"
            )
            return 1
        new_bug_id = create_next_nss_uplift_bug(bug, api_key)
        command_context.log(
            logging.INFO,
            "nss_uplift",
            {"bug_id": new_bug_id},
            "Created bug {bug_id}: https://bugzilla.mozilla.org/{bug_id}",
        )
        update_blocking_bug(blocking_bug, new_bug_id)

    result = subprocess.run(
        [
            "git",
            "commit",
            "-a",
            "-m",
            f"Bug {blocking_bug} - upgrade NSS to {tag}. r=#nss-reviewers UPGRADE_NSS_RELEASE",
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    return result.returncode
