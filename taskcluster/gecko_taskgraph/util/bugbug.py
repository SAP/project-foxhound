# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import hashlib
import os
import pathlib
import sys
import time

import requests
from mozbuild.util import memoize
from taskgraph import create
from taskgraph.util import json
from taskgraph.util.taskcluster import requests_retry_session

try:
    # TODO(py3): use time.monotonic()
    from time import monotonic
except ImportError:
    from time import time as monotonic

BUGBUG_BASE_URL = "https://bugbug.moz.tools"
RETRY_TIMEOUT = 9 * 60  # seconds
RETRY_INTERVAL = 10  # seconds

# Preset confidence thresholds.
CT_LOW = 0.7
CT_MEDIUM = 0.8
CT_HIGH = 0.9

GROUP_TRANSLATIONS = {
    "testing/web-platform/tests": "",
    "testing/web-platform/mozilla/tests": "/_mozilla",
}


def translate_group(group):
    for prefix, value in GROUP_TRANSLATIONS.items():
        if group.startswith(prefix):
            return group.replace(prefix, value)

    return group


class BugbugTimeoutException(Exception):
    pass


@memoize
def get_session():
    s = requests.Session()
    s.headers.update({"X-API-KEY": "gecko-taskgraph"})
    return requests_retry_session(retries=5, session=s)


def _perfherder_artifact_path(base_path, perfherder_data):
    base_dir = base_path.parent
    stem = base_path.stem
    sequence = int(time.monotonic() * 1000)
    payload = json.dumps(perfherder_data, sort_keys=True).encode("utf-8")
    digest = hashlib.sha1(payload).hexdigest()[:8]

    return base_dir / f"{stem}-{sequence}-{digest}.json"


def _write_perfherder_data(lower_is_better):
    if os.environ.get("MOZ_AUTOMATION", "0") == "1":
        perfherder_data = {
            "framework": {"name": "build_metrics"},
            "suites": [
                {
                    "name": suite,
                    "value": value,
                    "lowerIsBetter": True,
                    "shouldAlert": False,
                    "subtests": [],
                }
                for suite, value in lower_is_better.items()
            ],
        }
        print(f"PERFHERDER_DATA: {json.dumps(perfherder_data)}", file=sys.stderr)
        perfherder_path = os.environ.get("MOZ_PERFHERDER_UPLOAD")
        decision_upload_dir = os.environ.get("MOZ_UPLOAD_DIR")
        if perfherder_path:
            upload_path = pathlib.Path(perfherder_path)
        elif decision_upload_dir:
            upload_path = (
                pathlib.Path(decision_upload_dir) / "perfherder-data-bugbug.json"
            )
        else:
            return

        upload_path.parent.mkdir(parents=True, exist_ok=True)
        target = _perfherder_artifact_path(upload_path, perfherder_data)
        with target.open("w", encoding="utf-8") as f:
            json.dump(perfherder_data, f)


@memoize
def push_schedules(branch, rev):
    # Noop if we're in test-action-callback
    if create.testing:
        return

    url = BUGBUG_BASE_URL + f"/push/{branch}/{rev}/schedules"
    start = monotonic()
    session = get_session()

    # On try there is no fallback and pulling is slower, so we allow bugbug more
    # time to compute the results.
    # See https://github.com/mozilla/bugbug/issues/1673.
    timeout = RETRY_TIMEOUT
    if branch == "try":
        timeout += int(timeout / 3)

    attempts = timeout / RETRY_INTERVAL
    i = 0
    while i < attempts:
        r = session.get(url)
        r.raise_for_status()

        if r.status_code != 202:
            break

        time.sleep(RETRY_INTERVAL)
        i += 1
    end = monotonic()

    _write_perfherder_data(
        lower_is_better={
            "bugbug_push_schedules_time": end - start,
            "bugbug_push_schedules_retries": i,
        }
    )

    data = r.json()
    if r.status_code == 202:
        raise BugbugTimeoutException(f"Timed out waiting for result from '{url}'")

    if "groups" in data:
        data["groups"] = {translate_group(k): v for k, v in data["groups"].items()}

    if "config_groups" in data:
        data["config_groups"] = {
            translate_group(k): v for k, v in data["config_groups"].items()
        }

    return data


@memoize
def patch_schedules(base_rev, patch_content, mode="quick"):
    """Query BugBug API with a patch to get test recommendations.

    This is used by `./mach test --auto` to get test recommendations for local changes.

    Args:
        base_rev (str): The base revision hash.
        patch_content (str): The patch content with commit metadata.
        mode (str): The mode of test selection, which determines the confidence
            threshold. One of 'extensive', 'moderate', or 'quick'.
    Returns:
        dict: A dictionary with containing test recommendations filtered by
            confidence threshold.

    Raises:
        BugbugTimeoutException: If the API times out.
    """

    import hashlib
    import re

    # This ensures consistent hashing across multiple runs with identical
    # changes by stripping the date before hashing.
    filtered_content = re.sub(r"^Date: .*$", "", patch_content, flags=re.MULTILINE)
    patch_hash = hashlib.md5(filtered_content.encode("utf-8")).hexdigest()

    url = BUGBUG_BASE_URL + f"/patch/{base_rev}/{patch_hash}/schedules"

    session = get_session()

    r = session.post(
        url,
        data=patch_content.encode("utf-8"),
        headers={"Content-Type": "text/plain"},
    )
    r.raise_for_status()

    timeout = RETRY_TIMEOUT
    attempts = timeout / RETRY_INTERVAL
    i = 0
    while i < attempts:
        if r.status_code != 202:
            break

        time.sleep(RETRY_INTERVAL)
        r = session.get(url)
        r.raise_for_status()
        i += 1

    data = r.json()
    if r.status_code == 202:
        raise BugbugTimeoutException(f"Timed out waiting for result from '{url}'")

    if mode == "extensive":
        confidence_threshold = CT_LOW
    elif mode == "moderate":
        confidence_threshold = CT_MEDIUM
    elif mode == "quick":
        confidence_threshold = CT_HIGH
    else:
        raise ValueError(
            f"Invalid mode: '{mode}'; expected one of 'extensive', 'moderate', 'quick'"
        )

    return {k: v for k, v in data["groups"].items() if v >= confidence_threshold}
