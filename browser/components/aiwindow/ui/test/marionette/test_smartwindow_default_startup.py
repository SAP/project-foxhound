# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Marionette tests for Smart Window startup behavior in BrowserContentHandler.

These tests verify the synchronous startup gate `shouldOpenAsSmartWindow`
and the URL injection in `getFirstWindowArgs`. Scenarios requiring async
FxA authentication or saved-session state are covered by mochitest browser
tests in browser/components/aiwindow/ui/test/browser/ where they can be
stubbed with sinon.
"""

from marionette_harness import MarionetteTestCase


class TestSmartWindowDefaultStartup(MarionetteTestCase):
    """
    Test that Smart Window is (or isn't) opened on startup based on prefs.
    """

    BASE_PREFS = {
        "browser.smartwindow.enabled": True,
        "identity.fxaccounts.remote.root": "http://127.0.0.1/",
    }

    def setUp(self):
        super().setUp()
        self.marionette.set_context("chrome")

    def tearDown(self):
        # enforce_gecko_prefs writes the prefs into the profile (user.js),
        # which persists across normal restarts — a plain set_pref reset
        # would be re-overridden on the next test's restart. Do a clean-
        # profile restart to fully wipe state and prevent bleed-through.
        self.marionette.restart(clean=True, in_app=False)
        super().tearDown()

    def is_ai_window(self):
        return self.marionette.execute_script(
            """
            return window.document.documentElement.hasAttribute("ai-window");
            """
        )

    def restart_with_prefs(self, **extra_prefs):
        # enforce_gecko_prefs does a restart with the prefs applied at startup.
        # This ensures the restart keeps smart window pref enabled.
        self.marionette.enforce_gecko_prefs({**self.BASE_PREFS, **extra_prefs})

    def _assert_window_type(self, prefs, expected_smart, msg):
        """Restart with the given prefs and assert whether the resulting
        startup window opens as Smart (expected_smart=True) or Classic
        (expected_smart=False)."""
        self.restart_with_prefs(**prefs)
        self.assertEqual(self.is_ai_window(), expected_smart, msg=msg)

    def test_smartwindowdefault_user_not_logged_in(self):
        """Classic window opens at startup when Smart Window is default but user has never signed in."""
        self._assert_window_type(
            prefs={
                "browser.smartwindow.isDefaultWindow": True,
                "browser.smartwindow.tos.consentTime": 0,
            },
            expected_smart=False,
            msg="Window should be Classic when user has never signed in (consentTime=0)",
        )

    def test_smartwindowdefault_newtab(self):
        """Smart window opens at startup when user has previously signed in.

        URL substitution (about:home → AIWINDOW_URL) is verified separately
        via mochitest browser — marionette forces browser.startup.page=0 at
        every session start (testing/marionette/.../geckoinstance.py:666),
        which keeps the substitution path unreachable from this harness.
        """
        self._assert_window_type(
            prefs={
                "browser.smartwindow.isDefaultWindow": True,
                "browser.smartwindow.tos.consentTime": 1,
                "browser.smartwindow.firstrun.hasCompleted": True,
            },
            expected_smart=True,
            msg="Window should start as Smart Window when user is logged in",
        )

    def test_smartwindowdefault_false(self):
        """Classic window new tab opens at startup when smart window is not default."""
        self._assert_window_type(
            prefs={
                "browser.smartwindow.isDefaultWindow": False,
                "browser.smartwindow.tos.consentTime": 1,
                "browser.smartwindow.firstrun.hasCompleted": True,
            },
            expected_smart=False,
            msg="Window should start as Classic Window when Smart Window default pref is false",
        )

    def test_smartwindowdefault_privatewindow(self):
        """Classic private window opens even when Smart Window is the default."""
        self._assert_window_type(
            prefs={
                "browser.smartwindow.isDefaultWindow": True,
                "browser.smartwindow.tos.consentTime": 1,
                "browser.privatebrowsing.autostart": True,
            },
            expected_smart=False,
            msg="Window should be Classic Window in private browsing mode",
        )
