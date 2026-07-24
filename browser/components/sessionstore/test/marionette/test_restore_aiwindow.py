# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys

# add this directory to the path
sys.path.append(os.path.dirname(__file__))

from session_store_test_case import SessionStoreTestCase


def inline(title):
    return f"data:text/html;charset=utf-8,<html><head><title>{title}</title></head><body></body></html>"


class AIWindowTestMixin:
    startup_page = 1

    def setUp(self):
        super().setUp(
            startup_page=self.startup_page,
            include_private=False,
            restore_on_demand=True,
            test_windows=set([
                (
                    inline("Tab 1"),
                    inline("Tab 2"),
                    inline("Tab 3"),
                ),
            ]),
        )
        self.marionette.set_context("chrome")
        self.marionette.execute_script(
            """
            Services.prefs.setBoolPref("browser.smartwindow.enabled", true);
            """
        )

    def is_ai_window(self):
        return self.marionette.execute_script(
            """
            return window.document.documentElement.hasAttribute("ai-window");
            """
        )

    def get_tab_count(self):
        return self.marionette.execute_script(
            """
            return gBrowser.tabs.length;
            """
        )

    def toggle_ai_window(self, enabled):
        self.marionette.execute_script(
            """
            const { AIWindow } = ChromeUtils.importESModule(
                "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs"
            );
            AIWindow.toggleAIWindow(window, arguments[0]);
            """,
            script_args=[enabled],
        )


class TestAIWindowSessionRestore(AIWindowTestMixin, SessionStoreTestCase):
    """
    Test that AI Window state persists correctly across session restarts.
    """

    def restore_last_session(self):
        self.marionette.execute_script(
            """
            const lazy = {};
            ChromeUtils.defineESModuleGetters(lazy, {
                SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
            });
            function observeClosedObjectsChange() {
                return new Promise(resolve => {
                    function observe(subject, topic, data) {
                        if (topic == "sessionstore-closed-objects-changed") {
                            Services.obs.removeObserver(observe, "sessionstore-closed-objects-changed");
                            resolve();
                        }
                    }
                    Services.obs.addObserver(observe, "sessionstore-closed-objects-changed");
                });
            }

            async function restoreSession() {
                let closedWindowsObserver = observeClosedObjectsChange();
                lazy.SessionStore.restoreLastSession();
                await closedWindowsObserver;
            }
            return restoreSession();
            """
        )

    def test_window_mode_persists_across_restart(self):
        """Test that both Classic and AI Window states persist across session restarts."""
        self.marionette.execute_script(
            """
            Services.prefs.setBoolPref("browser.sessionstore.persist_closed_tabs_between_sessions", true);
            """
        )

        self.wait_for_windows(
            self.all_windows, "Not all requested windows have been opened"
        )

        self.assertFalse(
            self.is_ai_window(), msg="Window should start as Classic Window"
        )

        tab_count = self.get_tab_count()
        self.assertEqual(tab_count, 3, msg="Should have 3 tabs")

        self.toggle_ai_window(True)
        self.assertTrue(
            self.is_ai_window(), msg="Window should be AI Window after toggle"
        )

        self.marionette.quit()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.restore_last_session()

        self.assertEqual(
            len(self.marionette.chrome_window_handles),
            2,
            msg="AI Window opened in new window due to type mismatch with startup window.",
        )

        # Switch to the AI window (the second window)
        self.marionette.switch_to_window(self.marionette.chrome_window_handles[1])

        self.assertTrue(
            self.is_ai_window(),
            msg="AI Window state should persist after restart",
        )

        self.assertEqual(
            self.get_tab_count(),
            tab_count,
            msg="Tab count should be preserved after restart",
        )

    def test_aiwindow_not_restored_when_pref_disabled(self):
        """Test that AI Windows revert to Classic when pref is disabled after restart."""
        self.marionette.execute_script(
            """
            Services.prefs.setBoolPref("browser.sessionstore.persist_closed_tabs_between_sessions", true);
            """
        )

        self.wait_for_windows(
            self.all_windows, "Not all requested windows have been opened"
        )

        self.toggle_ai_window(True)
        self.assertTrue(self.is_ai_window(), msg="Window should be AI before restart")

        self.marionette.quit()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.marionette.execute_script(
            """
            Services.prefs.setBoolPref("browser.smartwindow.enabled", false);
            """
        )

        self.restore_last_session()

        self.assertEqual(
            len(self.marionette.chrome_window_handles),
            1,
            msg="Window from last session has been restored.",
        )

        self.assertFalse(
            self.is_ai_window(),
            msg="AI Window should revert to Classic when pref is disabled",
        )


class TestAIWindowAutomaticRestore(AIWindowTestMixin, SessionStoreTestCase):
    """Test AI Window persistence with automatic session restore."""

    startup_page = 3

    def test_single_window_stays_in_smart_window_on_automatic_restart(self):

        self.wait_for_windows(
            self.all_windows, "Not all requested windows have been opened"
        )

        self.assertFalse(
            self.is_ai_window(), msg="Window should start as Classic Window"
        )

        tab_count = self.get_tab_count()
        self.assertEqual(tab_count, 3, msg="Should have 3 tabs")

        self.toggle_ai_window(True)
        self.assertTrue(
            self.is_ai_window(), msg="Window should be AI Window after toggle"
        )

        # Restart with automatic session restore
        self.marionette.quit()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.assertEqual(
            len(self.marionette.chrome_window_handles),
            1,
            msg="Should have exactly one window after automatic restore",
        )

        self.assertTrue(
            self.is_ai_window(),
            msg="Window should stay in Smart Window mode after restart",
        )

        self.assertEqual(
            self.get_tab_count(),
            tab_count,
            msg="Tab count should be preserved after restart",
        )
