# Taint benchmark

A standalone benchmark for the data structures in `taint/Taint.{h,cpp}`. It
compiles `Taint.cpp` directly, so it needs nothing but a C++17 compiler; a
Firefox objdir is used for the real `mozilla/Assertions.h` if one happens to
exist, and a stub is generated otherwise.

```sh
./run.sh                     # benchmark the in-tree sources
./run.sh --src DIR           # benchmark another copy of taint/
./run.sh --compare DIR_A DIR_B
```

Set `BENCH_CPU` to pin to a different core (default 0).

For an A/B run, check the other revision out into a worktree and point at its
`taint` directory:

```sh
git worktree add /tmp/taint-base <revision>
taint/test/bench/run.sh --compare /tmp/taint-base/taint taint
```

## Reading the output

Each row is one scenario, modelled on the taint work Foxhound does while
browsing: building and extending flows, taking substrings, concatenating,
copying, per-character lookups, and mutating both tainted and untainted
strings.

**Trust `allocs/op` and `bytes/op`.** They are exact and identical across runs,
so a change of even one allocation is a real signal.

**Treat `ns/op` as a hint, not a result.** Run to run spread on an otherwise
idle machine has been measured at 20-30% for the shorter scenarios, which is
far larger than most changes worth making. A difference under about 10% here
means nothing on its own.

## What this benchmark cannot tell you

It measures the taint data structures in isolation. It has twice suggested a
change that did not survive contact with a real workload:

- Sharing the `TaintOperation` payload cut allocations by 61% here and
  regressed the browser by 36% on SunSpider's `date-format-xparb`, because it
  made construction allocate where it previously did not. Construction happens
  once per string operation; the copy that sharing avoids happens once per
  taint range, and there is usually one.
- Shrinking `JSString` looked like a 20% cell size reduction and was actually a
  redistribution that doubled the cost of a GC-heavy benchmark in the browser.

The scenarios here also over-represent operations that carry a script location
and arguments. That is the shape where copying is expensive, and it is not the
shape SpiderMonkey's hot paths use most.

So: use this to check that a change does what you think it does to the data
structures, then confirm the effect in a browser benchmark before believing it.
Correctness is covered separately by the gtest suite in `taint/test/gtest`.
