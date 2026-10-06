# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, # You can obtain one at http://mozilla.org/MPL/2.0/.

from pathlib import Path
from typing import Optional

import mozfile
from mach.decorators import Command, CommandArgument


def _find_moz_phab(tool_dir: Path) -> Optional[Path]:
    candidate = tool_dir / "moz-phab"
    if candidate.exists():
        return candidate
    candidate = candidate.with_suffix(".exe")
    if candidate.exists():
        return candidate
    return None


@Command(
    "install-moz-phab",
    category="misc",
    description="Install patch submission tool.",
    virtualenv_name="uv",
)
@CommandArgument(
    "--force",
    "-f",
    action="store_true",
    help="Force installation even if already installed.",
)
def install_moz_phab(command_context, force=False):
    import logging
    import subprocess
    import sys

    from mozversioncontrol import get_repository_object

    moz_phab_executable = mozfile.which("moz-phab")
    if moz_phab_executable and not force:
        command_context.log(
            logging.INFO,
            "already_installed",
            {},
            f"moz-phab is already installed in {moz_phab_executable}.",
        )
        sys.exit(0)

    # moz-phab requires user.email to be configured, so check and run `./mach vcs-setup` if needed
    repo = get_repository_object(command_context.topsrcdir)
    if not repo.get_user_email():
        command_context.log(
            logging.INFO,
            "vcs_setup_needed",
            {},
            'user.email is not configured. Running "./mach vcs-setup" first...',
        )
        mach = Path(command_context.topsrcdir) / "mach"
        subprocess.check_call([sys.executable, str(mach), "vcs-setup"])

    command_context.log(logging.INFO, "run", {}, "Installing moz-phab using uv")

    install_cmd = ["uv", "tool", "install", "MozPhab"]
    if force:
        install_cmd.append("--force")

    result = subprocess.run(install_cmd, check=False, text=True)

    if result.returncode != 0:
        command_context.log(
            logging.ERROR,
            "install_failed",
            {},
            "Failed to install moz-phab. Please check that uv is working correctly.",
        )
        sys.exit(1)

    # `uv tool update-shell` adds `moz-phab` to PATH but that requires a terminal restart.
    # We need the executable path now to add the API token, so we locate it via uv
    tool_dir_result = subprocess.run(
        ["uv", "tool", "dir", "--bin"], check=False, capture_output=True, text=True
    )

    if tool_dir_result.returncode == 0:
        tool_dir = Path(tool_dir_result.stdout.strip())
        moz_phab_path = _find_moz_phab(tool_dir)

        if moz_phab_path is None and not force:
            command_context.log(
                logging.WARNING,
                "shim_missing",
                {},
                f"uv reports mozphab is installed at {tool_dir} but it's "
                f"missing from there. Attempting to reinstall with --force.",
            )
            install_cmd.append("--force")
            result = subprocess.run(install_cmd, check=False, text=True)
            if result.returncode != 0:
                command_context.log(
                    logging.ERROR,
                    "install_failed",
                    {},
                    "Failed to reinstall moz-phab with --force. Please check that uv is working correctly.",
                )
                sys.exit(1)
            moz_phab_path = _find_moz_phab(tool_dir)

        if moz_phab_path is None:
            command_context.log(
                logging.ERROR,
                "shim_missing",
                {},
                f"moz-phab shim is missing from {tool_dir} even after a --force "
                f"reinstall. Please run 'uv tool install MozPhab --force' manually.",
            )
            sys.exit(1)

        subprocess.run([moz_phab_path, "install-certificate"], check=True)
    else:
        command_context.log(
            logging.WARNING,
            "certificate_setup_skipped",
            {},
            "Could not locate installed moz-phab. Please run 'moz-phab install-certificate' manually after restarting your shell.",
        )

    # We run this last, since it instructs the user to restart their shell (if necessary)
    subprocess.run(["uv", "tool", "update-shell"], check=True)
