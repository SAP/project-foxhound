import shutil

import pytest


@pytest.fixture
def get_installer(request, tmpdir):
    def _get_installer(extension):
        """Get path to the installer for the specified extension.

        We had to remove firefox.exe since it is not valid for mozinstall 1.12 and higher
        Bug 1157352 - We should grab a firefox.exe from the build process or download it
        """
        stub_dir = request.node.fspath.dirpath("installer_stubs")
        installer_path = stub_dir.join(f"firefox.{extension}").strpath

        # For DMG files, create a unique copy to avoid contention between tests
        if extension == "dmg":
            dmg_path = tmpdir.join(f"firefox.{extension}").strpath
            shutil.copy(installer_path, dmg_path)
            return dmg_path

        return installer_path

    return _get_installer
