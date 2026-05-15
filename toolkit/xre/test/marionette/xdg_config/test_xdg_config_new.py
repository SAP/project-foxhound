import os
import sys

sys.path.append(os.path.dirname(__file__))

from xdg_config_home_test_case import XdgConfigHomeTestCase


class TestXdgConfigHomeNew(XdgConfigHomeTestCase):
    def test_profile_dir(self):
        self.client.navigate(self.about_support)

        profile_subdir = self.get_asserted_profile_subdir()
        self.assertTrue(
            profile_subdir.startswith(".config/mozilla/firefox"),
            "Profile is under $HOME/.config/mozilla/firefox",
        )
