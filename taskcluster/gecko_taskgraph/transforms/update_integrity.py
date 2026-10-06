# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import shlex
import urllib.parse

from mozrelease.paths import getReleaseInstallerPath, getReleasesDir
from mozrelease.platforms import updatePlatform2ftp
from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import resolve_keyed_by

transforms = TransformSequence()


@transforms.add
def skip_for_non_nightly(config, jobs):
    """Don't generate any jobs unless running as a nightly. Other code in this transform depends on nightly-specific parameters being set."""
    if not config.params["release_history"]:
        return

    yield from jobs


@transforms.add
def add_build_target(config, jobs):
    for job in jobs:
        # checked before `linux64` to avoid `linux64-aarch64` ending up with
        # `linux64` information
        if job["attributes"]["build_platform"].startswith("linux64-aarch64"):
            build_target = "Linux_aarch64-gcc3"
        elif job["attributes"]["build_platform"].startswith("linux64"):
            build_target = "Linux_x86_64-gcc3"
        elif job["attributes"]["build_platform"].startswith("mac"):
            build_target = "Darwin_x86_64-gcc3-u-i386-x86_64"
        elif job["attributes"]["build_platform"].startswith("win32"):
            build_target = "WINNT_x86-msvc"
        # checked before `win64` to avoid `win64-aarch64` ending up with
        # `win64` information
        elif job["attributes"]["build_platform"].startswith("win64-aarch64"):
            build_target = "WINNT_aarch64-msvc-aarch64"
        elif job["attributes"]["build_platform"].startswith("win64"):
            build_target = "WINNT_x86_64-msvc"
        else:
            raise Exception("couldn't detect build target")

        job["attributes"]["build_target"] = build_target

        yield job


@transforms.add
def skip_for_new_locales_and_platforms(config, jobs):
    """Don't generate any jobs for newly added locales or platforms that don't have `from` releases to test."""
    for job in jobs:
        locale = job["attributes"].get("locale", "en-US")
        build_target = job["attributes"]["build_target"]

        if locale not in config.params["release_history"].get(build_target, {}):
            continue

        yield job


@transforms.add
def resolve_keys(config, jobs):
    for job in jobs:
        for key in ("cert-overrides", "fetches.toolchain", "archive-prefix"):
            resolve_keyed_by(
                job,
                key,
                job["name"],
                **{
                    "build-platform": job["attributes"]["build_platform"],
                    "project": config.params["project"],
                },
            )

        yield job


@transforms.add
def set_treeherder(config, jobs):
    for job in jobs:
        th = job.setdefault("treeherder", {})
        attrs = job["attributes"]
        attrs["locale"] = attrs.get("locale", "en-US")

        th["platform"] = f"{attrs['build_platform']}/{attrs['build_type']}"
        th["symbol"] = th["symbol"].format(**attrs)
        yield job


@transforms.add
def add_to_installer(config, jobs):
    """Adds fetch entries for the "to" installer to fetches."""
    for job in jobs:
        locale = job["attributes"].get("locale", "en-US")
        # en-US and l10n tasks have different upstream tasks, and different
        # artifact names.
        if locale == "en-US":
            if "linux" in job["attributes"]["build_platform"]:
                job["fetches"]["build-signing"] = [
                    {"artifact": "target.tar.xz", "extract": False}
                ]
            elif "mac" in job["attributes"]["build_platform"]:
                job["fetches"]["repackage"] = [{"artifact": "target.dmg"}]
            elif "win" in job["attributes"]["build_platform"]:
                job["fetches"]["repackage"] = [{"artifact": "target.installer.exe"}]
            else:
                raise Exception(
                    "unsupported platform: {job['attributes']['build_platform']}!"
                )
        else:  # noqa: PLR5501 -- this is more readable with a separate `else` block for l10n
            if "linux" in job["attributes"]["build_platform"]:
                job["fetches"]["shippable-l10n-signing"] = [
                    {"artifact": f"{locale}/target.tar.xz", "extract": False}
                ]
            elif "mac" in job["attributes"]["build_platform"]:
                job["fetches"]["repackage-l10n"] = [
                    {"artifact": f"{locale}/target.dmg"}
                ]
            elif "win" in job["attributes"]["build_platform"]:
                job["fetches"]["repackage-l10n"] = [
                    {"artifact": f"{locale}/target.installer.exe"}
                ]
            else:
                raise Exception(
                    "unsupported platform: {job['attributes']['build_platform']}!"
                )

        yield job


@transforms.add
def add_additional_fetches_and_command(config, jobs):
    """Adds fetch entries for the "from" installers and partial MARs."""
    for job in jobs:
        if job["attributes"]["build_platform"].startswith("linux"):
            platform = "linux"
            installer_suffix = "tar.xz"
        elif job["attributes"]["build_platform"].startswith("mac"):
            platform = "mac"
            installer_suffix = "dmg"
        elif job["attributes"]["build_platform"].startswith("win"):
            platform = "win"
            installer_suffix = "installer.exe"
        else:
            raise Exception("couldn't detect platform specific variables")

        # ideally, this attribute would be set on en-US jobs as well...but it's not, so we have to assume
        locale = job["attributes"].get("locale", "en-US")
        build_target = job["attributes"]["build_target"]

        cmd = [
            # add dmg tool location to the $PATH. this is not strictly necessary
            # for non-mac tests, but it's harmless
            "export PATH=$MOZ_FETCHES_DIR/dmg:$PATH &&",
            # test runner
            "/builds/worker/fetches/marannon/marannon",
            # script that actually runs the tests - eventually to be replaced
            # with native code
            "tools/update-verify/release/common/check_updates.sh",
            # platform - used to determine how to unpack builds
            platform,
            # "to" installer
            f"/builds/worker/fetches/target.{installer_suffix}",
            # "to" complete mar
            "/builds/worker/fetches/target.complete.mar",
            # directory containing partial mars
            "/builds/worker/fetches",
            # locale
            locale,
            # channel - stop hardcoding
            "nightly-try",
            # app name - stop hardcoding
            "firefox",
            # artifact dir
            "/builds/worker/artifacts",
        ]

        cert_overrides = job.pop("cert-overrides")
        if cert_overrides:
            cmd.extend([
                # directory containing mar certificates
                # note we use versions from tools/update-verify, not the ones
                # in toolkit/mozapps/update/updater, which are not precisely
                # the same size, and injecting them would corrupt the binary
                "--cert-dir",
                "tools/update-verify/release/mar_certs",
            ])
            for override in cert_overrides:
                cmd.extend(["--cert-override", shlex.quote(override)])

        archive_prefix = job.pop("archive-prefix")

        fetches = []
        for mar, info in config.params["release_history"][build_target][locale].items():
            if locale == "en-US":
                mar_prefix = ""
            else:
                mar_prefix = f"{locale}/"

            fetches.append({"artifact": f"{mar_prefix}{mar}"})

            # the locale identifier is different for japanese depending on the
            # platform...make sure we translate it for the updater download
            linux_locale = "ja" if locale == "ja-JP-mac" else locale

            # URLs for nightlies and releases are significantly different; they
            # can't be constructed in the same manner
            if "nightly" in info["mar_url"]:
                # parameters give us the complete MAR url. installers are found right
                # beside them
                base_url = info["mar_url"].split(".complete.mar")[0]
                identifier = info["buildid"]

                # regardless of what platform is under test, we perform the tests
                # with the 64-bit linux updater
                linux64_info = config.params["release_history"]["Linux_x86_64-gcc3"][
                    linux_locale
                ][mar]

                from_installer_url = f"{base_url}.{installer_suffix}"
                linux64_installer_url = linux64_info["mar_url"].replace(
                    ".complete.mar", ".tar.xz"
                )
            else:
                identifier = info["previousVersion"]
                from_installer_url = _get_release_installer_url(
                    info["product"],
                    build_target,
                    locale,
                    info["previousVersion"],
                    archive_prefix,
                )
                linux64_installer_url = _get_release_installer_url(
                    info["product"],
                    "Linux_x86_64-gcc3",
                    linux_locale,
                    info["previousVersion"],
                    archive_prefix,
                )

            # installers and updaters are fetched from URLs (not upstream tasks); we simply
            # inject these into the task for the payload to deal with
            cmd.append("--from")
            cmd.append(
                shlex.quote(
                    f"{identifier}|{from_installer_url}|{linux64_installer_url}|{mar}"
                )
            )

        job["fetches"]["partials-signing"] = fetches
        job["run"]["command"] = " ".join(cmd)

        yield job


def _get_release_installer_url(
    brand, build_target, locale, from_version, archive_prefix
):
    product = brand.lower()
    ftp_platform = updatePlatform2ftp(build_target)
    releases_dir = getReleasesDir(
        product, from_version, protocol="https", server=archive_prefix
    )
    path = urllib.parse.quote(
        getReleaseInstallerPath(product, brand, from_version, ftp_platform, locale)
    )
    return f"{releases_dir}/{path}"
