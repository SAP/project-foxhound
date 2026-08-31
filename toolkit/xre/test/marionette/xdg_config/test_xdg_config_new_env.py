import os
import sys

sys.path.append(os.path.dirname(__file__))

from xdg_config_home_test_case import XdgConfigHomeTestCase


class TestXdgConfigHomeNewEnv(XdgConfigHomeTestCase):
    def setUp(self):
        assert "XDG_CONFIG_HOME" not in self._env.keys()
        self._env.update({"XDG_CONFIG_HOME": f"{self.homedir}/mozXDG-config-dir"})
        super().setUp()

    def test_profile_dir(self):
        self.client.navigate(self.about_support)

        profile_subdir = self.get_asserted_profile_subdir()
        self.assertTrue(
            profile_subdir.startswith("mozXDG-config-dir/mozilla/firefox"),
            "Profile is under 'mozXDG-config-dir/mozilla/firefox'",
        )
