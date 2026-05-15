# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os

from marionette_driver import Wait
from marionette_harness import MarionetteTestCase


class TestSafeBrowsingInitialDownload(MarionetteTestCase):
    shavar_file_extensions = [
        "vlpset",
        "sbstore",
    ]

    protobuf_file_extensions = [
        "vlpset",
        "metadata",
    ]

    prefs_download_lists = [
        "urlclassifier.blockedTable",
        "urlclassifier.downloadAllowTable",
        "urlclassifier.downloadBlockTable",
        "urlclassifier.malwareTable",
        "urlclassifier.phishTable",
        "urlclassifier.trackingTable",
        "urlclassifier.trackingWhitelistTable",
    ]

    prefs_provider_update_time = {
        # Force an immediate download of the safebrowsing files
        "browser.safebrowsing.provider.mozilla.nextupdatetime": 1,
    }

    prefs_provider_google_update_time = {}

    prefs_safebrowsing = {
        "services.settings.server": "https://firefox.settings.services.mozilla.com/v1",
        "browser.safebrowsing.debug": True,
        "browser.safebrowsing.update.enabled": True,
    }

    def get_safebrowsing_files(self, is_v4):
        files = []

        if is_v4:
            my_file_extensions = self.protobuf_file_extensions
        else:  # v2
            my_file_extensions = self.shavar_file_extensions

        for pref_name in self.prefs_download_lists:
            base_names = self.marionette.get_pref(pref_name).split(",")

            # moztest- lists are not saved to disk
            # pylint --py3k: W1639
            base_names = list(
                filter(lambda x: not x.startswith("moztest-"), base_names)
            )

            for ext in my_file_extensions:
                files.extend([
                    f"{f}.{ext}"
                    for f in base_names
                    if f and f.endswith("-proto") == is_v4
                ])

        return set(sorted(files))

    def setUp(self):
        super().setUp()

        self.safebrowsing_shavar_files = self.get_safebrowsing_files(False)
        if any(
            f.startswith("goog-") or f.startswith("googpub-")
            for f in self.safebrowsing_shavar_files
        ):
            self.prefs_provider_google_update_time.update({
                "browser.safebrowsing.provider.google.nextupdatetime": 1,
            })

        self.safebrowsing_protobuf_files = self.get_safebrowsing_files(True)
        if any(
            f.startswith("goog-") or f.startswith("googpub-")
            for f in self.safebrowsing_protobuf_files
        ):
            self.prefs_provider_google_update_time.update({
                "browser.safebrowsing.provider.google4.nextupdatetime": 1,
                "browser.safebrowsing.provider.google5.nextupdatetime": 1,
            })

        # Force the preferences for the new profile
        enforce_prefs = self.prefs_safebrowsing
        enforce_prefs.update(self.prefs_provider_update_time)
        enforce_prefs.update(self.prefs_provider_google_update_time)
        self.marionette.enforce_gecko_prefs(enforce_prefs)

        self.safebrowsing_path = os.path.join(
            self.marionette.instance.profile.profile, "safebrowsing"
        )

    def tearDown(self):
        try:
            # Restart with a fresh profile
            self.marionette.restart(in_app=False, clean=True)
        finally:
            super().tearDown()

    def test_safe_browsing_initial_download(self):
        def check_downloaded(_):
            # All prefs in prefs_provider_update_time must be updated.
            # For prefs_provider_google_update_time (google4/google5),
            # either one being updated is sufficient since only one
            # provider will be active depending on whether V5 is enabled.
            for pref in self.prefs_provider_update_time:
                if int(self.marionette.get_pref(pref)) == 1:
                    return False
            if self.prefs_provider_google_update_time and not any(
                int(self.marionette.get_pref(pref)) != 1
                for pref in self.prefs_provider_google_update_time
            ):
                return False
            return True

        try:
            Wait(self.marionette, timeout=170).until(
                check_downloaded,
                message="Not all safebrowsing files have been downloaded",
            )
        finally:
            files_on_disk_toplevel = os.listdir(self.safebrowsing_path)
            for f in self.safebrowsing_shavar_files:
                self.assertIn(f, files_on_disk_toplevel)

            if len(self.safebrowsing_protobuf_files) > 0:
                files_on_disk_google4 = os.listdir(
                    os.path.join(self.safebrowsing_path, "google4")
                )
                for f in self.safebrowsing_protobuf_files:
                    self.assertIn(f, files_on_disk_google4)
