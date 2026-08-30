#!/usr/bin/env python3
"""Turn benchmark results into a Markdown summary.

Reports a confidence interval for every number and only calls a difference
real when a Welch t-test says so. Benchmark timings on shared CI runners move
by more than most changes worth making, so a point estimate on its own is not
evidence of anything.
"""

import argparse
import json
import math
import statistics as st


def per_round_totals(runs):
    """One number per round: the sum over sub-tests of that sub-test's mean."""
    return [sum(st.mean(v) for v in r.values()) for r in runs]


def ci95(xs):
    if len(xs) < 2:
        return 0.0
    return 1.96 * st.stdev(xs) / math.sqrt(len(xs))


def welch(a, b):
    """Returns (t, df). Degrees of freedom via Welch-Satterthwaite."""
    if len(a) < 2 or len(b) < 2:
        return 0.0, 0.0
    va, vb = st.variance(a), st.variance(b)
    na, nb = len(a), len(b)
    denom = va / na + vb / nb
    if denom == 0:
        return 0.0, 0.0
    t = (st.mean(b) - st.mean(a)) / math.sqrt(denom)
    df = denom**2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1))
    return t, df


def critical_t(df):
    """Two sided 0.05 critical value, good enough over the range of df a
    handful of rounds produces."""
    table = [(1, 12.71), (2, 4.30), (3, 3.18), (4, 2.78), (5, 2.57), (6, 2.45),
             (7, 2.36), (8, 2.31), (9, 2.26), (10, 2.23), (12, 2.18),
             (15, 2.13), (20, 2.09), (30, 2.04), (60, 2.00)]
    for limit, value in table:
        if df <= limit:
            return value
    return 1.96


def overhead(baseline_mean, other_mean, higher_is_better):
    """Positive means the second build is worse than the first."""
    if baseline_mean == 0:
        return 0.0
    if higher_is_better:
        return 100 * (baseline_mean / other_mean - 1) if other_mean else 0.0
    return 100 * (other_mean / baseline_mean - 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("results")
    ap.add_argument("--baseline", default="vanilla",
                    help="build to measure overhead against")
    ap.add_argument("--out", help="write Markdown here as well as stdout")
    args = ap.parse_args()

    with open(args.results) as f:
        data = json.load(f)

    lines = []
    add = lines.append
    add("## Taint tracking overhead")
    add("")

    any_rounds = 0
    for name, entry in data.items():
        runs = entry["runs"]
        labels = list(runs)
        if args.baseline not in labels:
            add(f"### {entry['label']}")
            add("")
            add(f"No `{args.baseline}` build in the results; nothing to compare against.")
            add("")
            continue
        rounds = min(len(v) for v in runs.values())
        any_rounds = max(any_rounds, rounds)
        if rounds == 0:
            continue

        unit = entry["unit"]
        hib = entry["higher_is_better"]
        base = per_round_totals(runs[args.baseline])

        add(f"### {entry['label']}")
        add("")
        add(f"{rounds} interleaved rounds, "
            f"{'higher' if hib else 'lower'} is better.")
        add("")
        add(f"| build | {unit} (mean ± 95% CI) | vs {args.baseline} | significant |")
        add("| --- | --- | --- | --- |")
        for label in labels:
            vals = per_round_totals(runs[label])
            if not vals:
                continue
            cell = f"{st.mean(vals):.1f} ± {ci95(vals):.1f}"
            if label == args.baseline:
                add(f"| {label} | {cell} | — | — |")
                continue
            delta = overhead(st.mean(base), st.mean(vals), hib)
            t, df = welch(base, vals)
            sig = "yes" if abs(t) > critical_t(df) else "no"
            add(f"| {label} | {cell} | {delta:+.1f}% | {sig} |")
        add("")

    add("---")
    add("")
    add("Differences marked not significant are indistinguishable from run to "
        "run variation and should not be read as a change. Benchmark timings "
        "on shared CI runners are noisy; treat this as a trend over several "
        "runs rather than a verdict on one commit.")

    text = "\n".join(lines)
    print(text)
    if args.out:
        with open(args.out, "w") as f:
            f.write(text + "\n")


if __name__ == "__main__":
    main()
