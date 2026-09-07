// Standalone allocation and timing benchmark for taint/Taint.{h,cpp}.
//
// Scenarios model the taint operations Foxhound performs during real browsing.
// Build and run it with taint/test/bench/run.sh; see the README there for what
// the numbers do and do not tell you.
//
// Correctness is covered by the gtest suite in taint/test/gtest.

#include "Taint.h"

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <new>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// Allocation counting (noise-free structural metric)
// ---------------------------------------------------------------------------
static size_t g_allocs = 0;
static size_t g_bytes = 0;
static bool g_counting = false;

void* operator new(size_t sz) {
  if (g_counting) {
    g_allocs++;
    g_bytes += sz;
  }
  void* p = std::malloc(sz ? sz : 1);
  if (!p) throw std::bad_alloc();
  return p;
}
void* operator new[](size_t sz) { return operator new(sz); }
void operator delete(void* p) noexcept { std::free(p); }
void operator delete[](void* p) noexcept { std::free(p); }
void operator delete(void* p, size_t) noexcept { std::free(p); }
void operator delete[](void* p, size_t) noexcept { std::free(p); }

// ---------------------------------------------------------------------------
// Realistic operation factories
// ---------------------------------------------------------------------------
static const std::u16string kFile =
    u"https://www.example.com/static/js/main.a3f9b2c1.chunk.js";
static const std::u16string kFunc = u"handleUserInput";

static TaintLocation MakeLocation(uint32_t line) {
  return TaintLocation(kFile, line, line * 7 % 80, line + 1, 3, 1,
                       TaintMd5{0x1a, 0x2b, 0x3c, 0x4d}, kFunc);
}

static TaintOperation MakeOp(const char* name, uint32_t line) {
  return TaintOperation(name, MakeLocation(line),
                        {u"argument-one", u"argument-two"});
}

static TaintOperation MakeSource(const char* name) {
  TaintOperation op(name, MakeLocation(1));
  op.setSource();
  return op;
}

// A source taint covering [0,len)
static SafeStringTaint MakeTainted(const char* src, uint32_t len) {
  return SafeStringTaint(0, len, MakeSource(src));
}

// A taint with `n` disjoint ranges of width `w`, spaced 2*w apart.
static SafeStringTaint MakeMultiRange(uint32_t n, uint32_t w) {
  SafeStringTaint t;
  for (uint32_t i = 0; i < n; i++) {
    TaintFlow flow(MakeSource("location.hash"));
    flow.extend(MakeOp("String.split", i));
    t.append(TaintRange(i * 2 * w, i * 2 * w + w, flow));
  }
  return t;
}

// ---------------------------------------------------------------------------
// Scenarios. Each returns a checksum so nothing is optimized away.
// ---------------------------------------------------------------------------

// Full flow lifecycle: source + chained string operations, then teardown.
// This is the single most common pattern (a.substring(..).toLowerCase()...).
static uint64_t S_flow_lifecycle() {
  uint64_t acc = 0;
  SafeStringTaint t = MakeTainted("location.search", 64);
  t.extend(MakeOp("String.prototype.substring", 10));
  t.extend(MakeOp("String.prototype.toLowerCase", 11));
  t.extend(MakeOp("String.prototype.trim", 12));
  t.extend(MakeOp("String.prototype.concat", 13));
  t.extend(MakeOp("String.prototype.replace", 14));
  t.extend(MakeOp("encodeURIComponent", 15));
  acc += t.begin()->end();
  return acc;
}

// Substring extraction, e.g. split()/slice()/charAt() over a multi-range string.
static uint64_t S_substring() {
  uint64_t acc = 0;
  SafeStringTaint t = MakeMultiRange(4, 8);
  for (uint32_t i = 0; i < 32; i++) {
    SafeStringTaint sub = t.safeSubTaint(i, i + 12);
    acc += sub.hasTaint() ? 1 : 0;
  }
  return acc;
}

// Concatenation of many tainted fragments (string building).
static uint64_t S_concat() {
  SafeStringTaint piece = MakeTainted("document.cookie", 6);
  SafeStringTaint out;
  uint32_t offset = 0;
  for (uint32_t i = 0; i < 24; i++) {
    out.concat(piece, offset);
    offset += 6;
  }
  return out.begin()->end();
}

// StringTaint copy/assign churn (nsString/JSString copies).
static uint64_t S_copy() {
  SafeStringTaint t = MakeMultiRange(4, 8);
  uint64_t acc = 0;
  for (uint32_t i = 0; i < 32; i++) {
    SafeStringTaint c(t);
    acc += c.begin()->begin();
  }
  return acc;
}

// Per-character taint lookup (charAt, character-wise copies).
static uint64_t S_at() {
  SafeStringTaint t = MakeMultiRange(8, 8);
  uint64_t acc = 0;
  for (uint32_t i = 0; i < 256; i++) {
    if (t.at(i % 128)) acc++;
  }
  return acc;
}

// Mutations on UNtainted strings. Overwhelmingly the most frequent case in a
// browser: almost every string is untainted, yet still runs taint bookkeeping.
static uint64_t S_untainted_mutations() {
  SafeStringTaint t;
  uint64_t acc = 0;
  for (uint32_t i = 0; i < 128; i++) {
    t.clearAt(i);
    t.clearBetween(i, i + 4);
    t.shift(i, 2);
    t.clearAfter(i + 64);
    acc += t.hasTaint() ? 1 : 0;
  }
  return acc;
}

// Mutations on tainted strings: replace/insert/shift paths.
static uint64_t S_tainted_mutations() {
  SafeStringTaint t = MakeMultiRange(4, 8);
  SafeStringTaint ins = MakeTainted("window.name", 3);
  uint64_t acc = 0;
  for (uint32_t i = 0; i < 16; i++) {
    t.clearBetween(20, 24);
    t.shift(12, 3);
    t.insert(12, ins);
    acc += t.hasTaint() ? 1 : 0;
  }
  return acc;
}

// overlay(): used by replace()/regexp paths to layer an operation onto a span.
static uint64_t S_overlay() {
  SafeStringTaint t = MakeMultiRange(4, 8);
  uint64_t acc = 0;
  for (uint32_t i = 0; i < 8; i++) {
    t.overlay(4 + i, 40 + i, MakeOp("String.prototype.replace", i));
    acc += t.hasTaint() ? 1 : 0;
  }
  return acc;
}

// End-to-end-ish mix approximating a DOM sink write.
static uint64_t S_mixed() {
  uint64_t acc = 0;
  SafeStringTaint url = MakeTainted("location.href", 48);
  url.extend(MakeOp("String.prototype.split", 20));
  SafeStringTaint part = url.safeSubTaint(8, 32);
  part.extend(MakeOp("decodeURIComponent", 21));
  SafeStringTaint msg;
  msg.concat(part, 0);
  msg.concat(part, 24);
  msg.extend(MakeOp("String.prototype.concat", 22));
  acc += msg.begin()->end();
  acc += msg.at(5) ? 1 : 0;
  return acc;
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------
struct Scenario {
  const char* name;
  uint64_t (*fn)();
  int reps;
};

static Scenario kScenarios[] = {
    {"flow_lifecycle", S_flow_lifecycle, 20000},
    {"substring", S_substring, 20000},
    {"concat", S_concat, 20000},
    {"copy", S_copy, 20000},
    {"at_lookup", S_at, 20000},
    {"untainted_mutations", S_untainted_mutations, 20000},
    {"tainted_mutations", S_tainted_mutations, 10000},
    {"overlay", S_overlay, 10000},
    {"mixed_dom", S_mixed, 20000},
};

int main(int argc, char** argv) {
  (void)argc;
  (void)argv;

  volatile uint64_t sink = 0;
  const int kTrials = 7;

  printf("%-22s %12s %12s %10s\n", "scenario", "ns/op", "allocs/op",
         "bytes/op");
  for (const auto& s : kScenarios) {
    // Warmup
    for (int i = 0; i < s.reps / 10; i++) sink += s.fn();

    // Allocation profile (single representative iteration set)
    g_allocs = 0;
    g_bytes = 0;
    g_counting = true;
    const int kAllocReps = 100;
    for (int i = 0; i < kAllocReps; i++) sink += s.fn();
    g_counting = false;
    double allocsPerOp = double(g_allocs) / kAllocReps;
    double bytesPerOp = double(g_bytes) / kAllocReps;

    // Timing: best of kTrials to suppress scheduler noise
    double best = 1e30;
    for (int t = 0; t < kTrials; t++) {
      auto t0 = std::chrono::steady_clock::now();
      for (int i = 0; i < s.reps; i++) sink += s.fn();
      auto t1 = std::chrono::steady_clock::now();
      double ns =
          std::chrono::duration<double, std::nano>(t1 - t0).count() / s.reps;
      if (ns < best) best = ns;
    }
    printf("%-22s %12.1f %12.2f %10.1f\n", s.name, best, allocsPerOp,
           bytesPerOp);
  }
  return 0;
}
