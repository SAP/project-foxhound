# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import tempfile
import time

import mozfile
import mozlog
from marionette_harness import MarionetteTestCase


class BackupTestBase(MarionetteTestCase):
    """
    Base class for backup/recovery marionette tests.

    Provides common setup, teardown, and helper methods for testing
    backup and recovery scenarios involving selectable profiles.
    """

    _sandbox = "BackupTestSandbox"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = mozlog.get_default_logger(component=self.__class__.__name__)

    def setUp(self):
        MarionetteTestCase.setUp(self)
        self.logger.info("Setting up test environment")

        self.marionette.enforce_gecko_prefs({
            "browser.backup.enabled": True,
            "browser.backup.log": True,
            "browser.backup.archive.enabled": True,
            "browser.backup.restore.enabled": True,
            "browser.backup.archive.overridePlatformCheck": True,
            "browser.backup.restore.overridePlatformCheck": True,
            "browser.backup.profiles.force-enable": True,
        })
        self.marionette.set_context("chrome")
        self.logger.info("Backup prefs configured")

        self._profile_name = None
        self._archive_path = None
        self._recovery_path = None
        self._new_profile_path = None
        self._new_profile_id = None
        self._cleanups = []

    def tearDown(self):
        self.logger.info("Tearing down test environment")
        self.marionette.restart(in_app=False, clean=True)

        for cleanup in self._cleanups:
            if cleanup.get("profile_name"):
                self.logger.info(f"Removing toolkit profile: {cleanup['profile_name']}")
                try:
                    self.marionette.execute_script(
                        """
                        let name = arguments[0];
                        let profileSvc = Cc["@mozilla.org/toolkit/profile-service;1"]
                            .getService(Ci.nsIToolkitProfileService);
                        let profile = profileSvc.getProfileByName(name);
                        profile.remove(false);
                        profileSvc.flush();
                        """,
                        script_args=(cleanup["profile_name"],),
                    )
                except Exception:
                    self.logger.warning(
                        f"Failed to remove profile: {cleanup['profile_name']}"
                    )

            if cleanup.get("path"):
                self.logger.info(f"Removing path: {cleanup['path']}")
                mozfile.remove(cleanup["path"])

        MarionetteTestCase.tearDown(self)
        self.logger.info("Teardown complete")

    def run_code(self, script, *args, **kwargs):
        """Run synchronous JS code."""
        return self.marionette.execute_script(
            script, new_sandbox=False, sandbox=self._sandbox, *args, **kwargs
        )

    def run_async_code(self, script, *args, **kwargs):
        """Run async JS code without error handling."""
        return self.marionette.execute_async_script(
            script, new_sandbox=False, sandbox=self._sandbox, *args, **kwargs
        )

    def run_async(self, script, script_args=None):
        """Run async JS code with error handling. Returns the script's return value."""
        wrapped = f"""
            let args = Array.from(arguments);
            let resolve = args.pop();
            (async () => {{
                try {{
                    return ["OK", await (async () => {{ {script} }})()];
                }} catch (e) {{
                    return ["ERROR", e.name, e.message, e.stack];
                }}
            }})().then(resolve);
        """
        result = self.marionette.execute_async_script(
            wrapped,
            script_args=script_args or [],
            new_sandbox=False,
            sandbox=self._sandbox,
        )
        self.assertEqual("OK", result[0], f"Script error: {result}")
        return result[1]

    def set_prefs(self, prefs):
        """Set prefs via Services.prefs (writes to profile's prefs.js only)."""
        self.marionette.execute_script(
            """
            for (let [name, value] of Object.entries(arguments[0])) {
                if (typeof value === "boolean")
                    Services.prefs.setBoolPref(name, value);
                else if (typeof value === "number")
                    Services.prefs.setIntPref(name, value);
                else if (typeof value === "string")
                    Services.prefs.setStringPref(name, value);
            }
            """,
            script_args=[prefs],
        )

    def register_profile_and_restart(self):
        """Register the profile with toolkit profile service and restart."""
        profile_name = "marionette-backup-test-" + str(int(time.time() * 1000))

        self.marionette.execute_script(
            """
            let profD = Services.dirsvc.get("ProfD", Ci.nsIFile);
            let profileName = arguments[0];
            let profileSvc = Cc["@mozilla.org/toolkit/profile-service;1"]
                .getService(Ci.nsIToolkitProfileService);
            let myProfile = profileSvc.createProfile(profD, profileName);
            profileSvc.flush();
            """,
            script_args=(profile_name,),
        )

        self.marionette.restart(clean=False, in_app=True)

        return profile_name

    def setup_selectable_profile(self):
        """Set up selectable profiles by creating a new profile in the database."""
        result = self.run_async(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            let newProfile = await SelectableProfileService.createNewProfile(false);
            let profileCount = (await SelectableProfileService.getAllProfiles()).length;
            let profile = SelectableProfileService.currentProfile;
            if (!profile) {
                throw new Error("currentProfile is null after createNewProfile");
            }
            return {
                path: profile.path,
                name: profile.name,
                store_id: SelectableProfileService.storeID,
                count: profileCount,
                id: profile.id
            };
            """
        )
        return result

    def create_backup(self):
        """Create a backup and return the archive path."""
        dest = os.path.join(tempfile.gettempdir(), "backup-dest")
        return self.run_async(
            """
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let bs = BackupService.init();
            bs.setParentDirPath(arguments[0]);
            let { archivePath } = await bs.createBackup();
            return archivePath;
            """,
            script_args=[dest],
        )

    def recover_backup(
        self, archive_path, recovery_path, replace_current_profile=False
    ):
        """Recover backup and return profile info."""
        return self.run_async(
            """
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            let [archivePath, recoveryPath, replaceCurrentProfile] = arguments;
            let bs = BackupService.get();
            let newProfileRoot = await IOUtils.createUniqueDirectory(
                PathUtils.tempDir, "backupTest"
            );
            let profile = await bs.recoverFromBackupArchive(
                archivePath, null, false, recoveryPath, newProfileRoot, replaceCurrentProfile
            );
            let rootDir = await profile.rootDir;
            return { name: profile.name, path: rootDir.path, id: profile.id };
            """,
            script_args=[archive_path, recovery_path, replace_current_profile],
        )

    def get_store_id(self):
        """Get the current storeID from SelectableProfileService."""
        return self.run_code(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            return SelectableProfileService.storeID;
            """
        )

    def get_store_id_pref(self):
        """Get the toolkit.profiles.storeID pref value."""
        return self.run_code(
            """
            return Services.prefs.getStringPref("toolkit.profiles.storeID", null);
            """
        )

    def has_selectable_profiles(self):
        """Check if selectable profiles have been created."""
        return self.run_code(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            return SelectableProfileService.hasCreatedSelectableProfiles();
            """
        )

    def wait_for_post_recovery(self):
        """Wait for post-recovery actions to complete."""
        self.run_async(
            """
            const { BackupService } = ChromeUtils.importESModule(
                "resource:///modules/backup/BackupService.sys.mjs"
            );
            await BackupService.get().postRecoveryComplete;
            """
        )

    def get_all_profiles(self):
        """Get all profiles from the SelectableProfileService database."""
        return self.run_async(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            let profiles = await SelectableProfileService.getAllProfiles();
            return profiles.map(p => ({ id: p.id, name: p.name, path: p.path }));
            """
        )

    def get_original_profile_name(self):
        """Get the localized 'Original Profile' name."""
        return self.run_async(
            """
            let localization = new Localization(["browser/profiles.ftl"]);
            let [originalName] = await localization.formatMessages([
                { id: "original-profile-name" }
            ]);
            return originalName.value;
            """
        )

    def cleanup_selectable_profiles(self):
        """Clean up selectable profiles database."""
        self.run_async(
            """
            let [profileId] = arguments;
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            const { ProfilesDatastoreService } = ChromeUtils.importESModule(
                "moz-src:///toolkit/profile/ProfilesDatastoreService.sys.mjs"
            );

            if (profileId) {
                try {
                    let profile = await SelectableProfileService.getProfile(profileId);
                    if (profile) await SelectableProfileService.deleteProfile(profile);
                } catch (e) {}
            }

            let dbPath = await ProfilesDatastoreService.getProfilesStorePath();
            await SelectableProfileService.uninit();
            await ProfilesDatastoreService.uninit();
            for (let suffix of ["", "-shm", "-wal"]) {
                try { await IOUtils.remove(dbPath + suffix); } catch (e) {}
            }
            """,
            script_args=[self._new_profile_id],
        )

    def init_selectable_profile_service(self):
        """Initialize the SelectableProfileService."""
        self.run_async(
            """
            const { SelectableProfileService } = ChromeUtils.importESModule(
                "resource:///modules/profiles/SelectableProfileService.sys.mjs"
            );
            await SelectableProfileService.init();
            """
        )
