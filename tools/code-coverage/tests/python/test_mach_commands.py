# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import subprocess
import sys
from pathlib import Path

import mozunit


def test_coverage_report_latest_push_gtest(tmp_path):
    topsrcdir = Path(__file__).resolve().parents[4]
    output_dir = tmp_path / "report"

    args = [
        sys.executable,
        "mach",
        "coverage-report",
        "--platform",
        "linux",
        "--suite",
        "gtest",
        "--stats",
        "--output-dir",
        str(output_dir),
    ]

    fetches_dir = os.environ.get("MOZ_FETCHES_DIR")
    if fetches_dir:
        args.extend(["--grcov", os.path.join(fetches_dir, "grcov", "grcov")])

    result = subprocess.run(
        args,
        cwd=topsrcdir,
        check=False,
        text=True,
        capture_output=True,
        timeout=600,
    )

    assert result.returncode == 0, result.stderr
    assert (output_dir / "output.json").exists()
    assert "Coverage percentage:" in result.stdout


if __name__ == "__main__":
    mozunit.main()
