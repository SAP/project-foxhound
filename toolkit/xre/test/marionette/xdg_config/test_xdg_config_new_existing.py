import os
import sys

import mozfile

sys.path.append(os.path.dirname(__file__))

from xdg_config_home_test_case import XdgConfigHomeTestCase


class TestXdgConfigHomeNewExisting(XdgConfigHomeTestCase):
    def setUp(self):
        assert "XDG_CONFIG_HOME" not in self._env.keys()
        self._env.update({"XDG_CONFIG_HOME": f"{self.homedir}/.config-test/"})
        self.product_root = self.make_product_root(
            os.path.join(".config-test", "mozilla", "firefox")
        )
        super().setUp()

    def tearDown(self):
        mozfile.remove(self.product_root)
        assert not os.path.exists(self.product_root)
        super().tearDown()

    def test_profile_dir(self):
        self.client.navigate(self.about_support)

        profile_subdir = self.get_asserted_profile_subdir()
        self.assertTrue(
            profile_subdir.startswith(".config-test/mozilla/firefox"),
            "Profile is under '.config-test/mozilla/firefox'",
        )
