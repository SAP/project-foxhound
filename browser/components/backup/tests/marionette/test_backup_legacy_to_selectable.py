# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys
import tempfile
from pathlib import Path

import mozfile

sys.path.append(os.fspath(Path(__file__).parents[0]))
from backup_test_base import BackupTestBase


class BackupLegacyToSelectableTest(BackupTestBase):
    """
    Tests that a backup created from a legacy profile (without selectable
    profiles enabled) can be successfully recovered in an environment where
    selectable profiles ARE enabled.

    This verifies that stale selectable profile prefs in the backup are
    overwritten with correct values during recovery.
    """

    def test_backup_legacy_to_selectable(self):
        self.logger.info("=== Test: Legacy -> Selectable ===")

        self.logger.info("Step 1: Creating legacy backup with stale prefs")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})

        self.set_prefs({
            "browser.profiles.enabled": False,
            "browser.profiles.created": False,
            "toolkit.profiles.storeID": "stale-legacy-store-id",
            "test.legacy.backup.pref": "test-value",
        })

        self.marionette.restart(clean=False, in_app=True)

        self._archive_path = self.create_backup()
        self._cleanups.append({"path": self._archive_path})
        self.assertTrue(
            os.path.exists(self._archive_path), "Backup archive should exist"
        )
        self.logger.info(f"Legacy backup created at: {self._archive_path}")

        self.logger.info("Step 2: Switching to new selectable profile environment")
        self.marionette.quit()
        self.marionette.instance.switch_profile()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        recovery_profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": recovery_profile_name})
        self.logger.info(f"Created recovery profile: {recovery_profile_name}")

        selectable_info = self.setup_selectable_profile()
        original_store_id = selectable_info["store_id"]
        self.assertIsNotNone(original_store_id, "storeID should be set")
        self.logger.info(f"Recovery environment storeID: {original_store_id}")

        self.logger.info("Step 3: Recovering legacy backup into selectable environment")
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), "legacy-to-selectable-recovery"
        )
        mozfile.remove(self._recovery_path)
        self._cleanups.append({"path": self._recovery_path})

        recovery_result = self.recover_backup(self._archive_path, self._recovery_path)
        self._new_profile_path = recovery_result["path"]
        self._new_profile_id = recovery_result["id"]
        self._cleanups.append({"path": self._new_profile_path})
        self.logger.info(
            f"Recovery complete. New profile path: {self._new_profile_path}, id: {self._new_profile_id}"
        )

        self.logger.info("Step 4: Launching recovered profile and verifying prefs")
        self.marionette.quit()
        intermediate_profile = self.marionette.instance.profile
        self.marionette.instance.profile = self._new_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()
        self.logger.info("Post-recovery complete")

        self.init_selectable_profile_service()

        store_id = self.get_store_id()
        self.assertEqual(
            store_id,
            original_store_id,
            "Recovered profile should have the same storeID as profile group",
        )
        self.logger.info(f"Verified storeID matches: {store_id}")

        prefs = self.run_code(
            """
            return {
                enabled: Services.prefs.getBoolPref("browser.profiles.enabled", false),
                created: Services.prefs.getBoolPref("browser.profiles.created", false),
            };
            """
        )
        self.assertTrue(
            prefs["enabled"],
            "browser.profiles.enabled should be true (not stale false from backup)",
        )
        self.assertTrue(
            prefs["created"],
            "browser.profiles.created should be true (not stale false from backup)",
        )
        self.logger.info("Verified prefs are correct (not stale values from backup)")

        self.logger.info("Step 5: Cleaning up")
        self.marionette.quit()
        self.marionette.instance.profile = intermediate_profile
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.cleanup_selectable_profiles()
        self.logger.info("=== Test: Legacy -> Selectable PASSED ===")
