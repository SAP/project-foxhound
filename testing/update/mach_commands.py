# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, # You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import logging
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from enum import Enum
from os import environ, makedirs
from pathlib import Path
from shutil import copytree, unpack_archive

import mozinfo
import mozinstall
import requests
from mach.decorators import Command, CommandArgument
from mozbuild.base import BinaryNotFoundException
from mozlog.structured import commandline
from mozrelease.update_verify import UpdateVerifyConfig


class ReleaseType(Enum):
    """Release type - duplicated from gecko_taskgraph.transforms.update_test
    to avoid importing taskgraph dependencies at mach command load time."""

    release = 0
    beta = 1
    esr = 2
    other = 3


STAGING_POLICY_PAYLOAD = {
    "policies": {
        "AppUpdateURL": "https://stage.balrog.nonprod.cloudops.mozgcp.net/update/6/Firefox/%VERSION%/%BUILD_ID%/%BUILD_TARGET%/%LOCALE%/%CHANNEL%/%OS_VERSION%/%SYSTEM_CAPABILITIES%/%DISTRIBUTION%/%DISTRIBUTION_VERSION%/update.xml"
    }
}


@dataclass
class UpdateTestConfig:
    """Track all needed test config"""

    channel: str = "release-localtest"
    mar_channel: str = "firefox-mozilla-release"
    app_dir_name: str = "fx_test"
    manifest_loc: str = "testing/update/manifest.toml"
    # Where in the list of allowable source versions should we default to testing
    source_version_position: int = -3
    # How many major versions back can we test?
    major_version_range: int = 3
    locale: str = "en-US"
    update_verify_file: str = "update-verify.cfg"
    update_verify_config = None
    config_source = None
    release_type: ReleaseType = ReleaseType.release
    esr_version = None
    staging_update = False

    def __post_init__(self):
        if environ.get("UPLOAD_DIR"):
            self.artifact_dir = Path(environ.get("UPLOAD_DIR"), "update-test")
            makedirs(self.artifact_dir, exist_ok=True)
            self.version_info_path = Path(
                self.artifact_dir, environ.get("VERSION_LOG_FILENAME")
            )

        else:
            self.version_info_path = None

    def set_channel(self, new_channel, esr_version=None):
        self.channel = new_channel
        if self.channel.startswith("release"):
            self.mar_channel = "firefox-mozilla-release"
            self.release_type = ReleaseType.release
        elif self.channel.startswith("beta"):
            self.mar_channel = "firefox-mozilla-beta,firefox-mozilla-release"
            self.release_type = ReleaseType.beta
        elif self.channel.startswith("esr"):
            self.mar_channel = "firefox-mozilla-esr,firefox-mozilla-release"
            self.release_type = ReleaseType.esr
            self.esr_version = esr_version
        else:
            self.mar_channel = "firefox-mozilla-central"
            self.release_type = ReleaseType.other

    def set_ftp_info(self):
        """Get server URL and template for downloading application/installer"""
        # The %release% string will be replaced by a version number later
        platform, executable_name = get_fx_executable_name("%release%")
        if self.update_verify_config:
            full_info_release = next(
                r for r in self.update_verify_config.releases if r.get("from")
            )
            executable_name = Path(full_info_release["from"]).name
            release_number = full_info_release["from"].split("/")[3]
            executable_name = executable_name.replace(release_number, "%release%")
            executable_name = executable_name.replace(".bz2", ".xz")
            executable_name = executable_name.replace(".pkg", ".dmg")
            executable_name = executable_name.replace(".msi", ".exe")
        template = (
            f"https://archive.mozilla.org/pub/firefox/releases/%release%/{platform}/{self.locale}/"
            + executable_name
        )

        self.ftp_server = template.split("%release%")[0]
        self.url_template = template

    def add_update_verify_config(self, filename=None):
        """Parse update-verify.cfg. Obtain a copy if not found in dep/commandline"""
        if not filename:
            platform, _ = get_fx_executable_name("")
            config_route = (
                "https://firefox-ci-tc.services.mozilla.com/api/"
                "index/v1/task/gecko.v2.mozilla-central.latest.firefox."
                f"update-verify-config-firefox-{platform}-{self.channel}"
                "/artifacts/public%2Fbuild%2Fupdate-verify.cfg"
            )
            resp = requests.get(config_route)
            try:
                resp.raise_for_status()
                filename = Path(self.tempdir, self.update_verify_file)
                with open(filename, "wb") as fh:
                    fh.write(resp.content)
                self.config_source = "route"
            except requests.exceptions.HTTPError:
                return None

        uv_config = UpdateVerifyConfig()
        uv_config.read(filename)
        self.update_verify_config = uv_config
        # Beta display version example "140.0 Beta 3", Release just like "140.0"
        if "Beta" in uv_config.to_display_version:
            major, beta = uv_config.to_display_version.split(" Beta ")
            self.target_version = f"{major}b{beta}"
        else:
            self.target_version = uv_config.to_display_version


def setup_update_argument_parser():
    from marionette_harness.runtests import MarionetteArguments
    from mozlog.structured import commandline

    parser = MarionetteArguments()
    commandline.add_logging_group(parser)

    return parser


def get_fx_executable_name(version):
    """Given a version string, get the expected downloadable name for the os"""
    if mozinfo.os == "mac":
        executable_platform = "mac"
        executable_name = f"Firefox {version}.dmg"

    if mozinfo.os == "linux":
        executable_platform = "linux-x86_64"
        try:
            assert int(version.split(".")[0]) < 135
            executable_name = f"firefox-{version}.tar.bz2"
        except (AssertionError, ValueError):
            executable_name = f"firefox-{version}.tar.xz"

    if mozinfo.os == "win":
        if mozinfo.arch == "aarch64":
            executable_platform = "win64-aarch64"
        elif mozinfo.bits == "64":
            executable_platform = "win64"
        else:
            executable_platform = "win32"
        executable_name = f"Firefox Setup {version}.exe"

    return executable_platform, executable_name.replace(" ", "%20")


def get_valid_source_versions(config):
    """
    Get a list of versions to update from, based on config.
    For beta, this means a list of betas, not releases.
    For ESR, this means a list of ESR versions where major version matches target.
    """
    ftp_content = requests.get(config.ftp_server).content.decode()
    # All versions start with e.g. 140.0, so beta and release can be int'ed
    ver_head, ver_tail = config.target_version.split(".", 1)
    latest_version = int(ver_head)
    latest_minor_str = ""
    # Versions like 130.10.1 and 130.0 are possible, capture the minor number
    for c in ver_tail:
        try:
            int(c)
            latest_minor_str = latest_minor_str + c
        except ValueError:
            break

    valid_versions: list[str] = []
    for major in range(latest_version - config.major_version_range, latest_version + 1):
        minor_versions = []
        if config.release_type == ReleaseType.esr and major != latest_version:
            continue
        for minor in range(0, 11):
            if (
                config.release_type == ReleaseType.release
                and f"/{major}.{minor}/" in ftp_content
            ):
                if f"{major}.{minor}" == config.target_version:
                    break
                minor_versions.append(minor)
                valid_versions.append(f"{major}.{minor}")
            elif config.release_type == ReleaseType.esr and re.compile(
                rf"/{major}\.{minor}.*/"
            ).search(ftp_content):
                minor_versions.append(minor)
                if f"/{major}.{minor}esr" in ftp_content:
                    valid_versions.append(f"{major}.{minor}")
            elif config.release_type == ReleaseType.beta and minor == 0:
                # Release 1xx.0 is not available, but 1xx.0b1 is:
                minor_versions.append(minor)

        sep = "b" if config.release_type == ReleaseType.beta else "."

        for minor in minor_versions:
            for dot in range(0, 15):
                if f"{major}.{minor}{sep}{dot}" == config.target_version:
                    break
                if config.release_type == ReleaseType.esr:
                    if f"/{major}.{minor}{sep}{dot}esr/" in ftp_content:
                        valid_versions.append(f"{major}.{minor}{sep}{dot}")
                elif f"/{major}.{minor}{sep}{dot}/" in ftp_content:
                    valid_versions.append(f"{major}.{minor}{sep}{dot}")

    # Only test beta versions if channel is beta
    if config.release_type == ReleaseType.beta:
        valid_versions = [ver for ver in valid_versions if "b" in ver]
    elif config.release_type == ReleaseType.esr:
        valid_versions = [
            f"{ver}esr" if not ver.endswith("esr") else ver for ver in valid_versions
        ]
    valid_versions.sort()
    while len(valid_versions) < 5:
        valid_versions.insert(0, valid_versions[0])
    return valid_versions


def get_binary_path(config: UpdateTestConfig, **kwargs) -> str:
    # Install correct Fx and return executable location
    if not config.source_version:
        if config.update_verify_config:
            # In future, we can modify this for watershed logic
            source_versions = get_valid_source_versions(config)
        else:
            response = requests.get(
                "https://product-details.mozilla.org/1.0/firefox_versions.json"
            )
            response.raise_for_status()
            product_details = response.json()
            if config.release_type == ReleaseType.beta:
                target_channel = "LATEST_FIREFOX_RELEASED_DEVEL_VERSION"
            elif config.release_type == ReleaseType.esr:
                current_esr = product_details.get("FIREFOX_ESR").split(".")[0]
                if config.esr_version == current_esr:
                    target_channel = "FIREFOX_ESR"
                else:
                    target_channel = f"FIREFOX_ESR{config.esr_version}"
            else:
                target_channel = "LATEST_FIREFOX_VERSION"

            target_version = product_details.get(target_channel)
            config.target_version = target_version
            source_versions = get_valid_source_versions(config)

        # NB below: value 0 will get you the oldest acceptable version, not the newest
        source_version = source_versions[config.source_version_position]
        config.source_version = source_version
    platform, executable_name = get_fx_executable_name(config.source_version)

    os_edition = f"{mozinfo.os} {mozinfo.os_version}"
    if config.version_info_path:
        # Only write the file on non-local runs
        print(f"Writing source info to {config.version_info_path.resolve()}...")
        with config.version_info_path.open("a") as fh:
            fh.write(f"Test Type: {kwargs.get('test_type')}\n")
            fh.write(f"UV Config Source: {config.config_source}\n")
            fh.write(f"Region: {config.locale}\n")
            fh.write(f"Source Version: {config.source_version}\n")
            fh.write(f"Platform: {os_edition}\n")
        with config.version_info_path.open() as fh:
            print("".join(fh.readlines()))
    else:
        print(
            f"Region: {config.locale}\nSource Version: {source_version}\nPlatform: {os_edition}"
        )

    executable_url = config.url_template.replace("%release%", config.source_version)

    installer_filename = Path(config.tempdir, Path(executable_url).name)
    installed_app_dir = Path(config.tempdir, config.app_dir_name)
    print(f"Downloading Fx from {executable_url}...")
    response = requests.get(executable_url)
    response.raise_for_status()
    print(f"Download successful, status {response.status_code}")
    with installer_filename.open("wb") as fh:
        fh.write(response.content)
    fx_location = mozinstall.install(installer_filename, installed_app_dir)
    print(f"Firefox installed to {fx_location}")

    if config.staging_update:
        print("Writing enterprise policy for update server")
        fx_path = Path(fx_location)
        policy_path = None
        if mozinfo.os in ["linux", "win"]:
            policy_path = fx_path / "distribution"
        elif mozinfo.os == "mac":
            policy_path = fx_path / "Contents" / "Resources" / "distribution"
        else:
            raise ValueError("Invalid OS.")
        makedirs(policy_path)
        policy_loc = policy_path / "policies.json"
        print(f"Creating {policy_loc}...")
        with policy_loc.open("w") as fh:
            json.dump(STAGING_POLICY_PAYLOAD, fh, indent=2)
        with policy_loc.open() as fh:
            print(fh.read())

    return fx_location


@Command(
    "update-test",
    category="testing",
    virtualenv_name="update",
    description="Test if the version can be updated to the latest patch successfully,",
    parser=setup_update_argument_parser,
)
@CommandArgument("--binary-path", help="Firefox executable path is needed")
@CommandArgument("--test-type", default="Base", help="Base/Background")
@CommandArgument("--source-version", help="Firefox build version to update from")
@CommandArgument(
    "--source-versions-back",
    help="Update from the version of Fx $N releases before current",
)
@CommandArgument("--source-locale", help="Firefox build locale to update from")
@CommandArgument("--channel", default="release-localtest", help="Update channel to use")
@CommandArgument(
    "--esr-version",
    help="ESR version, if set with --channel=esr, will only update within ESR major version",
)
@CommandArgument("--uv-config-file", help="Update Verify config file")
@CommandArgument(
    "--use-balrog-staging", action="store_true", help="Update from staging, not prod"
)
def build(command_context, binary_path, **kwargs):
    config = UpdateTestConfig()

    fetches = environ.get("MOZ_FETCHES_DIR")
    if fetches:
        config_file = Path(fetches, config.update_verify_file)
        if kwargs.get("uv_config_file"):
            config.config_source = "commandline"
        elif config_file.is_file():
            kwargs["uv_config_file"] = config_file
            config.config_source = "kind_dependency"

    if not kwargs.get("uv_config_file"):
        config.add_update_verify_config()
    else:
        config.add_update_verify_config(kwargs["uv_config_file"])
        # TODO: update tests to check against config version, not update server resp
        # kwargs["to_display_version"] = uv_config.to_display_version

    if kwargs.get("source_locale"):
        config.locale = kwargs["source_locale"]

    if kwargs.get("source_versions_back"):
        config.source_version_position = -int(kwargs["source_versions_back"])

    if kwargs.get("source_version"):
        config.source_version = kwargs["source_version"]
    else:
        config.source_version = None

    config.set_ftp_info()

    tempdir = tempfile.TemporaryDirectory()
    # If we have a symlink to the tmp directory, resolve it
    tempdir_name = str(Path(tempdir.name).resolve())
    config.tempdir = tempdir_name
    test_type = kwargs.get("test_type")

    if kwargs.get("use_balrog_staging"):
        config.staging_update = True

    # Select update channel
    if kwargs.get("channel"):
        config.set_channel(kwargs["channel"], kwargs.get("esr_version"))
        # if (config.beta and not config.update_verify_config):
        #     logging.error("Non-release testing on local machines is not supported.")
        #     sys.exit(1)

    # Run the specified test in the suite
    with open(config.manifest_loc) as f:
        old_content = f.read()

    with open(config.manifest_loc, "w") as f:
        f.write("[DEFAULT]\n\n")
        if test_type.lower() == "base":
            f.write('["test_apply_update.py"]')
        elif test_type.lower() == "background":
            f.write('["test_background_update.py"]')
        else:
            logging.ERROR("Invalid test type")
            sys.exit(1)

    config.dir = command_context.topsrcdir

    if mozinfo.os == "win":
        config.log_file_path = bits_pretest()
    try:
        kwargs["binary"] = set_up(
            binary_path or get_binary_path(config, **kwargs), config
        )
        # TODO: change tests to check against config, not update server response
        # if not kwargs.get("to_display_version"):
        #     kwargs["to_display_version"] = config.target_version
        return run_tests(config, **kwargs)
    except BinaryNotFoundException as e:
        command_context.log(
            logging.ERROR,
            "update-test",
            {"error": str(e)},
            "ERROR: {error}",
        )
        command_context.log(logging.INFO, "update-test", {"help": e.help()}, "{help}")
        return 1
    finally:
        with open(config.manifest_loc, "w") as f:
            f.write(old_content)
        if mozinfo.os == "win":
            bits_posttest(config)
        tempdir.cleanup()


def run_tests(config, **kwargs):
    from argparse import Namespace

    from marionette_harness.runtests import MarionetteHarness, MarionetteTestRunner

    args = Namespace()
    args.binary = kwargs["binary"]
    args.logger = kwargs.pop("log", None)
    if not args.logger:
        args.logger = commandline.setup_logging(
            "Update Tests", args, {"mach": sys.stdout}
        )

    for k, v in kwargs.items():
        setattr(args, k, v)

    args.tests = [
        Path(
            config.dir,
            config.manifest_loc,
        )
    ]
    args.gecko_log = "-"

    parser = setup_update_argument_parser()
    parser.verify_usage(args)

    failed = MarionetteHarness(MarionetteTestRunner, args=vars(args)).run()
    if config.version_info_path:
        with config.version_info_path.open("a") as fh:
            fh.write(f"Status: {'failed' if failed else 'passed'}\n")
    if failed > 0:
        return 1
    return 0


def copy_macos_channelprefs(config) -> str:
    # Copy ChannelPrefs.framework to the correct location on MacOS,
    # return the location of the Fx executable
    installed_app_dir = Path(config.tempdir, config.app_dir_name)

    bz_channelprefs_link = "https://bugzilla.mozilla.org/attachment.cgi?id=9417387"

    resp = requests.get(bz_channelprefs_link)
    download_target = Path(config.tempdir, "channelprefs.zip")
    unpack_target = str(download_target).rsplit(".", 1)[0]
    with download_target.open("wb") as fh:
        fh.write(resp.content)

    unpack_archive(download_target, unpack_target)
    print(
        f"Downloaded channelprefs.zip to {download_target} and unpacked to {unpack_target}"
    )

    src = Path(config.tempdir, "channelprefs", config.channel)
    dst = Path(installed_app_dir, "Firefox.app", "Contents", "Frameworks")

    Path(installed_app_dir, "Firefox.app").chmod(455)  # rwx for all users

    print(f"Copying ChannelPrefs.framework from {src} to {dst}")
    copytree(
        Path(src, "ChannelPrefs.framework"),
        Path(dst, "ChannelPrefs.framework"),
        dirs_exist_ok=True,
    )

    # test against the binary that was copied to local
    fx_executable = Path(
        installed_app_dir, "Firefox.app", "Contents", "MacOS", "firefox"
    )
    return str(fx_executable)


def set_up(binary_path, config):
    # Set channel prefs for all OS targets
    binary_path_str = mozinstall.get_binary(binary_path, "Firefox")
    print(f"Binary path: {binary_path_str}")
    binary_dir = Path(binary_path_str).absolute().parent

    if mozinfo.os == "mac":
        return copy_macos_channelprefs(config)
    else:
        with Path(binary_dir, "update-settings.ini").open("w") as f:
            f.write("[Settings]\n")
            f.write(f"ACCEPTED_MAR_CHANNEL_IDS={config.mar_channel}")

        with Path(binary_dir, "defaults", "pref", "channel-prefs.js").open("w") as f:
            f.write(f'pref("app.update.channel", "{config.channel}");')

    return binary_path_str


def bits_pretest():
    # Check that BITS is enabled
    for line in subprocess.check_output(["sc", "qc", "BITS"], text=True).split("\n"):
        if "START_TYPE" in line:
            assert "DISABLED" not in line
    # Write all logs to a file to check for results later
    log_file = tempfile.NamedTemporaryFile(mode="wt", delete=False)
    sys.stdout = log_file
    return log_file


def bits_posttest(config):
    if config.staging_update:
        # If we are in try, we didn't run the full test and BITS will fail.
        return None
    config.log_file_path.close()
    sys.stdout = sys.__stdout__

    failed = 0
    try:
        # Check that all the expected logs are present
        downloader_regex = r"UpdateService:makeBitsRequest - Starting BITS download with url: https?:\/\/.+, updateDir: .+, filename: .+"
        bits_download_regex = (
            r"Downloader:downloadUpdate - BITS download running. BITS ID: {.+}"
        )

        with open(config.log_file_path.name, errors="ignore") as f:
            logs = f.read()
            assert re.search(downloader_regex, logs)
            assert re.search(bits_download_regex, logs)
            assert (
                "AUS:SVC Downloader:_canUseBits - Not using BITS because it was already tried"
                not in logs
            )
            assert (
                "AUS:SVC Downloader:downloadUpdate - Starting nsIIncrementalDownload with url:"
                not in logs
            )
    except (UnicodeDecodeError, AssertionError) as e:
        failed = 1
        logging.error(e.__traceback__)
    finally:
        Path(config.log_file_path.name).unlink()

    if config.version_info_path:
        with config.version_info_path.open("a") as fh:
            fh.write(f"BITS: {'failed' if failed else 'passed'}\n")

    if failed:
        sys.exit(1)
