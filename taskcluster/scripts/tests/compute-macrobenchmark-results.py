#!/usr/bin/env python3

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import pathlib
import sys
from collections import defaultdict
from os import environ, listdir
from os.path import isfile, join

# Script that parses the results of a Macrobenchmark test run.
# Intended to be used within CI to parse and display the results of various Macrobenchmark properties:
# frame drops, time to initial display, etc.

# Key Constants
OVERRUNS_ON = "overruns_on"
OVERRUNS_OFF = "overruns_off"
CPU_DURATION_ON = "cpu_duration_on"
CPU_DURATION_OFF = "cpu_duration_off"
P90 = "P90"
P50 = "P50"
P99 = "P99"


def read_benchmark_data_from_directory(directory):
    ## org.mozilla.fenix.benchmark-benchmarkData.json
    benchmark_files = [
        file for file in listdir(directory) if isfile(join(directory, file))
    ]
    benchmark_results = {}
    for benchmark_file in benchmark_files:
        read_benchmark_data(f"{directory}/{benchmark_file}", benchmark_results)

    return benchmark_results


def read_benchmark_data(file_path, results):
    """Reads the JSON file and returns the benchmark results as a dictionary."""
    with open(file_path) as file:
        data = json.load(file)

    # Extract benchmarks data
    benchmarks = data["benchmarks"]
    for benchmark in benchmarks:
        name = benchmark["name"]
        metrics = benchmark["metrics"]
        sampled_metrics = benchmark["sampledMetrics"]

        results[name] = {}

        if "timeToInitialDisplayMs" in metrics:
            time_metrics = metrics["timeToInitialDisplayMs"]
            results[name]["ttid"] = {
                "median": time_metrics["median"],
                "minimum": time_metrics["minimum"],
                "maximum": time_metrics["maximum"],
            }

        if "frameCount" in metrics:
            frame_counts = metrics["frameCount"]
            results[name]["frame_counts"] = {
                "median": frame_counts["median"],
                "minimum": frame_counts["minimum"],
                "maximum": frame_counts["maximum"],
            }

        if "frameDurationCpuMs" in sampled_metrics:
            frame_duration_cpu = sampled_metrics["frameDurationCpuMs"]
            results[name]["frame_duration_cpu"] = {
                "P50": frame_duration_cpu["P50"],
                "P90": frame_duration_cpu["P90"],
                "P99": frame_duration_cpu["P99"],
            }

        if "frameOverrunMs" in sampled_metrics:
            frame_overruns = sampled_metrics["frameOverrunMs"]
            results[name]["frame_overruns"] = {
                "P50": frame_overruns["P50"],
                "P90": frame_overruns["P90"],
                "P99": frame_overruns["P99"],
            }

    return results


def format_output_content(results):
    """Formats the output content into the specified JSON structure."""

    # Construct the subtests list
    subtests = []
    for result_name, categories in results.items():
        for category_name, metrics in categories.items():
            for metric_name, value in metrics.items():
                if "frame_count" in category_name:
                    subtest = {
                        "name": f"{result_name}.{category_name}.{metric_name}",
                        "lowerIsBetter": False,
                        "value": value,
                        "unit": "count",
                    }
                    subtests.append(subtest)
                else:
                    subtest = {
                        "name": f"{result_name}.{category_name}.{metric_name}",
                        "lowerIsBetter": True,
                        "value": value,
                        "unit": "ms",
                    }
                    subtests.append(subtest)

    # Define the base JSON structure using the subtests list
    output_json = {
        "framework": {"name": "mozperftest"},
        "application": {"name": "fenix"},
        "suites": [
            {
                "name": "baseline-profile:fenix",
                "type": "coldstart",
                "unit": "ms",
                "extraOptions": [],
                "lowerIsBetter": True,
                "subtests": subtests,
            }
        ],
    }

    return output_json


def output_results(output_json, output_file_path):
    """Writes the output JSON to a specified file and prints it in a compacted format to the console."""
    # Convert JSON structure to a compacted one-line string
    compact_json = json.dumps(output_json)

    # Print in the specified format
    print(f"PERFHERDER_DATA: {compact_json}")
    if "MOZ_AUTOMATION" in environ:
        upload_path = pathlib.Path(environ.get("MOZ_PERFHERDER_UPLOAD"))
        upload_path.parent.mkdir(parents=True, exist_ok=True)
        with upload_path.open("w", encoding="utf-8") as f:
            f.write(compact_json)

    # Write the pretty-formatted JSON to the file
    with open(output_file_path, "w") as output_file:
        output_file.write(json.dumps(output_json, indent=3))
    print(f"Results have been written to {output_file_path}")


def compute_performance_delta(feature_on, feature_off):
    if feature_off == 0.0:
        return 0.0
    if feature_on is None or feature_off is None:
        return 0.0
    return round((feature_off - feature_on) / feature_off * 100, 1)


# Prints a table comparing the impact of startup with baseline profile to without
def generate_ttid_markdown_table(results):
    # Step 1: Organize the data
    table_data = defaultdict(lambda: {"median": None, "median none": None})
    benchmark_title_size = 0

    for result_name, categories in results.items():
        for category_name, metrics in categories.items():
            for metric_name, value in metrics.items():
                if "ttid" not in category_name:
                    continue
                if "median" in metric_name:
                    if "None" in result_name:
                        base_name = result_name.replace("None", "")
                        table_data[base_name]["median none"] = value
                    else:
                        table_data[result_name]["median"] = value
                        benchmark_title_size = max(
                            benchmark_title_size, len(result_name)
                        )

    # Step 2: Prepare markdown rows
    headers = ["Benchmark", "Median", "Median None", "% diff"]
    lines = [
        "### TTID Table by Median",
        f"|{' ' + headers[0] + ' ' * (benchmark_title_size - len(headers[0])) + '| ' + ' | '.join(headers[1:])} |",
        f"|{':-' + '-:|:-'.join(['-' * len(h) for h in headers])}-:|",
    ]

    for benchmark, values in sorted(table_data.items()):
        median = values["median"]
        median_none = values["median none"]
        if median is None or median_none is None:
            continue
        if median is not None and median_none:
            percent_diff = round((median_none - median) / median_none * 100, 1)
        else:
            percent_diff = ""

        benchmark_spacing = " " * (benchmark_title_size - len(benchmark))

        row = f"| {benchmark}{benchmark_spacing} | {median:.3f} | {median_none:.3f} | {percent_diff} |"
        lines.append(row)

    return "\n".join(lines)


def compute_frame_timing_row(benchmark, benchmark_title_size, percentile, values):
    title_spacing = " " * (benchmark_title_size - len(benchmark))
    overruns_on = 0.0
    overruns_off = 0.0
    duration_on = 0.0
    duration_off = 0.0
    if values[OVERRUNS_ON][percentile] is not None:
        overruns_on = values[OVERRUNS_ON][percentile]
    if values[OVERRUNS_OFF][percentile] is not None:
        overruns_off = values[OVERRUNS_OFF][percentile]
    if values[CPU_DURATION_ON][percentile] is not None:
        duration_on = values[CPU_DURATION_ON][percentile]
    if values[CPU_DURATION_OFF][percentile] is not None:
        duration_off = values[CPU_DURATION_OFF][percentile]
    return (
        f"| {benchmark} {percentile}{title_spacing} | {overruns_on:.3f} | {overruns_off:.3f} | {compute_performance_delta(overruns_on, overruns_off)} | {duration_on:.3f} | {duration_off:.3f} | {compute_performance_delta(duration_on, duration_off)} |",
    )


# Prints a table comparing P90 FrameTiming metrics with and without performance impacting factors
def generate_frame_timing_markdown_table(results):
    table_data = defaultdict(
        lambda: {
            OVERRUNS_ON: {P50: None, P90: None, P99: None},
            OVERRUNS_OFF: {P50: None, P90: None, P99: None},
            CPU_DURATION_ON: {P50: None, P90: None, P99: None},
            CPU_DURATION_OFF: {P50: None, P90: None, P99: None},
        }
    )
    benchmark_title_size = 0
    for result_name, categories in results.items():
        for category_name, metrics in categories.items():
            for metric_name, value in metrics.items():
                benchmark_title_size = max(benchmark_title_size, len(result_name))
                if "frame_duration_cpu" in category_name:
                    if "AnimationOn" in result_name:
                        base_name = result_name.replace("AnimationOn", "")
                        table_data[base_name][CPU_DURATION_ON][metric_name] = value
                    elif "AnimationOff" in result_name:
                        base_name = result_name.replace("AnimationOff", "")
                        table_data[base_name][CPU_DURATION_OFF][metric_name] = value
                elif "frame_overruns" in category_name:
                    if "AnimationOn" in result_name:
                        base_name = result_name.replace("AnimationOn", "")
                        table_data[base_name][OVERRUNS_ON][metric_name] = value
                    elif "AnimationOff" in result_name:
                        base_name = result_name.replace("AnimationOff", "")
                        table_data[base_name][OVERRUNS_OFF][metric_name] = value

    # Step 2: Prepare markdown rows
    headers = [
        "Benchmark",
        "Frame Overruns (Off)",
        "Frame Overruns (On)",
        "Delta (%)",
        "CPU Duration (Off)",
        "CPU Duration (On)",
        "Delta (%)",
    ]
    lines = [
        "### FrameTiming Table by P90 Overruns and CPU Duration",
        f"|{' ' + headers[0] + ' ' * (benchmark_title_size - len(headers[0])) + '| ' + ' | '.join(headers[1:])} |",
        f"|{':-' + '-:|:-'.join(['-' * len(h) for h in headers])}-:|",
    ]

    for benchmark, values in sorted(table_data.items()):
        lines += compute_frame_timing_row(benchmark, benchmark_title_size, P50, values)
        lines += compute_frame_timing_row(benchmark, benchmark_title_size, P90, values)
        lines += compute_frame_timing_row(benchmark, benchmark_title_size, P99, values)
    return "\n".join(lines)


# Print markdown tables
def print_markdown_tables(results):
    print(generate_ttid_markdown_table(results))
    print("\r\n")
    print(generate_frame_timing_markdown_table(results))


# Main script logic
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py <input_json_path> <output_file_path>")
    else:
        input_json_path = sys.argv[1]
        output_file_path = sys.argv[2]

        # Process the benchmark data
        results = read_benchmark_data_from_directory(input_json_path)
        output_json = format_output_content(results)
        output_results(output_json, output_file_path)
        print_markdown_tables(results)
