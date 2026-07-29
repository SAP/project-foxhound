# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import filters
from base_python_support import BasePythonSupport
from logger.logger import RaptorLogger
from utils import flatten

LOG = RaptorLogger(component="raptor-speedometer3-support")


class Speedometer3Support(BasePythonSupport):
    nova = None

    def setup_test(self, test, args):
        super().setup_test(test, args)

        if args.extra_prefs.get("browser.nova.enabled", False):
            self.nova = True

        if args.simpleperf:
            # Each test suite runs in its own browser cycle.
            # There's 20 test suites, so 20 cycles are needed.
            speedometer3_test_count = 20

            # Each test suite is run speedometer3_iteration_count times
            # in 1 browser cycle.
            speedometer3_iteration_count = 50

            test["simpleperf"] = True
            test["test_script"] = "speedometer3_simpleperf.js"
            test["browser_cycles"] = speedometer3_test_count
            test["browsertime_args"] = (
                f"{test.get('browsertime_args', '')} --browsertime.iteration_count={speedometer3_iteration_count}".strip()
            )

            # For correctness (should not affect functionality), set
            # test["apps"] to apps that work with Simpleperf profiling.
            test["apps"] = "fenix, geckoview"

    def handle_result(self, bt_result, raw_result, **kwargs):
        """Parse a result for the required results.

        See base_python_support.py for what's expected from this method.
        """
        for res in raw_result["extras"]:
            sp3_mean_score = round(res["s3"]["score"]["mean"], 3)
            flattened_metrics_s3_internal = flatten(res["s3_internal"], ())

            clean_flat_internal_metrics = {}
            for k, vals in flattened_metrics_s3_internal.items():
                if k in ("mean", "geomean"):
                    # Skip these for parity with what was being
                    # returned in the results.py/output.py
                    continue
                clean_flat_internal_metrics[k.replace("tests/", "")] = [
                    round(val, 3) for val in vals
                ]

            clean_flat_internal_metrics["score-internal"] = clean_flat_internal_metrics[
                "score"
            ]
            clean_flat_internal_metrics["score"] = [sp3_mean_score]

            for k, v in clean_flat_internal_metrics.items():
                bt_result["measurements"].setdefault(k, []).extend(v)

    def _build_subtest(self, measurement_name, replicates, test):
        unit = test.get("unit", "ms")
        if test.get("subtest_unit"):
            unit = test.get("subtest_unit")

        lower_is_better = test.get(
            "subtest_lower_is_better", test.get("lower_is_better", True)
        )
        if "score" in measurement_name:
            lower_is_better = False
            unit = "score"

        alert_severity = "subcritical"
        if measurement_name == "score" and self.platform == "Windows":
            alert_severity = "critical"

        subtest = {
            "unit": unit,
            "alertThreshold": float(test.get("alert_threshold", 2.0)),
            "alertSeverity": alert_severity,
            "lowerIsBetter": lower_is_better,
            "minBackWindow": 24,
            "maxBackWindow": 48,
            "name": measurement_name,
            "replicates": replicates,
            "shouldAlert": True,
            "value": round(filters.mean(replicates), 3),
        }

        if "score-internal" in measurement_name:
            subtest["shouldAlert"] = False

        if any(measurement_name.endswith(suffix) for suffix in ("/Async", "/Sync")):
            subtest["shouldAlert"] = False

        return subtest

    def summarize_test(self, test, suite, **kwargs):
        """Summarize the measurements found in the test as a suite with subtests.

        See base_python_support.py for what's expected from this method.
        """
        suite["type"] = "benchmark"
        suite["minBackWindow"] = 24
        suite["maxBackWindow"] = 48
        if suite["subtests"] == {}:
            suite["subtests"] = []
        for measurement_name, replicates in test["measurements"].items():
            if not replicates:
                continue
            if self.is_additional_metric(measurement_name):
                continue
            # Only report suite-level totals (e.g. "Perf-Dashboard/total"),
            # not per-task breakdowns (e.g. "Perf-Dashboard/Render/Async").
            if measurement_name.count("/") > 1:
                continue
            suite["subtests"].append(
                self._build_subtest(measurement_name, replicates, test)
            )

        self.add_additional_metrics(test, suite, **kwargs)
        suite["subtests"].sort(key=lambda subtest: subtest["name"])

        score = 0
        replicates = []
        for subtest in suite["subtests"]:
            if subtest["name"] == "score":
                score = subtest["value"]
                replicates = subtest.get("replicates", [])
                break
        suite["value"] = score
        suite["replicates"] = replicates
        suite["alertSeverity"] = "subcritical"
        if self.platform == "Windows":
            suite["alertSeverity"] = "critical"

        if test.get("simpleperf", False):
            suite["shouldAlert"] = False
            for subtest in suite.get("subtests", []):
                subtest["shouldAlert"] = False

        if self.nova:
            suite["extraOptions"].append("nova")

    def modify_command(self, cmd, test):
        """Modify the browsertime command for speedometer 3.

        Presently we need to modify the commend to accommodate profiling
        on android devices by modifying the test url to lower the iteration
        counts.

        """

        # Bug 1934266
        # For profiling on android + speedometer3 we set the iteration count to 5.
        # Otherwise the profiles are too large and use too much of the allocated
        # host machine memory. This is a useful temporary measure until we have
        # a more long term solution.
        if test.get("gecko_profile", False) and self.app in ("fenix", "geckoview"):
            LOG.info(
                "Modifying iterationCount to 5 for gecko profiling speedometer3 on android"
            )
            btime_url_index = cmd.index("--browsertime.url")
            cmd[btime_url_index + 1] += "&iterationCount=5"
