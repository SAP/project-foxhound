/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { SmartTabGroupingManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabbrowser/SmartTabGrouping.sys.mjs"
);

add_task(function test_logistic_regression_get_base_domain() {
  // Basic HTTPS URL with www
  Assert.equal(
    SmartTabGroupingManager.getBaseDomain("https://www.example.com/path"),
    "example.com",
    "www.example.com should normalize to example.com"
  );

  // Multiple subdomains
  Assert.equal(
    SmartTabGroupingManager.getBaseDomain("https://docs.example.com"),
    "docs.example.com",
    "Should keep last subdomain + baseDomain"
  );

  // Hosted services like blogs
  Assert.equal(
    SmartTabGroupingManager.getBaseDomain("https://myblog.example.com/"),
    "myblog.example.com",
    "Should bucket per hosted subdomain (blog, docs, etc.)"
  );

  // Host without dots
  Assert.equal(
    SmartTabGroupingManager.getBaseDomain("http://localhost"),
    "localhost",
    "Should return hostname as-is when there is no dot"
  );

  // Invalid / empty URL should be handled gracefully
  Assert.equal(
    SmartTabGroupingManager.getBaseDomain(""),
    "",
    "Invalid URL should return empty string"
  );
});

add_task(function test_logistic_regression_domain_match_fractions() {
  const mgr = new SmartTabGroupingManager();

  const anchors = [
    { url: "https://a.com/foo" },
    { url: "https://www.a.com/bar" },
    { url: "https://b.com/baz" },
  ];
  const candidates = [
    { url: "https://a.com/other" }, // matches 2 of 3 anchors
    { url: "https://b.com/other" }, // matches 1 of 3 anchors
    { url: "https://c.com/other" }, // matches 0 of 3 anchors
    { url: "" }, // invalid / empty URL
  ];

  const fractions = mgr.getDomainMatchFractions(anchors, candidates);

  Assert.equal(
    fractions.length,
    candidates.length,
    "Should return one value per candidate"
  );

  Assert.less(
    Math.abs(fractions[0] - 2 / 3),
    1e-6,
    "Candidate with domain matching two of three anchors should have fraction 2/3"
  );

  Assert.less(
    Math.abs(fractions[1] - 1 / 3),
    1e-6,
    "Candidate with domain matching one of three anchors should have fraction 1/3"
  );

  Assert.equal(
    fractions[2],
    0,
    "Candidate with domain not matching any anchor should have fraction 0"
  );

  Assert.equal(
    fractions[3],
    0,
    "Candidate with invalid URL should have fraction 0"
  );
});

add_task(function test_logistic_regression_get_max_similarity() {
  const mgr = new SmartTabGroupingManager();

  const anchors = [
    [1, 0],
    [0, 1],
  ];
  const candidates = [
    [1, 0], // identical to first anchor -> cos ~ 1
    [0.5, 0.5], // at 45 degrees -> cos ~ 0.707 with either anchor
  ];

  const maxSims = mgr.getMaxSimilarity(anchors, candidates);

  Assert.equal(
    maxSims.length,
    candidates.length,
    "Should return one max similarity per candidate"
  );

  Assert.less(
    Math.abs(maxSims[0] - 1),
    1e-6,
    "First candidate identical to first anchor should have cosine similarity ~1"
  );

  Assert.ok(
    maxSims[1] > 0.7 && maxSims[1] < 0.8,
    "Second candidate should have cosine similarity ~sqrt(1/2) ≈ 0.707 with at least one anchor"
  );
});

add_task(function test_logistic_regression_sigmoid_and_calculate_probability() {
  const mgr = new SmartTabGroupingManager();

  // Basic sigmoid sanity checks
  Assert.less(Math.abs(mgr.sigmoid(0) - 0.5), 1e-6, "sigmoid(0) should be 0.5");

  Assert.greater(
    mgr.sigmoid(10),
    0.99,
    "sigmoid of large positive number should be close to 1"
  );

  Assert.less(
    mgr.sigmoid(-10),
    0.01,
    "sigmoid of large negative number should be close to 0"
  );

  // Check that calculateProbability matches explicit linear combination + sigmoid
  const params = {
    GROUP_SIMILARITY_WEIGHT: 1,
    TITLE_SIMILARITY_WEIGHT: 2,
    DOMAIN_SIMILARITY_WEIGHT: 3,
    INTERCEPT: 0,
  };

  const s_gc = 0.5;
  const s_tt = 0.5;
  const s_dd = 0.5;

  const prob = mgr.calculateProbability(s_gc, s_tt, s_dd, params);
  const expectedZ = s_gc * 1 + s_tt * 2 + s_dd * 3; // 3
  const expectedProb = mgr.sigmoid(expectedZ);

  Assert.less(
    Math.abs(prob - expectedProb),
    1e-6,
    "calculateProbability should equal sigmoid(linear combination of features and weights)"
  );
});

add_task(
  function test_logistic_regression_calculate_all_probabilities_with_group() {
    const mgr = new SmartTabGroupingManager();

    // cos = 0 for both candidates -> s_gc = s_tt_max = 0.5 for both
    const groupSimilaritiesCos = [0, 0];
    const titleSimilaritiesCos = [0, 0];

    // Candidate 0 has full domain match, candidate 1 has none.
    const domainSimilarities = [1, 0];

    const probs = mgr.calculateAllProbabilities(
      groupSimilaritiesCos,
      titleSimilaritiesCos,
      domainSimilarities
    );

    Assert.equal(
      probs.length,
      2,
      "Should return one probability per candidate"
    );

    Assert.greater(
      probs[0],
      probs[1],
      "With group present, candidate with higher domain match fraction should have higher probability"
    );
  }
);

add_task(
  function test_logistic_regression_calculate_all_probabilities_without_group() {
    const mgr = new SmartTabGroupingManager();

    // cos = 0 for both candidates -> s_tt_max = 0.5 for both
    const titleSimilaritiesCos = [0, 0];

    // Candidate 0 has full domain match, candidate 1 has none.
    const domainSimilarities = [1, 0];

    const probs = mgr.calculateAllProbabilities(
      null, // no group similarities -> TITLE_ONLY params
      titleSimilaritiesCos,
      domainSimilarities
    );

    Assert.equal(
      probs.length,
      2,
      "Should return one probability per candidate"
    );

    Assert.greater(
      probs[0],
      probs[1],
      "Without group, candidate with higher domain match fraction should have higher probability"
    );
  }
);
