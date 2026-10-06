# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
UI-test-apk-specific transforms. Build the Slack notification payload from
the task's shipping-product, and build the test-lab.py invocation from the
task's flank-config / artifact-type / no-test-apk fields.
"""

import json

from taskgraph.transforms.base import TransformSequence

transforms = TransformSequence()


SLACK_PRODUCT_HEADERS = {
    "fenix": "Firefox for Android :firefox:",
    "focus": "Focus for Android :focusandroid:",
}

SLACK_TEXT = (
    "<https://firefox-ci-tc.services.mozilla.com/tasks/${status.taskId}"
    "|${task.metadata.name}>"
)

APK_APP = "/builds/worker/fetches/target.arm64-v8a.apk"
APK_TEST = "/builds/worker/fetches/target.noarch.apk"
TEST_LAB_SCRIPT = "taskcluster/scripts/tests/test-lab.py"


def _slack_attachments(product_header):
    return json.dumps([
        {
            "color": "#FF0000",
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": product_header},
                },
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "${task.metadata.name}",
                    },
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*Task:*\n<https://firefox-ci-tc.services.mozilla.com/tasks/${status.taskId}|Taskcluster>",
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Owner:*\n${task.metadata.owner}",
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Project:*\n${task.tags.project}",
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Treeherder:*\n<https://treeherder.mozilla.org/jobs?repo=${task.tags.project}&revision=${task.payload.env.GECKO_HEAD_REV}|View Jobs>",
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Source:*\n<${task.payload.env.GECKO_BASE_REPOSITORY}/rev/${task.payload.env.GECKO_HEAD_REV}|Commit> :hg:",
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Report:*\n<https://firefoxci.taskcluster-artifacts.net/${status.taskId}/0/public/results/HtmlErrorReport.html|View Report>",
                        },
                    ],
                },
                {"type": "divider"},
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": ":testops-notify: Mobile Test Engineering",
                        }
                    ],
                },
            ],
        }
    ])


@transforms.add
def build_slack_notification(config, tasks):
    for task in tasks:
        extra = task.setdefault("extra", {})
        notify = extra.get("notify") or {}
        if not notify.get("enabled"):
            extra["notify"] = {}
            yield task
            continue

        product = task.get("attributes", {}).get("shipping-product")
        header = SLACK_PRODUCT_HEADERS.get(product)
        if header is None:
            extra["notify"] = {}
            yield task
            continue

        extra["notify"] = {
            "slackText": SLACK_TEXT,
            "slackAttachments": _slack_attachments(header),
        }
        yield task


@transforms.add
def build_test_lab_command(config, tasks):
    for task in tasks:
        flank_config = task.pop("flank-config")
        artifact_type = task.pop("artifact-type", None)
        no_test_apk = task.pop("no-test-apk", False)

        command = ["python3", TEST_LAB_SCRIPT, flank_config, APK_APP]
        if not no_test_apk:
            command.extend(["--apk_test", APK_TEST])
        if artifact_type:
            command.extend(["--artifact_type", artifact_type])

        run = task.setdefault("run", {})
        run.setdefault("commands", []).append(command)
        yield task
