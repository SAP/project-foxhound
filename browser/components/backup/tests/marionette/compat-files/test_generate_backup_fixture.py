# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Generates backup fixtures with test data for compatibility testing.

This is not part of the regular test suite - run manually before bumping SCHEMA_VERSION
to create fixtures of the current version.

To generate fixtures:
1. Ensure you're on the commit BEFORE bumping SCHEMA_VERSION
2. Add entry to VERSION_CONFIG in compat_config.py
3. Run: ./mach test browser/components/backup/tests/marionette/compat-files/test_generate_backup_fixture.py --headless
4. Legacy and selectable fixtures will be saved to backups/
5. Add the new fixtures to manifest.toml support-files
6. Add test methods to test_compatibility.py
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

import mozfile

sys.path.append(os.fspath(Path(__file__).parents[1]))
from backup_test_base import BackupTestBase
from compat_config import VERSION_CONFIG


class GenerateTestBackup(BackupTestBase):
    """Generate test backup fixtures for compatibility testing."""

    def test_generate_current_version_backup(self):
        """Auto-detect schema version and generate both fixture types."""
        version = self.run_code(
            """
            const { ArchiveUtils } = ChromeUtils.importESModule(
                "resource:///modules/backup/ArchiveUtils.sys.mjs"
            );
            return ArchiveUtils.SCHEMA_VERSION;
            """
        )
        self.logger.info(f"Detected SCHEMA_VERSION: {version}")
        self.assertIn(
            version,
            VERSION_CONFIG,
            f"VERSION_CONFIG has no entry for schema version {version}. "
            f"Add one to compat_config.py before generating fixtures.",
        )

        self._generate_legacy_fixture(version)

        self.marionette.restart(in_app=False, clean=True)
        self.marionette.set_context("chrome")

        self._generate_selectable_fixture(version)

    def _generate_legacy_fixture(self, version):
        """Generate a legacy (non-selectable-profile) backup fixture."""
        config = VERSION_CONFIG[version]
        self.logger.info(f"Generating legacy fixture for v{version}")

        self._add_common_test_data(version)
        for extra in config["extra_data_legacy"]:
            add_method = getattr(self, f"_add_{extra}_data")
            add_method(version)

        self.marionette.restart()
        self.marionette.set_context("chrome")

        archive_path = self._create_encrypted_backup(config["recovery_password"])
        self.logger.info(f"Created legacy backup at: {archive_path}")

        output_path = self._save_fixture(archive_path, f"v{version}_legacy_backup.html")
        self.assertTrue(
            os.path.exists(output_path), f"Legacy fixture should exist at {output_path}"
        )
        self.logger.info(f"Legacy fixture saved: {output_path}")

    def _generate_selectable_fixture(self, version):
        """Generate a selectable-profile backup fixture."""
        config = VERSION_CONFIG[version]
        self.logger.info(f"Generating selectable fixture for v{version}")

        profile_name = self.register_profile_and_restart()
        self._cleanups.append({"profile_name": profile_name})

        self.setup_selectable_profile()

        self._add_common_test_data(version)
        for extra in config["extra_data_legacy"]:
            add_method = getattr(self, f"_add_{extra}_data")
            add_method(version)
        for extra in config["extra_data_selectable"]:
            add_method = getattr(self, f"_add_{extra}_data")
            add_method(version)

        self.marionette.restart(clean=False, in_app=True)
        self.marionette.set_context("chrome")

        self.marionette.enforce_gecko_prefs({
            "browser.backup.enabled": True,
            "browser.backup.log": True,
            "browser.backup.archive.enabled": True,
            "browser.backup.restore.enabled": True,
            "browser.backup.profiles.force-enable": True,
        })

        archive_path = self._create_encrypted_backup(config["recovery_password"])
        self.logger.info(f"Created selectable backup at: {archive_path}")

        output_path = self._save_fixture(
            archive_path, f"v{version}_selectable_backup.html"
        )
        self.assertTrue(
            os.path.exists(output_path),
            f"Selectable fixture should exist at {output_path}",
        )
        self.logger.info(f"Selectable fixture saved: {output_path}")

    def _add_selectable_profile_metadata_data(self, version):
        self.set_selectable_profile_metadata(f"V{version} Test Profile", "book")

    def _add_common_test_data(self, version):
        prefix = f"v{version}-test"
        self.marionette.execute_async_script(
            """
            const { PlacesUtils } = ChromeUtils.importESModule(
                "resource://gre/modules/PlacesUtils.sys.mjs"
            );

            let [prefix, version, outerResolve] = arguments;
            (async () => {
                await Services.logins.removeAllLoginsAsync();
                const nsLoginInfo = new Components.Constructor(
                    "@mozilla.org/login-manager/loginInfo;1",
                    Ci.nsILoginInfo,
                    "init"
                );
                const login = new nsLoginInfo(
                    `https://${prefix}.example.com`,
                    `https://${prefix}.example.com`,
                    null,
                    `${prefix}-user`,
                    `${prefix}-password`,
                    "user",
                    "pass"
                );
                await Services.logins.addLoginAsync(login);

                await PlacesUtils.bookmarks.eraseEverything();
                await PlacesUtils.bookmarks.insert({
                    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
                    title: `V${version} Compatibility Test Bookmark`,
                    url: Services.io.newURI(`https://${prefix}.example.com/bookmark`),
                });

                await PlacesUtils.history.clear();
                await PlacesUtils.history.insertMany([{
                    url: `https://${prefix}.example.com/history`,
                    visits: [{ transition: PlacesUtils.history.TRANSITION_LINK }],
                }]);

                Services.prefs.setBoolPref(`test.v${version}.compatibility.pref`, true);
            })().then(outerResolve);
            """,
            script_args=[prefix, version],
        )

    def _create_encrypted_backup(self, recovery_password):
        dest = os.path.join(tempfile.gettempdir(), "backup-fixture-dest")
        return self.run_async(
            """
            const { OSKeyStore } = ChromeUtils.importESModule(
                "resource://gre/modules/OSKeyStore.sys.mjs"
            );
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let [destPath, recoveryCode] = arguments;

            OSKeyStore.STORE_LABEL = "test-" + Math.random().toString(36).substr(2);

            let bs = BackupService.init();
            await bs.setParentDirPath(destPath);

            await bs.enableEncryption(recoveryCode);

            let result = await bs.createBackup();
            if (!result) {
                throw new Error(
                    "createBackup returned null; archiveEnabledStatus: " +
                    JSON.stringify(bs.archiveEnabledStatus)
                );
            }

            await OSKeyStore.cleanup();

            return result.archivePath;
            """,
            script_args=[dest, recovery_password],
        )

    def _save_fixture(self, archive_path, filename):
        test_dir = os.path.dirname(__file__)
        backups_dir = os.path.join(test_dir, "backups")
        os.makedirs(backups_dir, exist_ok=True)

        output_path = os.path.join(backups_dir, filename)
        shutil.copy(archive_path, output_path)
        mozfile.remove(archive_path)
        return output_path
