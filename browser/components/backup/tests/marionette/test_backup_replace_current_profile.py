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


class BackupReplaceCurrentProfileTest(BackupTestBase):
    """
    Tests for recovering backups with replaceCurrentProfile=true.

    This includes:
    1. Verifying the old profile is deleted from the database
    2. Verifying metadata (name, avatar, theme) is copied when recovering
       a legacy backup into a selectable profile environment
    """

    def test_replace_current_profile(self):
        """
        Tests that recovering with replaceCurrentProfile=true deletes the
        current profile from the database.
        """
        self.logger.info("=== Test: Replace Current Profile ===")

        self.logger.info("Step 1: Setting up source selectable profile")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})
        self.logger.info(f"Registered toolkit profile: {profile_name}")

        selectable_info = self.setup_selectable_profile()
        original_profile_id = selectable_info["id"]
        original_profile_path = selectable_info["path"]
        self.logger.info(
            f"Source profile: id={original_profile_id}, path={original_profile_path}"
        )

        self.marionette.restart(clean=False, in_app=True)

        self.logger.info("Step 2: Creating backup")
        self._archive_path = self.create_backup()
        self._cleanups.append({"path": self._archive_path})
        self.assertTrue(
            os.path.exists(self._archive_path), "Backup archive should exist"
        )
        self.logger.info(f"Backup created at: {self._archive_path}")

        self.logger.info("Step 3: Getting profiles before recovery")
        profiles_before = self.get_all_profiles()
        self.logger.info(f"Profiles before recovery: {profiles_before}")

        self.logger.info("Step 4: Recovering backup with replaceCurrentProfile=true")
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), "replace-profile-recovery"
        )
        mozfile.remove(self._recovery_path)
        self._cleanups.append({"path": self._recovery_path})

        new_profile_root = self.run_async(
            """
            let newProfileRoot = await IOUtils.createUniqueDirectory(
                PathUtils.tempDir, "replaceProfileTest"
            );
            return newProfileRoot;
            """
        )
        self._cleanups.append({"path": new_profile_root})
        self.logger.info(f"Created profile root for recovery: {new_profile_root}")

        self.run_async(
            """
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let [archivePath, recoveryPath, profileRoot] = arguments;
            let bs = BackupService.get();
            bs.deleteAndQuitCurrentSelectableProfile = async () => null;
            await bs.recoverFromBackupArchive(
                archivePath, null, false, recoveryPath, profileRoot, true
            );
            """,
            script_args=[self._archive_path, self._recovery_path, new_profile_root],
        )

        self.logger.info("Step 5: Launching recovered profile to verify it works")
        recovered_profile_dirs = os.listdir(new_profile_root)
        self.assertEqual(
            len(recovered_profile_dirs), 1, "Should have exactly one recovered profile"
        )
        recovered_profile_path = os.path.join(
            new_profile_root, recovered_profile_dirs[0]
        )
        self.logger.info(f"Recovered profile path: {recovered_profile_path}")
        self._new_profile_path = recovered_profile_path

        self.marionette.quit()
        self.marionette.instance.profile = recovered_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()
        self.logger.info("Post-recovery complete")

        self.init_selectable_profile_service()

        self.logger.info("Step 6: Cleaning up")
        self.cleanup_selectable_profiles()
        self.logger.info("=== Test: Replace Current Profile PASSED ===")

    def test_replace_current_profile_legacy_backup_copies_metadata(self):
        """
        Tests that recovering a legacy backup with replaceCurrentProfile=true
        copies the current profile's metadata (name, avatar, theme) to the
        new profile.
        """
        self.logger.info(
            "=== Test: Replace Current Profile - Legacy Backup Copies Metadata ==="
        )

        self.logger.info("Step 1: Creating legacy backup (no selectable profiles)")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})

        self.set_prefs({
            "browser.profiles.enabled": False,
            "browser.profiles.created": False,
        })

        has_selectable = self.has_selectable_profiles()
        self.assertFalse(has_selectable, "Should be a legacy profile")
        self.logger.info("Verified profile is legacy")

        self._archive_path = self.create_backup()
        self._cleanups.append({"path": self._archive_path})
        self.assertTrue(
            os.path.exists(self._archive_path), "Backup archive should exist"
        )
        self.logger.info(f"Legacy backup created at: {self._archive_path}")

        self.logger.info(
            "Step 2: Setting up destination selectable profile with custom metadata"
        )
        self.marionette.quit()
        self.marionette.instance.switch_profile()
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        recovery_profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": recovery_profile_name})

        self.setup_selectable_profile()

        custom_name = "My Custom Profile"
        custom_avatar = "book"
        custom_theme = {"themeBg": "#ff5500", "themeFg": "#ffffff"}
        self.run_async(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            let profile = SelectableProfileService.currentProfile;
            profile.name = arguments[0];
            profile.setAvatar(arguments[1]);
            profile.theme = arguments[2];
            """,
            script_args=[custom_name, custom_avatar, custom_theme],
        )
        self.logger.info(
            f"Set custom metadata: name={custom_name}, avatar={custom_avatar}"
        )

        self.logger.info(
            "Step 3: Recovering legacy backup with replaceCurrentProfile=true"
        )
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), "legacy-replace-profile-recovery"
        )
        mozfile.remove(self._recovery_path)
        self._cleanups.append({"path": self._recovery_path})

        new_profile_root = self.run_async(
            """
            let newProfileRoot = await IOUtils.createUniqueDirectory(
                PathUtils.tempDir, "legacyReplaceTest"
            );
            return newProfileRoot;
            """
        )
        self._cleanups.append({"path": new_profile_root})
        self.logger.info(f"Created profile root for recovery: {new_profile_root}")

        self.run_async(
            """
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let [archivePath, recoveryPath, profileRoot] = arguments;
            let bs = BackupService.get();
            bs.deleteAndQuitCurrentSelectableProfile = async () => null;
            await bs.recoverFromBackupArchive(
                archivePath, null, false, recoveryPath, profileRoot, true
            );
            """,
            script_args=[self._archive_path, self._recovery_path, new_profile_root],
        )

        self.logger.info("Step 4: Launching recovered profile to verify metadata")
        recovered_profile_dirs = os.listdir(new_profile_root)
        self.assertEqual(
            len(recovered_profile_dirs), 1, "Should have exactly one recovered profile"
        )
        recovered_profile_path = os.path.join(
            new_profile_root, recovered_profile_dirs[0]
        )
        self.logger.info(f"Recovered profile path: {recovered_profile_path}")
        self._new_profile_path = recovered_profile_path

        self.marionette.quit()
        self.marionette.instance.profile = recovered_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()
        self.logger.info("Post-recovery complete")

        self.logger.info("Step 5: Verifying recovered profile has copied metadata")
        self.init_selectable_profile_service()

        recovered_profile_metadata = self.run_async(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            const { FileUtils } = ChromeUtils.importESModule(
                "resource://gre/modules/FileUtils.sys.mjs"
            );

            let filePath = new FileUtils.File(arguments[0]);
            let profile = await SelectableProfileService.getProfileByPath(filePath);
            if (!profile) return null;
            return {
                id: profile.id,
                name: profile.name,
                avatar: profile.avatar,
                theme: profile.theme
            };
            """,
            script_args=[recovered_profile_path],
        )

        self.assertIsNotNone(
            recovered_profile_metadata, "Should have recovered profile metadata"
        )
        self.assertEqual(
            recovered_profile_metadata["name"],
            custom_name,
            "Recovered profile should have the old profile's name",
        )
        self.assertEqual(
            recovered_profile_metadata["avatar"],
            custom_avatar,
            "Recovered profile should have the old profile's avatar",
        )
        self.logger.info(
            f"Verified metadata was copied: name={recovered_profile_metadata['name']}, "
            f"avatar={recovered_profile_metadata['avatar']}"
        )

        self.logger.info("Step 6: Cleaning up")
        self.cleanup_selectable_profiles()
        self.logger.info(
            "=== Test: Replace Current Profile - Legacy Backup Copies Metadata PASSED ==="
        )
