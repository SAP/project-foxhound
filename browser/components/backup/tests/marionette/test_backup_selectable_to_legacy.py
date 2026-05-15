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


class BackupSelectableToLegacyTest(BackupTestBase):
    """
    Tests that a backup created from a selectable profile can be recovered
    into a legacy profile environment, converting it to selectable.

    The recovered profile should have the same groupID (storeID) as the
    profile group created during conversion.
    """

    def test_backup_selectable_to_legacy(self):
        self.logger.info("=== Test: Selectable -> Legacy ===")

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
            f"Created selectable profile with storeID: {original_backup_store_id}"
        )

        self.set_prefs({"test.selectable.backup.pref": "test-value"})

        self.marionette.restart(clean=False, in_app=True)

        self.logger.info("Step 2: Creating backup from selectable profile")
        self._archive_path = self.create_backup()
        self._cleanups.append({"path": self._archive_path})
        self.assertTrue(
            os.path.exists(self._archive_path), "Backup archive should exist"
        )
        self.logger.info(f"Backup created at: {self._archive_path}")

        self.logger.info("Step 3: Switching to new legacy profile environment")
        self.marionette.quit()
        self.marionette.instance.switch_profile()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        legacy_profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": legacy_profile_name})
        self.logger.info(f"Created legacy profile: {legacy_profile_name}")

        stale_store_id = "stale-garbage-store-id-12345"
        self.set_prefs({
            "browser.profiles.enabled": True,
            "browser.profiles.created": False,
            "toolkit.profiles.storeID": stale_store_id,
        })
        self.logger.info(f"Set stale storeID on legacy profile: {stale_store_id}")

        has_selectable = self.has_selectable_profiles()
        self.assertFalse(has_selectable, "Should start as legacy profile")
        self.logger.info(
            "Verified profile is legacy (hasCreatedSelectableProfiles=False)"
        )

        pre_recovery_store_id = self.get_store_id_pref()
        self.assertEqual(
            pre_recovery_store_id,
            stale_store_id,
            "Legacy profile should have the stale storeID we set",
        )

        self.logger.info("Step 4: Recovering backup into legacy environment")
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), "selectable-to-legacy-recovery"
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

        self.logger.info("Step 5: Verifying legacy profile was converted to selectable")
        has_selectable_after = self.has_selectable_profiles()
        self.assertTrue(
            has_selectable_after,
            "Legacy profile should be converted to selectable after recovery",
        )
        self.logger.info(
            "Legacy profile converted to selectable (hasCreatedSelectableProfiles=True)"
        )

        self.logger.info("Step 6: Verifying database entries")
        original_profile_name = self.get_original_profile_name()
        profiles_after_conversion = self.get_all_profiles()
        self.logger.info(f"Profiles in database: {profiles_after_conversion}")
        self.assertEqual(
            len(profiles_after_conversion),
            2,
            "Database should have 2 profiles after recovery (original + recovered)",
        )

        original_profile = next(
            (
                p
                for p in profiles_after_conversion
                if p["name"] == original_profile_name
            ),
            None,
        )
        self.assertIsNotNone(
            original_profile,
            f"Database should have a profile named '{original_profile_name}' (the converted legacy profile)",
        )
        self.logger.info(f"Found 'Original Profile' in database: {original_profile}")

        recovered_profile_in_db = next(
            (p for p in profiles_after_conversion if p["id"] == self._new_profile_id),
            None,
        )
        self.assertIsNotNone(
            recovered_profile_in_db,
            "Recovered profile should exist in the database",
        )
        self.logger.info(
            f"Found recovered profile in database: {recovered_profile_in_db}"
        )

        self.logger.info("Step 7: Verifying storeID was updated (not stale)")
        converted_store_id = self.get_store_id()
        self.logger.info(f"Converted storeID: {converted_store_id}")
        self.assertIsNotNone(
            converted_store_id, "Converted profile should have storeID"
        )
        self.assertNotEqual(
            converted_store_id,
            original_backup_store_id,
            "Converted profile group should have a NEW storeID, not the backup's",
        )
        self.assertNotEqual(
            converted_store_id,
            stale_store_id,
            "Converted profile group should have a NEW storeID, not the stale one",
        )
        self.logger.info(
            f"Verified storeID changed from stale '{stale_store_id}' to new '{converted_store_id}'"
        )

        self.logger.info("Step 8: Launching recovered profile and verifying prefs")
        self.marionette.quit()
        intermediate_profile = self.marionette.instance.profile
        self.marionette.instance.profile = self._new_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()
        self.logger.info("Post-recovery complete")

        self.init_selectable_profile_service()

        recovered_store_id = self.get_store_id()
        self.assertEqual(
            recovered_store_id,
            converted_store_id,
            "Recovered profile should have same storeID as converted profile group",
        )
        self.logger.info(
            f"Recovered profile storeID matches converted profile group: {recovered_store_id}"
        )

        store_id_pref = self.get_store_id_pref()
        self.assertEqual(
            store_id_pref,
            converted_store_id,
            "toolkit.profiles.storeID pref should match the profile group storeID",
        )
        self.assertNotEqual(
            store_id_pref,
            stale_store_id,
            "toolkit.profiles.storeID pref should NOT be the stale value",
        )
        self.logger.info(f"toolkit.profiles.storeID pref verified: {store_id_pref}")

        self.logger.info("Step 9: Cleaning up")
        self.marionette.quit()
        self.marionette.instance.profile = intermediate_profile
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.cleanup_selectable_profiles()
        self.logger.info("=== Test: Selectable -> Legacy PASSED ===")

    def test_backup_selectable_to_legacy_replace(self):
        """
        Tests that recovering a selectable backup into a legacy profile with
        replaceCurrentProfile=true converts the legacy profile to selectable
        and then deletes the original profile.
        """
        self.logger.info("=== Test: Selectable -> Legacy (Replace) ===")

        self.logger.info("Step 1: Setting up source selectable profile")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})

        selectable_info = self.setup_selectable_profile()
        original_backup_store_id = selectable_info["store_id"]
        self.assertIsNotNone(
            original_backup_store_id, "Backup profile should have storeID"
        )
        self.logger.info(
            f"Created selectable profile with storeID: {original_backup_store_id}"
        )

        self.set_prefs({"test.selectable.replace.pref": "replace-test-value"})
        self.marionette.restart(clean=False, in_app=True)

        self.logger.info("Step 2: Creating backup from selectable profile")
        self._archive_path = self.create_backup()
        self._cleanups.append({"path": self._archive_path})
        self.assertTrue(
            os.path.exists(self._archive_path), "Backup archive should exist"
        )
        self.logger.info(f"Backup created at: {self._archive_path}")

        self.logger.info("Step 3: Switching to new legacy profile environment")
        self.marionette.quit()
        self.marionette.instance.switch_profile()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        legacy_profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": legacy_profile_name})
        self.logger.info(f"Created legacy profile: {legacy_profile_name}")

        self.set_prefs({
            "browser.profiles.enabled": True,
            "browser.profiles.created": False,
        })

        has_selectable = self.has_selectable_profiles()
        self.assertFalse(has_selectable, "Should start as legacy profile")
        self.logger.info("Verified profile is legacy")

        self.logger.info("Step 4: Recovering backup with replaceCurrentProfile=true")
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), "selectable-to-legacy-replace-recovery"
        )
        mozfile.remove(self._recovery_path)
        self._cleanups.append({"path": self._recovery_path})

        recovery_result = self.recover_backup(
            self._archive_path, self._recovery_path, replace_current_profile=True
        )
        self._new_profile_path = recovery_result["path"]
        self._new_profile_id = recovery_result["id"]
        self._cleanups.append({"path": self._new_profile_path})
        self.logger.info(
            f"Recovery complete. New profile path: {self._new_profile_path}"
        )

        self.logger.info("Step 5: Verifying only the recovered profile remains")
        profiles_after = self.get_all_profiles()
        self.logger.info(f"Profiles in database: {profiles_after}")

        self.assertEqual(
            len(profiles_after),
            1,
            "Database should have only 1 profile (original was deleted after replace)",
        )

        recovered_profile = profiles_after[0]
        self.assertEqual(
            recovered_profile["id"],
            self._new_profile_id,
            "The only remaining profile should be the recovered one",
        )
        self.logger.info(
            f"Verified only recovered profile remains: {recovered_profile}"
        )

        self.logger.info("Step 7: Cleaning up")
        self.cleanup_selectable_profiles()
        self.logger.info("=== Test: Selectable -> Legacy (Replace) PASSED ===")
