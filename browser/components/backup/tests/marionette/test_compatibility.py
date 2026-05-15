# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Tests that backups created with older manifest versions can still be
recovered by the current version of Firefox.

This ensures backward compatibility as the backup schema evolves.

To add a new version:
1. Before bumping SCHEMA_VERSION, run test_generate_backup_fixture.py to create the fixture
2. Add entry to VERSION_CONFIG with backup_file, extra_checks list
3. Implement any new _verify_* methods for extra_checks
4. Add test method: test_recover_vN_backup calling _test_recover_backup(N)
"""

import os
import sys
import tempfile
from pathlib import Path

import mozfile

sys.path.append(os.fspath(Path(__file__).parents[0]))
from backup_test_base import BackupTestBase

VERSION_CONFIG = {
    1: {
        "backup_file": "v1_backup.html",
        "recovery_password": "v1-test-recovery-password",
        "extra_checks": [],
    },
}


class BackupCompatibilityTest(BackupTestBase):
    """Test backward compatibility of backup recovery across schema versions."""

    def test_recover_v1_backup_selectable(self):
        """Test that a v1 backup can be recovered into a selectable profile environment."""
        self.logger.info("=== Test: V1 Backup -> Selectable ===")
        self._test_recover_backup_selectable(1)

    def test_recover_v1_backup_legacy(self):
        """Test that a v1 backup can be recovered into a legacy profile environment."""
        self.logger.info("=== Test: V1 Backup -> Legacy ===")
        self._test_recover_backup_legacy(1)

    def _test_recover_backup_selectable(self, version):
        """Test recovering a backup into a selectable profile environment."""
        config = VERSION_CONFIG[version]
        backup_path = self._get_backup_path(config["backup_file"])
        self.assertTrue(
            os.path.exists(backup_path),
            f"V{version} backup fixture must exist at {backup_path}",
        )

        self.logger.info("Step 1: Setting up selectable profile environment")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})

        selectable_info = self.setup_selectable_profile()
        original_store_id = selectable_info["store_id"]
        self.assertIsNotNone(original_store_id, "storeID should be set")
        self.logger.info(f"Recovery environment storeID: {original_store_id}")

        self.logger.info(f"Step 2: Recovering v{version} backup")
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), f"v{version}-compat-selectable-recovery"
        )
        mozfile.remove(self._recovery_path)
        self._cleanups.append({"path": self._recovery_path})

        result = self._recover_backup(
            backup_path, self._recovery_path, config["recovery_password"]
        )
        self._new_profile_path = result["path"]
        self._new_profile_id = result["id"]
        self._cleanups.append({"path": self._new_profile_path})
        self.logger.info(
            f"Recovery complete. New profile path: {self._new_profile_path}"
        )

        self.logger.info("Step 3: Launching recovered profile and verifying data")
        self.marionette.quit()
        intermediate_profile = self.marionette.instance.profile
        self.marionette.instance.profile = self._new_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()

        self.init_selectable_profile_service()

        store_id = self.get_store_id()
        self.assertEqual(
            store_id,
            original_store_id,
            "Recovered profile should have the same storeID as profile group",
        )
        self.logger.info(f"Verified storeID matches: {store_id}")

        self._verify_common_data(version)

        for check in config["extra_checks"]:
            verify_method = getattr(self, f"_verify_{check}")
            verify_method(version)

        self.logger.info("Step 4: Cleaning up")
        self.marionette.quit()
        self.marionette.instance.profile = intermediate_profile
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.cleanup_selectable_profiles()
        self.logger.info(f"=== Test: V{version} Backup -> Selectable PASSED ===")

    def _test_recover_backup_legacy(self, version):
        """Test recovering a backup into a legacy profile environment."""
        config = VERSION_CONFIG[version]
        backup_path = self._get_backup_path(config["backup_file"])
        self.assertTrue(
            os.path.exists(backup_path),
            f"V{version} backup fixture must exist at {backup_path}",
        )

        self.logger.info("Step 1: Setting up legacy profile environment")
        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})

        self.set_prefs({
            "browser.profiles.enabled": True,
            "browser.profiles.created": False,
        })

        has_selectable = self.has_selectable_profiles()
        self.assertFalse(has_selectable, "Should start as legacy profile")
        self.logger.info("Verified profile is legacy")

        self.logger.info(f"Step 2: Recovering v{version} backup")
        self._recovery_path = os.path.join(
            tempfile.gettempdir(), f"v{version}-compat-legacy-recovery"
        )
        mozfile.remove(self._recovery_path)
        self._cleanups.append({"path": self._recovery_path})

        result = self._recover_backup(
            backup_path, self._recovery_path, config["recovery_password"]
        )
        self._new_profile_path = result["path"]
        self._new_profile_id = result["id"]
        self._cleanups.append({"path": self._new_profile_path})
        self.logger.info(
            f"Recovery complete. New profile path: {self._new_profile_path}"
        )

        self.logger.info("Step 3: Verifying legacy profile was converted to selectable")
        has_selectable_after = self.has_selectable_profiles()
        self.assertTrue(
            has_selectable_after,
            "Legacy profile should be converted to selectable after recovery",
        )
        self.logger.info("Legacy profile converted to selectable")

        self.logger.info("Step 4: Launching recovered profile and verifying data")
        self.marionette.quit()
        intermediate_profile = self.marionette.instance.profile
        self.marionette.instance.profile = self._new_profile_path
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.wait_for_post_recovery()

        self.init_selectable_profile_service()

        self._verify_common_data(version)

        for check in config["extra_checks"]:
            verify_method = getattr(self, f"_verify_{check}")
            verify_method(version)

        self.logger.info("Step 5: Cleaning up")
        self.marionette.quit()
        self.marionette.instance.profile = intermediate_profile
        self.marionette.start_session()
        self.marionette.set_context("chrome")

        self.cleanup_selectable_profiles()
        self.logger.info(f"=== Test: V{version} Backup -> Legacy PASSED ===")

    def _verify_common_data(self, version):
        """Verify data that should exist in all backup versions."""
        prefix = f"v{version}-test"
        self._verify_login(f"https://{prefix}.example.com")
        self._verify_bookmark(f"https://{prefix}.example.com/bookmark")
        self._verify_history(f"https://{prefix}.example.com/history")
        self._verify_preference(f"test.v{version}.compatibility.pref")

    def _get_backup_path(self, filename):
        """Get path to a backup fixture."""
        test_dir = os.path.dirname(__file__)
        return os.path.join(test_dir, "backups", filename)

    def _recover_backup(
        self,
        archive_path,
        recovery_path,
        recovery_password,
        replace_current_profile=False,
    ):
        """Recover from an encrypted backup archive."""
        return self.run_async(
            """
            const { OSKeyStore } = ChromeUtils.importESModule(
                "resource://gre/modules/OSKeyStore.sys.mjs"
            );
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let [archivePath, recoveryCode, recoveryPath, replaceCurrentProfile] = arguments;
            // Use a fake OSKeyStore label to avoid keychain auth prompts
            OSKeyStore.STORE_LABEL = "test-" + Math.random().toString(36).substr(2);

            let bs = BackupService.init();
            let newProfileRoot = await IOUtils.createUniqueDirectory(
                PathUtils.tempDir, "backupCompatTest"
            );
            let profile = await bs.recoverFromBackupArchive(
                archivePath, recoveryCode, false, recoveryPath, newProfileRoot, replaceCurrentProfile
            );
            let rootDir = await profile.rootDir;
            return { name: profile.name, path: rootDir.path, id: profile.id };
            """,
            script_args=[
                archive_path,
                recovery_password,
                recovery_path,
                replace_current_profile,
            ],
        )

    def _verify_login(self, origin):
        """Verify a login exists for the given origin."""
        count = self.marionette.execute_async_script(
            """
            let [origin, outerResolve] = arguments;
            (async () => {
                let logins = await Services.logins.searchLoginsAsync({
                    origin: origin,
                });
                return logins.length;
            })().then(outerResolve);
            """,
            script_args=[origin],
        )
        self.assertEqual(count, 1, f"Login for {origin} should exist")

    def _verify_bookmark(self, url):
        """Verify a bookmark exists for the given URL."""
        exists = self.marionette.execute_async_script(
            """
            const { PlacesUtils } = ChromeUtils.importESModule(
                "resource://gre/modules/PlacesUtils.sys.mjs"
            );
            let [url, outerResolve] = arguments;
            (async () => {
                let bookmark = await PlacesUtils.bookmarks.fetch({ url });
                return bookmark != null;
            })().then(outerResolve);
            """,
            script_args=[url],
        )
        self.assertTrue(exists, f"Bookmark for {url} should exist")

    def _verify_history(self, url):
        """Verify a history entry exists for the given URL."""
        exists = self.marionette.execute_async_script(
            """
            const { PlacesUtils } = ChromeUtils.importESModule(
                "resource://gre/modules/PlacesUtils.sys.mjs"
            );
            let [url, outerResolve] = arguments;
            (async () => {
                let entry = await PlacesUtils.history.fetch(url);
                return entry != null;
            })().then(outerResolve);
            """,
            script_args=[url],
        )
        self.assertTrue(exists, f"History for {url} should exist")

    def _verify_preference(self, pref_name):
        """Verify a preference exists and is true."""
        value = self.marionette.execute_script(
            """
            let [prefName] = arguments;
            return Services.prefs.getBoolPref(prefName, false);
            """,
            script_args=[pref_name],
        )
        self.assertTrue(value, f"Preference {pref_name} should be true")
