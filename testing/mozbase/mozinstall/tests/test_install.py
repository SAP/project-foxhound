import subprocess
from unittest import mock

import mozinfo
import mozinstall
import mozunit
import pytest


@pytest.mark.skipif(
    mozinfo.isWin,
    reason="Bug 1157352 - New firefox.exe needed for mozinstall 1.12 and higher.",
)
def test_is_installer(request, get_installer):
    """Test that we can identify a correct installer."""
    assert mozinstall.is_installer(get_installer("tar.xz"))
    assert mozinstall.is_installer(get_installer("zip"))

    if mozinfo.isWin:
        assert mozinstall.is_installer(get_installer("msix"))

        # test exe installer
        assert mozinstall.is_installer(get_installer("exe"))

        try:
            # test stub browser file
            # without pefile on the system this test will fail
            import pefile  # noqa

            stub_exe = (
                request.node.fspath.dirpath("build_stub").join("firefox.exe").strpath
            )
            assert not mozinstall.is_installer(stub_exe)
        except ImportError:
            pass

    if mozinfo.isMac or mozinfo.isLinux:
        assert mozinstall.is_installer(get_installer("dmg"))


def test_invalid_source_error(get_installer):
    """Test that InvalidSource error is raised with an incorrect installer."""
    if mozinfo.isWin:
        with pytest.raises(mozinstall.InvalidSource):
            mozinstall.install(get_installer("dmg"), "firefox")

    elif mozinfo.isLinux:
        with pytest.raises(mozinstall.InvalidSource):
            mozinstall.install(get_installer("msix"), "firefox")

    elif mozinfo.isMac:
        with pytest.raises(mozinstall.InvalidSource):
            mozinstall.install(get_installer("exe"), "firefox")

    # Test an invalid url handler
    with pytest.raises(mozinstall.InvalidSource):
        mozinstall.install("file://foo.bar", "firefox")


@pytest.mark.skipif(
    mozinfo.isWin,
    reason="Bug 1157352 - New firefox.exe needed for mozinstall 1.12 and higher.",
)
def test_install(tmpdir, get_installer):
    """Test to install an installer."""
    installdir_zip = mozinstall.install(
        get_installer("zip"), tmpdir.join("zip").strpath
    )
    assert installdir_zip == tmpdir.join("zip", "firefox").strpath

    if mozinfo.isLinux:
        installdir = mozinstall.install(get_installer("tar.xz"), tmpdir.strpath)
        assert installdir == tmpdir.join("firefox").strpath

    elif mozinfo.isWin:
        installdir_exe = mozinstall.install(
            get_installer("exe"), tmpdir.join("exe").strpath
        )
        assert installdir_exe == tmpdir.join("exe", "firefox").strpath

    elif mozinfo.isMac:
        installdir = mozinstall.install(get_installer("dmg"), tmpdir.strpath)
        assert installdir == tmpdir.realpath().join("Firefox Stub.app").strpath

        mounted_images = subprocess.check_output(["hdiutil", "info"]).decode("utf-8")
        assert get_installer("dmg") not in mounted_images


def test_install_existing_target_folder(tmpdir, get_installer):
    """Test that InstallError is raised when target folder already exists."""
    if mozinfo.isMac:
        installdir = mozinstall.install(get_installer("dmg"), tmpdir.strpath)
        assert installdir == tmpdir.realpath().join("Firefox Stub.app").strpath

        with pytest.raises(mozinstall.InstallError, match="App bundle already exists"):
            mozinstall.install(get_installer("dmg"), tmpdir.strpath)


@pytest.mark.skipif(not mozinfo.isMac, reason="DMG installer only on macOS")
def test_install_dmg_detach_retry(tmpdir, get_installer):
    """Test that DMG detach retries on EBUSY errors."""
    original_check_call = subprocess.check_call
    detach_call_count = 0

    def mock_check_call(cmd, shell=False, **kwargs):
        nonlocal detach_call_count

        if shell and "hdiutil detach" in cmd:
            detach_call_count += 1
            if detach_call_count <= 2:
                raise subprocess.CalledProcessError(16, cmd)

        return original_check_call(cmd, shell=shell, **kwargs)

    with mock.patch("subprocess.check_call", side_effect=mock_check_call):
        installdir = mozinstall.install(get_installer("dmg"), tmpdir.strpath)
        assert installdir == tmpdir.realpath().join("Firefox Stub.app").strpath

        assert detach_call_count == 3


if __name__ == "__main__":
    mozunit.main()
