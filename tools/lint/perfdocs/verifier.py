# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import os
import pathlib
import re

import jsonschema
from perfdocs.gatherer import Gatherer
from perfdocs.logger import PerfDocLogger
from perfdocs.utils import read_file, read_yaml

logger = PerfDocLogger()

"""
Schema for the config.yml file.
Expecting a YAML file with a format such as this:

name: raptor
manifest: testing/raptor/raptor/raptor.ini
static-only: False
suites:
    desktop:
        description: "Desktop tests."
        tests:
            raptor-tp6: "Raptor TP6 tests."
    mobile:
        description: "Mobile tests"
    benchmarks:
        description: "Benchmark tests."
        tests:
            wasm: "All wasm tests."

"""
CONFIG_SCHEMA = {
    "definitions": {
        "metrics_schema": {
            "metric_name": {
                "type": "object",
                "properties": {
                    "aliases": {"type": "array", "items": {"type": "string"}},
                    "description": {"type": "string"},
                    "matcher": {"type": "string"},
                },
                "required": ["description", "aliases"],
            },
        },
    },
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "manifest": {"type": "string"},
        "static-only": {"type": "boolean"},
        "metrics": {"$ref": "#/definitions/metrics_schema"},
        "suites": {
            "type": "object",
            "properties": {
                "suite_name": {
                    "type": "object",
                    "properties": {
                        "tests": {
                            "type": "object",
                            "properties": {
                                "test_name": {"type": "string"},
                                "metrics": {"$ref": "#/definitions/metrics_schema"},
                            },
                        },
                        "description": {"type": "string"},
                        "owner": {"type": "string"},
                        "metrics": {"$ref": "#/definitions/metrics_schema"},
                    },
                    "required": ["description"],
                }
            },
        },
    },
    "required": ["name", "manifest", "static-only", "suites"],
}


class Verifier(object):
    """
    Verifier is used for validating the perfdocs folders/tree. In the future,
    the generator will make use of this class to obtain a validated set of
    descriptions that can be used to build up a document.
    """

    def __init__(self, workspace_dir, taskgraph=None):
        """
        Initialize the Verifier.

        :param str workspace_dir: Path to the top-level checkout directory.
        """
        self.workspace_dir = workspace_dir
        self._gatherer = Gatherer(workspace_dir, taskgraph)
        self._compiled_matchers = {}

    def _is_yaml_test_match(
        self, target_test_name, test_name, suite="", global_descriptions={}
    ):
        """Determine if a target name (from a YAML) matches with a test."""
        tb = os.path.basename(target_test_name)
        tb = re.sub("\..*", "", tb)
        if test_name == tb:
            # Found an exact match for the test_name
            return True
        if test_name in tb:
            # Found a 'fuzzy' match for the test_name
            # i.e. 'wasm' could exist for all raptor wasm tests
            global_descriptions.setdefault(suite, []).append(test_name)
            return True

    def _validate_desc_yaml_direction(
        self, suite, framework_info, yaml_content, global_descriptions
    ):
        """Validate the descriptions in the YAML.

        This validation ensures that all tests defined in the YAML exist in the test
        harness. Failures here suggest that there's a typo in the YAML or that
        a test was removed.
        """
        ytests = yaml_content["suites"][suite]
        global_descriptions[suite] = []
        if not ytests.get("tests"):
            # It's possible a suite entry has no tests
            return True

        # Suite found - now check if any tests in YAML
        # definitions don't exist
        ytests = ytests["tests"]
        for test_name in ytests:
            foundtest = False
            for t in framework_info["test_list"][suite]:
                if self._is_yaml_test_match(
                    t, test_name, suite=suite, global_descriptions=global_descriptions
                ):
                    foundtest = True
                    break
            if not foundtest:
                logger.warning(
                    "Could not find an existing test for {} - bad test name?".format(
                        test_name
                    ),
                    framework_info["yml_path"],
                )
                return False

    def _validate_desc_harness_direction(
        self, suite, test_list, yaml_content, global_descriptions
    ):
        """Validate that the tests have a description in the YAML.

        This stage of validation ensures that all the tests have some
        form of description, or that global descriptions are available.
        Failures here suggest a new test was added, or the config.yml
        file was changed.
        """
        # If only a description is provided for the suite, assume
        # that this is a suite-wide description and don't check for
        # it's tests
        stests = yaml_content["suites"][suite].get("tests", None)
        if not stests:
            return

        tests_found = 0
        missing_tests = []
        test_to_manifest = {}
        for test_name, test_info in test_list.items():
            manifest_path = test_info.get("path", test_info.get("manifest", ""))
            tb = os.path.basename(manifest_path)
            tb = re.sub("\..*", "", tb)
            if (
                stests.get(tb, None) is not None
                or stests.get(test_name, None) is not None
            ):
                # Test description exists, continue with the next test
                tests_found += 1
                continue
            test_to_manifest[test_name] = manifest_path
            missing_tests.append(test_name)

        # Check if global test descriptions exist (i.e.
        # ones that cover all of tp6) for the missing tests
        new_mtests = []
        for mt in missing_tests:
            found = False
            for test_name in global_descriptions[suite]:
                # Global test exists for this missing test
                if mt.startswith(test_name):
                    found = True
                    break
                if test_name in mt:
                    found = True
                    break
            if not found:
                new_mtests.append(mt)

        if len(new_mtests):
            # Output an error for each manifest with a missing
            # test description
            for test_name in new_mtests:
                logger.warning(
                    "Could not find a test description for {}".format(test_name),
                    test_to_manifest[test_name],
                )

    def _match_metrics(self, target_metric_name, target_metric_info, measured_metrics):
        """Find all metrics that match the given information.

        It either checks for the metric through a direct equality check, and if
        a regex matcher was provided, we will use that afterwards.
        """
        verified_metrics = []

        metric_names = target_metric_info["aliases"] + [target_metric_name]
        for measured_metric in measured_metrics:
            if measured_metric in metric_names:
                verified_metrics.append(measured_metric)

        if target_metric_info.get("matcher", ""):
            # Compile the regex separately to capture issues in the regex
            # compilation
            matcher = self._compiled_matchers.get(target_metric_name, None)
            if not matcher:
                matcher = re.compile(target_metric_info.get("matcher"))
                self._compiled_matchers[target_metric_name] = matcher

            # Search the measured metrics
            for measured_metric in measured_metrics:
                if matcher.search(measured_metric):
                    verified_metrics.append(measured_metric)

        return verified_metrics

    def _validate_metrics_yaml_direction(
        self, suite, framework_info, yaml_content, global_metrics
    ):
        """Validate the metric descriptions in the YAML.

        This direction (`yaml_direction`) checks that the YAML definitions exist in
        the test harness as real metrics. Failures here suggest that a metric
        changed name, is missing an alias, is misnamed, duplicated, or was removed.
        """
        yaml_suite = yaml_content["suites"][suite]
        suite_metrics = yaml_suite.get("metrics", {})

        # Check to make sure all the metrics with given descriptions
        # are actually being measured. Add the metric to the "verified" field in
        # global_metrics to use it later for "global" metrics that can
        # have their descriptions removed. Start from the test level.
        for test_name, test_info in yaml_suite.get("tests", {}).items():
            if not isinstance(test_info, dict):
                continue
            test_metrics_info = test_info.get("metrics", {})

            # Find all tests that match with this name in case they measure
            # different things
            measured_metrics = []
            for t in framework_info["test_list"][suite]:
                if not self._is_yaml_test_match(t, test_name):
                    # Check to make sure we are checking against the right
                    # test. Skip the metric check if we can't find the test.
                    continue
                measured_metrics.extend(
                    framework_info["test_list"][suite][t].get("metrics", [])
                )

            if len(measured_metrics) == 0:
                continue

            # Check if all the test metrics documented exist
            for metric_name, metric_info in test_metrics_info.items():
                verified_metrics = self._match_metrics(
                    metric_name, metric_info, measured_metrics
                )
                if len(verified_metrics) > 0:
                    global_metrics["yaml-verified"].extend(
                        [metric_name] + metric_info["aliases"]
                    )
                    global_metrics["verified"].extend(
                        [metric_name] + metric_info["aliases"] + verified_metrics
                    )
                else:
                    logger.warning(
                        (
                            "Cannot find documented metric `{}` "
                            "being used in the specified test `{}`."
                        ).format(metric_name, test_name),
                        framework_info["yml_path"],
                    )

        # Check the suite level now
        for suite_metric_name, suite_metric_info in suite_metrics.items():
            measured_metrics = []
            for _, test_info in framework_info["test_list"][suite].items():
                measured_metrics.extend(test_info.get("metrics", []))

            verified_metrics = self._match_metrics(
                suite_metric_name, suite_metric_info, measured_metrics
            )
            if len(verified_metrics) > 0:
                global_metrics["yaml-verified"].extend(
                    [suite_metric_name] + suite_metric_info["aliases"]
                )
                global_metrics["verified"].extend(
                    [suite_metric_name]
                    + suite_metric_info["aliases"]
                    + verified_metrics
                )
            else:
                logger.warning(
                    (
                        "Cannot find documented metric `{}` "
                        "being used in the specified suite `{}`."
                    ).format(suite_metric_name, suite),
                    framework_info["yml_path"],
                )

        # Finally check the global level (output failures later)
        all_measured_metrics = []
        for _, test_info in framework_info["test_list"][suite].items():
            all_measured_metrics.extend(test_info.get("metrics", []))
        for global_metric_name, global_metric_info in global_metrics["global"].items():
            verified_metrics = self._match_metrics(
                global_metric_name, global_metric_info, all_measured_metrics
            )
            if global_metric_info.get("verified", False):
                # We already verified this global metric, but add any
                # extra verified metrics here
                global_metrics["verified"].extend(verified_metrics)
                continue
            if len(verified_metrics) > 0:
                global_metric_info["verified"] = True
                global_metrics["yaml-verified"].extend(
                    [global_metric_name] + global_metric_info["aliases"]
                )
                global_metrics["verified"].extend(
                    [global_metric_name]
                    + global_metric_info["aliases"]
                    + verified_metrics
                )

    def _validate_metrics_harness_direction(
        self, suite, test_list, yaml_content, global_metrics
    ):
        """Validate that metrics in the harness are documented."""
        # Gather all the metrics being measured
        all_measured_metrics = {}
        for test_name, test_info in test_list.items():
            metrics = test_info.get("metrics", [])
            for metric in metrics:
                all_measured_metrics.setdefault(metric, []).append(test_name)

        if len(all_measured_metrics) == 0:
            # There are no metrics measured by this suite
            return

        for metric, tests in all_measured_metrics.items():
            if metric not in global_metrics["verified"]:
                # Log a warning in all files that have this metric
                for test in tests:
                    logger.warning(
                        "Missing description for the metric `{}` in test `{}`".format(
                            metric, test
                        ),
                        test_list[test].get(
                            "path", test_list[test].get("manifest", "")
                        ),
                    )

    def validate_descriptions(self, framework_info):
        """
        Cross-validate the tests found in the manifests and the YAML
        test definitions. This function doesn't return a valid flag. Instead,
        the StructDocLogger.VALIDATION_LOG is used to determine validity.

        The validation proceeds as follows:
            1. Check that all tests/suites in the YAML exist in the manifests.
                - At the same time, build a list of global descriptions which
                   define descriptions for groupings of tests.
            2. Check that all tests/suites found in the manifests exist in the YAML.
                - For missing tests, check if a global description for them exists.

        As the validation is completed, errors are output into the validation log
        for any issues that are found.

        The same is done for the metrics field expect it also has regex matching,
        and the definitions cannot be duplicated in a single harness. We make use
        of two `*verified` fields to simplify the two stages/directions, and checking
        for any duplication.

        :param dict framework_info: Contains information about the framework. See
            `Gatherer.get_test_list` for information about its structure.
        """
        yaml_content = framework_info["yml_content"]

        # Check for any bad test/suite names in the yaml config file
        # TODO: Combine global settings into a single dictionary
        global_descriptions = {}
        global_metrics = {
            "global": yaml_content.get("metrics", {}),
            "verified": [],
            "yaml-verified": [],
        }
        for suite, ytests in yaml_content["suites"].items():
            # Find the suite, then check against the tests within it
            if framework_info["test_list"].get(suite, None) is None:
                logger.warning(
                    "Could not find an existing suite for {} - bad suite name?".format(
                        suite
                    ),
                    framework_info["yml_path"],
                )
                continue

            # Validate descriptions
            self._validate_desc_yaml_direction(
                suite, framework_info, yaml_content, global_descriptions
            )

            # Validate metrics
            self._validate_metrics_yaml_direction(
                suite, framework_info, yaml_content, global_metrics
            )

        # The suite and test levels were properly checked, but we can only
        # check the global level after all suites were checked. If the metric
        # isn't in the verified
        for global_metric_name, _ in global_metrics["global"].items():
            if global_metric_name not in global_metrics["verified"]:
                logger.warning(
                    (
                        "Cannot find documented metric `{}` "
                        "being used in the specified harness `{}`."
                    ).format(global_metric_name, yaml_content["name"]),
                    framework_info["yml_path"],
                )

        # Check for duplicate metrics/aliases in the verified metrics
        unique_metrics = set()
        warned = set()
        for metric in global_metrics["yaml-verified"]:
            if (
                metric in unique_metrics or unique_metrics.add(metric)
            ) and metric not in warned:
                logger.warning(
                    "Duplicate definitions found for `{}`.".format(metric),
                    framework_info["yml_path"],
                )
                warned.add(metric)

        # Check for duplicate metrics in the global level
        unique_metrics = set()
        warned = set()
        for metric, metric_info in global_metrics["global"].items():
            if (
                metric in unique_metrics or unique_metrics.add(metric)
            ) and metric not in warned:
                logger.warning(
                    "Duplicate definitions found for `{}`.".format(metric),
                    framework_info["yml_path"],
                )
                for alias in metric_info.get("aliases", []):
                    unique_metrics.add(alias)
                    warned.add(alias)
                warned.add(metric)

        # Check for any missing tests/suites
        for suite, test_list in framework_info["test_list"].items():
            if not yaml_content["suites"].get(suite):
                # Description doesn't exist for the suite
                logger.warning(
                    "Missing suite description for {}".format(suite),
                    yaml_content["manifest"],
                )
                continue

            self._validate_desc_harness_direction(
                suite, test_list, yaml_content, global_descriptions
            )

            self._validate_metrics_harness_direction(
                suite, test_list, yaml_content, global_metrics
            )

    def validate_yaml(self, yaml_path):
        """
        Validate that the YAML file has all the fields that are
        required and parse the descriptions into strings in case
        some are give as relative file paths.

        :param str yaml_path: Path to the YAML to validate.
        :return bool: True/False => Passed/Failed Validation
        """

        def _get_description(desc):
            """
            Recompute the description in case it's a file.
            """
            desc_path = pathlib.Path(self.workspace_dir, desc)

            try:
                if desc_path.exists() and desc_path.is_file():
                    with open(desc_path, "r") as f:
                        desc = f.readlines()
            except OSError:
                pass

            return desc

        def _parse_descriptions(content):
            for suite, sinfo in content.items():
                desc = sinfo["description"]
                sinfo["description"] = _get_description(desc)

                # It's possible that the suite has no tests and
                # only a description. If they exist, then parse them.
                if "tests" in sinfo:
                    for test, desc in sinfo["tests"].items():
                        sinfo["tests"][test] = _get_description(desc)

        valid = False
        yaml_content = read_yaml(yaml_path)

        try:
            jsonschema.validate(instance=yaml_content, schema=CONFIG_SCHEMA)
            _parse_descriptions(yaml_content["suites"])
            valid = True
        except Exception as e:
            logger.warning("YAML ValidationError: {}".format(str(e)), yaml_path)

        return valid

    def validate_rst_content(self, rst_path):
        """
        Validate that the index file given has a {documentation} entry
        so that the documentation can be inserted there.

        :param str rst_path: Path to the RST file.
        :return bool: True/False => Passed/Failed Validation
        """
        rst_content = read_file(rst_path)

        # Check for a {documentation} entry in some line,
        # if we can't find one, then the validation fails.
        valid = False
        docs_match = re.compile(".*{documentation}.*")
        for line in rst_content:
            if docs_match.search(line):
                valid = True
                break
        if not valid:
            logger.warning(
                "Cannot find a '{documentation}' entry in the given index file",
                rst_path,
            )

        return valid

    def _check_framework_descriptions(self, item):
        """
        Helper method for validating descriptions
        """
        framework_info = self._gatherer.get_test_list(item)
        self.validate_descriptions(framework_info)

    def validate_tree(self):
        """
        Validate the `perfdocs` directory that was found.
        Returns True if it is good, false otherwise.

        :return bool: True/False => Passed/Failed Validation
        """
        found_good = 0

        # For each framework, check their files and validate descriptions
        for matched in self._gatherer.perfdocs_tree:
            # Get the paths to the YAML and RST for this framework
            matched_yml = pathlib.Path(matched["path"], matched["yml"])
            matched_rst = pathlib.Path(matched["path"], matched["rst"])

            _valid_files = {
                "yml": self.validate_yaml(matched_yml),
                "rst": True,
            }
            if not read_yaml(matched_yml)["static-only"]:
                _valid_files["rst"] = self.validate_rst_content(matched_rst)

            # Log independently the errors found for the matched files
            for file_format, valid in _valid_files.items():
                if not valid:
                    logger.log("File validation error: {}".format(file_format))
            if not all(_valid_files.values()):
                continue
            found_good += 1

            self._check_framework_descriptions(matched)

        if not found_good:
            raise Exception("No valid perfdocs directories found")
