import os
import sys

sys.path.append(os.path.dirname(__file__))

from xdg_config_home_test_case import XdgConfigHomeTestCase


class TestXdgConfigHomeLegacy(XdgConfigHomeTestCase):
    def setUp(self):
        assert "MOZ_LEGACY_HOME" not in self._env.keys()
        self._env.update({"MOZ_LEGACY_HOME": "1"})
        super().setUp()

    def test_profile_dir(self):
        self.client.navigate(self.about_support)

        profile_subdir = self.get_asserted_profile_subdir()
        self.assertTrue(
            profile_subdir.startswith(".mozilla/firefox"),
            "Profile is under .mozilla/firefox",
        )
