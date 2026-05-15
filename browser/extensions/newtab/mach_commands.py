# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import io
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from urllib.parse import urljoin, urlparse
from zipfile import ZipFile

import requests
import yaml
from colorama import Fore, Style
from mach.decorators import (
    Command,
    CommandArgument,
    SubCommand,
)
from mozfile import json

import taskcluster

# The glean parser module dependency is in a different folder, so we add it to our path.
sys.path.append(
    str(
        Path(
            "toolkit", "components", "glean", "build_scripts", "glean_parser_ext"
        ).absolute()
    )
)
WEBEXT_METRICS_PATH = Path("browser", "extensions", "newtab", "webext-glue", "metrics")
sys.path.append(str(WEBEXT_METRICS_PATH.absolute()))
import glean_utils
from run_glean_parser import parse_with_options

FIREFOX_L10N_REPO = "https://github.com/mozilla-l10n/firefox-l10n.git"
FLUENT_FILE = "newtab.ftl"
WEBEXT_LOCALES_PATH = Path("browser", "extensions", "newtab", "webext-glue", "locales")

LOCAL_EN_US_PATH = Path("browser", "locales", "en-US", "browser", "newtab", FLUENT_FILE)
COMPARE_TOOL_PATH = Path(
    "third_party", "python", "moz_l10n", "moz", "l10n", "bin", "compare.py"
)
REPORT_PATH = Path(WEBEXT_LOCALES_PATH, "locales-report.json")
REPORT_LEFT_JUSTIFY_CHARS = 15
FLUENT_FILE_ANCESTRY = Path("browser", "newtab")
SUPPORTED_LOCALES_PATH = Path(WEBEXT_LOCALES_PATH, "supported-locales.json")

# We query whattrainisitnow.com to get some key dates for both beta and
# release in order to compute whether or not strings have been available on
# the beta channel long enough to consider falling back (currently, that's
# 3 weeks of time on the beta channel).
BETA_SCHEDULE_QUERY = "https://whattrainisitnow.com/api/release/schedule/?version=beta"
RELEASE_SCHEDULE_QUERY = (
    "https://whattrainisitnow.com/api/release/schedule/?version=release"
)
BETA_FALLBACK_THRESHOLD = timedelta(weeks=3)
TASKCLUSTER_ROOT_URL = "https://firefox-ci-tc.services.mozilla.com"
BEETMOVER_TASK_NAME = "beetmover-newtab"
XPI_NAME = "newtab.xpi"
BEETMOVER_ARTIFACT_PATH = f"public/build/{XPI_NAME}"
ARCHIVE_ROOT_PATH = "https://ftp.mozilla.org"


class YamlType(Enum):
    METRICS = "metrics"
    PINGS = "pings"


@Command(
    "newtab",
    category="misc",
    description="Run a command for the newtab built-in addon",
    virtualenv_name="newtab",
)
def newtab(command_context):
    """
    Desktop New Tab build and update utilities.
    """
    command_context._sub_mach(["help", "newtab"])
    return 1


def run_mach(command_context, cmd, **kwargs):
    return command_context._mach_context.commands.dispatch(
        cmd, command_context._mach_context, **kwargs
    )


@SubCommand(
    "newtab",
    "watch",
    description="Invokes npm run watchmc and mach watch simultaneously for auto-building and bundling of compiled newtab code.",
)
def watch(command_context):
    processes = []

    try:
        p1 = subprocess.Popen([
            "./mach",
            "npm",
            "run",
            "watchmc",
            "--prefix=browser/extensions/newtab",
        ])
        p2 = subprocess.Popen(["./mach", "watch"])
        processes.extend([p1, p2])
        print("Watching subprocesses started. Press Ctrl-C to terminate them.")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nSIGINT received. Terminating subprocesses...")
        for p in processes:
            p.terminate()
        for p in processes:
            p.wait()
        print("All watching subprocesses terminated.")

    # Rebundle to avoid having all of the sourcemaps stick around.
    run_mach(
        command_context,
        "npm",
        args=["run", "bundle", "--prefix=browser/extensions/newtab"],
    )


@SubCommand(
    "newtab",
    "update-locales",
    description="Update the locales snapshot.",
    virtualenv_name="newtab",
)
def update_locales(command_context):
    try:
        os.mkdir(WEBEXT_LOCALES_PATH)
    except FileExistsError:
        pass

    # Step 1: We download the latest reckoning of strings from firefox-l10n
    print("Cloning the latest HEAD of firefox-l10n repository")
    with tempfile.TemporaryDirectory() as clone_dir:
        subprocess.check_call([
            "git",
            "clone",
            "--depth=1",
            FIREFOX_L10N_REPO,
            clone_dir,
        ])
        # Step 2: Get some metadata about what we just pulled down -
        # specifically, the revision.
        revision = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=str(clone_dir),
            universal_newlines=True,
        ).strip()

        # Step 3: Recursively find all files matching the filename for our
        # FLUENT_FILE, and copy them into WEBEXT_LOCALES_PATH/AB_CD/FLUENT_FILE
        root_dir = Path(clone_dir)
        fluent_file_matches = list(root_dir.rglob(FLUENT_FILE))
        for fluent_file_abs_path in fluent_file_matches:
            relative_path = fluent_file_abs_path.relative_to(root_dir)
            # The first element of the path is the locale code, which we want
            # to recreate under WEBEXT_LOCALES_PATH
            locale = relative_path.parts[0]
            destination_file = WEBEXT_LOCALES_PATH.joinpath(
                locale, FLUENT_FILE_ANCESTRY, FLUENT_FILE
            )
            destination_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(fluent_file_abs_path, destination_file)

        # Now clean up the temporary directory.
        shutil.rmtree(clone_dir)

    # Step 4: Now copy the local version of FLUENT_FILE in LOCAL_EN_US_PATH
    # into WEBEXT_LOCALES_PATH/en-US/FLUENT_FILE
    print(f"Cloning local en-US copy of {FLUENT_FILE}")
    dest_en_ftl_path = WEBEXT_LOCALES_PATH.joinpath(
        "en-US", FLUENT_FILE_ANCESTRY, FLUENT_FILE
    )
    dest_en_ftl_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(LOCAL_EN_US_PATH, dest_en_ftl_path)

    # Step 4.5: Now compute the commit dates of each of the strings inside of
    # LOCAL_EN_US_PATH.
    print("Computing local message commit dates…")
    message_dates = get_message_dates(LOCAL_EN_US_PATH)

    # Step 5: Now compare that en-US Fluent file with all of the ones we just
    # cloned and create a report with how many strings are still missing.
    print("Generating localization report…")

    source_ftl_path = WEBEXT_LOCALES_PATH.joinpath("en-US")
    paths = list(WEBEXT_LOCALES_PATH.rglob(FLUENT_FILE))

    # There are 2 parent folders of each FLUENT_FILE (see FLUENT_FILE_ANCESTRY),
    # and we want to get at the locale folder root for our comparison.
    ANCESTRY_LENGTH = 2

    # Get the full list of supported locales that we just pulled down
    supported_locales = sorted([path.parents[ANCESTRY_LENGTH].name for path in paths])
    path_strs = [path.parents[ANCESTRY_LENGTH].as_posix() for path in paths]

    # Verbosity on the compare.py tool appears to be a count value, which is
    # incremented for each -v flag. We want an elevated verbosity so that we
    # get back
    verbosity = ["-v", "-v"]
    # A bug in compare.py means that the source folder must be passed in as
    # an absolute path.
    source = ["--source=%s" % source_ftl_path.absolute().as_posix()]
    other_flags = ["--json"]

    # The moz.l10n compare tool is currently designed to be invoked from the
    # command line interface. We'll use subprocess to invoke it and capture
    # its output.
    python = command_context.virtualenv_manager.python_path

    def on_line(line):
        locales = json.loads(line)

        # The compare tool seems to produce non-deterministic ordering of
        # missing message IDs, which makes reasoning about changes to the
        # report JSON difficult. We sort each locales list of missing message
        # IDs alphabetically.
        REPORT_FILE_PATH = f"browser/newtab/{FLUENT_FILE}"
        for locale, locale_data in locales.items():
            missing = locale_data.get("missing", None)
            if isinstance(missing, dict):
                entries = missing.get(REPORT_FILE_PATH, None)
                if isinstance(entries, list):
                    entries.sort()

        report = {
            "locales": locales,
            "meta": {
                "repository": FIREFOX_L10N_REPO,
                "revision": revision,
                "updated": datetime.utcnow().isoformat(),
            },
            "message_dates": message_dates,
        }
        with open(REPORT_PATH, "w") as file:
            json.dump(report, file, indent=2, sort_keys=True)
        display_report(report)
        print("Wrote report to %s" % REPORT_PATH)

    command_context.run_process(
        [python, str(COMPARE_TOOL_PATH)] + other_flags + source + verbosity + path_strs,
        pass_thru=False,
        line_handler=on_line,
    )

    print("Writing supported locales to %s" % SUPPORTED_LOCALES_PATH)
    with open(SUPPORTED_LOCALES_PATH, "w") as file:
        json.dump(supported_locales, file, indent=2)

    print("Done")


@SubCommand(
    "newtab",
    "locales-report",
    description="Parses the current locales-report.json and produces something human readable.",
    virtualenv_name="newtab",
)
@CommandArgument(
    "--details", default=None, help="Which locale to pull up details about"
)
def locales_report(command_context, details):
    with open(REPORT_PATH) as file:
        report = json.load(file)
        display_report(report, details)


def get_message_dates(fluent_file_path):
    """Computes the landing dates of strings in fluent_file_path.

    This is returned as a dict of Fluent message names mapped
    to ISO-formatted dates for their landings.
    """
    result = subprocess.run(
        ["git", "blame", "--line-porcelain", fluent_file_path],
        stdout=subprocess.PIPE,
        text=True,
        check=True,
    )

    pattern = re.compile(r"^([a-z-]+[^\s]+) ")
    entries = {}
    entry = {}

    for line in result.stdout.splitlines():
        if line.startswith("\t"):
            code = line[1:]
            match = pattern.match(code)
            if match:
                key = match.group(1)
                timestamp = int(entry.get("committer-time", 0))
                commit_time = datetime.fromtimestamp(timestamp)
                # Only store the first time it was introduced (which blame gives us)
                entries[key] = commit_time.isoformat()
            entry = {}
        elif " " in line:
            key, val = line.split(" ", 1)
            entry[key] = val

    return entries


def get_date_manually():
    """Requests a date from the user in yyyy/mm/dd format.

    This will loop until a valid date is computed. Returns a datetime.
    """
    while True:
        try:
            typed_chars = input("Enter date manually (yyyy/mm/dd): ")
            manual_date = datetime.strptime(typed_chars, "%Y/%m/%d")
            return manual_date
        except ValueError:
            print("Invalid date format. Please use yyyy/mm/dd.")


def display_report(report, details=None):
    """Displays a report about the current newtab localization state.

    This report is calculated using the REPORT_PATH file generated
    via the update-locales command, along with the merge-to-beta
    dates of the most recent beta and release versions of the browser,
    as well as the current date.

    Details about a particular locale can be requested via the details
    argument.
    """
    print("New Tab locales report")
    # We need some key dates to determine which strings are currently awaiting
    # translations on the beta channel, and which strings are just missing
    # (where missing means that they've been available for translation on the
    # beta channel for more than the BETA_FALLBACK_THRESHOLD, and are still
    # not available).
    #
    # We need to get the last merge date of the current beta, and the merge
    # date of the current release.
    try:
        response = requests.get(BETA_SCHEDULE_QUERY, timeout=10)
        response.raise_for_status()
        beta_merge_date = datetime.fromisoformat(response.json()["merge_day"])
    except (requests.RequestException, requests.HTTPError):
        print(f"Failed to compute last beta merge day for {FLUENT_FILE}.")
        beta_merge_date = get_date_manually()

    beta_merge_date = beta_merge_date.replace(tzinfo=timezone.utc)
    print(f"Beta date: {beta_merge_date}")

    # The release query needs to be different because the endpoint doesn't
    # actually tell us the merge-to-beta date for the version on the release
    # channel. We guesstimate it by getting at the build date for the first
    # beta of that version, and finding the last prior Monday.
    try:
        response = requests.get(RELEASE_SCHEDULE_QUERY, timeout=10)
        response.raise_for_status()
        release_merge_date = datetime.fromisoformat(response.json()["beta_1"])
        # weekday() defaults to Monday.
        release_merge_date = release_merge_date - timedelta(
            days=release_merge_date.weekday()
        )
    except (requests.RequestException, requests.HTTPError):
        print(
            f"Failed to compute the merge-to-beta day the current release for {FLUENT_FILE}."
        )
        release_merge_date = get_date_manually()

    release_merge_date = release_merge_date.replace(tzinfo=timezone.utc)
    print(f"Release merge-to-beta date: {release_merge_date}")

    # These two dates will be used later on when we start calculating which
    # untranslated strings should be considered "pending" (we're still waiting
    # for them to be on beta for at least 3 weeks), and which should be
    # considered "missing" (they've been on beta for more than 3 weeks and
    # still aren't translated).

    meta = report["meta"]
    message_date_strings = report["message_dates"]
    # Convert each message date into a datetime object
    message_dates = {
        key: datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
        for key, value in message_date_strings.items()
    }

    print(f"Locales last updated: {meta['updated']}")
    print(f"From {meta['repository']} - revision: {meta['revision']}")
    print("------")
    if details:
        if details not in report["locales"]:
            print(f"Unknown locale '{details}'")
            return
        sorted_locales = [details]
    else:
        sorted_locales = sorted(report["locales"].keys(), key=lambda x: x.lower())
    for locale in sorted_locales:
        print(Style.RESET_ALL, end="")
        if report["locales"][locale]["missing"]:
            missing_translations = report["locales"][locale]["missing"][
                str(FLUENT_FILE_ANCESTRY.joinpath(FLUENT_FILE))
            ]
            # For each missing string, see if any of them have been in the
            # en-US locale for less than BETA_FALLBACK_THRESHOLD. If so, these
            # strings haven't been on the beta channel long enough to consider
            # falling back. We're still awaiting translations on them.
            total_pending_translations = 0
            total_missing_translations = 0
            for missing_translation in missing_translations:
                message_id = missing_translation.split(".")[0]
                if message_dates[message_id] < release_merge_date:
                    # Anything landed prior to the most recent release
                    # merge-to-beta date has clearly been around long enough
                    # to be translated. This is a "missing" string.
                    total_missing_translations = total_missing_translations + 1
                    if details:
                        print(
                            Fore.YELLOW
                            + f"Missing: {message_dates[message_id]}: {message_id}"
                        )
                elif message_dates[message_id] < beta_merge_date and (
                    datetime.now(timezone.utc) - beta_merge_date
                    > BETA_FALLBACK_THRESHOLD
                ):
                    # Anything that landed after the release merge to beta, but
                    # before the most recent merge to beta, we'll consider its
                    # age to be the beta_merge_date, rather than the
                    # message_dates entry. If we compare the beta_merge_date
                    # with the current time and see that BETA_FALLBACK_THRESHOLD
                    # has passed, then the string is missing.
                    total_missing_translations = total_missing_translations + 1
                    if details:
                        print(
                            Fore.YELLOW
                            + f"Missing: {message_dates[message_id]}: {message_id}"
                        )
                else:
                    # Otherwise, this string has not been on beta long enough
                    # to have been translated. This is a pending string.
                    total_pending_translations = total_pending_translations + 1
                    if details:
                        print(
                            Fore.RED
                            + f"Pending: {message_dates[message_id]}: {message_id}"
                        )

            if total_pending_translations > 10:
                color = Fore.RED
            else:
                color = Fore.YELLOW
            print(
                color
                + f"{locale.ljust(REPORT_LEFT_JUSTIFY_CHARS)}{total_pending_translations} pending translations, {total_missing_translations} missing translations"
            )

        else:
            print(
                Fore.GREEN
                + f"{locale.ljust(REPORT_LEFT_JUSTIFY_CHARS)}0 missing translations"
            )
    print(Style.RESET_ALL, end="")


@SubCommand(
    "newtab",
    "channel-metrics-diff",
    description="Compares and produces a JSON diff between local NewTab metrics and pings, and the specified channel.",
    virtualenv_name="newtab",
)
@CommandArgument(
    "--channel",
    default="release",
    choices=["beta", "release"],
    help="Which channel should be used to compare NewTab metrics and pings YAML",
)
def channel_metrics_diff(command_context, channel):
    """
    Fetch main and a comparison branch (beta or release) metrics.yaml, compute only the new metrics,
    and process as before. To run use: ./mach newtab channel-metrics-diff --channel [beta|release]
    This will print YAML-formatted output to stdout, showing the differences in newtab metrics and pings.
    """
    METRICS_LOCAL_YAML_PATH = Path("browser", "components", "newtab", "metrics.yaml")
    PINGS_LOCAL_YAML_PATH = Path("browser", "components", "newtab", "pings.yaml")

    try:
        # Get Firefox version from version.txt
        version_file = Path("browser", "config", "version.txt")
        if not version_file.exists():
            print("Error: version.txt not found")
            return 1

        with open(version_file) as f:
            # Extract just the major version number (e.g., "141" from "141.0a1")
            firefox_version = int(f.read().strip().split(".")[0])

        # Adjust version number based on channel
        if channel == "beta":
            firefox_version -= 1
        elif channel == "release":
            firefox_version -= 2

        output_filename = f"runtime-metrics-{firefox_version}.json"

        # Base URL for fetching YAML files from GitHub
        GITHUB_URL_TEMPLATE = "https://raw.githubusercontent.com/mozilla-firefox/firefox/refs/heads/{branch}/browser/components/newtab/{yaml}"

        main_metrics_yaml = yaml.safe_load(open(METRICS_LOCAL_YAML_PATH))
        compare_metrics_yaml = fetch_yaml(
            GITHUB_URL_TEMPLATE.format(branch=channel, yaml="metrics.yaml")
        )
        main_pings_yaml = yaml.safe_load(open(PINGS_LOCAL_YAML_PATH))
        compare_pings_yaml = fetch_yaml(
            GITHUB_URL_TEMPLATE.format(branch=channel, yaml="pings.yaml")
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)

            # 2. Process metrics and pings file
            metrics_path = process_yaml_file(
                main_metrics_yaml, compare_metrics_yaml, YamlType.METRICS, temp_dir_path
            )
            pings_path = process_yaml_file(
                main_pings_yaml, compare_pings_yaml, YamlType.PINGS, temp_dir_path
            )

            # 3. Set up the input files
            input_files = [metrics_path, pings_path]

            # 4. Parse the YAML file
            options = {"allow_reserved": False}
            all_objs, options = parse_with_options(input_files, options)

            # 5. Create output directory and file
            WEBEXT_METRICS_PATH.mkdir(parents=True, exist_ok=True)
            output_file_path = WEBEXT_METRICS_PATH / output_filename

            # 6. Write to the output file
            output_fd = io.StringIO()
            glean_utils.output_file_with_key(all_objs, output_fd, options)
            Path(output_file_path).write_text(output_fd.getvalue())

            # 7. Print warnings for any metrics with changed types or new extra_keys
            changed_metrics = check_existing_metrics(
                main_metrics_yaml, compare_metrics_yaml
            )
            if changed_metrics:
                print("\nWARNING: Found existing metrics with updated properties:")
                for category, metrics in changed_metrics.items():
                    print(f"\nCategory: {category}")
                    for metric, changes in metrics.items():
                        print(f"  Metric: {metric}")
                        if "type_change" in changes:
                            print(
                                f"      Old type: {changes['type_change']['old_type']}"
                            )
                            print(
                                f"      New type: {changes['type_change']['new_type']}"
                            )
                        if "new_extra_keys" in changes:
                            print(
                                f"    New extra keys: {', '.join(changes['new_extra_keys'])}"
                            )
                print(
                    "\nPlease review above warning carefully as existing metrics update cannot be dynamically registered"
                )

    except requests.RequestException as e:
        print(f"Network error while fetching YAML files: {e}\nPlease try again.")
        return 1
    except yaml.YAMLError as e:
        print(f"YAML parsing error: {e}\nPlease check that the YAML files are valid.")
        return 1
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return 1


def fetch_yaml(url):
    response = requests.get(url)
    response.raise_for_status()
    return yaml.safe_load(response.text)


def process_yaml_file(main_yaml, compare_yaml, yaml_type: YamlType, temp_dir_path):
    """Helper function to process YAML content and write to temporary file.

    Args:
        main_yaml: The main branch YAML content
        compare_yaml: The comparison branch YAML content
        yaml_type: YamlType Enum value to determine which comparison function to use
        temp_dir_path: Path object for the temporary directory

    Returns:
        Path object for the created temporary file
    """
    if yaml_type == YamlType.METRICS:
        new_yaml = get_new_metrics(main_yaml, compare_yaml)
        filename = "newtab_metrics_only_new.yaml"
    else:
        new_yaml = get_new_pings(main_yaml, compare_yaml)
        filename = "newtab_pings_only_new.yaml"

    # Remove $tags if present to avoid invalid tag lint error
    if "$tags" in new_yaml:
        del new_yaml["$tags"]
    new_yaml["no_lint"] = ["COMMON_PREFIX"]

    yaml_content = yaml.dump(new_yaml, sort_keys=False)
    print(yaml_content)

    # Write to temporary file
    file_path = temp_dir_path / filename
    with open(file_path, "w") as f:
        f.write(yaml_content)

    return file_path


def get_new_metrics(main_yaml, compare_yaml):
    """Compare main and comparison YAML files to find new metrics.

    This function compares the metrics defined in the main branch against those in the comparison branch
    (beta or release) and returns only the metrics that are new in the main branch.

    Args:
        main_yaml: The YAML content from the main branch containing metric definitions
        compare_yaml: The YAML content from the comparison branch (beta/release) containing metric definitions

    Returns:
        dict: A dictionary containing only the metrics that are new in the main branch
    """
    new_metrics_yaml = {}
    for category in main_yaml:
        if category.startswith("$"):
            new_metrics_yaml[category] = main_yaml[category]
            continue
        if category not in compare_yaml:
            new_metrics_yaml[category] = main_yaml[category]
            continue
        new_metrics = {}
        for metric in main_yaml[category]:
            if metric not in compare_yaml[category]:
                new_metrics[metric] = main_yaml[category][metric]
        if new_metrics:
            new_metrics_yaml[category] = new_metrics
    return new_metrics_yaml


def get_new_pings(main_yaml, compare_yaml):
    """Compare main and comparison YAML files to find new pings.

    This function compares the pings defined in the main branch against those in the comparison branch
    (beta or release) and returns only the pings that are new in the main branch.

    Args:
        main_yaml: The YAML content from the main branch containing ping definitions
        compare_yaml: The YAML content from the comparison branch (beta/release) containing ping definitions

    Returns:
        dict: A dictionary containing only the pings that are new in the main branch
    """
    new_pings_yaml = {}
    for ping in main_yaml:
        if ping.startswith("$"):
            new_pings_yaml[ping] = main_yaml[ping]
            continue
        if ping not in compare_yaml:
            new_pings_yaml[ping] = main_yaml[ping]
            continue
    return new_pings_yaml


def check_existing_metrics(main_yaml, compare_yaml):
    """Compare metrics that exist in both YAML files for:
    1. Changes in type property values
    2. New extra_keys added to event type metrics

    Args:
        main_yaml: The main YAML file containing metrics
        compare_yaml: The comparison YAML file containing metrics

    Returns:
        A dictionary containing metrics with changes, organized by category.
            Each entry contains either:
            - type_change: old and new type values
            - new_extra_keys: list of newly added extra keys for event metrics
    """
    changed_metrics = {}

    for category in main_yaml:
        # Skip metadata categories that start with $
        if category.startswith("$"):
            continue

        # Skip categories that don't exist in compare_yaml
        if category not in compare_yaml:
            continue

        category_changes = {}
        for metric in main_yaml[category]:
            # Only check metrics that exist in both YAMLs
            if metric in compare_yaml[category]:
                main_metric = main_yaml[category][metric]
                compare_metric = compare_yaml[category][metric]

                # Check for type changes
                main_type = main_metric.get("type")
                compare_type = compare_metric.get("type")

                changes = {}

                # If types are different, record the change
                if main_type != compare_type:
                    changes["type_change"] = {
                        "old_type": compare_type,
                        "new_type": main_type,
                    }

                # Check for changes in extra_keys for event metrics
                if main_type == "event" and "extra_keys" in main_metric:
                    main_extra_keys = set(main_metric["extra_keys"].keys())
                    compare_extra_keys = set(
                        compare_metric.get("extra_keys", {}).keys()
                    )

                    # Find new extra keys
                    new_extra_keys = main_extra_keys - compare_extra_keys
                    if new_extra_keys:
                        changes["new_extra_keys"] = list(new_extra_keys)

                # Only add the metric if there were any changes
                if changes:
                    category_changes[metric] = changes

        # Only add the category if there were changes
        if category_changes:
            changed_metrics[category] = category_changes

    return changed_metrics


@SubCommand(
    "newtab",
    "trainhop-recipe",
    description="""Generates the appropriate trainhop recipe for the Nimbus
newtabTrainhopAddon feature, given a Taskcluster shipping task group URL from
ship-it""",
)
@CommandArgument(
    "taskcluster_group_url", help="The shipping Taskcluster task group URL from ship-it"
)
def trainhop_recipe(command_context, taskcluster_group_url):
    tc_root_url = urlparse(TASKCLUSTER_ROOT_URL)
    group_url = urlparse(taskcluster_group_url)
    if group_url.scheme != "https" or group_url.hostname != tc_root_url.hostname:
        print(
            f"Expected an https URL with hostname {tc_root_url.hostname}. Got: {taskcluster_group_url}"
        )
        return 1

    group_id = group_url.path.split("/")[-1]
    if not group_id:
        print(f"Could not extract the task group ID from {taskcluster_group_url}")
        return 1

    print(f"Extracted task group ID {group_id}")

    queue = taskcluster.Queue({"rootUrl": TASKCLUSTER_ROOT_URL})
    task_group = queue.listTaskGroup(group_id)
    artifact_destination = ""

    for task in task_group["tasks"]:
        if task["task"]["metadata"]["name"] == BEETMOVER_TASK_NAME:
            print(f"Found {BEETMOVER_TASK_NAME} task")
            artifacts = task["task"]["payload"]["artifactMap"]
            for artifact in artifacts:
                if BEETMOVER_ARTIFACT_PATH in artifact["paths"]:
                    artifact_destination = artifact["paths"][BEETMOVER_ARTIFACT_PATH][
                        "destinations"
                    ][0]

    print(f"Got the destination: {artifact_destination}")
    xpi_archive_url = urljoin(ARCHIVE_ROOT_PATH, artifact_destination)
    print(f"Downloading from: {xpi_archive_url}")

    with tempfile.TemporaryDirectory() as download_dir:
        with requests.get(xpi_archive_url, stream=True) as request:
            request.raise_for_status()

            download_path = Path(download_dir).joinpath(XPI_NAME)
            with open(download_path, "wb") as f:
                for chunk in request.iter_content(chunk_size=8192):
                    # If you have chunk encoded response uncomment if
                    # and set chunk_size parameter to None.
                    # if chunk:
                    f.write(chunk)

            # XPIs are just ZIP files, so let's reach in and read manifest.json.
            with ZipFile(download_path) as newtab_xpi:
                with newtab_xpi.open("manifest.json") as manifest_file:
                    manifest = json.loads(manifest_file.read())
                    addon_version = manifest["version"]

            shutil.rmtree(download_dir)

    result = {
        "addon_version": addon_version,
        "xpi_download_path": "/".join(artifact_destination.split("/")[-2:]),
    }

    print("Nimbus train-hop recipe:\n\n")
    print(json.dumps(result, indent=2, sort_keys=True))
    print("\n")


@SubCommand(
    "newtab",
    "bundle",
    description="Bundle compiled newtab code.",
)
def bundle(command_context):
    """
    Runs: ./mach npm run bundle --prefix=browser/extensions/newtab
    """
    proc = None

    try:
        proc = subprocess.Popen([
            "./mach",
            "npm",
            "run",
            "bundle",
            "--prefix=browser/extensions/newtab",
        ])
        print("Bundling newtab started. Press Ctrl-C to terminate.")
        proc.wait()
    except KeyboardInterrupt:
        if proc:
            proc.terminate()
            proc.wait()
            print("Bundle process terminated.")
    else:
        # Successful bundle
        if proc and proc.returncode == 0:
            print("Bundling newtab completed.")
        elif proc:
            code = proc.returncode
            print(f"Bundling newtab failed (exit code {code}). See logs above.")

            if code == 127:
                print(
                    "Hint: Required npm binaries not found. "
                    "Try running:\n  ./mach newtab install"
                )

    # Swallow errors (no exception raising). Return the process returncode for mach to surface.
    return 0 if proc is None else proc.returncode


@SubCommand(
    "newtab",
    "install",
    description="Installing node dependencies for newtab extension.",
)
def install(command_context):
    """
    Runs: ./mach npm install --prefix=browser/extensions/newtab
    """
    proc = None

    try:
        proc = subprocess.Popen([
            "./mach",
            "npm",
            "install",
            "--prefix=browser/extensions/newtab",
        ])
        print(
            "Installing node dependencies for newtab started. Press Ctrl-C to terminate."
        )
        proc.wait()
    except KeyboardInterrupt:
        if proc:
            proc.terminate()
            proc.wait()
            print("Install process terminated.")
    else:
        print("Installing node dependencies for newtab completed.")

    # Swallow errors (no exception raising). Return the process returncode for mach to surface.
    return 0 if proc is None else proc.returncode


@SubCommand(
    "newtab",
    "get-unbranded-builds",
    description="Get URLs for the latest unbranded Firefox builds for add-on development.",
)
@CommandArgument(
    "--channel",
    default="release",
    choices=["beta", "release"],
    help="Which channel to get unbranded builds for",
)
def get_unbranded_builds(command_context, channel):
    """
    Prints the latest unbranded Firefox build artifact URLs for Mac, Windows, and Linux.
    These builds allow testing unsigned extensions without enforcing signature requirements.
    """
    TASKCLUSTER_INDEX_URL = (
        "https://firefox-ci-tc.services.mozilla.com/api/index/v1/task"
    )

    repo = f"mozilla-{channel}"

    platforms = {
        "macOS (Intel)": {
            "namespace": f"gecko.v2.{repo}.latest.firefox.macosx64-add-on-devel",
            "artifact": "public/build/target.dmg",
        },
        "Windows 32-bit": {
            "namespace": f"gecko.v2.{repo}.latest.firefox.win32-add-on-devel",
            "artifact": "public/build/target.zip",
        },
        "Windows 64-bit": {
            "namespace": f"gecko.v2.{repo}.latest.firefox.win64-add-on-devel",
            "artifact": "public/build/target.zip",
        },
        "Linux 64-bit": {
            "namespace": f"gecko.v2.{repo}.latest.firefox.linux64-add-on-devel",
            "artifact": "public/build/target.tar.bz2",
        },
    }

    print(f"Fetching latest unbranded builds for {channel} channel...\n")

    for platform_name, platform_info in platforms.items():
        namespace = platform_info["namespace"]
        artifact = platform_info["artifact"]

        try:
            index_url = f"{TASKCLUSTER_INDEX_URL}/{namespace}"
            response = requests.get(index_url, timeout=10)
            response.raise_for_status()
            task_data = response.json()
            task_id = task_data["taskId"]

            artifact_url = f"https://firefox-ci-tc.services.mozilla.com/api/queue/v1/task/{task_id}/runs/0/artifacts/{artifact}"

            print(f"{platform_name}:")
            print(f"  {artifact_url}\n")
        except requests.RequestException as e:
            print(f"{platform_name}: Failed to fetch ({e})\n")

    print(
        "For more information, see: https://wiki.mozilla.org/Add-ons/Extension_Signing#Unbranded_Builds"
    )
    print(
        f"Manual search: https://treeherder.mozilla.org/#/jobs?repo={repo}&searchStr=addon"
    )
