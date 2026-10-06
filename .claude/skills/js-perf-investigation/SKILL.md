---
name: js-perf-investigation
description: >
  Structured performance opportunity investigation for SpiderMonkey (the Firefox JavaScript engine).
  Use this skill when the user wants to investigate JS engine performance, profile SpiderMonkey,
  find optimization opportunities, write performance patches, or evaluate benchmark regressions.
  Trigger on mentions of: profiling JS, SpiderMonkey performance, JIT optimization, benchmark
  regression analysis, shell benchmarking, or any request to make JS workloads faster.

  The methodolgy is described mostly for the JS shell but can be adapted to browser investigation.
allowed-tools: Bash(searchfox-cli *) Bash(profiler-cli *) Bash(samply *) Bash(mach *) Python(*.py) Markdown(*.md)
---

# SpiderMonkey Performance Investigation

This skill guides a structured, evidence-driven performance investigation for the SpiderMonkey
JavaScript engine. The methodology has four phases: **hypothesis generation**, **evidence
gathering**, **patch writing**, and **evaluation**. Each phase builds on the last: resist the
urge to skip ahead to writing patches before you have empirical evidence that a change will help.

When asked to create multiple patches, iterate through the phases each time to ensure each patch
is independently validated and measured. **Always create commits before moving onto a new patch
if you are creating multiple patches**. This will make it easier to review and to measure
contribution.

The end result of this skill will be a summary of the investigation, and one or more patches
that measurably improve the performance of the targeted workload, with each patch describing
supporting evidence and measured impact.

## Prerequisites

The user should provide:
- A workload to investigate (a JS file, benchmark suite, or instructions to reproduce)
- A build configuration or existing shell to use

You have access to:
- `samply` — sampling profiler that produces Firefox Profiler-compatible output
- `profiler-cli` — for analyzing profiles. This can also be used to investigate Gecko
  profiler profiles if the investigation is being done in the browser.
- `searchfox-cli` — source code search for the Firefox codebase

For more details on how to use these tools load the "profiler-analysis" skill, which
will also hint on how to get the tools installed if needed.

An `artifacts/` directory can be created and this is excluded from version control.

## Phase 1: Hypothesis Generation

The goal is to identify where time is being spent and form testable hypotheses about what
could be improved.

### 1.1 Prepare the build

Use an **opt-nodebug** (optimized, no debug checks) build. Debug builds
distort profiles with assertion overhead.

The user should provide or confirm the mozconfig to use. The key settings for an opt-nodebug
build are:

```
ac_add_options --enable-optimize
ac_add_options --disable-debug
```

If the user hasn't specified a mozconfig, ask them — build configurations vary across
machines and the user will know which obj-dir and config is appropriate for their setup.

**Always run the shell with `--strict-benchmark-mode` when investigating performance.**
This flag validates the runtimeconfiguration and will error if something would produce
unreliable numbers (e.g. JIT is disabled unexpectedly). Generating profiles without this
flag risks producing misleading data.

### 1.2 Establish the workload

Examine the workload to understand what it does. If the workload has an iteration count or
loop parameter, determine an appropriate count so that **the workload runs for at least 30
seconds under profiling**. Statistical profilers need sufficient samples to produce
meaningful data — short runs produce noisy profiles where real hotspots are hard to
distinguish from sampling noise.

For targeted micro-optimizations (e.g. improving a single opcode or a specific stub), longer
runs (60s+) may be necessary to accumulate enough samples in the specific code path of
interest.

If the workload driver supports iteration configuration, prefer that.

Otherwise, wrap it:

```js
for (let i = 0; i < ITERATIONS; i++) {
    load("workload.js");  // or call the main function
}
```

### 1.3 Profile

Record a profile with samply. Always set `IONPERF=func` and `PERF_SPEW_DIR` so that
JIT-compiled functions appear with readable names in the profile instead of raw addresses.
The overhead is negligible:

```bash
mkdir -p artifacts/perf-spew
PERF_SPEW_DIR=artifacts/perf-spew IONPERF=func \
    samply record --save-only -o artifacts/profile.json.gz -- \
    ./obj-opt-nodebug/dist/bin/js --strict-benchmark-mode workload.js
```

Using `--save-only` avoids opening the browser and gives you a local file you can analyze
with `profiler-cli`. Save profiles to the `artifacts/` directory; you may need to gzip
the profile for profiler-cli to read it.

For deeper JIT investigation (e.g. understanding what IR the JIT emitted for a hot
function), use `IONPERF=ir` instead — see `references/advanced-tools.md`.

### 1.4 Analyze the profile

Start broad and narrow down: Looking at the profile, answer some of the following questionsfile:

1. What are the top CPU consumers?
2. What does the call tree look like top-down?
3. Who calls a hot function?
4. What does a specific function's time look like with callees collapsed?

For Speedometer profiles, always use `--focus-marker="-async,-sync"` to exclude async idle
time between benchmark iterations.

### 1.5 Form hypotheses

Based on the profile data, form specific, testable hypotheses. Good hypotheses look like:

- "Function X is called Y times from path Z — reducing call frequency by caching result W should save ~N% of its self time"
- "The JIT is spending M% of time in IC stubs for property access pattern P — a specialized stub for this pattern could reduce that"
- "Allocation pressure in function F is causing N% GC time — pretenuring could help"

Bad hypotheses (avoid these):
- "Let's tune the inlining threshold" — tuning existing knobs tends to overfit to the current benchmark state rather than making general engine progress
- "This function seems slow, let's rewrite it" — without understanding *why* it's slow

## Phase 2: Evidence Gathering

Before writing a patch, gather enough evidence to be confident the hypothesis is sound.

### 2.1 Source investigation

Use `searchfox-cli` to understand the relevant code and understand the current behavior.

Use searchfox-cli for blame on relevant code, as well as git history on relevant files.
This might provide context on why things are the way they are.

### 2.2 Instrumentation

Profiling shows *where* time is spent but not always *why*. When your hypothesis depends on
runtime state (data distributions, cache hit rates, list lengths, frequency of code paths),
add temporary instrumentation to measure it directly.

Use MOZ_LOG or JS_LOG for instrumentation.

```cpp
JS_LOG(debug /* you can also add your own channel, but debug should be unused */, Debug, "list length: %zu, sorted: %s",
           list.length(), isSorted ? "yes" : "no");
```

**Throttle instrumentation output** when it would fire on every iteration — use a counter
to log every Nth occurrence, or accumulate statistics and log a summary. Unthrottled logging
in a hot path will drown the output and slow the workload enough to distort measurements.

```cpp
static uint32_t callCount = 0;
if (++callCount % 10000 == 0) {
    JS_LOG_FMT(debug, Debug, "after %u calls: avg length = %zu",
               callCount, totalLength / callCount);
}
```

Re run with `MOZ_LOG=debug:5` to see the output.

In a browser build you can add profiler markers instead of logging which can be read through
gecko-profiling and the profiler-cli.

### 2.3 Re-run with instrumentation

Run the instrumented build and collect the data. This confirms whether your hypothesis
about runtime behavior is correct before you invest in writing a real patch.

## Phase 3: Patch Writing

Now that you have evidence, write the patch.

### 3.1 Design for measurability

Where possible, gate the optimization behind a **JS::Prefs preference** so you can do
apples-to-apples comparison on the same binary. This eliminates build-to-build variation
as a confounding factor and makes it trivial to re-measure later.

To add the pref, add an entry to `StaticPrefList.yaml`:

```yaml
- name: javascript.options.experimental.my_optimization
  type: bool
  value: true
  mirror: always
  set_spidermonkey_pref: always
```

Then guard the code path:

```cpp
if (JS::Prefs::experimental_my_optimization()) {
    // new path (default: on)
} else {
    // old path
}
```

Use `set_spidermonkey_pref: always` (not `startup`) so the pref can be toggled via
`--setpref` without requiring a restart:

```bash
# Measure with optimization (default):
./js --strict-benchmark-mode workload.js
# Measure without:
./js --strict-benchmark-mode --setpref experimental.my_optimization=false workload.js
```

Note that pref-gating is not always feasible. For changes on extremely hot paths (tight
JIT loops, inline caches), the branch on the pref check itself can be costly enough to
distort measurements. In those cases, fall back to saving the obj-dir from a build without
the patch and comparing against a build with the patch applied.

**Note: You can't save -just- a `js` binary, as there are dynamically linked libraries.
Always save the obj-dir, or create a different mozconfig**.

### 3.2 Add development logging

During patch development, add `JS_LOG` logging to the debug channel to verify the new
code path is being taken where expected. Throttle by a counter to avoid flooding output.
Do a run with the instrumentation logging to ensure the logging fires when/where/as-much
as expected. Remove or reduce this logging before the patch is finalized.

### 3.3 Microbenchmark

For a given optimization is is often compelling to also generate a microbenchmark which
demonstrates in the _absolute most ideal circumstances for the optimization_ what kind
of result is achievable. This is not a replacement for measuring the real workload,
but can be a useful sanity check that the optimization is working as intended and has
the potential to produce the expected impact, and can help in choosing to keep
patches which are effective in the microbenchmark but don't show good impact under the
real workload.

### 3.4 Multiple patches

When investigating multiple optimization opportunities:

- Develop each patch independently so its contribution can be measured in isolation
- Commit each patch separately with a clear message describing the change and the hypothesis
  aims to address, evidence in favour and testing results.
- At the end of optimziation, present:
  1. **Total improvement** from baseline (no patches) to all patches applied
  2. **Individual contribution** of each patch measured independently
  3. Any **interactions** between patches (does applying A make B more or less effective?)

## Phase 4: Evaluation

### 4.1 Performance measurement

Run the workload with and without the patch (using the pref toggle or separate builds).

If `hyperfine` is available, you can use that if. If not, start with 5 runs of each configuration, collecting timing results into arrays.

```bash
# With pref-gated optimization — collect results into a file:
for i in $(seq 1 5); do
    ./js --strict-benchmark-mode --setpref experimental.my_optimization=true workload.js \
        2>&1 | tee -a artifacts/results_with.txt
done
for i in $(seq 1 5); do
    ./js --strict-benchmark-mode --setpref experimental.my_optimization=false workload.js \
        2>&1 | tee -a artifacts/results_without.txt
done
```

After collecting initial results, use a Python script to assess whether the sample size
is sufficient. Use the **Mann-Whitney U test** (non-parametric, robust to non-normal
distributions common in benchmark data) to test for significance:

```python
# /// script
# dependencies = [
#   "numpy",
#   "scipy",
# ]
# ///

# use `uv run script.py` and deps should be automaticaly installed
import numpy as np
from scipy import stats

baseline = np.array([...])  # times without patch
patched = np.array([...])   # times with patch

stat, p_value = stats.mannwhitneyu(baseline, patched, alternative='two-sided')
effect_size = (np.mean(baseline) - np.mean(patched)) / np.mean(baseline) * 100

print(f"Baseline: {np.mean(baseline):.2f} +/- {np.std(baseline):.2f}")
print(f"Patched:  {np.mean(patched):.2f} +/- {np.std(patched):.2f}")
print(f"Effect:   {effect_size:.2f}%")
print(f"p-value:  {p_value:.4f}")

if p_value > 0.05:
    print("Result not statistically significant at p<0.05 — consider more runs")
```

If the p-value is borderline (0.01 < p < 0.10) or the effect size is small relative to
the observed variance, collect additional runs and retest. But **do not exceed 20 runs per
configuration** — if 20 runs on each side still can't produce a significant result, the
effect is too close to the noise floor to be meaningfully measured this way. That's a signal
to step back and reconsider: either the optimization isn't having the expected impact, or
the workload needs to be restructured to isolate the effect better (e.g. more iterations
of the hot path, a more targeted microbenchmark).

### 4.2 Profile the patched build

Don't just measure — profile again to confirm the patch is having the expected effect.
The profile should show reduced time in the targeted code path. If it doesn't, investigate
why.

### 4.3 Safety evaluation

After each patch is written, but before it's commited, **run the correctness test suites.**

Both of these must pass. Test with opt-nodebug first (because you have the build) but
also test with an opt-debug build as well, as there are many debug-only assertions
that catch errors that are needed to be evaluated.

```bash
./mach jit-test
./mach jstests
```

If the patch touches **GC-related code**, run both suites with `--jitflags=all` for more
thorough coverage:

```bash
./mach jit-test --jitflags=all
./mach jstests --jitflags=all
```

Beyond the test suites, consider adding test cases to address
- Edge cases the optimization might mishandle
- Whether the patch changes general-purpose code paths that could regress other workloads

## Investigation document

Produce a summary document (outside the source tree, e.g. in `artifacts/`) that records:

1. **Objective**: What workload was being investigated and why
2. **Methodology**: Build configuration, profiling setup, iteration counts
3. **Hypotheses investigated**: For each hypothesis:
   - What the profile data suggested
   - What evidence was gathered (instrumentation results, source analysis)
   - Whether a patch was written and what it does
   - Measured performance impact (with numbers and variance)
4. **Hypotheses rejected**: Hypotheses that were investigated but didn't pan out, and why —
   this is valuable for future investigators
5. **Results**: Summary of total improvement achieved, per-patch breakdown
6. **Remaining opportunities**: Observations from profiling that weren't pursued but could
   be investigated in future work

## Anti-patterns to avoid

- **Patching without evidence**: Never write an optimization patch based on intuition alone.
  Profile first, instrument if needed, then patch.
- **Knob tuning**: Adjusting existing heuristic thresholds (inlining limits, IC stub counts,
  GC triggers) tends to overfit to the specific benchmark. Prefer structural improvements
  that make the engine generally better over threshold adjustments that win one benchmark.
- **Measuring too few iterations**: A single run or a 2-second profile is not reliable.
  Ensure sufficient samples for statistical confidence.
- **Forgetting `--strict-benchmark-mode`**: Without this flag, the shell may be in a
  configuration that produces misleading numbers. Always use it.
- **Comparing across builds without controlling for noise**: Use pref-gated patches or
  carefully controlled build pairs. Random rebuild-to-rebuild variation can mask or
  exaggerate real differences.
- **Mixing together independnet changes in a single patch**.
- Advocating for changes that can't even be measured on a targeted microbenchmark.
  If the optimization can't show a clear improvement in an idealized scenario, it's
  unlikely to produce meaningful improvement in the real workload.
