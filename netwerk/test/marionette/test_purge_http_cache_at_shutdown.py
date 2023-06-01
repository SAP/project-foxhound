# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pathlib import Path

from marionette_driver import Wait
from marionette_harness import MarionetteTestCase


class PurgeHTTPCacheAtShutdownTestCase(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        self.marionette.enforce_gecko_prefs(
            {
                "privacy.sanitize.sanitizeOnShutdown": True,
                "privacy.clearOnShutdown.cache": True,
                "network.cache.shutdown_purge_in_background_task": True,
            }
        )

        self.profile_path = Path(self.marionette.profile_path)
        self.cache_path = self.profile_path.joinpath("cache2")

    def tearDown(self):
        self.marionette.cleanup()
        super().tearDown()

    def cacheDirExists(self):
        return self.cache_path.exists()

    def renamedDirExists(self):
        return any(
            child.name.endswith(".purge.bg_rm") for child in self.profile_path.iterdir()
        )

    def test_ensure_cache_purge_after_in_app_quit(self):
        self.assertTrue(self.cacheDirExists(), "Cache directory must exist")

        self.marionette.quit()

        Wait(self.marionette, timeout=60).until(
            lambda _: not self.cacheDirExists() and not self.renamedDirExists(),
            message="Cache directory must be removed after orderly shutdown",
        )

    def test_longstanding_cache_purge_after_in_app_quit(self):
        self.assertTrue(self.cacheDirExists(), "Cache directory must exist")

        self.marionette.set_pref(
            "toolkit.background_tasks.remove_directory.testing.sleep_ms", 5000
        )

        self.marionette.quit()

        Wait(self.marionette, timeout=60).until(
            lambda _: not self.cacheDirExists() and not self.renamedDirExists(),
            message="Cache directory must be removed after orderly shutdown",
        )

    def test_ensure_cache_purge_after_forced_restart(self):
        """
        Doing forced restart here to prevent the shutdown phase purging and only allow startup
        phase one, via `CacheFileIOManager::OnDelayedStartupFinished`.
        """
        self.profile_path.joinpath("foo.purge.bg_rm").mkdir()

        self.marionette.restart(in_app=False)

        Wait(self.marionette, timeout=60).until(
            lambda _: not self.renamedDirExists(),
            message="Directories with .purge.bg_rm postfix must be removed at startup after"
            "disorderly shutdown",
        )
