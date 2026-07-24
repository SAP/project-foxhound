# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Generates backup fixtures with test data for compatibility testing.

This is not part of the regular test suite - run manually before bumping SCHEMA_VERSION
to create a fixture of the current version.

To generate a fixture:
1. Ensure you're on the commit BEFORE bumping SCHEMA_VERSION
2. Add entry to VERSION_CONFIG with backup_file, extra_data list
3. Run: ./mach test browser/components/backup/tests/marionette/test_generate_backup_fixture.py --headless
4. The fixture will be saved to backups/vN_backup.html
5. Add the new fixture to manifest.toml support-files
6. Add a test_recover_vN_backup method to test_compatibility.py
"""

import os
import shutil
import tempfile

import mozfile
from marionette_harness import MarionetteTestCase

VERSION_CONFIG = {
    1: {
        "backup_file": "v1_backup.html",
        "recovery_password": "v1-test-recovery-password",
        "extra_data": [],
    },
}


class GenerateTestBackup(MarionetteTestCase):
    """Generate test backup fixtures for compatibility testing."""

    def setUp(self):
        MarionetteTestCase.setUp(self)

        self.marionette.enforce_gecko_prefs({
            "browser.backup.enabled": True,
            "browser.backup.log": True,
            "browser.backup.archive.enabled": True,
            "browser.backup.archive.overridePlatformCheck": True,
        })

        self.marionette.set_context("chrome")

    def tearDown(self):
        self.marionette.quit()
        self.marionette.instance.switch_profile()
        self.marionette.start_session()
        MarionetteTestCase.tearDown(self)

    def test_generate_v1_backup(self):
        """Generate a v1 backup fixture with test data."""
        self._generate_backup_fixture(1)

    def _generate_backup_fixture(self, version):
        """Generate a backup fixture for a specific version."""
        config = VERSION_CONFIG[version]

        print(f"Adding test data for v{version}...")
        self._add_common_test_data(version)
        for extra in config["extra_data"]:
            add_method = getattr(self, f"_add_{extra}_data")
            add_method(version)

        self.marionette.restart()
        self.marionette.set_context("chrome")

        print("Creating backup...")
        archive_path = self._create_backup(config["recovery_password"])
        print(f"Created backup at: {archive_path}")

        test_dir = os.path.dirname(__file__)
        backups_dir = os.path.join(test_dir, "backups")
        os.makedirs(backups_dir, exist_ok=True)

        output_path = os.path.join(backups_dir, config["backup_file"])
        shutil.copy(archive_path, output_path)
        print(f"V{version} backup saved at: {output_path}")

        mozfile.remove(archive_path)

        self.assertTrue(os.path.exists(output_path), f"V{version} backup should exist")
        print(f"SUCCESS: V{version} backup fixture generated!")

    def _add_common_test_data(self, version):
        """Add login, bookmark, history, and preference test data."""
        prefix = f"v{version}-test"
        self.marionette.execute_async_script(
            """
            const { PlacesUtils } = ChromeUtils.importESModule(
                "resource://gre/modules/PlacesUtils.sys.mjs"
            );

            let [prefix, version, outerResolve] = arguments;
            (async () => {
                // Add test login
                Services.logins.removeAllLogins();
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

                // Add test bookmark
                await PlacesUtils.bookmarks.eraseEverything();
                await PlacesUtils.bookmarks.insert({
                    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
                    title: `V${version} Compatibility Test Bookmark`,
                    url: Services.io.newURI(`https://${prefix}.example.com/bookmark`),
                });

                // Add test history
                await PlacesUtils.history.clear();
                await PlacesUtils.history.insertMany([{
                    url: `https://${prefix}.example.com/history`,
                    visits: [{ transition: PlacesUtils.history.TRANSITION_LINK }],
                }]);

                // Add test preference
                Services.prefs.setBoolPref(`test.v${version}.compatibility.pref`, true);
            })().then(outerResolve);
            """,
            script_args=[prefix, version],
        )

    def _create_backup(self, recovery_password):
        """Create an encrypted backup and return the archive path."""
        dest = os.path.join(tempfile.gettempdir(), "backup-fixture-dest")
        return self.marionette.execute_async_script(
            """
            const { OSKeyStore } = ChromeUtils.importESModule(
                "resource://gre/modules/OSKeyStore.sys.mjs"
            );
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let [destPath, recoveryCode, outerResolve] = arguments;
            (async () => {
                // Use a fake OSKeyStore label to avoid keychain auth prompts
                OSKeyStore.STORE_LABEL = "test-" + Math.random().toString(36).substr(2);

                let bs = BackupService.init();
                bs.setParentDirPath(destPath);
                await bs.enableEncryption(recoveryCode);
                let { archivePath } = await bs.createBackup();

                // Clean up the fake keychain entry
                await OSKeyStore.cleanup();

                return archivePath;
            })().then(outerResolve);
            """,
            script_args=[dest, recovery_password],
        )
