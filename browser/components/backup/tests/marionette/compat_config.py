# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Per-version configuration for backup compatibility tests.

Each version entry defines the fixture files and test hooks for that backup
format version. The keys are:

- legacy_backup_file / selectable_backup_file: Filenames of pre-generated
  backup fixtures used for restore testing. None if that backup type didn't
  exist for the version.
- recovery_password: The password used to encrypt/decrypt the fixture.
- extra_data_legacy / extra_data_selectable: Lists of feature names whose
  test data should be added when generating fixtures. Each entry "foo"
  maps to a _add_foo_data(version) method on the generator class.
  "legacy" entries are added to legacy-only fixtures; "selectable" entries
  are added to selectable profile fixtures (along with any legacy entries).
- extra_checks_legacy / extra_checks_selectable: Lists of feature names
  to verify after restoring a fixture. Each entry "foo" maps to a
  _verify_foo(version) method on the test class. This allows each version
  to declare version-specific assertions beyond the common checks.
"""

VERSION_CONFIG = {
    1: {
        "legacy_backup_file": "v1_backup.html",
        "selectable_backup_file": None,
        "recovery_password": "v1-test-recovery-password",
        "extra_data_legacy": [],
        "extra_data_selectable": [],
        "extra_checks_legacy": [],
        "extra_checks_selectable": [],
    },
    2: {
        "legacy_backup_file": "v2_legacy_backup.html",
        "selectable_backup_file": "v2_selectable_backup.html",
        "recovery_password": "v2-test-recovery-password",
        "extra_data_legacy": [],
        "extra_data_selectable": ["selectable_profile_metadata"],
        "extra_checks_legacy": [],
        "extra_checks_selectable": ["selectable_profile_metadata"],
    },
}
