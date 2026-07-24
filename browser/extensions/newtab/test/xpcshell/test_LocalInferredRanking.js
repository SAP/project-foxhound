"use strict";

// --- imports (adjust path if needed) ---
ChromeUtils.defineESModuleGetters(this, {
  scoreItemInferred:
    "resource://newtab/lib/InferredModel/GreedyContentRanker.mjs",
});

// ---------- scoreItemInferred tests ----------

add_task(
  async function test_scoreItemInferred_combines_normalized_local_and_server() {
    const inferredInterests = {
      parenting: 0.6, // float
      news_reader: 0.2, // float
      clicks: 2, // integer → excluded from inferred_norm
    };

    const weights = {
      local: 0.6, // 60%
      server: 0.4, // 40%
      inferred_norm: 0.8, // 0.6 + 0.2 (floats only)
    };

    const item = {
      id: "a1",
      section: "top_stories_section",
      item_score: 0,
      server_score: 0.5,
      features: { s_parenting: 1, s_news_reader: 1, other: 1 },
    };

    const ret = await scoreItemInferred(item, inferredInterests, weights);
    Assert.strictEqual(ret, item, "returns same object");

    // inferred_score = 0.6 + 0.2 = 0.8
    // score = 0.60 * 0.8 / (0.8 + 1e-6) + 0.40 * 0.5
    const expected = (0.6 * 0.8) / (0.8 + 1e-6) + 0.4 * 0.5;

    Assert.greater(item.score, 0, "score is positive");
    Assert.less(
      Math.abs(item.score - expected),
      1e-6,
      "score matches normalized formula with epsilon"
    );
    Assert.equal(item.score, item.item_score, "score mirrors item_score");
  }
);

add_task(async function test_scoreItemInferred_server_nullish_is_zero() {
  const inferredInterests = { tech: 0.8 };
  const weights = { local: 1.0, server: 0.4, inferred_norm: 0.8 };
  const item = {
    id: "a2",
    section: "top_stories_section",
    features: { s_tech: 1 },
    // merino_score is undefined → should default to 0
  };

  await scoreItemInferred(item, inferredInterests, weights);

  // inferred_score = 0.8; merino term = 0
  const expected = (1.0 * 0.8) / (0.8 + 1e-6) + 0.4 * 0;
  Assert.less(Math.abs(item.score - expected), 1e-6, "merino nullish → 0");
});
