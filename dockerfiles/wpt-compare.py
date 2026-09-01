#!/usr/bin/env python3
"""Diff two wptreport JSON files.

Intended for comparing a Foxhound run with tainting.active=false (baseline)
against one with tainting.active=true, so that taint-tracking regressions can be
told apart from the ~1-2% of WPT that any Firefox build fails anyway.

    wpt-compare baseline.json tainted.json [--json out.json]
"""

import argparse
import json
import sys
from collections import Counter


def load(path, use_retries=True):
    """Return {test_id: {"status": str, "subtests": {name: status}}}.

    A wptreport file holds one complete JSON document per suite run, appended.
    With --retry-unexpected, wptrunner emits a second suite containing just the
    tests whose first result was unexpected, so the file is JSON-lines rather
    than a single object. Later documents are overlaid on earlier ones, which
    makes the retry outcome authoritative -- that is the point of retrying, and
    it keeps flaky tests from showing up as false diffs between two runs.
    Pass use_retries=False to compare first-pass results only.
    """
    results = {}
    suites = 0
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            report = json.loads(line)
            suites += 1
            if suites > 1 and not use_retries:
                break
            for test in report.get("results", []):
                results[test["test"]] = {
                    "status": test.get("status", "MISSING"),
                    "subtests": {s["name"]: s.get("status", "MISSING")
                                 for s in test.get("subtests", [])},
                }
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("baseline")
    parser.add_argument("tainted")
    parser.add_argument("--json", dest="json_out",
                        help="also write the structured diff here")
    parser.add_argument("--include-list", dest="include_out",
                        help="write the differing test ids here, one per line, "
                             "ready to feed back as `mach wpt --include-list`")
    parser.add_argument("--quiet", action="store_true",
                        help="print only the summary, not the per-test diff")
    parser.add_argument("--no-retries", dest="use_retries", action="store_false",
                        help="compare first-pass results only, ignoring the "
                             "--retry-unexpected pass")
    args = parser.parse_args()

    base = load(args.baseline, args.use_retries)
    taint = load(args.tainted, args.use_retries)

    only_base = sorted(set(base) - set(taint))
    only_taint = sorted(set(taint) - set(base))
    shared = sorted(set(base) & set(taint))

    changed = []
    for test in shared:
        b, t = base[test], taint[test]
        subtest_changes = []
        for name in sorted(set(b["subtests"]) | set(t["subtests"])):
            bs = b["subtests"].get(name, "MISSING")
            ts = t["subtests"].get(name, "MISSING")
            if bs != ts:
                subtest_changes.append({"subtest": name, "baseline": bs, "tainted": ts})
        if b["status"] != t["status"] or subtest_changes:
            changed.append({
                "test": test,
                "baseline": b["status"],
                "tainted": t["status"],
                "subtests": subtest_changes,
            })

    print(f"baseline: {len(base)} tests   tainted: {len(taint)} tests")
    print(f"only in baseline: {len(only_base)}   only in tainted: {len(only_taint)}")
    print(f"differing: {len(changed)}\n")

    transitions = Counter()
    for entry in changed:
        if entry["baseline"] != entry["tainted"]:
            transitions[(entry["baseline"], entry["tainted"])] += 1
        for sub in entry["subtests"]:
            transitions[(sub["baseline"], sub["tainted"])] += 1

    if transitions:
        print("status transitions (baseline -> tainted):")
        for (b, t), count in transitions.most_common():
            print(f"  {b:>12} -> {t:<12} {count}")
        print()

    if not args.quiet:
        for entry in changed:
            if entry["baseline"] != entry["tainted"]:
                print(f"{entry['test']}: {entry['baseline']} -> {entry['tainted']}")
            else:
                print(f"{entry['test']}:")
            for sub in entry["subtests"]:
                print(f"    [{sub['baseline']} -> {sub['tainted']}] {sub['subtest']}")

    if args.include_out:
        with open(args.include_out, "w") as f:
            for entry in changed:
                f.write(entry["test"] + "\n")
        print(f"\nwrote {args.include_out} ({len(changed)} tests)")

    if args.json_out:
        with open(args.json_out, "w") as f:
            json.dump({
                "only_in_baseline": only_base,
                "only_in_tainted": only_taint,
                "changed": changed,
            }, f, indent=2)
        print(f"\nwrote {args.json_out}")

    # Non-zero when taint tracking changed anything, so this can gate CI.
    return 1 if changed else 0


if __name__ == "__main__":
    sys.exit(main())
