/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  InferredPersonalizationFeed:
    "resource://newtab/lib/InferredPersonalizationFeed.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const AT = {
  INFERRED_PERSONALIZATION_REFRESH: "INFERRED_PERSONALIZATION_REFRESH",
  INFERRED_PERSONALIZATION_CLEAR_INTEREST_VECTOR:
    "INFERRED_PERSONALIZATION_CLEAR_INTEREST_VECTOR",
  INFERRED_PERSONALIZATION_DEBUG_FEATURES_REQUEST:
    "INFERRED_PERSONALIZATION_DEBUG_FEATURES_REQUEST",
  INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE:
    "INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE",
  INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET:
    "INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET",
};

function expectedBroadcast(type, data) {
  return {
    type,
    data,
    meta: {
      from: "ActivityStream:Main",
      to: "ActivityStream:Content",
    },
  };
}

/**
 * Test inferred personalization feed constructor from InferredPersonalizationFeed.sys.mjs.
 */
add_task(async function test_InferredPersonalizationFeed_constructor() {
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
    .returns({
      set: () => {},
      get: () => {},
    });

  let feed = new InferredPersonalizationFeed();

  ok(feed instanceof InferredPersonalizationFeed, "Feed is constructed");
  sandbox.restore();
});

/**
 * Test inferred personalization feed method clearOldDataOfTable from InferredPersonalizationFeed.sys.mjs.
 * We pass a fake placesUtils to verify the SQL query and dates are correct.
 */
add_task(async function test_clearOldDataOfTable() {
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
    .returns({
      set: () => {},
      get: () => {},
    });

  const FIXED_TIMESTAMP_MS = 1672531200000;
  sandbox.stub(InferredPersonalizationFeed.prototype, "Date").returns({
    now: () => FIXED_TIMESTAMP_MS,
  });

  const feed = new InferredPersonalizationFeed();

  let sqlUsed;
  let wrapperNameUsed;
  let wrapperCalled = 0;

  const fakePlacesUtils = {
    withConnectionWrapper: async (name, callback) => {
      wrapperCalled++;
      wrapperNameUsed = name;
      const fakeDB = {
        execute: async sql => {
          sqlUsed = sql;
          return [];
        },
      };
      return callback(fakeDB);
    },
  };

  const preserveAgeDays = 7;
  const table = "test_table";

  const expectedTimestamp =
    Math.floor(FIXED_TIMESTAMP_MS / 1000) - preserveAgeDays * 24 * 60 * 60;

  await feed.clearOldDataOfTable(preserveAgeDays, table, fakePlacesUtils);
  const expectedSQL = `DELETE FROM ${table}
      WHERE timestamp_s < ${expectedTimestamp}`;

  equal(wrapperCalled, 1, "withConnectionWrapper was called once");
  ok(
    wrapperNameUsed.includes("clearOldDataOfTable"),
    "withConnectionWrapper name includes clearOldDataOfTable"
  );
  equal(
    sqlUsed.replace(/\s+/g, " ").trim(),
    expectedSQL.replace(/\s+/g, " ").trim(),
    "SQL query is as expected"
  );

  sandbox.restore();
});

const TEST_MODEL_DATA = {
  model_type: "clicks",
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    news_reader: {
      features: { pub_nytimes_com: 0.5, pub_cnn_com: 0.5 },
      thresholds: [0.3, 0.4],
      diff_p: 1,
      diff_q: 0,
    },
    parenting: {
      features: { parenting: 1 },
      thresholds: [0.3, 0.4],
      diff_p: 1,
      diff_q: 0,
    },
    clicks: {
      features: { click: 1 },
      thresholds: [10, 30],
      diff_p: 1,
      diff_q: 0,
    },
  },
};

add_task(
  async function test_getDebuggingInterestFeaturesSupported_noModelData() {
    const sandbox = sinon.createSandbox();
    const fakeCache = {
      set: sandbox.stub().resolves(),
      get: sandbox.stub().resolves(null),
    };
    sandbox
      .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
      .returns(fakeCache);

    const feed = new InferredPersonalizationFeed();
    sandbox.stub(feed, "getInferredModelData").resolves(null);

    const result = await feed.getDebuggingInterestFeaturesSupported();

    deepEqual(result, {}, "Returns empty object when no model data");

    sandbox.restore();
  }
);

add_task(async function test_setAndGetDebuggingInterestFeatures_integration() {
  const sandbox = sinon.createSandbox();

  let cacheStorage = {};
  const fakeCache = {
    set: sandbox.stub().callsFake((key, value) => {
      cacheStorage[key] = value;
      return Promise.resolve();
    }),
    get: sandbox.stub().callsFake(key => {
      return Promise.resolve(cacheStorage[key] || null);
    }),
  };
  sandbox
    .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
    .returns(fakeCache);

  const feed = new InferredPersonalizationFeed();

  const mockModelData = {
    model_id: "test_model",
    model_data: TEST_MODEL_DATA,
    getInterestFeaturesSupported() {
      return {
        news_reader: { numValues: 3 },
        parenting: { numValues: 3 },
        clicks: { numValues: 3 },
      };
    },
  };

  const mockInterestVector = {
    data: {
      coarseInferredInterests: {
        news_reader: 1,
        parenting: 2,
      },
    },
  };

  sandbox.stub(feed, "getInferredModelData").resolves(mockModelData);
  cacheStorage.interest_vector = mockInterestVector;

  const resultBefore = await feed.getDebuggingInterestFeaturesSupported();

  equal(
    resultBefore.news_reader.currentValue,
    1,
    "Initial news_reader currentValue is 1"
  );
  equal(
    resultBefore.news_reader.overrideValue,
    undefined,
    "Initially no override for news_reader"
  );
  equal(
    resultBefore.parenting.currentValue,
    2,
    "Initial parenting currentValue is 2"
  );
  equal(
    resultBefore.parenting.overrideValue,
    undefined,
    "Initially no override for parenting"
  );

  const overrides = {
    news_reader: 0,
    parenting: 3,
    clicks: 2,
  };
  await feed.setDebuggingInterestFeaturesOverride(overrides);

  const resultAfter = await feed.getDebuggingInterestFeaturesSupported();

  equal(
    resultAfter.news_reader.currentValue,
    1,
    "news_reader currentValue unchanged"
  );
  equal(
    resultAfter.news_reader.overrideValue,
    0,
    "news_reader now has overrideValue of 0"
  );
  equal(
    resultAfter.parenting.currentValue,
    2,
    "parenting currentValue unchanged"
  );
  equal(
    resultAfter.parenting.overrideValue,
    3,
    "parenting now has overrideValue of 3"
  );
  equal(
    resultAfter.clicks.currentValue,
    undefined,
    "clicks has no currentValue"
  );
  equal(
    resultAfter.clicks.overrideValue,
    2,
    "clicks now has overrideValue of 2"
  );

  await feed.setDebuggingInterestFeaturesOverride(null);

  const resultCleared = await feed.getDebuggingInterestFeaturesSupported();

  equal(
    resultCleared.news_reader.currentValue,
    1,
    "news_reader currentValue still present after clearing"
  );
  equal(
    resultCleared.news_reader.overrideValue,
    undefined,
    "news_reader overrideValue cleared"
  );
  equal(
    resultCleared.parenting.overrideValue,
    undefined,
    "parenting overrideValue cleared"
  );
  equal(
    resultCleared.clicks.overrideValue,
    undefined,
    "clicks overrideValue cleared"
  );

  sandbox.restore();
});

add_task(
  async function test_onAction_refresh_reloads_and_broadcasts_features() {
    const sandbox = sinon.createSandbox();
    sandbox
      .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
      .returns({
        set: () => {},
        get: () => {},
      });

    const feed = new InferredPersonalizationFeed();
    const dispatch = sandbox.stub();
    feed.store = {
      dispatch,
      getState: () => ({
        Prefs: {
          values: {
            "discoverystream.sections.personalization.inferred.user.enabled": true,
            "discoverystream.sections.personalization.inferred.enabled": true,
          },
        },
      }),
    };
    const features = { arts: { numValues: 4, currentValue: 1 } };
    const resetStub = sandbox.stub(feed, "reset").resolves();
    const loadStub = sandbox.stub(feed, "loadInterestVector").resolves();
    sandbox
      .stub(feed, "getDebuggingInterestFeaturesSupported")
      .resolves(features);

    await feed.onAction({ type: AT.INFERRED_PERSONALIZATION_REFRESH });

    Assert.equal(
      resetStub.callCount,
      1,
      "Refresh clears previous cached values"
    );
    Assert.equal(loadStub.callCount, 1, "Refresh recomputes inferred values");
    deepEqual(
      dispatch.lastCall.args[0],
      expectedBroadcast(
        AT.INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE,
        features
      ),
      "Refresh broadcasts debug features after recompute"
    );

    sandbox.restore();
  }
);

add_task(
  async function test_onAction_debug_features_request_broadcasts_features() {
    const sandbox = sinon.createSandbox();
    sandbox
      .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
      .returns({
        set: () => {},
        get: () => {},
      });

    const feed = new InferredPersonalizationFeed();
    const dispatch = sandbox.stub();
    feed.store = { dispatch, getState: () => ({ Prefs: { values: {} } }) };
    const features = { arts: { numValues: 4, currentValue: 1 } };
    sandbox
      .stub(feed, "getDebuggingInterestFeaturesSupported")
      .resolves(features);

    await feed.onAction({
      type: AT.INFERRED_PERSONALIZATION_DEBUG_FEATURES_REQUEST,
    });

    deepEqual(
      dispatch.lastCall.args[0],
      expectedBroadcast(
        AT.INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE,
        features
      ),
      "Debug feature request broadcasts current debug metadata"
    );

    sandbox.restore();
  }
);

add_task(
  async function test_onAction_debug_overrides_set_stores_and_rebroadcasts() {
    const sandbox = sinon.createSandbox();
    sandbox
      .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
      .returns({
        set: () => {},
        get: () => {},
      });

    const feed = new InferredPersonalizationFeed();
    const dispatch = sandbox.stub();
    feed.store = { dispatch, getState: () => ({ Prefs: { values: {} } }) };
    const overrides = { arts: 2, sports: 1 };
    const features = {
      arts: { numValues: 4, currentValue: 1, overrideValue: 2 },
      sports: { numValues: 4, currentValue: 0, overrideValue: 1 },
    };
    const setStub = sandbox
      .stub(feed, "setDebuggingInterestFeaturesOverride")
      .resolves();
    sandbox
      .stub(feed, "getDebuggingInterestFeaturesSupported")
      .resolves(features);

    await feed.onAction({
      type: AT.INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET,
      data: overrides,
    });

    Assert.equal(
      setStub.callCount,
      1,
      "Overrides action stores override payload"
    );
    deepEqual(
      setStub.firstCall.args[0],
      overrides,
      "Overrides are passed through to storage method"
    );
    deepEqual(
      dispatch.lastCall.args[0],
      expectedBroadcast(
        AT.INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE,
        features
      ),
      "Setting overrides rebroadcasts updated debug metadata"
    );

    sandbox.restore();
  }
);

// computeAverageCTRFromTopics tests
// The function and its dependencies are lazily imported inside each test to
// avoid eager module load failures in the xpcshell test environment.

add_task(function test_computeAverageCTRFromTopics_basic() {
  const { computeAverageCTRFromTopics } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredPersonalizationFeed.sys.mjs"
  );
  const { AggregateResultKeys } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredModel/InferredConstants.sys.mjs"
  );
  const schema = {
    [AggregateResultKeys.FEATURE]: 0,
    [AggregateResultKeys.FORMAT_ENUM]: 1,
    [AggregateResultKeys.VALUE]: 2,
  };

  const clickIntervals = [
    [
      ["t_food", 0, 10],
      ["t_sports", 0, 5],
      ["unknown_feature", 0, 100],
    ],
  ];
  const impressionIntervals = [
    [
      ["t_food", 0, 200],
      ["t_sports", 0, 100],
      ["unknown_feature", 0, 50],
    ],
  ];

  const avg = computeAverageCTRFromTopics(
    clickIntervals,
    impressionIntervals,
    schema
  );

  // topic clicks = 10+5 = 15, topic impressions = 200+100 = 300
  Assert.less(
    Math.abs(avg - 0.05),
    0.001,
    `Average CTR from known topics only: ${avg}`
  );
});

add_task(function test_computeAverageCTRFromTopics_noTopics() {
  const { computeAverageCTRFromTopics } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredPersonalizationFeed.sys.mjs"
  );
  const { AggregateResultKeys } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredModel/InferredConstants.sys.mjs"
  );
  const schema = {
    [AggregateResultKeys.FEATURE]: 0,
    [AggregateResultKeys.FORMAT_ENUM]: 1,
    [AggregateResultKeys.VALUE]: 2,
  };

  const clickIntervals = [[["unknown_a", 0, 10]]];
  const impressionIntervals = [[["unknown_a", 0, 200]]];

  const avg = computeAverageCTRFromTopics(
    clickIntervals,
    impressionIntervals,
    schema
  );

  Assert.equal(avg, 0.002, "No known topics returns DEFAULT_USER_CTR");
});

add_task(function test_computeAverageCTRFromTopics_zeroImpressions() {
  const { computeAverageCTRFromTopics } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredPersonalizationFeed.sys.mjs"
  );
  const { AggregateResultKeys } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredModel/InferredConstants.sys.mjs"
  );
  const schema = {
    [AggregateResultKeys.FEATURE]: 0,
    [AggregateResultKeys.FORMAT_ENUM]: 1,
    [AggregateResultKeys.VALUE]: 2,
  };

  const clickIntervals = [[["t_food", 0, 0]]];
  const impressionIntervals = [[["t_food", 0, 0]]];

  const avg = computeAverageCTRFromTopics(
    clickIntervals,
    impressionIntervals,
    schema
  );

  Assert.equal(avg, 0.002, "Zero topic impressions returns DEFAULT_USER_CTR");
});

add_task(function test_computeAverageCTRFromTopics_multipleIntervals() {
  const { computeAverageCTRFromTopics } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredPersonalizationFeed.sys.mjs"
  );
  const { AggregateResultKeys } = ChromeUtils.importESModule(
    "resource://newtab/lib/InferredModel/InferredConstants.sys.mjs"
  );
  const schema = {
    [AggregateResultKeys.FEATURE]: 0,
    [AggregateResultKeys.FORMAT_ENUM]: 1,
    [AggregateResultKeys.VALUE]: 2,
  };

  const clickIntervals = [
    [
      ["t_food", 0, 5],
      ["t_sports", 0, 3],
    ],
    [
      ["t_food", 0, 5],
      ["t_sports", 0, 2],
    ],
  ];
  const impressionIntervals = [
    [
      ["t_food", 0, 100],
      ["t_sports", 0, 50],
    ],
    [
      ["t_food", 0, 100],
      ["t_sports", 0, 50],
    ],
  ];

  const avg = computeAverageCTRFromTopics(
    clickIntervals,
    impressionIntervals,
    schema
  );

  // topic clicks = 5+3+5+2 = 15, topic impressions = 100+50+100+50 = 300
  Assert.less(
    Math.abs(avg - 0.05),
    0.001,
    `Multiple intervals averaged correctly: ${avg}`
  );
});
add_task(async function test_onAction_clear_interest_vector_clears_cache() {
  const sandbox = sinon.createSandbox();
  const cacheSetStub = sandbox.stub().resolves();
  sandbox
    .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
    .returns({
      set: cacheSetStub,
      get: sandbox.stub().resolves(null),
    });

  const feed = new InferredPersonalizationFeed();
  feed.store = {
    dispatch: sandbox.stub(),
    getState: () => ({ Prefs: { values: {} } }),
  };

  await feed.onAction({
    type: AT.INFERRED_PERSONALIZATION_CLEAR_INTEREST_VECTOR,
  });

  Assert.equal(cacheSetStub.callCount, 1, "cache.set was called once");
  deepEqual(
    cacheSetStub.firstCall.args,
    ["interest_vector", {}],
    "Interest vector is cleared to an empty object"
  );

  sandbox.restore();
});

add_task(
  async function test_onAction_clear_interest_vector_noop_without_cache() {
    const sandbox = sinon.createSandbox();
    sandbox
      .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
      .returns(null);

    const feed = new InferredPersonalizationFeed();
    feed.cache = null;
    feed.store = {
      dispatch: sandbox.stub(),
      getState: () => ({ Prefs: { values: {} } }),
    };

    await feed.onAction({
      type: AT.INFERRED_PERSONALIZATION_CLEAR_INTEREST_VECTOR,
    });

    ok(true, "No error when cache is null");

    sandbox.restore();
  }
);
