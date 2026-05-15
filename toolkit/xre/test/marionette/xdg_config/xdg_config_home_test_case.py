import os
import subprocess
import tempfile

import mozfile
from marionette_driver.marionette import Marionette
from marionette_harness import MarionetteTestCase


class XdgConfigHomeTestCase(MarionetteTestCase):
    about_support = "about:support"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._created_dirs = []

        self.tmproot = tempfile.mkdtemp(prefix="mozrunner-xdg_config-test")

        self.bin = None
        self.tmphome = os.path.join(self.tmproot, "DEFAULT")
        self.homedir = self.get_home_root()

        self._env = os.environ.copy()
        self._env.update({"HOME": self.homedir})

        self.process_handler = None

    def setUp(self):
        super().setUp()

        if not self.bin:
            self.bin = self.marionette.instance.binary

        self._cmd = [
            self.bin,
            "--headless",
            "-marionette",
            "-remote-allow-system-access",
        ]

        self.marionette.quit(in_app=False)
        self.client = Marionette(host="127.0.0.1", port=2828)

        self.start()
        self.client.start_session()

    def tearDown(self):
        self.process_handler.kill()
        self.process_handler.wait()
        self.process_handler = None

        self.client = None

        super().tearDown()

        self.cleanup()

    def start(self):
        self.assert_safe_homedir()
        _env = self._env.copy()
        self.process_handler = subprocess.Popen(self._cmd, env=self._env)

    def assert_safe_homedir(self):
        assert "mozrunner-xdg_config-test" in self.homedir, (
            f"HOME is not real user's home: {self.homedir}"
        )

    def get_home_root(self):
        rv = tempfile.mkdtemp(prefix="{}.".format("run"), dir=self.tmproot)
        self._created_dirs.append(rv)
        return rv

    def make_product_root(self, subpath):
        product_root = os.path.join(self.homedir, subpath)
        assert not os.path.exists(product_root), f"no {product_root}"
        os.makedirs(product_root)

        profiles_ini_path = os.path.join(product_root, "profiles.ini")
        assert not os.path.exists(profiles_ini_path)
        with open(profiles_ini_path, "w") as profiles_ini:
            profiles_ini.write(
                """
[General]
StartWithLastProfile=1
Version=2
"""
            )
        return product_root

    def find_one_existing_test_run_directory(self):
        dirs = os.listdir(self.tmproot)
        test_dir = list(filter(lambda e: e.startswith("run."), dirs))
        assert len(test_dir) == 1
        return os.path.join(self.tmproot, test_dir[0])

    def find_one_profile_run_dir(self):
        test_dir_walk = list(os.walk(self.homedir))
        maybe_profile = list(
            filter(lambda e: "compatibility.ini" in e[2], test_dir_walk)
        )
        assert len(maybe_profile) == 1
        (profile_dir, _, _) = maybe_profile[0]
        return profile_dir

    def cleanup(self):
        for d in self._created_dirs:
            mozfile.remove(d)
            assert not os.path.exists(d)

        if self.tmproot:
            mozfile.remove(self.tmproot)
            assert not os.path.exists(self.tmproot)

    def get_process_env_value(self, name):
        with self.client.using_context(self.client.CONTEXT_CHROME):
            rv = self.client.execute_script(
                f"""
                return Services.env.get("{name}");
                """
            )
        return rv

    def get_profile_dir(self):
        with self.client.using_context(self.client.CONTEXT_CHROME):
            rv = self.client.execute_script(
                """
                return Services.dirsvc.get("ProfD", Ci.nsIFile).path;
                """
            )
        return rv

    def get_asserted_profile_subdir(self):
        profile_dir = self.get_profile_dir()
        common = os.path.commonpath((self.homedir, profile_dir))
        self.assertTrue(
            len(common) > 0,
            f"Profile dir {profile_dir} is a subdir of homedir: {self.homedir}",
        )

        return os.path.relpath(profile_dir, self.homedir)
