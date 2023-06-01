# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import copy
import enum
import itertools
import os
import re
import sys
from contextlib import redirect_stdout

from mozbuild.base import MozbuildObject
from mozversioncontrol import get_repository_object

from ..push import generate_try_task_config, push_to_try
from ..util.fzf import (
    FZF_NOT_FOUND,
    build_base_cmd,
    fzf_bootstrap,
    run_fzf,
    setup_tasks_for_fzf,
)
from .compare import CompareParser

here = os.path.abspath(os.path.dirname(__file__))
build = MozbuildObject.from_environment(cwd=here)

PERFHERDER_BASE_URL = (
    "https://treeherder.mozilla.org/perfherder/"
    "compare?originalProject=try&originalRevision=%s&newProject=try&newRevision=%s"
)

# Prevent users from running more than 300 tests at once. It's possible, but
# it's more likely that a query is broken and is selecting far too much.
MAX_PERF_TASKS = 300
REVISION_MATCHER = re.compile(r"remote:.*/try/rev/([\w]*)[ \t]*$")

# Name of the base category with no variants applied to it
BASE_CATEGORY_NAME = "base"


class InvalidCategoryException(Exception):
    """Thrown when a category is found to be invalid.

    See the `PerfParser.run_category_checks()` method for more info.
    """

    pass


class LogProcessor:
    def __init__(self):
        self.buf = ""
        self.stdout = sys.__stdout__
        self._revision = None

    @property
    def revision(self):
        return self._revision

    def write(self, buf):
        while buf:
            try:
                newline_index = buf.index("\n")
            except ValueError:
                # No newline, wait for next call
                self.buf += buf
                break

            # Get data up to next newline and combine with previously buffered data
            data = self.buf + buf[: newline_index + 1]
            buf = buf[newline_index + 1 :]

            # Reset buffer then output line
            self.buf = ""
            if data.strip() == "":
                continue
            self.stdout.write(data.strip("\n") + "\n")

            # Check if a temporary commit wa created
            match = REVISION_MATCHER.match(data)
            if match:
                # Last line found is the revision we want
                self._revision = match.group(1)


class ClassificationEnum(enum.Enum):
    """This class provides the ability to use Enums as array indices."""

    @property
    def value(self):
        return self._value_["value"]

    def __index__(self):
        return self._value_["index"]

    def __int__(self):
        return self._value_["index"]


class Platforms(ClassificationEnum):
    ANDROID_A51 = {"value": "android-a51", "index": 0}
    ANDROID = {"value": "android", "index": 1}
    WINDOWS = {"value": "windows", "index": 2}
    LINUX = {"value": "linux", "index": 3}
    MACOSX = {"value": "macosx", "index": 4}
    DESKTOP = {"value": "desktop", "index": 5}


class Apps(ClassificationEnum):
    FIREFOX = {"value": "firefox", "index": 0}
    CHROME = {"value": "chrome", "index": 1}
    CHROMIUM = {"value": "chromium", "index": 2}
    GECKOVIEW = {"value": "geckoview", "index": 3}
    FENIX = {"value": "fenix", "index": 4}
    CHROME_M = {"value": "chrome-m", "index": 5}
    SAFARI = {"value": "safari", "index": 6}


class Suites(ClassificationEnum):
    RAPTOR = {"value": "raptor", "index": 0}
    TALOS = {"value": "talos", "index": 1}
    AWSY = {"value": "awsy", "index": 2}


class Variants(ClassificationEnum):
    NO_FISSION = {"value": "no-fission", "index": 0}
    BYTECODE_CACHED = {"value": "bytecode-cached", "index": 1}
    LIVE_SITES = {"value": "live-sites", "index": 2}
    PROFILING = {"value": "profiling", "index": 3}
    SWR = {"value": "swr", "index": 4}


"""
The following methods and constants are used for restricting
certain platforms and applications such as chrome, safari, and
android tests. These all require a flag such as --android to
enable (see build_category_matrix for more info).
"""


def check_for_android(android=False, **kwargs):
    return android


def check_for_chrome(chrome=False, **kwargs):
    return chrome


def check_for_safari(safari=False, **kwargs):
    return safari


def check_for_live_sites(live_sites=False, **kwargs):
    return live_sites


def check_for_profile(profile=False, **kwargs):
    return profile


class PerfParser(CompareParser):
    name = "perf"
    common_groups = ["push", "task"]
    task_configs = [
        "artifact",
        "browsertime",
        "disable-pgo",
        "env",
        "gecko-profile",
        "path",
        "rebuild",
    ]

    platforms = {
        Platforms.ANDROID_A51.value: {
            "query": "'android 'a51 'shippable 'aarch64",
            "restriction": check_for_android,
            "platform": Platforms.ANDROID.value,
        },
        Platforms.ANDROID.value: {
            # The android, and android-a51 queries are expected to be the same,
            # we don't want to run the tests on other mobile platforms.
            "query": "'android 'a51 'shippable 'aarch64",
            "restriction": check_for_android,
            "platform": Platforms.ANDROID.value,
        },
        Platforms.WINDOWS.value: {
            "query": "!-32 'windows 'shippable",
            "platform": Platforms.DESKTOP.value,
        },
        Platforms.LINUX.value: {
            "query": "!clang 'linux 'shippable",
            "platform": Platforms.DESKTOP.value,
        },
        Platforms.MACOSX.value: {
            "query": "'osx 'shippable",
            "platform": Platforms.DESKTOP.value,
        },
        Platforms.DESKTOP.value: {
            "query": "!android 'shippable !-32 !clang",
            "platform": Platforms.DESKTOP.value,
        },
    }

    apps = {
        Apps.FIREFOX.value: {
            "query": "!chrom !geckoview !fenix !safari",
            "platforms": [Platforms.DESKTOP.value],
        },
        Apps.CHROME.value: {
            "query": "'chrome",
            "negation": "!chrom",
            "restriction": check_for_chrome,
            "platforms": [Platforms.DESKTOP.value],
        },
        Apps.CHROMIUM.value: {
            "query": "'chromium",
            "negation": "!chrom",
            "restriction": check_for_chrome,
            "platforms": [Platforms.DESKTOP.value],
        },
        Apps.GECKOVIEW.value: {
            "query": "'geckoview",
            "platforms": [Platforms.ANDROID.value],
        },
        Apps.FENIX.value: {
            "query": "'fenix",
            "platforms": [Platforms.ANDROID.value],
        },
        Apps.CHROME_M.value: {
            "query": "'chrome-m",
            "negation": "!chrom",
            "restriction": check_for_chrome,
            "platforms": [Platforms.ANDROID.value],
        },
        Apps.SAFARI.value: {
            "query": "'safari",
            "negation": "!safari",
            "restriction": check_for_safari,
            "platforms": [Platforms.MACOSX.value],
        },
    }

    variants = {
        Variants.NO_FISSION.value: {
            "query": "'nofis",
            "negation": "!nofis",
            "platforms": [Platforms.ANDROID.value],
            "apps": [Apps.FENIX.value, Apps.GECKOVIEW.value],
        },
        Variants.BYTECODE_CACHED.value: {
            "query": "'bytecode",
            "negation": "!bytecode",
            "platforms": [Platforms.DESKTOP.value],
            "apps": [Apps.FIREFOX.value],
        },
        Variants.LIVE_SITES.value: {
            "query": "'live",
            "negation": "!live",
            "restriction": check_for_live_sites,
            "platforms": [Platforms.DESKTOP.value, Platforms.ANDROID.value],
            "apps": list(apps.keys()),
        },
        Variants.PROFILING.value: {
            "query": "'profil",
            "negation": "!profil",
            "restriction": check_for_profile,
            "platforms": [Platforms.DESKTOP.value, Platforms.ANDROID.value],
            "apps": [Apps.FIREFOX.value, Apps.GECKOVIEW.value, Apps.FENIX.value],
        },
        Variants.SWR.value: {
            "query": "'swr",
            "negation": "!swr",
            "platforms": [Platforms.DESKTOP.value],
            "apps": [Apps.FIREFOX.value],
        },
    }

    suites = {
        Suites.RAPTOR.value: {
            "apps": list(apps.keys()),
            "platforms": list(platforms.keys()),
            "variants": [
                Variants.NO_FISSION.value,
                Variants.LIVE_SITES.value,
                Variants.PROFILING.value,
                Variants.BYTECODE_CACHED.value,
            ],
        },
        Suites.TALOS.value: {
            "apps": [Apps.FIREFOX.value],
            "platforms": [Platforms.DESKTOP.value],
            "variants": [
                Variants.PROFILING.value,
                Variants.SWR.value,
            ],
        },
        Suites.AWSY.value: {
            "apps": [Apps.FIREFOX.value],
            "platforms": [Platforms.DESKTOP.value],
            "variants": [],
        },
    }

    """
    Here you can find the base categories that are defined for the perf
    selector. The following fields are available:
        * query: Set the queries to use for each suite you need.
        * suites: The suites that are needed for this category.
        * tasks: A hard-coded list of tasks to select.
        * platforms: The platforms that it can run on.
        * app-restrictions: A list of apps that the category can run.
        * variant-restrictions: A list of variants available for each suite.

    Note that setting the App/Variant-Restriction fields should be used to
    restrict the available apps and variants, not expand them.
    """
    categories = {
        "Pageload": {
            "query": {
                Suites.RAPTOR.value: ["'browsertime 'tp6"],
            },
            "suites": [Suites.RAPTOR.value],
            "tasks": [],
        },
        "Pageload (essential)": {
            "query": {
                Suites.RAPTOR.value: ["'browsertime 'tp6 'essential"],
            },
            "variant-restrictions": {Suites.RAPTOR.value: [Variants.NO_FISSION.value]},
            "suites": [Suites.RAPTOR.value],
            "app-restrictions": {
                Suites.RAPTOR.value: [
                    Apps.FIREFOX.value,
                    Apps.CHROME.value,
                    Apps.CHROMIUM.value,
                    Apps.FENIX.value,
                    Apps.GECKOVIEW.value,
                ],
            },
            "tasks": [],
        },
        "Responsiveness": {
            "query": {
                Suites.RAPTOR.value: ["'browsertime 'responsive"],
            },
            "suites": [Suites.RAPTOR.value],
            "variant-restrictions": {Suites.RAPTOR.value: []},
            "app-restrictions": {
                Suites.RAPTOR.value: [
                    Apps.FIREFOX.value,
                    Apps.CHROME.value,
                    Apps.CHROMIUM.value,
                    Apps.FENIX.value,
                    Apps.GECKOVIEW.value,
                ],
            },
            "tasks": [],
        },
        "Benchmarks": {
            "query": {
                Suites.RAPTOR.value: ["'browsertime 'benchmark"],
            },
            "suites": [Suites.RAPTOR.value],
            "variant-restrictions": {Suites.RAPTOR.value: []},
            "tasks": [],
        },
        "DAMP (Devtools)": {
            "query": {
                Suites.TALOS.value: ["'talos 'damp"],
            },
            "suites": [Suites.TALOS.value],
            "tasks": [],
        },
        "Talos PerfTests": {
            "query": {
                Suites.TALOS.value: ["'talos"],
            },
            "suites": [Suites.TALOS.value],
            "tasks": [],
        },
        "Resource Usage": {
            "query": {
                Suites.TALOS.value: ["'talos 'xperf | 'tp5"],
                Suites.RAPTOR.value: ["'power 'osx"],
                Suites.AWSY.value: ["'awsy"],
            },
            "suites": [Suites.TALOS.value, Suites.RAPTOR.value, Suites.AWSY.value],
            "platform-restrictions": [Platforms.DESKTOP.value],
            "variant-restrictions": {
                Suites.RAPTOR.value: [],
                Suites.TALOS.value: [],
            },
            "app-restrictions": {
                Suites.RAPTOR.value: [Apps.FIREFOX.value],
                Suites.TALOS.value: [Apps.FIREFOX.value],
            },
            "tasks": [],
        },
        "Graphics, & Media Playback": {
            "query": {
                # XXX This might not be an exhaustive list for talos atm
                Suites.TALOS.value: ["'talos 'svgr | 'bcv | 'webgl"],
                Suites.RAPTOR.value: ["'browsertime 'youtube-playback"],
            },
            "suites": [Suites.TALOS.value, Suites.RAPTOR.value],
            "variant-restrictions": {Suites.RAPTOR.value: [Variants.NO_FISSION.value]},
            "app-restrictions": {
                Suites.RAPTOR.value: [
                    Apps.FIREFOX.value,
                    Apps.CHROME.value,
                    Apps.CHROMIUM.value,
                    Apps.FENIX.value,
                    Apps.GECKOVIEW.value,
                ],
            },
            "tasks": [],
        },
    }

    arguments = [
        [
            ["--show-all"],
            {
                "action": "store_true",
                "default": False,
                "help": "Show all available tasks.",
            },
        ],
        [
            ["--android"],
            {
                "action": "store_true",
                "default": False,
                "help": "Show android test categories (disabled by default).",
            },
        ],
        [
            ["--chrome"],
            {
                "action": "store_true",
                "default": False,
                "help": "Show tests available for Chrome-based browsers "
                "(disabled by default).",
            },
        ],
        [
            ["--safari"],
            {
                "action": "store_true",
                "default": False,
                "help": "Show tests available for Safari (disabled by default).",
            },
        ],
        [
            ["--live-sites"],
            {
                "action": "store_true",
                "default": False,
                "help": "Run tasks with live sites (if possible). "
                "You can also use the `live-sites` variant.",
            },
        ],
        [
            ["--profile"],
            {
                "action": "store_true",
                "default": False,
                "help": "Run tasks with profiling (if possible). "
                "You can also use the `profiling` variant.",
            },
        ],
        [
            ["--single-run"],
            {
                "action": "store_true",
                "default": False,
                "help": "Run tasks without a comparison",
            },
        ],
        [
            ["--variants"],
            {
                "nargs": "*",
                "type": str,
                "default": [BASE_CATEGORY_NAME],
                "dest": "requested_variants",
                "choices": list(variants.keys()),
                "help": "Select variants to display in the selector from: "
                + ", ".join(list(variants.keys())),
                "metavar": "",
            },
        ],
        [
            ["--platforms"],
            {
                "nargs": "*",
                "type": str,
                "default": [],
                "dest": "requested_platforms",
                "choices": list(platforms.keys()),
                "help": "Select specific platforms to target. Android only "
                "available with --android. Available platforms: "
                + ", ".join(list(platforms.keys())),
                "metavar": "",
            },
        ],
        [
            ["--apps"],
            {
                "nargs": "*",
                "type": str,
                "default": [],
                "dest": "requested_apps",
                "choices": list(apps.keys()),
                "help": "Select specific applications to target from: "
                + ", ".join(list(apps.keys())),
                "metavar": "",
            },
        ],
    ]

    def get_tasks(base_cmd, queries, query_arg=None, candidate_tasks=None):
        cmd = base_cmd[:]
        if query_arg:
            cmd.extend(["-f", query_arg])

        query_str, tasks = run_fzf(cmd, sorted(candidate_tasks))
        queries.append(query_str)
        return set(tasks)

    def get_perf_tasks(base_cmd, all_tg_tasks, perf_categories):
        # Convert the categories to tasks
        selected_tasks = set()
        queries = []

        selected_categories = PerfParser.get_tasks(
            base_cmd, queries, None, perf_categories
        )

        for category, category_info in perf_categories.items():
            if category not in selected_categories:
                continue
            print("Gathering tasks for %s category" % category)

            category_tasks = set()
            for suite in PerfParser.suites:
                # Either perform a query to get the tasks (recommended), or
                # use a hardcoded task list
                suite_queries = category_info["queries"].get(suite)

                category_suite_tasks = set()
                if suite_queries:
                    print(
                        "Executing %s queries: %s" % (suite, ", ".join(suite_queries))
                    )

                    for perf_query in suite_queries:
                        if not category_suite_tasks:
                            # Get all tasks selected with the first query
                            category_suite_tasks |= PerfParser.get_tasks(
                                base_cmd, queries, perf_query, all_tg_tasks
                            )
                        else:
                            # Keep only those tasks that matched in all previous queries
                            category_suite_tasks &= PerfParser.get_tasks(
                                base_cmd, queries, perf_query, category_suite_tasks
                            )

                        if len(category_suite_tasks) == 0:
                            print("Failed to find any tasks for query: %s" % perf_query)
                            break

                    if category_suite_tasks:
                        category_tasks |= category_suite_tasks

            if category_info["tasks"]:
                category_tasks = set(category_info["tasks"]) & all_tg_tasks
                if category_tasks != set(category_info["tasks"]):
                    print(
                        "Some expected tasks could not be found: %s"
                        % ", ".join(category_info["tasks"] - category_tasks)
                    )

            if not category_tasks:
                print("Could not find any tasks for category %s" % category)
            else:
                # Add the new tasks to the currently selected ones
                selected_tasks |= category_tasks

        if len(selected_tasks) > MAX_PERF_TASKS:
            print(
                "That's a lot of tests selected (%s)!\n"
                "These tests won't be triggered. If this was unexpected, "
                "please file a bug in Testing :: Performance." % MAX_PERF_TASKS
            )
            return [], [], []

        return selected_tasks, selected_categories, queries

    def _check_app(app, target):
        """Checks if the app exists in the target."""
        if app.value in target:
            return True
        return False

    def _check_platform(platform, target):
        """Checks if the platform, or it's type exists in the target."""
        if (
            platform.value in target
            or PerfParser.platforms[platform.value]["platform"] in target
        ):
            return True
        return False

    def _build_initial_decision_matrix():
        # Build first stage of matrix APPS X PLATFORMS
        initial_decision_matrix = []
        for platform in Platforms:
            platform_row = []
            for app in Apps:
                if PerfParser._check_platform(
                    platform, PerfParser.apps[app.value]["platforms"]
                ):
                    # This app can run on this platform
                    platform_row.append(True)
                else:
                    platform_row.append(False)
            initial_decision_matrix.append(platform_row)
        return initial_decision_matrix

    def _build_intermediate_decision_matrix():
        # Second stage of matrix building applies the 2D matrix found above
        # to each suite
        initial_decision_matrix = PerfParser._build_initial_decision_matrix()

        intermediate_decision_matrix = []
        for suite in Suites:
            suite_matrix = copy.deepcopy(initial_decision_matrix)
            suite_info = PerfParser.suites[suite.value]

            # Restric the platforms for this suite now
            for platform in Platforms:
                for app in Apps:
                    runnable = False
                    if PerfParser._check_app(
                        app, suite_info["apps"]
                    ) and PerfParser._check_platform(platform, suite_info["platforms"]):
                        runnable = True
                    suite_matrix[platform][app] = (
                        runnable and suite_matrix[platform][app]
                    )

            intermediate_decision_matrix.append(suite_matrix)
        return intermediate_decision_matrix

    def _build_variants_matrix():
        # Third stage is expanding the intermediate matrix
        # across all the variants (non-expanded). Start with the
        # intermediate matrix in the list since it provides our
        # base case with no variants
        intermediate_decision_matrix = PerfParser._build_intermediate_decision_matrix()

        variants_matrix = []
        for variant in Variants:
            variant_matrix = copy.deepcopy(intermediate_decision_matrix)

            for suite in Suites:
                if variant.value in PerfParser.suites[suite.value]["variants"]:
                    # Allow the variant through and set it's platforms and apps
                    # based on how it sets it -> only restrict, don't make allowances
                    # here
                    for platform in Platforms:
                        for app in Apps:
                            if not (
                                PerfParser._check_platform(
                                    platform,
                                    PerfParser.variants[variant.value]["platforms"],
                                )
                                and PerfParser._check_app(
                                    app, PerfParser.variants[variant.value]["apps"]
                                )
                            ):
                                variant_matrix[suite][platform][app] = False
                else:
                    # This variant matrix needs to be completely False
                    variant_matrix[suite] = [
                        [False] * len(platform_row)
                        for platform_row in variant_matrix[suite]
                    ]

            variants_matrix.append(variant_matrix)

        return variants_matrix, intermediate_decision_matrix

    def _build_decision_matrix():
        """Build the decision matrix.

        This method builds the decision matrix that is used
        to determine what categories will be shown to the user.
        This matrix has the following form (as lists):
            - Variants
                - Suites
                    - Platforms
                        - Apps

        Each element in the 4D Matrix is either True or False and tells us
        whether the particular combination is "runnable" according to
        the given specifications. This does not mean that the combination
        exists, just that it's fully configured in this selector.

        The ("base",) variant combination found in the matrix has
        no variants applied to it. At this stage, it's a catch-all for those
        categories. The query it uses is reduced further in later stages.
        """
        # Get the variants matrix (see methods above) and the intermediate decision
        # matrix to act as the base category
        (
            variants_matrix,
            intermediate_decision_matrix,
        ) = PerfParser._build_variants_matrix()

        # Get all possible combinations of the variants
        expanded_variants = [
            variant_combination
            for set_size in range(len(Variants) + 1)
            for variant_combination in itertools.combinations(list(Variants), set_size)
        ]

        # Final stage combines the intermediate matrix with the
        # expanded variants and leaves a "base" category which
        # doesn't have any variant specifications (it catches them all)
        decision_matrix = {(BASE_CATEGORY_NAME,): intermediate_decision_matrix}
        for variant_combination in expanded_variants:
            expanded_variant_matrix = []

            # Perform an AND operation on the combination of variants
            # to determine where this particular combination can run
            for suite in Suites:
                suite_matrix = []
                suite_variants = PerfParser.suites[suite.value]["variants"]

                # Disable the variant combination if none of them
                # are found in the suite
                disable_variant = not any(
                    [variant.value in suite_variants for variant in variant_combination]
                )

                for platform in Platforms:
                    if disable_variant:
                        platform_row = [False for _ in Apps]
                    else:
                        platform_row = [
                            all(
                                variants_matrix[variant][suite][platform][app]
                                for variant in variant_combination
                                if variant.value in suite_variants
                            )
                            for app in Apps
                        ]
                    suite_matrix.append(platform_row)

                expanded_variant_matrix.append(suite_matrix)
            decision_matrix[variant_combination] = expanded_variant_matrix

        return decision_matrix

    def _skip_with_restrictions(value, restrictions, requested=[]):
        """Determines if we should skip an app, platform, or variant.

        We add base here since it's the base category variant that
        would always be displayed and it won't affect the app, or
        platform selections.
        """
        if restrictions is not None and value not in restrictions + [
            BASE_CATEGORY_NAME
        ]:
            return True
        if requested and value not in requested + [BASE_CATEGORY_NAME]:
            return True
        return False

    def build_category_matrix(
        requested_variants=[BASE_CATEGORY_NAME],
        requested_platforms=[],
        requested_apps=[],
        **kwargs,
    ):
        """Build a decision matrix for all the categories.

        It will have the form:
            - Category
                - Variants
                    - ...
        """
        # Build the base decision matrix
        decision_matrix = PerfParser._build_decision_matrix()

        # Here, the variants are further restricted by the category settings
        # using the `_skip_with_restrictions` method. This part also handles
        # explicitly requested platforms, apps, and variants.
        category_decision_matrix = {}
        for category, category_info in PerfParser.categories.items():
            category_matrix = copy.deepcopy(decision_matrix)

            for variant_combination, variant_matrix in decision_matrix.items():
                variant_runnable = True
                if BASE_CATEGORY_NAME not in variant_combination:
                    # Make sure that all portions of the variant combination
                    # target at least one of the suites in the category
                    tmp_variant_combination = set(
                        [v.value for v in variant_combination]
                    )
                    for suite in Suites:
                        if suite.value not in category_info["suites"]:
                            continue
                        tmp_variant_combination = tmp_variant_combination - set(
                            [
                                variant.value
                                for variant in variant_combination
                                if variant.value
                                in PerfParser.suites[suite.value]["variants"]
                            ]
                        )
                    if tmp_variant_combination:
                        # If it's not empty, then some variants
                        # are non-existent
                        variant_runnable = False

                for suite, platform, app in itertools.product(Suites, Platforms, Apps):
                    runnable = variant_runnable

                    # Disable this combination if there are any variant
                    # restrictions for this suite, or if the user didn't request it
                    # (and did request some variants). The same is done below with
                    # the apps, and platforms.
                    if any(
                        PerfParser._skip_with_restrictions(
                            variant.value if not isinstance(variant, str) else variant,
                            category_info.get("variant-restrictions", {}).get(
                                suite.value, None
                            ),
                            requested_variants,
                        )
                        for variant in variant_combination
                    ):
                        runnable = False

                    if PerfParser._skip_with_restrictions(
                        platform.value,
                        category_info.get("platform-restrictions", None),
                        requested_platforms,
                    ):
                        runnable = False

                    # If the platform is restricted, check if the appropriate
                    # flags were provided (or appropriate conditions hit). We do
                    # the same thing for apps below.
                    if (
                        PerfParser.platforms[platform.value].get("restriction", None)
                        is not None
                    ):
                        runnable = runnable and PerfParser.platforms[platform.value][
                            "restriction"
                        ](**kwargs)

                    if PerfParser._skip_with_restrictions(
                        app.value,
                        category_info.get("app-restrictions", {}).get(
                            suite.value, None
                        ),
                        requested_apps,
                    ):
                        runnable = False
                    if PerfParser.apps[app.value].get("restriction", None) is not None:
                        runnable = runnable and PerfParser.apps[app.value][
                            "restriction"
                        ](**kwargs)

                    category_matrix[variant_combination][suite][platform][app] = (
                        runnable and variant_matrix[suite][platform][app]
                    )

            category_decision_matrix[category] = category_matrix

        return category_decision_matrix

    def _enable_restriction(restriction, **kwargs):
        """Used to simplify checking a restriction."""
        return restriction is not None and restriction(**kwargs)

    def _category_suites(category_info):
        """Returns all the suite enum entries in this category."""
        return [suite for suite in Suites if suite.value in category_info["suites"]]

    def _add_variant_queries(
        category_info, variant_matrix, variant_combination, platform, queries, app=None
    ):
        """Used to add the variant queries to various categories."""
        for variant in variant_combination:
            for suite in PerfParser._category_suites(category_info):
                if (app is not None and variant_matrix[suite][platform][app]) or (
                    app is None and any(variant_matrix[suite][platform])
                ):
                    queries[suite.value].append(
                        PerfParser.variants[variant.value]["query"]
                    )

    def _build_categories(category, category_info, category_matrix):
        """Builds the categories to display."""
        categories = {}

        for variant_combination, variant_matrix in category_matrix.items():
            base_category = BASE_CATEGORY_NAME in variant_combination

            for platform in Platforms:
                if not any(
                    any(variant_matrix[suite][platform])
                    for suite in PerfParser._category_suites(category_info)
                ):
                    # There are no apps available on this platform in either
                    # of the requested suites
                    continue

                # This code has the effect of restricting all suites to
                # a platform. This means categories with mixed suites will
                # be available even if some suites will no longer run
                # given this platform constraint. The reasoning for this is that
                # it's unexpected to receive desktop tests when you explcitly
                # request android.
                platform_queries = {
                    suite: (
                        category_info["query"][suite]
                        + [PerfParser.platforms[platform.value]["query"]]
                    )
                    for suite in category_info["suites"]
                }

                platform_category_name = f"{category} {platform.value}"
                platform_category_info = {
                    "queries": platform_queries,
                    "tasks": category_info["tasks"],
                    "platform": platform,
                    "app": None,
                    "suites": category_info["suites"],
                    "base-category": base_category,
                    "base-category-name": category,
                }
                for app in Apps:
                    if not any(
                        variant_matrix[suite][platform][app]
                        for suite in PerfParser._category_suites(category_info)
                    ):
                        # This app is not available on the given platform
                        # for any of the suites
                        continue

                    # Add the queries for the app for any suites that need it and
                    # the variant queries if needed
                    app_queries = copy.deepcopy(platform_queries)
                    for suite in Suites:
                        if suite.value not in app_queries:
                            continue
                        app_queries[suite.value].append(
                            PerfParser.apps[app.value]["query"]
                        )
                    if not base_category:
                        PerfParser._add_variant_queries(
                            category_info,
                            variant_matrix,
                            variant_combination,
                            platform,
                            app_queries,
                            app=app,
                        )

                    app_category_name = f"{platform_category_name} {app.value}"
                    if not base_category:
                        app_category_name = (
                            f"{app_category_name} "
                            f"{'+'.join([v.value for v in variant_combination])}"
                        )
                    categories[app_category_name] = {
                        "queries": app_queries,
                        "tasks": category_info["tasks"],
                        "platform": platform,
                        "app": app,
                        "suites": category_info["suites"],
                        "base-category": base_category,
                    }

                if not base_category:
                    platform_category_name = (
                        f"{platform_category_name} "
                        f"{'+'.join([v.value for v in variant_combination])}"
                    )
                    PerfParser._add_variant_queries(
                        category_info,
                        variant_matrix,
                        variant_combination,
                        platform,
                        platform_queries,
                    )
                categories[platform_category_name] = platform_category_info

        return categories

    def _handle_variant_negations(category, category_info, **kwargs):
        """Handle variant negations.

        The reason why we're negating variants here instead of where we add
        them to the queries is because we need to iterate over all of the variants
        but when we add them, we only look at the variants in the combination. It's
        possible to combine these, but that increases the complexity of the code
        by quite a bit so it's best to do it separately.
        """
        for variant in Variants:
            if category_info["base-category"] and variant.value in kwargs.get(
                "requested_variants", [BASE_CATEGORY_NAME]
            ):
                # When some particular variant(s) are requested, and we are at a
                # base category, don't negate it. Otherwise, if the variant
                # wasn't requested negate it
                continue
            if variant.value in category:
                # If this variant is in the category name, skip negations
                continue
            if not PerfParser._check_platform(
                category_info["platform"],
                PerfParser.variants[variant.value]["platforms"],
            ):
                # Make sure the variant applies to the platform
                continue

            for suite in category_info["suites"]:
                if variant.value not in PerfParser.suites[suite]["variants"]:
                    continue
                category_info["queries"][suite].append(
                    PerfParser.variants[variant.value]["negation"]
                )

    def _handle_app_negations(category, category_info, **kwargs):
        """Handle app negations.

        This is where the global chrome/safari negations get added. We use kwargs
        along with the app restriction method to make this decision.
        """
        for app in Apps:
            if PerfParser.apps[app.value].get("negation", None) is None:
                continue
            elif any(
                PerfParser.apps[app.value]["negation"]
                in category_info["queries"][suite]
                for suite in category_info["suites"]
            ):
                # Already added the negations
                continue
            if category_info.get("app", None) is not None:
                # We only need to handle this for categories that
                # don't specify an app
                continue
            if PerfParser._enable_restriction(
                PerfParser.apps[app.value].get("restriction", None), **kwargs
            ):
                continue

            for suite in category_info["suites"]:
                if app.value not in PerfParser.suites[suite]["apps"]:
                    continue
                category_info["queries"][suite].append(
                    PerfParser.apps[app.value]["negation"]
                )

    def _handle_negations(category, category_info, **kwargs):
        """This method handles negations.

        This method should only include things that should be globally applied
        to all the queries. The apps are included as chrome is negated if
        --chrome isn't provided, and the variants are negated here too.
        """
        PerfParser._handle_variant_negations(category, category_info, **kwargs)
        PerfParser._handle_app_negations(category, category_info, **kwargs)

    def get_categories(**kwargs):
        """Get the categories to be displayed.

        The categories are built using the decision matrices from `build_category_matrix`.
        The methods above provide more detail on how this is done. Here, we use
        this matrix to determine if we should show a category to a user.

        We also apply the negations for restricted apps/platforms and variants
        at the end before displaying the categories.
        """
        categories = {}

        # Setup the restrictions, and ease-of-use variants requested (if any)
        for variant in Variants:
            if PerfParser._enable_restriction(
                PerfParser.variants[variant.value].get("restriction", None), **kwargs
            ):
                kwargs.setdefault("requested_variants", []).append(variant.value)

        category_decision_matrix = PerfParser.build_category_matrix(**kwargs)

        # Now produce the categories by finding all the entries that are True
        for category, category_matrix in category_decision_matrix.items():
            categories.update(
                PerfParser._build_categories(
                    category, PerfParser.categories[category], category_matrix
                )
            )

        # Handle the restricted app queries, and variant negations
        for category, category_info in categories.items():
            PerfParser._handle_negations(category, category_info, **kwargs)

        return categories

    def perf_push_to_try(
        selected_tasks, selected_categories, queries, try_config, dry_run, single_run
    ):
        """Perf-specific push to try method.

        This makes use of logic from the CompareParser to do something
        very similar except with log redirection. We get the comparison
        revisions, then use the repository object to update between revisions
        and the LogProcessor for parsing out the revisions that are used
        to build the Perfherder links.
        """
        vcs = get_repository_object(build.topsrcdir)
        compare_commit, current_revision_ref = PerfParser.get_revisions_to_run(
            vcs, None
        )

        # Build commit message
        msg = "Perf selections={} (queries={})".format(
            ",".join(selected_categories),
            "&".join([q for q in queries if q is not None and len(q) > 0]),
        )

        updated = False
        new_revision_treeherder = ""
        base_revision_treeherder = ""
        try:
            # redirect_stdout allows us to feed each line into
            # a processor that we can use to catch the revision
            # while providing real-time output
            log_processor = LogProcessor()
            with redirect_stdout(log_processor):
                push_to_try(
                    "perf",
                    "{msg}".format(msg=msg),
                    # XXX Figure out if changing `fuzzy` to `perf` will break something
                    try_task_config=generate_try_task_config(
                        "fuzzy", selected_tasks, try_config
                    ),
                    stage_changes=False,
                    dry_run=dry_run,
                    closed_tree=False,
                    allow_log_capture=True,
                )

            new_revision_treeherder = log_processor.revision

            if not (dry_run or single_run):
                vcs.update(compare_commit)
                updated = True

                with redirect_stdout(log_processor):
                    # XXX Figure out if we can use the `again` selector in some way
                    # Right now we would need to modify it to be able to do this.
                    # XXX Fix up the again selector for the perf selector (if it makes sense to)
                    push_to_try(
                        "perf-again",
                        "{msg}".format(msg=msg),
                        try_task_config=generate_try_task_config(
                            "fuzzy", selected_tasks, try_config
                        ),
                        stage_changes=False,
                        dry_run=dry_run,
                        closed_tree=False,
                        allow_log_capture=True,
                    )

                base_revision_treeherder = log_processor.revision
        finally:
            if updated:
                vcs.update(current_revision_ref)

        return base_revision_treeherder, new_revision_treeherder

    def run(
        update=False,
        show_all=False,
        parameters=None,
        try_config=None,
        dry_run=False,
        single_run=False,
        **kwargs,
    ):
        # Setup fzf
        fzf = fzf_bootstrap(update)

        if not fzf:
            print(FZF_NOT_FOUND)
            return 1

        all_tasks, dep_cache, cache_dir = setup_tasks_for_fzf(
            not dry_run,
            parameters,
            full=True,
            disable_target_task_filter=False,
        )
        base_cmd = build_base_cmd(fzf, dep_cache, cache_dir, show_estimates=False)

        # Perform the selection, then push to try and return the revisions
        queries = []
        selected_categories = []
        if not show_all:
            # Expand the categories first
            categories = PerfParser.get_categories(**kwargs)
            selected_tasks, selected_categories, queries = PerfParser.get_perf_tasks(
                base_cmd, all_tasks, categories
            )
        else:
            selected_tasks = PerfParser.get_tasks(base_cmd, queries, None, all_tasks)

        if len(selected_tasks) == 0:
            print("No tasks selected")
            return None

        return PerfParser.perf_push_to_try(
            selected_tasks,
            selected_categories,
            queries,
            try_config,
            dry_run,
            single_run,
        )

    def run_category_checks():
        # XXX: Add a jsonschema check for the category definition
        # Make sure the queries don't specify variants in them
        variant_queries = {
            suite: [
                PerfParser.variants[variant]["query"]
                for variant in suite_info.get(
                    "variants", list(PerfParser.variants.keys())
                )
            ]
            + [
                PerfParser.variants[variant]["negation"]
                for variant in suite_info.get(
                    "variants", list(PerfParser.variants.keys())
                )
            ]
            for suite, suite_info in PerfParser.suites.items()
        }

        for category, category_info in PerfParser.categories.items():
            for suite, query in category_info["query"].items():
                if len(variant_queries[suite]) == 0:
                    # This suite has no variants
                    continue
                if any(any(v in q for q in query) for v in variant_queries[suite]):
                    raise InvalidCategoryException(
                        f"The '{category}' category suite query for '{suite}' "
                        f"uses a variant in it's query '{query}'."
                        "If you don't want a particular variant use the "
                        "`variant-restrictions` field in the category."
                    )

        return True


def run(**kwargs):
    # Make sure the categories are following
    # the rules we've setup
    PerfParser.run_category_checks()

    revisions = PerfParser.run(
        profile=kwargs.get("try_config", {}).get("gecko-profile", False),
        **kwargs,
    )

    if revisions is None:
        return

    # Provide link to perfherder for comparisons now
    if not kwargs.get("single_run", False):
        perfcompare_url = PERFHERDER_BASE_URL % revisions
        print(
            "\n!!!NOTE!!!\n You'll be able to find a performance comparison here "
            "once the tests are complete (ensure you select the right "
            "framework): %s\n" % perfcompare_url
        )
    print(
        "If you need any help, you can find us in the #perf-help Matrix channel:\n"
        "https://matrix.to/#/#perf-help:mozilla.org\n"
    )
    print(
        "For more information on the performance tests, see our PerfDocs here:\n"
        "https://firefox-source-docs.mozilla.org/testing/perfdocs/"
    )
