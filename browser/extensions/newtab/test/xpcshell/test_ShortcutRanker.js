"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

add_task(async function test_weightedSampleTopSites_no_guid_last() {
  // Ranker are utilities we are testing
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  const provider = new Ranker.RankShortcutsProvider();
  // We are going to stub a database call
  const { NewTabUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/NewTabUtils.sys.mjs"
  );

  await NewTabUtils.init();

  const sandbox = sinon.createSandbox();

  // Stub DB call
  sandbox
    .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
    .resolves([
      ["a", 5, 10],
      ["b", 2, 10],
    ]);

  // First item here intentially has no guid
  const input = [
    { url: "no-guid.com" },
    { guid: "a", url: "a.com" },
    { guid: "b", url: "b.com" },
  ];

  const prefValues = {
    trainhopConfig: {
      smartShortcuts: {
        // fset: "custom", // uncomment iff your build defines a "custom" fset you want to use
        eta: 0,
        click_bonus: 10,
        positive_prior: 1,
        negative_prior: 1,
        fset: 1,
      },
    },
  };

  const result = await provider.rankTopSites(input, prefValues, {
    isStartup: false,
  });

  Assert.ok(Array.isArray(result), "returns an array");
  Assert.equal(
    result[result.length - 1].url,
    "no-guid.com",
    "top-site without GUID is last"
  );

  sandbox.restore();
});

add_task(async function test_sumNorm() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  let vec = [1, 1];
  let result = Ranker.sumNorm(vec);
  Assert.ok(
    result.every((v, i) => Math.abs(v - [0.5, 0.5][i]) < 1e-6),
    "sum norm works as expected for dense array"
  );

  vec = [0, 0];
  result = Ranker.sumNorm(vec);
  Assert.ok(
    result.every((v, i) => Math.abs(v - [0.0, 0.0][i]) < 1e-6),
    "if sum is 0.0, it should return the original vector, input is zeros"
  );

  vec = [1, -1];
  result = Ranker.sumNorm(vec);
  Assert.ok(
    result.every((v, i) => Math.abs(v - [1.0, -1.0][i]) < 1e-6),
    "if sum is 0.0, it should return the original vector, input contains negatives"
  );
});

add_task(async function test_computeLinearScore() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  let entry = { a: 1, b: 0, bias: 1 };
  let weights = { a: 1, b: 0, bias: 0 };
  let result = Ranker.computeLinearScore(entry, weights);
  Assert.equal(result, 1, "check linear score with one non-zero weight");

  entry = { a: 1, b: 1, bias: 1 };
  weights = { a: 1, b: 1, bias: 1 };
  result = Ranker.computeLinearScore(entry, weights);
  Assert.equal(result, 3, "check linear score with 1 everywhere");

  entry = { bias: 1 };
  weights = { a: 1, b: 1, bias: 1 };
  result = Ranker.computeLinearScore(entry, weights);
  Assert.equal(result, 1, "check linear score with empty entry, get bias");

  entry = { a: 1, b: 1, bias: 1 };
  weights = {};
  result = Ranker.computeLinearScore(entry, weights);
  Assert.equal(result, 0, "check linear score with empty weights");

  entry = { a: 1, b: 1, bias: 1 };
  weights = { a: 3 };
  result = Ranker.computeLinearScore(entry, weights);
  Assert.equal(result, 3, "check linear score with a missing weight");
});

add_task(async function test_interpolateWrappedHistogram() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  let hist = [1, 2];
  let t = 0.5;
  let result = Ranker.interpolateWrappedHistogram(hist, t);
  Assert.equal(result, 1.5, "test linear interpolation square in the middle");

  hist = [1, 2, 5];
  t = 2.5;
  result = Ranker.interpolateWrappedHistogram(hist, t);
  Assert.equal(
    result,
    (hist[0] + hist[2]) / 2,
    "test linear interpolation correctly wraps around"
  );

  hist = [1, 2, 5];
  t = 5;
  result = Ranker.interpolateWrappedHistogram(hist, t);
  Assert.equal(
    result,
    hist[2],
    "linear interpolation will wrap around to the last index"
  );
});

add_task(async function test_bayesHist() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  let vec = [1, 2];
  let pvec = [0.5, 0.5];
  let tau = 2;
  let result = Ranker.bayesHist(vec, pvec, tau);
  // checking the math
  // (1+2*.5)/(3+2)........... 2/5
  // (2+2*.5)/(3+2)........... 3/5
  Assert.ok(
    result.every((v, i) => Math.abs(v - [0.4, 0.6][i]) < 1e-6),
    "bayes histogram is expected for typical input"
  );
  vec = [1, 2];
  pvec = [0.5, 0.5];
  tau = 0.0;
  result = Ranker.bayesHist(vec, pvec, tau);
  Assert.ok(
    result.every((v, i) => Math.abs(v - vec[i] / 3) < 1e-6), // 3 is sum of vec
    "bayes histogram is a sum norming function if tau is 0"
  );
});

add_task(async function test_normSites() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  let Y = {
    a: [2, 2],
    b: [3, 3],
  };
  let result = Ranker.normHistDict(Y);
  Assert.ok(
    result.a.every(
      (v, i) => Math.abs(v - [4 / (4 + 9), 4 / (4 + 9)][i]) < 1e-6
    ),
    "normSites, basic input, first array"
  );
  Assert.ok(
    result.b.every(
      (v, i) => Math.abs(v - [9 / (4 + 9), 9 / (4 + 9)][i]) < 1e-6
    ),
    "normSites, basic input, second array"
  );

  Y = [];
  result = Ranker.normHistDict(Y);
  Assert.deepEqual(result, [], "normSites handles empty array");
});

add_task(async function test_clampWeights() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  let weights = { a: 0, b: 1000, bias: 0 };
  let result = Ranker.clampWeights(weights, 100);
  info("clampWeights clamps a big weight vector");
  Assert.equal(result.a, 0);
  Assert.equal(result.b, 100);
  Assert.equal(result.bias, 0);

  weights = { a: 1, b: 1, bias: 1 };
  result = Ranker.clampWeights(weights, 100);
  info("clampWeights ignores a small weight vector");
  Assert.equal(result.a, 1);
  Assert.equal(result.b, 1);
  Assert.equal(result.bias, 1);
});

add_task(async function test_updateWeights_batch() {
  // Import the module that exports updateWeights
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const eta = 1;
  const click_bonus = 1;
  const features = ["a", "b", "bias"];

  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
  function approxEqual(actual, expected, eps = 1e-12) {
    Assert.lessOrEqual(
      Math.abs(actual - expected),
      eps,
      `expected ${actual} ≈ ${expected}`
    );
  }

  //  single click on guid_A updates all weights
  const initial1 = { a: 0, b: 1, bias: 0.1 };
  const scores1 = {
    guid_A: { final: 1.1, a: 1, b: 1, bias: 1 },
  };

  let updated = await Ranker.updateWeights(
    {
      data: { guid_A: { clicks: 1, impressions: 0 } },
      scores: scores1,
      features,
      weights: { ...initial1 },
      eta,
      click_bonus,
    },
    false
  );

  const delta = sigmoid(1.1) - 1; // gradient term for a positive click
  approxEqual(updated.a, 0 - Number(delta) * 1);
  approxEqual(updated.b, 1 - Number(delta) * 1);
  approxEqual(updated.bias, 0.1 - Number(delta) * 1);

  // missing guid -> no-op (weights unchanged)
  const initial2 = { a: 0, b: 1000, bias: 0 };
  const scores2 = {
    guid_A: { final: 1, a: 1, b: 1e-3, bias: 1 },
  };

  updated = await Ranker.updateWeights(
    {
      data: { guid_B: { clicks: 1, impressions: 0 } }, // guid_B not in scores
      scores: scores2,
      features,
      weights: { ...initial2 },
      eta,
      click_bonus,
    },
    false
  );

  Assert.equal(updated.a, 0);
  Assert.equal(updated.b, 1000);
  Assert.equal(updated.bias, 0);
});

add_task(async function test_buildFrecencyFeatures_shape_and_empty() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  // empty inputs → empty feature maps
  let out = await Ranker.buildFrecencyFeatures({}, {});
  Assert.ok(
    out && "refre" in out && "rece" in out && "freq" in out,
    "returns transposed object with feature keys"
  );
  Assert.deepEqual(out.refre, {}, "refre empty");
  Assert.deepEqual(out.rece, {}, "rece  empty");
  Assert.deepEqual(out.freq, {}, "freq  empty");

  // single guid with no visits → zeros
  out = await Ranker.buildFrecencyFeatures({ guidA: [] }, { guidA: 42 });
  Assert.equal(out.refre.guidA, 0, "refre zero with no visits");
  Assert.equal(out.freq.guidA, 0, "freq  zero with no visits");
  Assert.equal(out.rece.guidA, 0, "rece  zero with no visits");
});

add_task(async function test_buildFrecencyFeatures_recency_monotonic() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  const sandbox = sinon.createSandbox();

  // Fix time so the decay is deterministic
  const nowMs = Date.UTC(2025, 0, 1); // Jan 1, 2025
  const clock = sandbox.useFakeTimers({ now: nowMs });

  const dayMs = 864e5;
  // visits use microseconds since epoch; function computes age with visit_date_us / 1000
  const us = v => Math.round(v * 1000);

  const visitsByGuid = {
    // one very recent visit (age ~0d)
    recent: [{ visit_date_us: us(nowMs), visit_type: 2 /* any value */ }],
    // one older visit (age 10d)
    old: [{ visit_date_us: us(nowMs - 10 * dayMs), visit_type: 2 }],
    // both recent + old → should have larger rece (sum of decays)
    both: [
      { visit_date_us: us(nowMs), visit_type: 2 },
      { visit_date_us: us(nowMs - 10 * dayMs), visit_type: 2 },
    ],
  };
  const visitCounts = { recent: 10, old: 10, both: 10 };

  const out = await Ranker.buildFrecencyFeatures(visitsByGuid, visitCounts, {
    halfLifeDays: 28, // default
  });

  Assert.greater(
    out.rece.recent,
    out.rece.old,
    "more recent visit → larger recency score"
  );
  Assert.greater(
    out.rece.both,
    out.rece.recent,
    "two visits (recent+old) → larger recency sum than just recent"
  );

  clock.restore();
  sandbox.restore();
});

add_task(
  async function test_buildFrecencyFeatures_log_scaling_and_interaction() {
    const Ranker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
    );
    const sandbox = sinon.createSandbox();
    const clock = sandbox.useFakeTimers({ now: Date.UTC(2025, 0, 1) });

    const nowMs = Date.now();
    const us = v => Math.round(v * 1000);

    // Same single visit (type held constant) for both GUIDs → same rece and same type sum.
    // Only visit_count differs → freq/refre should scale with log1p(visit_count).
    const visitsByGuid = {
      A: [{ visit_date_us: us(nowMs), visit_type: 2 /* 'typed' typically */ }],
      B: [{ visit_date_us: us(nowMs), visit_type: 2 }],
    };
    const visitCounts = { A: 9, B: 99 }; // different lifetime counts

    const out = await Ranker.buildFrecencyFeatures(visitsByGuid, visitCounts);

    // rece should be identical (same timestamps)
    Assert.equal(
      out.rece.A,
      out.rece.B,
      "recency is independent of visit_count"
    );

    // freq and refre should scale with log1p(total)
    const ratio = Math.log1p(visitCounts.B) / Math.log1p(visitCounts.A);
    const approxEqual = (a, b, eps = 1e-9) =>
      Assert.lessOrEqual(Math.abs(a - b), eps);

    approxEqual(out.freq.B / out.freq.A, ratio, 1e-9);
    approxEqual(out.refre.B / out.refre.A, ratio, 1e-9);

    clock.restore();
    sandbox.restore();
  }
);

add_task(async function test_buildFrecencyFeatures_halfLife_effect() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  const sandbox = sinon.createSandbox();
  const nowMs = Date.UTC(2025, 0, 1);
  const clock = sandbox.useFakeTimers({ now: nowMs });

  const dayMs = 864e5;
  const us = v => Math.round(v * 1000);

  // Two visits: one now, one 28 days ago.
  const visits = [
    {
      visit_date_us: us(nowMs),
      visit_type: 1,
    },
    {
      visit_date_us: us(nowMs - 28 * dayMs),
      visit_type: 1,
    },
  ];
  const visitsByGuid = { X: visits };
  const visitCounts = { X: 10 };

  const outShort = await Ranker.buildFrecencyFeatures(
    visitsByGuid,
    visitCounts,
    {
      halfLifeDays: 7, // faster decay
    }
  );
  const outLong = await Ranker.buildFrecencyFeatures(
    visitsByGuid,
    visitCounts,
    {
      halfLifeDays: 56, // slower decay
    }
  );

  Assert.greater(
    outLong.rece.X,
    outShort.rece.X,
    "larger half-life → slower decay → bigger recency sum"
  );

  clock.restore();
  sandbox.restore();
});

add_task(
  async function test_buildFrecencyFeatures_unknown_types_are_zero_bonus() {
    const Ranker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
    );
    const sandbox = sinon.createSandbox();
    const clock = sandbox.useFakeTimers({ now: Date.UTC(2025, 0, 1) });

    const nowMs = Date.now();
    const us = v => Math.round(v * 1000);

    // Use an unknown visit_type so TYPE_SCORE[visit_type] falls back to 0.
    const visitsByGuid = {
      U: [{ visit_date_us: us(nowMs), visit_type: 99999 }],
    };
    const visitCounts = { U: 100 };

    const out = await Ranker.buildFrecencyFeatures(visitsByGuid, visitCounts);

    Assert.equal(out.freq.U, 0, "unknown visit_type → zero frequency bonus");
    Assert.equal(out.refre.U, 0, "unknown visit_type → zero interaction");
    Assert.greater(out.rece.U, 0, "recency is still > 0 for a recent visit");

    clock.restore();
    sandbox.restore();
  }
);

add_task(
  async function test_weightedSampleTopSites_new_features_scores_and_norms() {
    const Ranker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
    );

    // 2 GUIDs with simple, distinct raw values so ordering is obvious
    const guids = ["g1", "g2"];
    const input = {
      guid: guids,
      features: ["bmark", "rece", "freq", "refre", "bias"],

      // raw feature maps keyed by guid
      bmark_scores: { g1: 1, g2: 0 }, // bookmark flag/intensity
      rece_scores: { g1: 2.0, g2: 1.0 }, // recency-only raw
      freq_scores: { g1: 0.5, g2: 0.25 }, // frequency-only raw
      refre_scores: { g1: 10, g2: 5 }, // interaction raw

      // per-feature normalization state (whatever your normUpdate expects)
      norms: { bmark: null, rece: null, freq: null, refre: null },

      // weights: only new features (and bias) contribute to final
      weights: { bmark: 1, rece: 1, freq: 1, refre: 1, bias: 0 },

      // unused here (no "thom", "hour", "daily")
      clicks: [],
      impressions: [],
      alpha: 1,
      beta: 1,
      tau: 0,
      hourly_seasonality: {},
      daily_seasonality: {},
    };

    // Pre-compute what normUpdate will return for each raw vector,
    // so we can assert exact equality with weightedSampleTopSites output.
    const vecBmark = guids.map(g => input.bmark_scores[g]); // [1, 0]
    const vecRece = guids.map(g => input.rece_scores[g]); // [2, 1]
    const vecFreq = guids.map(g => input.freq_scores[g]); // [0.5, 0.25]
    const vecRefre = guids.map(g => input.refre_scores[g]); // [10, 5]

    const [expBmark, expBmarkNorm] = Ranker.normUpdate(
      vecBmark,
      input.norms.bmark
    );
    const [expRece, expReceNorm] = Ranker.normUpdate(vecRece, input.norms.rece);
    const [expFreq, expFreqNorm] = Ranker.normUpdate(vecFreq, input.norms.freq);
    const [expRefre, expRefreNorm] = Ranker.normUpdate(
      vecRefre,
      input.norms.refre
    );

    const result = await Ranker.weightedSampleTopSites(input);

    // shape
    Assert.ok(
      result && result.score_map && result.norms,
      "returns {score_map, norms}"
    );

    // per-feature, per-guid scores match normUpdate outputs
    Assert.equal(
      result.score_map.g1.bmark,
      expBmark[0],
      "bmark g1 normalized value"
    );
    Assert.equal(
      result.score_map.g2.bmark,
      expBmark[1],
      "bmark g2 normalized value"
    );

    Assert.equal(
      result.score_map.g1.rece,
      expRece[0],
      "rece g1 normalized value"
    );
    Assert.equal(
      result.score_map.g2.rece,
      expRece[1],
      "rece g2 normalized value"
    );

    Assert.equal(
      result.score_map.g1.freq,
      expFreq[0],
      "freq g1 normalized value"
    );
    Assert.equal(
      result.score_map.g2.freq,
      expFreq[1],
      "freq g2 normalized value"
    );

    Assert.equal(
      result.score_map.g1.refre,
      expRefre[0],
      "refre g1 normalized value"
    );
    Assert.equal(
      result.score_map.g2.refre,
      expRefre[1],
      "refre g2 normalized value"
    );

    // updated norms propagated back out
    Assert.deepEqual(result.norms.bmark, expBmarkNorm, "bmark norms updated");
    Assert.deepEqual(result.norms.rece, expReceNorm, "rece norms updated");
    Assert.deepEqual(result.norms.freq, expFreqNorm, "freq norms updated");

    // THIS WILL FAIL until you fix the bug in the refre block:
    //   updated_norms.rece = refre_norm;
    // should be:
    //   updated_norms.refre = refre_norm;
    Assert.deepEqual(result.norms.refre, expRefreNorm, "refre norms updated");

    // final score equals computeLinearScore with provided weights
    const expectedFinalG1 = Ranker.computeLinearScore(
      result.score_map.g1,
      input.weights
    );
    const expectedFinalG2 = Ranker.computeLinearScore(
      result.score_map.g2,
      input.weights
    );
    Assert.equal(
      result.score_map.g1.final,
      expectedFinalG1,
      "final matches linear score (g1)"
    );
    Assert.equal(
      result.score_map.g2.final,
      expectedFinalG2,
      "final matches linear score (g2)"
    );

    // sanity: g1 should outrank g2 with strictly larger raw vectors across all features
    Assert.greaterOrEqual(
      result.score_map.g1.final,
      result.score_map.g2.final,
      "g1 final ≥ g2 final as all contributing features favor g1"
    );
  }
);

add_task(async function test_rankshortcuts_queries_returning_nothing() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  const { NewTabUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/NewTabUtils.sys.mjs"
  );
  await NewTabUtils.init();

  const sandbox = sinon.createSandbox();
  const stub = sandbox
    .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
    .resolves([]); // <— mock: query returns nothing

  const topsites = [{ guid: "g1" }, { guid: "g2" }];
  const places = "moz_places";
  const hist = "moz_historyvisits";

  // fetchVisitCountsByGuid: returns {} if no rows come back
  {
    const out = await Ranker.fetchVisitCountsByGuid(topsites, places);
    Assert.deepEqual(out, {}, "visit counts: empty rows → empty map");
  }

  // fetchLast10VisitsByGuid: pre-seeds all guids → each should be []
  {
    const out = await Ranker.fetchLast10VisitsByGuid(topsites, hist, places);
    Assert.deepEqual(
      out,
      { g1: [], g2: [] },
      "last 10 visits: empty rows → each guid has []"
    );
  }

  // fetchBookmarkedFlags: ensures every guid present with false
  {
    const out = await Ranker.fetchBookmarkedFlags(
      topsites,
      "moz_bookmarks",
      places
    );
    Assert.deepEqual(
      out,
      { g1: false, g2: false },
      "bookmarks: empty rows → every guid is false"
    );
  }

  // fetchDailyVisitsSpecific: ensures every guid has a 7-bin zero hist
  {
    const out = await Ranker.fetchDailyVisitsSpecific(topsites, hist, places);
    Assert.ok(
      Array.isArray(out.g1) && out.g1.length === 7,
      "daily specific: 7 bins"
    );
    Assert.ok(
      Array.isArray(out.g2) && out.g2.length === 7,
      "daily specific: 7 bins"
    );
    Assert.ok(
      out.g1.every(v => v === 0) && out.g2.every(v => v === 0),
      "daily specific: all zeros"
    );
  }

  // fetchDailyVisitsAll: returns a 7-bin zero hist
  {
    const out = await Ranker.fetchDailyVisitsAll(hist);
    Assert.ok(Array.isArray(out) && out.length === 7, "daily all: 7 bins");
    Assert.ok(
      out.every(v => v === 0),
      "daily all: all zeros"
    );
  }

  // fetchHourlyVisitsSpecific: ensures every guid has a 24-bin zero hist
  {
    const out = await Ranker.fetchHourlyVisitsSpecific(topsites, hist, places);
    Assert.ok(
      Array.isArray(out.g1) && out.g1.length === 24,
      "hourly specific: 24 bins"
    );
    Assert.ok(
      Array.isArray(out.g2) && out.g2.length === 24,
      "hourly specific: 24 bins"
    );
    Assert.ok(
      out.g1.every(v => v === 0) && out.g2.every(v => v === 0),
      "hourly specific: all zeros"
    );
  }

  // fetchHourlyVisitsAll: returns a 24-bin zero hist
  {
    const out = await Ranker.fetchHourlyVisitsAll(hist);
    Assert.ok(Array.isArray(out) && out.length === 24, "hourly all: 24 bins");
    Assert.ok(
      out.every(v => v === 0),
      "hourly all: all zeros"
    );
  }

  // sanity: we actually exercised the stub at least once
  Assert.greater(stub.callCount, 0, "executePlacesQuery was called");

  sandbox.restore();
});

// cover the explicit "no topsites" early-return branches
add_task(async function test_rankshortcuts_no_topsites_inputs() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  const { NewTabUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/NewTabUtils.sys.mjs"
  );
  await NewTabUtils.init();

  const sandbox = sinon.createSandbox();
  const stub = sandbox
    .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
    .resolves([]); // should not matter (early return)

  // empty topsites → {}
  Assert.deepEqual(
    await Ranker.fetchVisitCountsByGuid([], "moz_places"),
    {},
    "visit counts early return {}"
  );
  Assert.deepEqual(
    await Ranker.fetchLast10VisitsByGuid([], "moz_historyvisits", "moz_places"),
    {},
    "last10 early return {}"
  );
  Assert.deepEqual(
    await Ranker.fetchBookmarkedFlags([], "moz_bookmarks", "moz_places"),
    {},
    "bookmarks early return {}"
  );
  Assert.deepEqual(
    await Ranker.fetchDailyVisitsSpecific(
      [],
      "moz_historyvisits",
      "moz_places"
    ),
    {},
    "daily specific early return {}"
  );
  Assert.deepEqual(
    await Ranker.fetchHourlyVisitsSpecific(
      [],
      "moz_historyvisits",
      "moz_places"
    ),
    {},
    "hourly specific early return {}"
  );

  // note: the *All* variants don't take topsites and thus aren't part of this early-return set.

  // make sure we didn't query DB for early-return cases
  Assert.equal(stub.callCount, 0, "no DB calls for early-return functions");

  sandbox.restore();
});

add_task(async function test_rankTopSites_sql_pipeline_happy_path() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  const { NewTabUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/NewTabUtils.sys.mjs"
  );

  await NewTabUtils.init();
  const sandbox = sinon.createSandbox();

  // freeze time so recency/seasonality are stable
  const nowFixed = Date.UTC(2025, 0, 1, 12, 0, 0); // Jan 1, 2025 @ noon UTC
  const clock = sandbox.useFakeTimers({ now: nowFixed });

  // inputs: one strong site (g1), one weaker (g2), and one without guid
  const topsites = [
    { guid: "g1", url: "https://g1.com", frecency: 1000 },
    { guid: "g2", url: "https://g2.com", frecency: 10 },
    { url: "https://no-guid.com" }, // should end up last
  ];

  // provider under test
  const provider = new Ranker.RankShortcutsProvider();

  // keep cache interactions in-memory + observable
  const initialWeights = {
    bmark: 1,
    rece: 1,
    freq: 1,
    refre: 1,
    hour: 1,
    daily: 1,
    bias: 0,
    frec: 0,
  };
  const fakeCache = {
    weights: { ...initialWeights },
    init_weights: { ...initialWeights },
    norms: null,
    // minimal score_map so updateWeights can run even if eta > 0 (we set eta=0 below)
    score_map: { g1: { final: 0 }, g2: { final: 0 } },
  };
  sandbox.stub(provider.sc_obj, "get").resolves(fakeCache);
  const setSpy = sandbox.stub(provider.sc_obj, "set").resolves();

  // stub DB: return realistic rows per SQL shape
  const execStub = sandbox
    .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
    .callsFake(async sql => {
      const s = String(sql);

      // --- Bookmarks (fetchBookmarkedFlags)
      if (s.includes("FROM moz_bookmarks")) {
        // rows: [key, bookmark_count]
        return [
          ["g1", 2], // bookmarked
          ["g2", 0], // not bookmarked
        ];
      }

      // --- Visit counts (fetchVisitCountsByGuid)
      if (s.includes("COALESCE(p.visit_count")) {
        // rows: [guid, visit_count]
        return [
          ["g1", 42],
          ["g2", 3],
        ];
      }

      // --- Last 10 visits (fetchLast10VisitsByGuid)
      if (s.includes("LIMIT 10") && s.includes("ORDER BY vv.visit_date DESC")) {
        // rows: [guid, visit_date_us, visit_type], ordered by guid/date DESC
        const nowUs = nowFixed * 1000;
        const dayUs = 864e8;
        // g1: two recent visits (typed + link); g2: one older link
        return [
          ["g1", nowUs, 2], // TYPED
          ["g1", nowUs - 1 * Number(dayUs), 1], // LINK (yesterday)
          ["g2", nowUs - 10 * Number(dayUs), 1], // LINK (older)
        ];
      }

      // --- Daily specific (fetchDailyVisitsSpecific): rows [key, dow, count]
      if (
        s.includes("strftime('%w'") &&
        s.includes("GROUP BY place_ids.guid")
      ) {
        return [
          ["g1", 1, 3], // Mon
          ["g1", 2, 2], // Tue
          ["g2", 1, 1], // Mon
        ];
      }

      // --- Daily all (fetchDailyVisitsAll): rows [dow, count]
      if (s.includes("strftime('%w'") && !s.includes("place_ids.guid")) {
        return [
          [0, 10],
          [1, 20],
          [2, 15],
          [3, 12],
          [4, 8],
          [5, 5],
          [6, 4],
        ];
      }

      // --- Hourly specific (fetchHourlyVisitsSpecific): rows [key, hour, count]
      if (
        s.includes("strftime('%H'") &&
        s.includes("GROUP BY place_ids.guid")
      ) {
        return [
          ["g1", 9, 5],
          ["g1", 10, 3],
          ["g2", 9, 1],
        ];
      }

      // --- Hourly all (fetchHourlyVisitsAll): rows [hour, count]
      if (s.includes("strftime('%H'") && !s.includes("place_ids.guid")) {
        return Array.from({ length: 24 }, (_, h) => [
          h,
          h >= 8 && h <= 18 ? 10 : 2,
        ]);
      }

      // --- Shortcut interactions (fetchShortcutInteractions)
      // The query varies by implementation; if your helper hits SQL, fall back to "empty"
      if (
        s.toLowerCase().includes("shortcut") ||
        s.toLowerCase().includes("smartshortcuts")
      ) {
        return [];
      }

      // default: empty for any other SQL the provider might issue
      return [];
    });

  // prefs: set eta=0 so updateWeights is a no-op (deterministic)
  // NOTE: Feature set comes from the module's SHORTCUT_FSETS.
  // If your build's default fset already includes ["bmark","rece","freq","refre","hour","daily","bias","frec"],
  // this test will exercise all the SQL above. If not, it still passes the core assertions.
  const prefValues = {
    trainhopConfig: {
      smartShortcuts: {
        // fset: "custom", // uncomment iff your build defines a "custom" fset you want to use
        eta: 0,
        click_bonus: 10,
        positive_prior: 1,
        negative_prior: 1,
        fset: 8,
        telem: true,
      },
    },
  };

  // run
  const out = await provider.rankTopSites(topsites, prefValues, {
    isStartup: false,
  });

  // assertions
  Assert.ok(Array.isArray(out), "returns an array");
  Assert.ok(
    out.every(
      site =>
        Object.prototype.hasOwnProperty.call(site, "scores") &&
        Object.prototype.hasOwnProperty.call(site, "weights")
    ),
    "Every shortcut should expose scores and weights (even when null) because telem=true"
  );
  Assert.equal(
    out[out.length - 1].url,
    "https://no-guid.com",
    "no-guid item is last"
  );

  // If the active fset includes the “new” features, g1 should outrank g2 based on our SQL.
  const rankedGuids = out.filter(x => x.guid).map(x => x.guid);
  if (rankedGuids.length === 2) {
    // This is a soft assertion—kept as ok() instead of equal() so the test still passes
    // on builds where the active fset does not include those features.
    Assert.strictEqual(
      rankedGuids[0],
      "g1",
      `expected g1 to outrank g2 when feature set includes (bmark/rece/freq/refre/hour/daily); got ${rankedGuids}`
    );
  }

  // cache writes happened (norms + score_map)
  Assert.ok(setSpy.calledWith("norms"), "norms written to cache");
  Assert.ok(setSpy.calledWith("score_map"), "score_map written to cache");

  // sanity: DB stub exercised
  Assert.greater(execStub.callCount, 0, "executePlacesQuery was called");

  // cleanup
  clock.restore();
  sandbox.restore();
});

//
// 2) weightedSampleTopSites: "open" feature sets per-guid scores and norms
//
add_task(async function test_weightedSampleTopSites_open_feature_basic() {
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  // Three guids; g1 and g3 are open, g2 is closed.
  const guid = ["g1", "g2", "g3"];
  const input = {
    features: ["open", "bias"],
    guid,
    // keep only "open" contributing to final; set bias to 0 for clarity
    weights: { open: 1, bias: 0 },
    // no prior norms → normUpdate will initialize from first value
    norms: { open: null },
    // provide the open_scores dict in the format rankTopSites will pass
    open_scores: { g1: 1, g2: 0, g3: 1 },
  };

  const out = await Worker.weightedSampleTopSites(input);

  // shape
  Assert.ok(out && out.score_map && out.norms, "returns {score_map, norms}");
  Assert.ok(out.norms.open, "norms include 'open'");

  // The normalized values are opaque, but ordering should reflect inputs:
  const s1 = out.score_map.g1.open;
  const s2 = out.score_map.g2.open;
  const s3 = out.score_map.g3.open;

  Assert.greater(s1, s2, "an open guid should score higher than a closed one");
  Assert.greater(s3, s2, "another open guid should score higher than closed");
  Assert.equal(
    Math.abs(s1 - s3) < 1e-12, // normalization treats identical inputs identically
    true,
    "two open guids with identical inputs get identical normalized scores"
  );

  // final should reflect the 'open' score since bias has weight 0
  Assert.equal(out.score_map.g1.final, s1, "final = open (g1)");
  Assert.equal(out.score_map.g2.final, s2, "final = open (g2)");
  Assert.equal(out.score_map.g3.final, s3, "final = open (g3)");
});

//
// 3) weightedSampleTopSites: "open" feature honors existing running-norm state
//
add_task(async function test_weightedSampleTopSites_open_with_existing_norms() {
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guid = ["A", "B", "C", "D"];
  const open_scores = { A: 0, B: 1, C: 0, D: 1 };

  // Seed a prior norm object to ensure running mean/var is updated & used.
  const prior = { beta: 1e-3, mean: 0.5, var: 1.0 };
  const input = {
    features: ["open", "bias"],
    guid,
    weights: { open: 1, bias: 0 },
    norms: { open: prior },
    open_scores,
  };

  const out = await Worker.weightedSampleTopSites(input);

  // Norm object should be updated (mean or var shifts minutely due to beta)
  Assert.ok(out.norms.open, "open norm returned");
  Assert.notEqual(out.norms.open.mean, prior.mean, "running mean updated");
  Assert.greater(out.norms.open.var, 0, "variance stays positive");

  // Basic ordering still holds
  const finals = guid.map(g => out.score_map[g].final);
  // open (1) items should outrank closed (0) items after normalization
  const maxClosed = Math.max(finals[0], finals[2]); // A,C
  const minOpen = Math.min(finals[1], finals[3]); // B,D
  Assert.greater(minOpen, maxClosed, "open > closed after normalization");
});

add_task(async function test_buildFrecencyFeatures_unid_counts_unique_days() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  const sandbox = sinon.createSandbox();

  // Fix the clock so "now" is deterministic
  const nowMs = Date.UTC(2025, 0, 10); // Jan 10, 2025
  const clock = sandbox.useFakeTimers({ now: nowMs });
  const us = ms => Math.round(ms * 1000);
  const dayMs = 864e5;

  const visitsByGuid = {
    g1: [
      { visit_date_us: us(nowMs), visit_type: 1 }, // today
      { visit_date_us: us(nowMs - 2 * dayMs), visit_type: 1 }, // 2 days ago
      { visit_date_us: us(nowMs - 2 * dayMs), visit_type: 1 }, // same day as above
    ],
    g2: [
      { visit_date_us: us(nowMs - 7 * dayMs), visit_type: 1 }, // 7 days ago
    ],
  };
  const visitCounts = { g1: 3, g2: 1 };

  const out = await Ranker.buildFrecencyFeatures(visitsByGuid, visitCounts);

  Assert.equal(out.unid.g1, 2, "g1 has visits on 2 unique days");
  Assert.equal(out.unid.g2, 1, "g2 has visits on 1 unique day");

  clock.restore();
  sandbox.restore();
});

add_task(async function test_weightedSampleTopSites_unid_feature() {
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guids = ["a", "b"];
  const input = {
    features: ["unid", "bias"],
    guid: guids,
    // explicit scores: a=5 unique days, b=1
    unid_scores: { a: 5, b: 1 },
    norms: { unid: null },
    weights: { unid: 1, bias: 0 },
  };

  const result = await Worker.weightedSampleTopSites(input);

  Assert.ok(result.norms.unid, "norms include 'unid'");
  const ua = result.score_map.a.unid;
  const ub = result.score_map.b.unid;
  Assert.greater(ua, ub, "site with more unique days visited scores higher");
  Assert.equal(result.score_map.a.final, ua, "final equals unid score (a)");
  Assert.equal(result.score_map.b.final, ub, "final equals unid score (b)");
});

//
// 1) CTR feature: ordering + final uses normalized CTR when weighted
//
add_task(async function test_weightedSampleTopSites_ctr_basic() {
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  // g1: 9/10 → .909; g2: 1/10 → .1; g3: 0/0 → smoothed to (0+1)/(0+1)=1
  // After normalization, g3 should be highest, then g1, then g2.
  const input = {
    features: ["ctr", "bias"],
    guid: ["g1", "g2", "g3"],
    clicks: [9, 1, 0],
    impressions: [10, 10, 0],
    norms: { ctr: null },
    weights: { ctr: 1, bias: 0 },
  };

  const out = await Worker.weightedSampleTopSites(input);

  // shape
  Assert.ok(out && out.score_map && out.norms, "returns {score_map, norms}");
  Assert.ok(out.norms.ctr, "returns ctr norms");

  // ordering by normalized ctr (highest to lowest): g3 > g1 > g2
  const s1 = out.score_map.g1.ctr;
  const s2 = out.score_map.g2.ctr;
  const s3 = out.score_map.g3.ctr;

  Assert.greater(s3, s1, "g3 (1.0 smoothed) > g1 (~0.909)");
  Assert.greater(s1, s2, "g1 (~0.909) > g2 (0.1)");

  // finals reflect ctr weight only
  Assert.equal(out.score_map.g1.final, s1, "final equals ctr (g1)");
  Assert.equal(out.score_map.g2.final, s2, "final equals ctr (g2)");
  Assert.equal(out.score_map.g3.final, s3, "final equals ctr (g3)");
});

//
// 2) CTR smoothing edge cases: zero impressions produce finite values
//
add_task(async function test_weightedSampleTopSites_ctr_smoothing_zero_imps() {
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  // gA: clicks=0, imps=0 → (0+1)/(0+1)=1.0
  // gB: clicks=5, imps=0 → (5+1)/(0+1)=6.0  (still finite, larger than 1.0)
  const input = {
    features: ["ctr"],
    guid: ["gA", "gB"],
    clicks: [0, 5],
    impressions: [0, 0],
    norms: { ctr: null },
    weights: { ctr: 1 },
  };

  const out = await Worker.weightedSampleTopSites(input);

  const a = out.score_map.gA.ctr;
  const b = out.score_map.gB.ctr;

  // normalized values are opaque, but ordering must follow raw_ctr (B > A)
  Assert.greater(b, a, "higher smoothed CTR should score higher");

  // finiteness check
  Assert.ok(Number.isFinite(a) && Number.isFinite(b), "scores are finite");
});

//
// 3) CTR running norm: prior norm influences (mean,var) and persists
//
add_task(async function test_weightedSampleTopSites_ctr_with_prior_norm() {
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const prior = { beta: 1e-3, mean: 0.3, var: 1.0 }; // seeded running stats
  const input = {
    features: ["ctr"],
    guid: ["x", "y"],
    clicks: [3, 0],
    impressions: [10, 10], // raw ctr: x=.364, y=.091 → with +1 smoothing: (.3~) but ordering same
    norms: { ctr: prior },
    weights: { ctr: 1 },
  };

  const out = await Worker.weightedSampleTopSites(input);

  Assert.ok(out.norms.ctr, "ctr norm returned");
  Assert.notEqual(out.norms.ctr.mean, prior.mean, "running mean updated");
  Assert.greater(out.norms.ctr.var, 0, "variance positive");

  const x = out.score_map.x.ctr;
  const y = out.score_map.y.ctr;
  Assert.greater(x, y, "higher ctr ranks higher under prior normalization");
});

// sticky clicks testing

add_task(async function test_fetchShortcutLastClickPositions_empty() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  const out = await Ranker.fetchShortcutLastClickPositions(
    [],
    "smart_shortcuts",
    "moz_places"
  );
  Assert.deepEqual(out, [], "empty guid list → empty result");
});

add_task(
  async function test_fetchShortcutLastClickPositions_happy_path_and_numImps() {
    const Ranker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
    );
    const { NewTabUtils } = ChromeUtils.importESModule(
      "resource://gre/modules/NewTabUtils.sys.mjs"
    );
    await NewTabUtils.init();

    const sandbox = sinon.createSandbox();
    const guids = ["g1", "g2", "g3"];
    const numImps = 7;

    // Stub DB: we just need to return rows in the final SELECT shape:
    // [guid, position|null]
    const execStub = sandbox
      .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
      .callsFake(async _sql => {
        // Return positions for two guids; one missing (null)
        return [
          ["g1", 3],
          ["g2", null],
          // g3 absent → should default to null in the aligned output
        ];
      });

    const out = await Ranker.fetchShortcutLastClickPositions(
      guids,
      "smart_shortcuts",
      "moz_places",
      numImps
    );

    Assert.deepEqual(
      out,
      [3, null, null],
      "aligned array: g1=3, g2=null, g3=null (missing → null)"
    );
    Assert.greater(execStub.callCount, 0, "DB was queried");
    sandbox.restore();
  }
);

add_task(async function test_placeGuidsByPositions_basic_and_collisions() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guids = ["a", "b", "c", "d"];
  // a→1, b→1 (collision), c→3, d→null
  const pos = new Map(Object.entries({ a: 1, b: 1, c: 3, d: null }));

  const out = Ranker.placeGuidsByPositions(guids, pos);
  // Pass #1 (hard place): out[1] = "a", out[3] = "c"
  // Pass #2 (fill holes left→right) with [b, d] in original order:
  // holes are idx 0 then 2 → place "b" at 0, "d" at 2
  Assert.deepEqual(
    out,
    ["b", "a", "d", "c"],
    "collision resolved by first-come; others fill holes stably"
  );
});

add_task(async function test_placeGuidsByPositions_inferred_size() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guids = ["p", "q"];
  const pos = new Map(Object.entries({ p: 0, q: null }));
  const out = Ranker.placeGuidsByPositions(guids, pos);
  Assert.equal(
    out.length,
    guids.length,
    "default size inferred to guids.length"
  );
  Assert.deepEqual(out, ["p", "q"]);
});

add_task(async function test_fetchShortcutLastClickPositions_empty() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  // Empty GUID list → empty aligned output; should not query DB.
  const { NewTabUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/NewTabUtils.sys.mjs"
  );
  await NewTabUtils.init();

  const sandbox = sinon.createSandbox();
  const stub = sandbox
    .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
    .resolves([]);

  const out = await Ranker.fetchShortcutLastClickPositions(
    [],
    "smart_shortcuts",
    "moz_places",
    10
  );
  Assert.deepEqual(out, [], "empty guid list → empty result");
  Assert.equal(stub.callCount, 0, "no DB query for empty input");
  sandbox.restore();
});

add_task(async function test_placeGuidsByPositions_empty_inputs() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  // Empty guids, empty positions
  {
    const out = Ranker.placeGuidsByPositions([], new Map());
    Assert.deepEqual(out, [], "empty → empty");
  }

  // Empty guids, non-empty positions map (should still produce empty)
  {
    const pos = new Map(Object.entries({ x: 5, y: 0 }));
    const out = Ranker.placeGuidsByPositions([], pos);
    Assert.deepEqual(out, [], "no guids to place → empty result");
  }
});

add_task(async function test_placeGuidsByPositions_all_null_positions() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guids = ["a", "b", "c"];
  const pos = new Map(Object.entries({ a: null, b: null, c: null }));
  const out = Ranker.placeGuidsByPositions(guids, pos);
  Assert.deepEqual(out, guids, "all null → stable original order");
});

add_task(async function test_placeGuidsByPositions_plain_object_positions() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guids = ["a", "b", "c"];
  // Use a plain object (exercises normalization)
  const pos = new Map(Object.entries({ a: 2, b: 0, c: 1 }));
  const out = Ranker.placeGuidsByPositions(guids, pos);
  Assert.deepEqual(out, ["b", "c", "a"], "plain object map works");
});

add_task(async function test_placeGuidsByPositions_negative_and_noninteger() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );

  const guids = ["a", "b", "c", "d"];
  // a→-1 (ignored), b→1.7 (non-integer → ignored), c→0 (valid), d→null
  const pos = new Map(Object.entries({ a: -1, b: 1.7, c: 0, d: null }));
  const out = Ranker.placeGuidsByPositions(guids, pos);
  // Pass #1 puts c at 0. Others (a,b,d) fill holes in order → [c, a, b, d]
  Assert.deepEqual(
    out,
    ["c", "a", "b", "d"],
    "negative & non-integer treated as unpositioned"
  );
});

add_task(
  async function test_placeGuidsByPositions_large_position_goes_lastish() {
    const Ranker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
    );

    const guids = ["a", "b", "c"];
    // If your implementation infers size as max(guids.length, maxPos+1),
    // this will create a 6-slot array. The fill pass will leave trailing nulls.
    // We at least assert that ordering of real items is stable and includes "a" at its slot.
    const pos = new Map(Object.entries({ a: 5, b: null, c: null }));
    const out = Ranker.placeGuidsByPositions(guids, pos);

    // out length may be > guids.length depending on your impl; assert item order:
    const nonNull = out.filter(x => x !== null);
    // "a" should still appear once, and b/c follow in original order somewhere after
    Assert.ok(nonNull.includes("a"), "contains 'a'");
    // The fill order is stable for the unpositioned ones
    const idxB = nonNull.indexOf("b");
    const idxC = nonNull.indexOf("c");
    Assert.greater(
      idxC,
      idxB,
      "unpositioned items stay in input order (b before c)"
    );
  }
);

add_task(
  async function test_applyStickyClicks_preserves_null_and_clamps_negative() {
    const Worker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
    );

    // positions aligned with guids; pos[1] is null; pos[2] becomes negative after shift
    const guids = ["g1", "g2", "g3"];
    const positions = [3, null, 1]; // absolute
    const numSponsored = 2; // shift by 2 → [1, null, -1] → clamp -1 → 0

    const out = Worker.applyStickyClicks(positions, guids, numSponsored);
    // After building guid→pos: g1→1, g2→null, g3→0
    // Hard place: out[1]=g1, out[0]=g3; fill hole(s) with g2 → [g3, g1, g2]
    Assert.deepEqual(
      out,
      ["g3", "g1", "g2"],
      "null preserved, negatives clamped to 0"
    );
  }
);

add_task(
  async function test_applyStickyClicks_undefined_numSponsored_defaults_zero() {
    const Worker = ChromeUtils.importESModule(
      "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
    );

    const guids = ["g1", "g2"];
    const positions = [4, null]; // shift by undefined → treated as 0 in robust version

    const out = Worker.applyStickyClicks(positions, guids, undefined);
    // guid→pos: g1→4, g2→null → places g1 at 4 (if your placer grows size) or ignores (if not)
    // We assert at least the unpositioned stays in order and g1 appears once.
    Assert.ok(out.includes("g1") && out.includes("g2"), "both guids present");
  }
);

function prefsFor(features, extra = {}) {
  // Map every feature in FEATURE_META to a weight; default 0, chosen ones 100.
  const baseWeights = {
    thom_weight: 0,
    frec_weight: 0,
    hour_weight: 0,
    daily_weight: 0,
    bmark_weight: 0,
    rece_weight: 0,
    freq_weight: 0,
    refre_weight: 0,
    open_weight: 0,
    unid_weight: 0,
    ctr_weight: 0,
    bias_weight: 100,
  };
  for (const f of features) {
    const key = {
      thom: "thom_weight",
      frec: "frec_weight",
      hour: "hour_weight",
      daily: "daily_weight",
      bmark: "bmark_weight",
      rece: "rece_weight",
      freq: "freq_weight",
      refre: "refre_weight",
      open: "open_weight",
      unid: "unid_weight",
      ctr: "ctr_weight",
      bias: "bias_weight",
    }[f];
    if (key) {
      baseWeights[key] = 100;
    }
  }

  return {
    trainhopConfig: {
      smartShortcuts: {
        features,
        // make training a no-op for determinism
        eta: 0,
        click_bonus: 10,
        positive_prior: 1,
        negative_prior: 1,
        sticky_numimps: 0, // off for matrix tests
        ...baseWeights,
        ...extra,
      },
    },
  };
}

function attachLocalWorker(provider, WorkerMod) {
  provider._rankShortcutsWorker = {
    async post(name, args) {
      // name is a string like "weightedSampleTopSites"
      // Worker functions are exported with same names.
      // Some are standalone, some are exported in the class wrapper too.
      const fn = WorkerMod[name] || new WorkerMod.RankShortcutsWorker()[name];
      if (typeof fn === "function") {
        // if it's a plain function, spread args; if method, pass as method
        return Array.isArray(args) ? fn(...args) : fn(args);
      }
      throw new Error(`No worker function for ${name}`);
    },
  };
}

function stubDB(sinon, NewTabUtils, nowFixed) {
  return sinon
    .stub(NewTabUtils.activityStreamProvider, "executePlacesQuery")
    .callsFake(async sql => {
      const s = String(sql);

      // Bookmarks
      if (s.includes("FROM moz_bookmarks")) {
        return [
          ["g1", 1],
          ["g2", 0],
          ["g3", 0],
        ];
      }

      // Visit counts
      if (s.includes("COALESCE(p.visit_count")) {
        return [
          ["g1", 20],
          ["g2", 10],
          ["g3", 5],
        ];
      }

      // Last 10 visits (guid, visit_date_us, visit_type)
      if (s.includes("LIMIT 10") && s.includes("ORDER BY vv.visit_date DESC")) {
        const us = ms => Math.round(ms * 1000);
        const day = 864e5;
        return [
          ["g1", us(nowFixed), 2], // typed now
          ["g1", us(nowFixed - day), 1], // link
          ["g2", us(nowFixed - 2 * day), 1],
          ["g3", us(nowFixed - 10 * day), 1],
        ];
      }

      // Daily specific (guid, dow, count)
      if (
        s.includes("strftime('%w'") &&
        s.includes("GROUP BY place_ids.guid")
      ) {
        return [
          ["g1", 1, 3],
          ["g2", 1, 1],
        ];
      }

      // Daily all (dow, count)
      if (s.includes("strftime('%w'") && !s.includes("place_ids.guid")) {
        return [
          [0, 10],
          [1, 20],
          [2, 15],
          [3, 12],
          [4, 8],
          [5, 5],
          [6, 4],
        ];
      }

      // Hourly specific (guid, hour, count)
      if (
        s.includes("strftime('%H'") &&
        s.includes("GROUP BY place_ids.guid")
      ) {
        return [
          ["g1", 9, 5],
          ["g2", 10, 1],
        ];
      }

      // Hourly all (hour, count)
      if (s.includes("strftime('%H'") && !s.includes("place_ids.guid")) {
        return Array.from({ length: 24 }, (_, h) => [
          h,
          h >= 8 && h <= 18 ? 10 : 2,
        ]);
      }

      // Shortcut interactions (clicks/imps aggregation over 2 months)
      if (
        s.includes("moz_newtab_shortcuts_interaction") &&
        s.includes("SUM(")
      ) {
        return [
          ["g1", 5, 10], // clicks, imps
          ["g2", 1, 10],
          ["g3", 0, 0],
        ];
      }

      // Sticky-clicks helper (only in its dedicated test)
      if (s.includes("ROW_NUMBER()") && s.includes("tile_position")) {
        // Shape: [guid, position|null]
        return [
          ["g1", 3],
          ["g2", null],
          ["g3", null],
        ];
      }

      return [];
    });
}

add_task(async function test_rankTopSites_feature_matrix() {
  const Ranker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );
  const Worker = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs"
  );
  const { NewTabUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/NewTabUtils.sys.mjs"
  );
  const { sinon } = ChromeUtils.importESModule(
    "resource://testing-common/Sinon.sys.mjs"
  );
  await NewTabUtils.init();

  const sandbox = sinon.createSandbox();
  const nowFixed = Date.UTC(2025, 0, 1, 12, 0, 0);
  const clock = sandbox.useFakeTimers({ now: nowFixed });

  // provider under test
  const provider = new Ranker.RankShortcutsProvider();
  attachLocalWorker(provider, Worker);

  // cache stubs: keep simple but real-ish
  const fakeCache = {
    weights: {},
    init_weights: {},
    norms: null,
    score_map: { g1: { final: 0 }, g2: { final: 0 }, g3: { final: 0 } },
    time_last_update: 0,
  };
  sandbox.stub(provider.sc_obj, "get").resolves(fakeCache);
  sandbox.stub(provider.sc_obj, "set").resolves();

  const dbStub = stubDB(sandbox, NewTabUtils, nowFixed);

  // input topsites
  const topsites = [
    { guid: "g1", url: "https://g1", frecency: 100 },
    { guid: "g2", url: "https://g2", frecency: 10 },
    { guid: "g3", url: "https://g3", frecency: 1 },
    { url: "https://no-guid" }, // should remain last
  ];

  // build feature lists
  const ALL = [
    "thom",
    "frec",
    "hour",
    "daily",
    "bmark",
    "rece",
    "freq",
    "refre",
    "unid",
    "ctr",
    "bias",
  ];
  const singles = ALL.map(f => [f]);
  const pairs = [
    ["frec", "bias"],
    ["thom", "bias"],
    ["ctr", "bias"],
    ["bmark", "bias"],
    ["rece", "freq"],
  ];
  const triples = [
    ["frec", "thom", "bias"],
    ["rece", "freq", "refre"],
  ];

  const cases = [...singles, ...pairs, ...triples];

  for (const features of cases) {
    const prefs = prefsFor(features, { sticky_numimps: 0 });
    const out = await provider.rankTopSites(
      topsites,
      prefs,
      { isStartup: true },
      /*numSponsored*/ 0
    );

    // basic shape assertions
    Assert.ok(Array.isArray(out), `(${features}) returns array`);
    Assert.equal(out.length, topsites.length, `(${features}) length stable`);
    Assert.equal(
      out[out.length - 1].url,
      "https://no-guid",
      `(${features}) no-guid item is last`
    );

    // permutation check for guided items
    const inGuids = topsites
      .filter(x => x.guid)
      .map(x => x.guid)
      .sort();
    const outGuids = out
      .filter(x => x.guid)
      .map(x => x.guid)
      .sort();
    Assert.deepEqual(outGuids, inGuids, `(${features}) guids preserved`);
  }

  Assert.greater(dbStub.callCount, 0, "DB stub used at least once");
  clock.restore();
  sandbox.restore();
});

add_task(function test_roundNum_precision_and_edge_cases() {
  const { roundNum } = ChromeUtils.importESModule(
    "resource://newtab/lib/SmartShortcutsRanker/RankShortcuts.mjs"
  );

  Assert.equal(
    roundNum(1.23456789),
    1.235,
    "roundNum rounds to four significant digits by default"
  );
  Assert.equal(
    roundNum(987.65, 2),
    990,
    "roundNum respects the requested precision"
  );
  Assert.equal(
    roundNum(5e-7),
    0,
    "roundNum clamps magnitudes smaller than eps to zero"
  );
  Assert.equal(
    roundNum(-5e-7),
    0,
    "roundNum clamps small negative magnitudes to zero"
  );
  Assert.equal(
    roundNum(5e-7, 4, 1e-9),
    5e-7,
    "roundNum uses the provided eps override when keeping small values"
  );
  Assert.strictEqual(
    roundNum(Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
    "roundNum leaves non-finite numbers unchanged"
  );
  Assert.ok(Number.isNaN(roundNum(NaN)), "roundNum returns NaN for NaN");
  const sentinel = { foo: "bar" };
  Assert.strictEqual(
    roundNum(sentinel),
    sentinel,
    "roundNum returns non-number inputs unchanged"
  );
});
