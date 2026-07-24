#!/usr/bin/env python3
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Builds the Bergamot translations engine for integration with Firefox.

If you wish to test the Bergamot engine locally, then uncomment the .wasm line in
the toolkit/components/translations/jar.mn after building the file. Just make sure
not to check the code change in.
"""

import argparse
import logging
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Any

import yaml
import zstandard as zstd

DIR_PATH = Path(__file__).parent
ROOT_PATH = (DIR_PATH / "../../../..").resolve()

MOZ_YAML_PATH = DIR_PATH / "moz.yaml"
FINAL_JS_PATH = DIR_PATH / "bergamot-translator.js"
PATCHES_PATH = DIR_PATH / "patches"

THIRD_PARTY_PATH = DIR_PATH / "thirdparty"
REPO_PATH = THIRD_PARTY_PATH / "translations"
BUILD_PATH = REPO_PATH / "inference/build-wasm"
JS_PATH = BUILD_PATH / "bergamot-translator.js"
WASM_PATH = BUILD_PATH / "bergamot-translator.wasm"

parser = argparse.ArgumentParser(
    description=__doc__,
    # Preserves whitespace in the help text.
    formatter_class=argparse.RawTextHelpFormatter,
)
parser.add_argument(
    "--clobber", action="store_true", help="Clobber the build artifacts"
)
parser.add_argument(
    "--debug",
    action="store_true",
    help="Build with debug symbols, useful for profiling",
)
parser.add_argument(
    "--translations_repo",
    metavar="DIRECTORY",
    type=Path,
    help="Optionally use a local copy of the https://github.com/mozilla/translations",
)
parser.add_argument(
    "--allow_run_on_host",
    action="store_true",
    help="Do not use Docker when building, run the build on the host machine",
)
parser.add_argument(
    "--force_rebuild",
    action="store_true",
    help="Always rebuild the artifacts",
)

logging.basicConfig(level=logging.INFO, format="[%(name)s] %(message)s")
logger = logging.getLogger(Path(__file__).stem)
logger.setLevel(logging.INFO)


def git_clone_update(name: str, repo_url: str, revision: str):
    if not REPO_PATH.exists():
        logger.info(f"Clone the {name} repo into {REPO_PATH}\n")
        subprocess.check_call(
            ["git", "clone", repo_url, REPO_PATH],
            cwd=THIRD_PARTY_PATH,
        )

    def run(command):
        return subprocess.check_call(command, cwd=REPO_PATH)

    local_head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_PATH,
        text=True,
    ).strip()

    if local_head != revision:
        logger.info(f"The head ({local_head}) and revision ({revision}) don't match.")
        logger.info(f"Fetching revision {revision} from {name}.\n")
        run(["git", "fetch", "--recurse-submodules", "origin", revision])

        logger.info(f"Checking out the revision {revision}")
        run(["git", "checkout", revision])


def maybe_remove_repo_path():
    """
    Removes the REPO_PATH if it exists, handling files, directories, and symlinks.
    """
    if not REPO_PATH.exists():
        return

    if REPO_PATH.is_symlink() or REPO_PATH.is_file():
        REPO_PATH.unlink()
    elif REPO_PATH.is_dir():
        shutil.rmtree(REPO_PATH)

    logger.info(f"Remove existing path: {REPO_PATH}")


def fetch_bergamot_source(translations_repo: Path | None):
    """
    Fetches the Bergamot source code either from the --translations_repo path,
    or by cloning the repository as defined in the moz.yaml file.

    Returns:
        str: The path to the Bergamot repository.
    """
    maybe_remove_repo_path()

    if translations_repo:
        assert translations_repo.is_dir(), (
            f"The translations repo must be a directory: {translations_repo}"
        )

        logger.info(f"Using local mozilla/translations repo: {translations_repo}")

        Path(REPO_PATH).symlink_to(translations_repo)
        logger.info(f"Create symlink: {REPO_PATH} -> {translations_repo}")

        return REPO_PATH
    else:
        logger.info(
            "The --translations_repo was not set. Cloning the repository as per moz.yaml."
        )

        with open(MOZ_YAML_PATH, encoding="utf8") as file:
            moz_yaml = yaml.safe_load(file)

        repo_url = moz_yaml["origin"]["url"]
        revision = moz_yaml["origin"]["revision"]

        git_clone_update(
            name="translations",
            repo_url=repo_url,
            revision=revision,
        )


def create_command(allow_run_on_host: bool, force_rebuild: bool, task_args: list[str]):
    extra_args = []
    if force_rebuild:
        extra_args.extend(["--", "--force-rebuild"])
    if allow_run_on_host:
        # Attempt to build the WASM artifacts on the host computer.
        command = ["task", "inference-build-wasm", *extra_args]
    else:
        # Attempt to build the WASM artifacts within a Docker container.
        command = [
            "task",
            "docker-run",
            "--",
            "--volume",
            f"{BUILD_PATH}:/inference/build_wasm",
            "task",
            "inference-build-wasm",
            *extra_args,
        ]

        if platform.system() == "Linux":
            # Linux seems to have an issue with permissions involving `tar`
            # unless the UID and GID are set to the current user.
            command.append("--run-as-user")

    # Append task arguments if they exist
    if task_args:
        command.extend(task_args)

    return command


def build_bergamot(args: Any):
    """
    Builds the inference engine by calling the 'inference-build-wasm' task.

    If the --allow_run_on_host flag is set, then the build will attempt to run
    locally on the host system.

    Otherwise, by default, the WASM artifacts will be built with a Docker container
    using the Docker image specified by the repository.
    """

    if WASM_PATH.exists() and JS_PATH.exists() and not args.force_rebuild:
        logger.info("The build artifacts already exist: skipping build step...")
        logger.info("Use the --force_rebuild flag to build them again.")
        return

    task_args = []
    if args.clobber:
        task_args.append("--clobber")
    if args.debug:
        task_args.append("--debug")

    command = create_command(args.allow_run_on_host, args.force_rebuild, task_args)

    logger.info("Building inference engine WASM...\n")
    return subprocess.run(command, cwd=REPO_PATH, shell=False, check=True)


def write_final_bergamot_js_file():
    """
    Formats and writes the final JavaScript file for Bergamot by running ESLint on
    a temporary copy and moving it to the final destination.
    """
    with open(JS_PATH, encoding="utf8") as file:
        logger.info("Formatting the final Bergamot file")

        # Create the file outside of this directory so it's not ignored by ESLint.
        temp_path = DIR_PATH / "../temp-bergamot.js"
        with open(temp_path, "w", encoding="utf8") as temp_file:
            temp_file.write(file.read())

        subprocess.run(
            f"./mach eslint --fix {temp_path} --rule 'curly:error'",
            cwd=ROOT_PATH,
            check=True,
            shell=True,
            capture_output=True,
        )

        logger.info(f"Writing out final Bergamot file: {FINAL_JS_PATH}")
        shutil.move(temp_path, FINAL_JS_PATH)

    if PATCHES_PATH.exists():
        for patch_file in PATCHES_PATH.iterdir():
            if patch_file.is_file() and patch_file.suffix == ".diff":
                logger.info(f"Applying patch: {patch_file.name}")
                subprocess.check_call(
                    ["git", "apply", "--reject", str(patch_file)], cwd=DIR_PATH
                )


def compress_wasm_file():
    """
    Compresses the generated .wasm file using zstd and saves it as .wasm.zst.
    """
    if not WASM_PATH.exists():
        logger.error(f"WASM file not found: {WASM_PATH}")
        return

    compressed_path = WASM_PATH.with_suffix(".wasm.zst")

    logger.info(f"Compressing WASM file: {compressed_path}")

    with open(WASM_PATH, "rb") as f_in, open(compressed_path, "wb") as f_out:
        compressor = zstd.ZstdCompressor(19)
        f_out.write(compressor.compress(f_in.read()))

    logger.info(f"Compressed WASM saved to: {compressed_path}")


def main():
    args = parser.parse_args()

    if not THIRD_PARTY_PATH.exists():
        THIRD_PARTY_PATH.mkdir()

    fetch_bergamot_source(args.translations_repo)
    build_bergamot(args)
    write_final_bergamot_js_file()
    compress_wasm_file()

    logger.info(
        "Uncomment the line in toolkit/components/translations/jar.mn to test the wasm artifact locally"
    )


if __name__ == "__main__":
    main()
