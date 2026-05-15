# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_harness import MarionetteTestCase

customization_pref = "browser.uiCustomization.state"


class TestSidebarButtonRemoval(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        self.marionette.set_context("chrome")

    def tearDown(self):
        try:
            # Make sure subsequent tests get a clean profile
            self.marionette.restart(in_app=False, clean=True)
        finally:
            super().tearDown()

    def get_sidebar_cui_area(self):
        area = self.marionette.execute_script(
            """
            const window = BrowserWindowTracker.getTopWindow();
            return window.CustomizableUI.getPlacementOfWidget("sidebar-button")?.area;
            """
        )
        return area

    def test_sidebar_enable_at_restart(self):
        self.marionette.enforce_gecko_prefs({"sidebar.revamp": False})
        self.assertEqual(
            self.get_sidebar_cui_area(),
            None,
            "The sidebar-button is not placed in a toolbar",
        )
        # enable revamp at the next startup
        self.marionette.enforce_gecko_prefs({"sidebar.revamp": True})
        self.assertEqual(
            self.get_sidebar_cui_area(),
            "nav-bar",
            "The sidebar-button gets placed in the nav-bar by default when starting up with revamp=true",
        )

    def test_sidebar_enable_at_runtime_remove_button(self):
        self.marionette.enforce_gecko_prefs({"sidebar.revamp": False})
        self.assertEqual(
            self.get_sidebar_cui_area(),
            None,
            "The sidebar-button is not placed in a toolbar",
        )
        self.marionette.set_pref("sidebar.revamp", True)
        self.assertEqual(
            self.get_sidebar_cui_area(),
            "nav-bar",
            "The sidebar-button is in the nav-bar",
        )

        # Remove the button
        self.marionette.execute_script(
            """
            const window = BrowserWindowTracker.getTopWindow();
            return window.CustomizableUI.removeWidgetFromArea("sidebar-button");
            """
        )
        self.assertEqual(
            self.get_sidebar_cui_area(),
            None,
            "The sidebar-button is not placed in a toolbar",
        )
        self.assertEqual(
            self.marionette.get_pref(
                "browser.toolbarbuttons.introduced.sidebar-button"
            ),
            True,
            "The 'introduced' pref is set",
        )

        self.marionette.restart(in_app=True, clean=False)
        self.marionette.set_context("chrome")

        self.assertEqual(
            self.get_sidebar_cui_area(),
            None,
            "The sidebar-button is not restored to the nav-bar",
        )
