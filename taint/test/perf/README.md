# Browser benchmarks

Measures how much taint tracking costs, by running the same standard
benchmarks in Foxhound and in a stock Firefox built from the upstream commit
Foxhound is based on.

Everything is served from localhost out of benchmarks already vendored in the
tree, so no network access and no Talos machinery is involved:

| benchmark | source | unit |
| --- | --- | --- |
| SunSpider 1.0.1 | `third_party/webkit/PerformanceTests/SunSpider` | ms, lower is better |
| Kraken 1.1 | `testing/talos/talos/tests/kraken` | ms, lower is better |
| V8 benchmark v7 | `testing/talos/talos/tests/v8_7` | score, higher is better |

Each driver reports its results differently, so `benchmarks.py` gives each one
a small patch that hands the numbers back to the harness instead of writing
them into the page. Adding a benchmark means adding an entry there.

## Running it locally

```sh
python3 taint/test/perf/run_benchmarks.py --rounds 8 \
    --out results.json \
    vanilla=/path/to/firefox \
    foxhound=obj-tf-release/dist/bin/foxhound

python3 taint/test/perf/summarise.py results.json --baseline vanilla
```

`--benchmarks` takes a comma separated subset. Any number of builds can be
compared at once; `--baseline` picks which one the others are measured against.

Builds are run interleaved, one round at a time, with the order rotated between
rounds, so that drift over a long run is spread across the builds instead of
landing on whichever one went first.

## Reading the results

Every number comes with a 95% confidence interval, and a difference is only
marked significant when a Welch t-test says so. **A point estimate on its own
is not a result.** On an otherwise idle machine the spread between runs of the
same build has been measured at 20 to 30% for the shorter benchmarks, and CI
runners are shared with other tenants, so they are worse.

This is why the workflow runs weekly rather than per pull request, and why it
reports rather than fails. A benchmark gate tight enough to catch a real
regression would flap constantly on this hardware; one loose enough not to flap
would not catch anything worth catching. Read it as a trend across runs.

## Comparing fairly

The workflow builds stock Firefox from `FIREFOX_UPSTREAM_COMMIT` in
`.PLAYWRIGHT_VERSION` with a mozconfig matching Foxhound's, so the two differ
in the instrumentation and not in build options.

Do not substitute a Firefox downloaded from mozilla.org. Release builds are
built with PGO and LTO that these builds are not, so the comparison would
attribute the difference in build configuration to taint tracking and overstate
the overhead considerably.

## What has been measured

At the time this was written, taint tracking cost roughly 17 to 18% on
SunSpider against a stock Firefox built from the merge base. Most of that is
structural rather than propagation logic: `JSString` grows from 24 to 40 bytes
to carry the taint pointer and the inline character padding that comes with it.
