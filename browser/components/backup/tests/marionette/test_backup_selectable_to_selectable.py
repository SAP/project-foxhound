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


class BackupSelectableToSelectableTest(BackupTestBase):
    """
    Tests that a backup created from a selectable profile can be recovered
    into another selectable profile environment.

    The recovered profile should have the same groupID (storeID) as the
    profile group we recovered into (not the original backup's storeID).
    """

    def test_backup_selectable_to_selectable(self):
        self.logger.info("=== Test: Selectable -> Selectable ===")

        self.logger.info("Step 1: Setting up source selectable profile")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})
        self.logger.info(f"Registered toolkit profile: {profile_name}")

        selectable_info = self.setup_selectable_profile()
        original_backup_store_id = selectable_info["store_id"]
        self.assertIsNotNone(
            original_backup_store_id, "Backup profile should have storeID"
        )
        self.logger.info(
            f"Source selectable profile storeID: {original_backup_store_id}"
        )

        self.set_prefs({"test.selectable.backup.pref": "test-value"})

        self.marionette.restart(clean=False, in_app=True)

        self.logger.info("Step 2: Creating backup from source selectable profile")
        self._archive_path = self.create_backup()
        self._cleanups.append({"path": self._archive_path})
        self.assertTrue(
            os.path.exists(self._archive_path), "Backup archive should exist"
        )
        self.logger.info(f"Backup created at: {self._archive_path}")

        self.logger.info(
            "Step 3: Setting up destination selectable profile environment"
        )
        self.marionette.quit()
        self.marionette.instance.switch_profile()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        recovery_profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": recovery_profile_name})
        self.logger.info(
            f"Registered destination toolkit profile: {recovery_profile_name}"
        )

        recovery_selectable_info = self.setup_selectable_profile()
        recovery_env_store_id = recovery_selectable_info["store_id"]
        self.assertIsNotNone(recovery_env_store_id, "Recovery env should have storeID")
        self.assertNotEqual(
            recovery_env_store_id,
            original_backup_store_id,
            "Recovery env should have different storeID than original backup",
        )
        self.logger.info(
            f"Destination selectable profile storeID: {recovery_env_store_id}"
        )
        self.logger.info(
            f"Verified source storeID ({original_backup_store_id}) != destination storeID ({recovery_env_store_id})"
        )

        self.logger.info(
            "Step 4: Recovering backup into destination selectable environment"
        )
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), "selectable-to-selectable-recovery"
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

        self.logger.info("Step 5: Verifying database entries")
        profiles_after_recovery = self.get_all_profiles()
        self.logger.info(f"Profiles in database: {profiles_after_recovery}")
        self.assertEqual(
            len(profiles_after_recovery),
            3,
            "Database should have 3 profiles after recovery (original + new + recovered)",
        )

        recovered_profile_in_db = next(
            (p for p in profiles_after_recovery if p["id"] == self._new_profile_id),
            None,
        )
        self.assertIsNotNone(
            recovered_profile_in_db,
            "Recovered profile should exist in the database",
        )
        self.logger.info(
            f"Found recovered profile in database: {recovered_profile_in_db}"
        )

        self.logger.info("Step 6: Launching recovered profile and verifying storeID")
        self.marionette.quit()
        intermediate_profile = self.marionette.instance.profile
        self.marionette.instance.profile = self._new_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()
        self.logger.info("Post-recovery complete")

        self.init_selectable_profile_service()

        recovered_store_id = self.get_store_id()
        self.logger.info(f"Recovered profile storeID: {recovered_store_id}")
        self.assertEqual(
            recovered_store_id,
            recovery_env_store_id,
            "Recovered profile should have same storeID as recovery environment",
        )
        self.assertNotEqual(
            recovered_store_id,
            original_backup_store_id,
            "Recovered profile should NOT have original backup's storeID",
        )
        self.logger.info(
            f"Verified recovered storeID ({recovered_store_id}) == destination storeID ({recovery_env_store_id})"
        )
        self.logger.info(
            f"Verified recovered storeID ({recovered_store_id}) != source storeID ({original_backup_store_id})"
        )

        store_id_pref = self.get_store_id_pref()
        self.assertEqual(
            store_id_pref,
            recovery_env_store_id,
            "toolkit.profiles.storeID pref should match the recovery environment storeID",
        )
        self.logger.info(f"toolkit.profiles.storeID pref verified: {store_id_pref}")

        self.logger.info("Step 7: Cleaning up")
        self.marionette.quit()
        self.marionette.instance.profile = intermediate_profile
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.cleanup_selectable_profiles()
        self.logger.info("=== Test: Selectable -> Selectable PASSED ===")
