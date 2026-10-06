# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Module to handle Simpleperf profiling.
"""

import os
import shutil
import subprocess
import zipfile
from pathlib import Path

from logger.logger import RaptorLogger
from raptor_profiling import RaptorProfiling

LOG = RaptorLogger(component="raptor-simpleperf")


class SimpleperfProfile(RaptorProfiling):
    """
    Handle Simpleperf profiling.

    This allows us to process Simpleperf profiles in Raptor.
    """

    def __init__(self, upload_dir, raptor_config, test_config):
        super().__init__(upload_dir, raptor_config, test_config)

        self.upload_dir = Path(upload_dir)

        self.breakpad_symbol_dir = None
        self.samply_path = None

        if "MOZ_AUTOMATION" in os.environ:
            moz_fetch = Path(os.environ["MOZ_FETCHES_DIR"])
            self.breakpad_symbol_dir = moz_fetch / "target.crashreporter-symbols"
            self.samply_path = moz_fetch / "samply" / "samply"

        self.dest_dir = (
            self.upload_dir
            / "browsertime-results"
            / self.test_config.get("name", "simpleperf")
        )

    def symbolicate(self):
        if not self.breakpad_symbol_dir:
            LOG.info("symbols directory not set, skipping symbolication")
            return

        if not self.samply_path:
            LOG.info("samply not set, skipping symbolication")
            return

        if not self.samply_path.exists():
            LOG.info("samply not found, skipping symbolication")
            return

        symbol_zip = Path(f"{self.breakpad_symbol_dir}.zip")
        if "MOZ_AUTOMATION" in os.environ and symbol_zip.exists():
            with zipfile.ZipFile(symbol_zip, "r") as zipf:
                zipf.extractall(self.breakpad_symbol_dir)

        if not self.breakpad_symbol_dir.exists():
            LOG.info("symbols directory not found, skipping symbolication")
            return

        # Find all perf.data files
        perf_files = list(self.dest_dir.rglob("perf.data"))

        if not perf_files:
            LOG.error(f"perf.data not found at {self.dest_dir}, skipping symbolication")
            return

        if "MOZ_AUTOMATION" in os.environ:
            profile_archive = Path(
                self.upload_dir, f"profile_{self.test_config['name']}.zip"
            )

            try:
                mode = zipfile.ZIP_DEFLATED
            except NameError:
                mode = zipfile.ZIP_STORED

        for perf_file in perf_files:
            profile = perf_file.parent / f"{perf_file.parent.name}.json"

            try:
                result = subprocess.run(
                    [
                        str(self.samply_path),
                        "import",
                        str(perf_file),
                        "--save-only",
                        "-o",
                        str(profile),
                        "--presymbolicate",
                        "--breakpad-symbol-dir",
                        str(self.breakpad_symbol_dir),
                        "--breakpad-symbol-server",
                        "https://symbols.mozilla.org/",
                        "--aux-file-dir",
                        str(perf_file.parent),
                        "--name",
                        self.raptor_config.get("binary", "org.mozilla.fenix"),
                    ],
                    check=False,
                    capture_output=True,
                    text=True,
                )
                for line in result.stdout.splitlines():
                    LOG.info(f"samply stdout: {line}")
                for line in result.stderr.splitlines():
                    LOG.info(f"samply stderr: {line}")
                if result.returncode != 0:
                    LOG.error(f"samply exited with code {result.returncode}")
                if not profile.exists():
                    LOG.error(f"samply did not produce a profile at {profile}")
                else:
                    LOG.info(
                        f"Profile converted: {profile} ({profile.stat().st_size} bytes)"
                    )

                    if "MOZ_AUTOMATION" in os.environ:
                        with zipfile.ZipFile(profile_archive, "a", mode) as zipf:
                            path_in_zip = f"simpleperf/{profile.name}"
                            LOG.info(
                                f"Adding {profile.name} to {profile_archive} as {path_in_zip}"
                            )
                            zipf.write(profile, arcname=path_in_zip)
                            profile.unlink(missing_ok=True)
            finally:
                perf_file.unlink(missing_ok=True)
                if perf_file.parent.exists():
                    for marker in perf_file.parent.glob("marker-*.txt"):
                        marker.unlink(missing_ok=True)
                    for jitdump in perf_file.parent.rglob("jit-*.dump"):
                        jitdump.unlink(missing_ok=True)

        if "MOZ_AUTOMATION" in os.environ:
            if profile_archive and profile_archive.exists():
                LOG.info(
                    f"Profiles archived to: {profile_archive} ({profile_archive.stat().st_size} bytes)"
                )
            elif profile_archive:
                LOG.error(f"Failed to archive profiles to {profile_archive}")

    def clean(self):
        if self.breakpad_symbol_dir and self.breakpad_symbol_dir.exists():
            shutil.rmtree(self.breakpad_symbol_dir)
