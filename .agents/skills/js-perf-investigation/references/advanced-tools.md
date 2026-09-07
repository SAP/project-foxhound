# Advanced Profiling Tools

## IONPERF — JIT code annotation for profilers

The `IONPERF` environment variable enables SpiderMonkey to emit JIT code metadata that
profilers (samply, perf) can use to attribute samples to JIT-compiled functions and
annotate disassembly with IR or source.

`PERF_SPEW_DIR` must be set to a directory where the jitdump files will be written.
Create the directory before running:

```bash
mkdir -p artifacts/perf-spew
PERF_SPEW_DIR=artifacts/perf-spew IONPERF=ir \
    samply record --save-only -o profile.json.gz -- \
    ./obj-opt-nodebug/dist/bin/js --strict-benchmark-mode workload.js
```

### Modes

| Value       | Output                                            | Build requirement    |
|-------------|---------------------------------------------------|----------------------|
| `func`      | Function-level granularity only                   | None                 |
| `ir`        | Assembly annotated with MIR/LIR names             | None                 |
| `ir-ops`    | Assembly annotated with MIR/LIR including operands| `--enable-jitspew`   |
| `ir-graph`  | Structured IR graphs for visualization            | `--enable-jitspew`   |
| `src`       | Assembly annotated with source lines (if available)| None                |

**`func`** is the lightest option — it just tells the profiler which JIT function each
code region belongs to, so profiler output shows function names instead of raw addresses.
Use this when you just want readable profiler output without IR detail.

**`ir`** is the most commonly useful mode for performance investigation. It annotates
the generated assembly with the MIR/LIR instruction names, so you can correlate hot
assembly with the compiler IR that produced it. This is invaluable when you need to
understand *what the JIT decided to emit* for a given operation.

**`ir-ops`** adds operand details to the IR annotations (register names, constant values).
Requires a jitspew-enabled build (`--enable-jitspew` in the mozconfig). Falls back to `ir`
if jitspew is not available.

**`ir-graph`** emits structured IR graph data suitable for visualization tools. Also
requires `--enable-jitspew`.

**`src`** annotates assembly with source file and line information. Useful when you want
to see which JS source line produced which assembly, but depends on source info being
available in the build.

### When to use IONPERF

Use `IONPERF=func` routinely — it has negligible overhead and makes profiler output
readable for JIT code.

Use `IONPERF=ir` when:
- A hot function is JIT-compiled and you need to understand what code the JIT emitted
- You're evaluating whether the JIT is making good decisions for a specific code pattern
- You want to see if a new IC stub or optimization is actually being used
