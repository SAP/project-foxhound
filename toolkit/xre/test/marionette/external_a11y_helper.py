# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
External-observer helper for the bug 2028944 regression test.

Launches a Firefox process and, from this (separate) process, verifies that
the accessibility (AX) API on the launched process is queryable as soon as
`NSWorkspaceDidLaunchApplicationNotification` fires. This mirrors what an
assistive technology like VoiceControl does at app launch time.

Exit codes:
  0  - PASS: notification observed, AX queries succeeded.
  2  - FAIL: notification did not arrive for the launched pid before timeout.
  3  - FAIL: AX query returned a non-zero error.
 77  - SKIP: PyObjC not available in this environment.

Based on a debug script by Eitan Isaacson (:eeejay) in bug 2028944 comment 3.
"""

import os
import subprocess
import sys
import tempfile
import threading

try:
    from AppKit import NSWorkspace, NSWorkspaceDidLaunchApplicationNotification
    from ApplicationServices import (
        AXUIElementCopyAttributeValue,
        AXUIElementCreateApplication,
    )
    from Foundation import NSObject
    from Quartz import CFRunLoopGetCurrent, CFRunLoopRun, CFRunLoopStop
except ImportError as exc:
    print(f"SKIP PyObjC unavailable: {exc}", flush=True)
    sys.exit(77)


RUNLOOP_TIMEOUT_SECONDS = 20


def main(binary_path):
    result = {
        "got_launch": False,
        "ax_ok": False,
        "title_err": None,
        "role_err": None,
        "pid": None,
    }

    profile_dir = tempfile.mkdtemp(prefix="bug2028944-")

    # Launch the subject Firefox with a clean environment so we don't drag
    # in test-harness variables (MOZ_MARIONETTE, etc.) that would change
    # its behavior. MOZ_LAUNCHED_CHILD=1 selects the relaunch codepath in
    # nsAppRunner.cpp -- the same codepath that used to leave NSApp in a
    # pre-init state when the workspace launch notification fired.
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": os.environ.get("HOME", profile_dir),
        "MOZ_LAUNCHED_CHILD": "1",
        "MOZ_DISABLE_SAFE_MODE_KEY": "1",
    }

    class Observer(NSObject):
        def gotLaunch_(self, notification):
            info = notification.userInfo()
            pid = info.get("NSApplicationProcessIdentifier", 0)
            if pid != child.pid:
                return
            result["got_launch"] = True
            result["pid"] = pid

            acc = AXUIElementCreateApplication(pid)
            err_t, _ = AXUIElementCopyAttributeValue(acc, "AXTitle", None)
            err_r, _ = AXUIElementCopyAttributeValue(acc, "AXRole", None)
            result["title_err"] = int(err_t)
            result["role_err"] = int(err_r)
            result["ax_ok"] = err_t == 0 and err_r == 0

            CFRunLoopStop(CFRunLoopGetCurrent())

    observer = Observer.new()
    NSWorkspace.sharedWorkspace().notificationCenter().addObserver_selector_name_object_(  # noqa: E501
        observer,
        "gotLaunch:",
        NSWorkspaceDidLaunchApplicationNotification,
        None,
    )

    child = subprocess.Popen(
        [binary_path, "--no-remote", "--profile", profile_dir],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Bound the runloop so a missed notification fails fast rather than
    # hanging the test.
    threading.Timer(
        RUNLOOP_TIMEOUT_SECONDS, lambda: CFRunLoopStop(CFRunLoopGetCurrent())
    ).start()

    CFRunLoopRun()

    # Tear down the subject Firefox.
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()

    if not result["got_launch"]:
        print(
            f"FAIL no NSWorkspaceDidLaunchApplicationNotification for pid {child.pid}",
            flush=True,
        )
        return 2
    if not result["ax_ok"]:
        print(
            f"FAIL AX query failed: "
            f"AXTitle err={result['title_err']} "
            f"AXRole err={result['role_err']}",
            flush=True,
        )
        return 3
    print(f"PASS pid={result['pid']}: AX queries succeeded", flush=True)
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <firefox-binary-path>", flush=True)
        sys.exit(1)
    sys.exit(main(sys.argv[1]))
