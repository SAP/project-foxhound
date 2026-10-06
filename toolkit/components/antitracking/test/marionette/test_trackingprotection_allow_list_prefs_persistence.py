# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_harness import MarionetteTestCase

# Tests the persistence of the baseline and convenience tracking protection allow list preferences
# after browser restart.


class TrackingProtectionAllowListPreferenceTestCase(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        # Simulate the state after ETP Strict user upgrades, and UrlClassifierExceptionsListService
        # has ran to ensure the baseline and convenience preferences are set to False.
        self.marionette.enforce_gecko_prefs({
            "browser.contentblocking.category": "strict",
            "privacy.trackingprotection.allow_list.baseline.enabled": False,
            "privacy.trackingprotection.allow_list.convenience.enabled": False,
            "privacy.trackingprotection.allow_list.hasMigratedCategoryPrefs": True,
        })

        self.marionette.set_context("chrome")

    def tearDown(self):
        self.marionette.restart(in_app=False, clean=True)

        super().tearDown()

    def test_state_after_restart(self):
        self.marionette.restart(clean=False, in_app=True)
        baseline = self.marionette.execute_script(
            """
                return Services.prefs.getBoolPref("privacy.trackingprotection.allow_list.baseline.enabled")
            """
        )
        self.assertEqual(
            baseline, False, "Baseline should remain unchanged on restart."
        )

        convenience = self.marionette.execute_script(
            """
                return Services.prefs.getBoolPref("privacy.trackingprotection.allow_list.convenience.enabled")
            """
        )
        self.assertEqual(
            convenience, False, "Convenience should remain unchanged on restart."
        )
