# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import logging
import os
import subprocess

import yaml
from mach.decorators import Command, CommandArgument
from mach.util import UserError


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

    result = subprocess.run(
        [
            "git",
            "commit",
            "-a",
            "-m"
            f"Bug {blocking_bug} - upgrade NSS to {tag}. r=#nss-reviewers UPGRADE_NSS_RELEASE",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.returncode == 0

    if "_RTM" in tag:
        command_context.log(
            logging.WARNING,
            "nss_uplift",
            {},
            "Create a bug for the next release, update the blocking bug for updatebot in security/nss/moz.yaml, and run `git commit --amend`",
        )

    return 0
