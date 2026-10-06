import os
import sys
from pathlib import Path
from subprocess import check_call

import mozinstall
import mozunit
import pytest
from moztest.selftest import fixtures

MOZ_AUTOMATION = bool(os.getenv("MOZ_AUTOMATION", "0") == "1")
MOZ_FETCHES_DIR = os.getenv("MOZ_FETCHES_DIR", "")


# skip tsan while ubuntu 18.04 is the test image, for intermittent startup crashes
@pytest.mark.skip_mozinfo("tsan")
@pytest.mark.parametrize("relaunch", [1, 5])
def test_grizzly_smoke(relaunch):
    ffbin = fixtures.binary()
    ffbin = ffbin.replace("$MOZ_FETCHES_DIR", MOZ_FETCHES_DIR).strip('"')

    # add minidump-stackwalk to path so grizzly will find it
    mdsw_path = Path(MOZ_FETCHES_DIR) / "minidump-stackwalk"
    if MOZ_FETCHES_DIR and mdsw_path.is_dir():
        path = os.getenv("PATH", "").split(os.pathsep)
        path.append(str(mdsw_path))
        os.environ["PATH"] = os.pathsep.join(path)

    if "Contents/MacOS/firefox" in ffbin and MOZ_AUTOMATION:
        mozinstall.install(
            str(Path(MOZ_FETCHES_DIR) / "target.dmg"),
            MOZ_FETCHES_DIR,
        )

    if MOZ_AUTOMATION:
        assert Path(ffbin).exists(), (
            "Missing Firefox build. Build it, or set GECKO_BINARY_PATH"
        )

    elif not Path(ffbin).exists():
        pytest.skip("Missing Firefox build. Build it, or set GECKO_BINARY_PATH")

    check_call(
        [
            sys.executable,
            "-m",
            "grizzly",
            ffbin,
            "no-op",
            "--headless",
            "--smoke-test",
            "--display-launch-failures",
            "--limit",
            "10",
            "--relaunch",
            str(relaunch),
        ],
    )


if __name__ == "__main__":
    mozunit.main()
