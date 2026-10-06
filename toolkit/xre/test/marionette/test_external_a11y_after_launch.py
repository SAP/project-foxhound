# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Regression test for bug 2028944.

The original bug: on macOS, the early-startup code in
`toolkit/xre/nsAppRunner.cpp` spun the event loop (via
`ReceiveNextEvent`) before NSApplication was fully initialized. Any
external observer of `NSWorkspaceDidLaunchApplicationNotification` would
receive the launch notification before Firefox's accessibility responder
was wired up, so an assistive technology like VoiceControl that queried
Firefox's AX tree at that moment would silently fail.

This test launches Firefox from a separate Python process and, from
that process, verifies that `AXTitle` / `AXRole` queries on the new
Firefox pid succeed as soon as the launch notification fires.

Based on a debug script by Eitan Isaacson (:eeejay) in bug 2028944
comment 3.
"""

import os
import platform
import subprocess
import sys

from marionette_harness import MarionetteTestCase


class TestExternalA11yAfterLaunch(MarionetteTestCase):
    def test_external_observer_can_query_ax(self):
        if platform.system() != "Darwin":
            self.skipTest("macOS-only regression test (bug 2028944)")

        binary = self.marionette.bin
        helper = os.path.join(os.path.dirname(__file__), "external_a11y_helper.py")

        # The helper has to register the workspace observer before our
        # subject Firefox launches, so let the helper own the spawn.
        # Quit the marionette-controlled Firefox first so it doesn't
        # race the helper-launched one for the notification window.
        self.marionette.quit(in_app=False)
        try:
            proc = subprocess.run(
                [sys.executable, helper, binary],
                capture_output=True,
                text=True,
                timeout=90,
                check=False,
            )
        finally:
            self.marionette.start_session()

        if proc.returncode == 77:
            self.skipTest(
                f"PyObjC unavailable in test environment: {proc.stdout.strip()}"
            )
        self.assertEqual(
            proc.returncode,
            0,
            msg=(
                f"external_a11y_helper exited with rc={proc.returncode}\n"
                f"stdout:\n{proc.stdout}\n"
                f"stderr:\n{proc.stderr}"
            ),
        )
