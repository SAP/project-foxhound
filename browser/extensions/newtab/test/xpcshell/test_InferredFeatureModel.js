"use strict";

ChromeUtils.defineESModuleGetters(this, {
  FeatureModel: "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
  dictAdd: "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
  dictApply: "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
  divideDict: "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
  DayTimeWeighting: "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
  InterestFeatures: "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
  unaryEncodeDiffPrivacy:
    "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs",
});

/**
 * Compares two dictionaries up to decimalPoints decimal points
 *
 * @param {object} a
 * @param {object} b
 * @param {number} decimalPoints
 * @returns {boolean} True if vectors are similar
 */
function vectorLooseEquals(a, b, decimalPoints = 2) {
  return Object.entries(a).every(
    ([k, v]) => v.toFixed(decimalPoints) === b[k].toFixed(decimalPoints)
  );
}

add_task(function test_dictAdd() {
  let dict = {};
  dictAdd(dict, "a", 3);
  Assert.equal(dict.a, 3, "Should set value when key is missing");

  dictAdd(dict, "a", 2);
  Assert.equal(dict.a, 5, "Should add value when key exists");
});

add_task(function test_dictApply() {
  let input = { a: 1, b: 2 };
  let output = dictApply(input, x => x * 2);
  Assert.deepEqual(output, { a: 2, b: 4 }, "Should double all values");

  let identity = dictApply(input, x => x);
  Assert.deepEqual(
    identity,
    input,
    "Should return same values with identity function"
  );
});

add_task(function test_divideDict_basic() {
  const numerator = { a: 6, b: 4 };
  const denominator = { a: 2, b: 2 };
  const result = divideDict(numerator, denominator);
  Assert.deepEqual(
    result,
    { a: 3, b: 2 },
    "Basic division should correctly divide numerator by denominator"
  );
});

add_task(function test_divideDict_missingDenominator() {
  const numerator = { a: 6, b: 4 };
  const denominator = {};
  const result = divideDict(numerator, denominator);
  Assert.deepEqual(
    result,
    { a: 0, b: 0 },
    "Missing denominator keys should yield 0 for each numerator key"
  );
});

add_task(function test_divideDict_zeroDenominator() {
  const numerator = { a: 5, b: 10 };
  const denominator = { a: 0, b: 2 };
  const result = divideDict(numerator, denominator);
  Assert.deepEqual(
    result,
    { a: 0, b: 5 },
    "Zero denominator should produce 0. non-zero denominator should divide normally"
  );
});

add_task(function test_divideDict_missingNumerator() {
  const numerator = {};
  const denominator = { a: 3, b: 5 };
  const result = divideDict(numerator, denominator);
  Assert.deepEqual(
    result,
    { a: 0.0, b: 0.0 },
    "Denominator keys without numerator should yield 0.0 for each key"
  );
});

add_task(function test_DayTimeWeighting_getDateIntervals() {
  let weighting = new DayTimeWeighting([1, 2], [0.5, 0.2]);
  let now = Date.now();
  let intervals = weighting.getDateIntervals(now);

  Assert.equal(
    intervals.length,
    2,
    "Should return one interval per pastDay entry"
  );
  Assert.lessOrEqual(
    intervals[0].end,
    new Date(now),
    "Each interval end should be before or equal to now"
  );
  Assert.less(
    intervals[0].start,
    intervals[0].end,
    "Start should be before end"
  );
  Assert.lessOrEqual(
    intervals[1].end,
    new Date(now),
    "Each interval end should be before or equal to now"
  );
  Assert.less(
    intervals[1].start,
    intervals[0].end,
    "Start should be before end"
  );
});

add_task(function test_DayTimeWeighting_getRelativeWeight() {
  let weighting = new DayTimeWeighting([1, 2], [0.5, 0.2]);

  Assert.equal(
    weighting.getRelativeWeight(0),
    0.5,
    "Should return correct weight for index 0"
  );
  Assert.equal(
    weighting.getRelativeWeight(1),
    0.2,
    "Should return correct weight for index 1"
  );
  Assert.equal(
    weighting.getRelativeWeight(2),
    0,
    "Should return 0 for out-of-range index"
  );
});

add_task(function test_DayTimeWeighting_fromJSON() {
  const json = { days: [1, 2], relative_weight: [0.1, 0.3] };
  const weighting = DayTimeWeighting.fromJSON(json);

  Assert.ok(
    weighting instanceof DayTimeWeighting,
    "Should create instance from JSON"
  );
  Assert.deepEqual(
    weighting.pastDays,
    [1, 2],
    "Should correctly parse pastDays"
  );
  Assert.deepEqual(
    weighting.relativeWeight,
    [0.1, 0.3],
    "Should correctly parse relative weights"
  );
});

add_task(function test_InterestFeatures_applyThresholds() {
  let feature = new InterestFeatures("test", {}, [10, 20, 30]);
  // Note that number of output is 1 + the length of the input weights
  Assert.equal(
    feature.applyThresholds(5),
    0,
    "Value < first threshold returns 0"
  );
  Assert.equal(
    feature.applyThresholds(15),
    1,
    "Value < second threshold returns 1"
  );
  Assert.equal(
    feature.applyThresholds(25),
    2,
    "Value < third threshold returns 2"
  );
  Assert.equal(
    feature.applyThresholds(35),
    3,
    "Value >= all thresholds returns length of thresholds"
  );
  Assert.equal(
    feature.applyThresholds(15, 0),
    0,
    "Threshold is overridden by debugging value."
  );
  Assert.equal(
    feature.applyThresholds(15, 3),
    3,
    "Threshold is overridden by debugging value - top of range"
  );
  Assert.equal(
    feature.applyThresholds(15, 5),
    1,
    "Threshold is not overridden by out of range debugging value."
  );
});

add_task(function test_InterestFeatures_noThresholds() {
  let feature = new InterestFeatures("test", {});
  Assert.equal(
    feature.applyThresholds(42),
    42,
    "Without thresholds, should return input unchanged"
  );
});

add_task(function test_InterestFeatures_fromJSON() {
  const json = { features: { a: 1 }, thresholds: [1, 2] };
  const feature = InterestFeatures.fromJSON("f", json);

  Assert.ok(
    feature instanceof InterestFeatures,
    "Should create InterestFeatures from JSON"
  );
  Assert.equal(feature.name, "f", "Should set correct name");
  Assert.deepEqual(
    feature.featureWeights,
    { a: 1 },
    "Should set correct feature weights"
  );
  Assert.deepEqual(feature.thresholds, [1, 2], "Should set correct thresholds");
});

const SPECIAL_FEATURE_CLICK = "clicks";

const AggregateResultKeys = {
  POSITION: "position",
  FEATURE: "feature",
  VALUE: "feature_value",
  SECTION_POSITION: "section_position",
  FORMAT_ENUM: "card_format_enum",
};

const SCHEMA = {
  [AggregateResultKeys.FEATURE]: 0,
  [AggregateResultKeys.FORMAT_ENUM]: 1,
  [AggregateResultKeys.VALUE]: 2,
};

const jsonModelData = {
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
    [SPECIAL_FEATURE_CLICK]: {
      features: { click: 1 },
      thresholds: [10, 30],
      diff_p: 1,
      diff_q: 0,
    },
  },
};

const jsonModelDataNoCoarseSupport = {
  model_type: "clicks",
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    news_reader: {
      features: { pub_nytimes_com: 0.5, pub_cnn_com: 0.5 },
      thresholds: [],
      // MISSING thresholds
      diff_p: 1,
      diff_q: 0,
    },
    parenting: {
      features: { parenting: 1 },
      thresholds: [0.3, 0.4],
      // MISSING p,q values
    },
    [SPECIAL_FEATURE_CLICK]: {
      features: { click: 1 },
      thresholds: [10, 30],
      diff_p: 1,
      diff_q: 0,
    },
  },
};

add_task(function test_FeatureModel_fromJSON() {
  const model = FeatureModel.fromJSON(jsonModelData);
  const curTime = new Date();
  const intervals = model.getDateIntervals(curTime);
  Assert.equal(intervals.length, jsonModelData.day_time_weighting.days.length);
  for (const interval of intervals) {
    Assert.lessOrEqual(
      interval.start.getTime(),
      interval.end.getTime(),
      "Interval start and end are in correct order"
    );
    Assert.lessOrEqual(
      interval.end.getTime(),
      curTime.getTime(),
      "Interval end is not in future"
    );
  }
});

const SQL_RESULT_DATA = [
  [
    ["click", 0, 1],
    ["parenting", 0, 1],
  ],
  [
    ["click", 0, 2],
    ["parenting", 0, 1],
    ["pub_nytimes_com", 0, 1],
  ],
  [],
];

add_task(function test_modelChecks() {
  const model = FeatureModel.fromJSON(jsonModelData);
  Assert.equal(
    model.supportsCoarseInterests(),
    true,
    "Supports coarse interests check yes "
  );
  Assert.equal(
    model.supportsCoarsePrivateInterests(),
    true,
    "Supports coarse private interests check yes "
  );

  const modelNoCoarse = FeatureModel.fromJSON(jsonModelDataNoCoarseSupport);
  Assert.equal(
    modelNoCoarse.supportsCoarseInterests(),
    false,
    "Supports coarse interests check no "
  );
  Assert.equal(
    modelNoCoarse.supportsCoarsePrivateInterests(),
    false,
    "Supports coarse private interests check no "
  );
});

add_task(function test_computeInterestVectorClickModel() {
  const modelData = { ...jsonModelData, rescale: true };
  const model = FeatureModel.fromJSON(modelData);
  const result = model.computeInterestVector({
    dataForIntervals: SQL_RESULT_DATA,
    indexSchema: SCHEMA,
    applyThresholding: false,
    applyPostProcessing: true,
  });
  Assert.ok("parenting" in result, "Result should contain parenting");
  Assert.ok("news_reader" in result, "Result should contain news_reader");
  Assert.equal(result.parenting, 1.0, "Vector is rescaled");

  Assert.equal(result[SPECIAL_FEATURE_CLICK], 2, "Should include raw click");
});

add_task(function test_computeThresholds() {
  const modelData = { ...jsonModelData, rescale: true };
  const model = FeatureModel.fromJSON(modelData);
  const result = model.computeInterestVector({
    dataForIntervals: SQL_RESULT_DATA,
    indexSchema: SCHEMA,
    applyThresholding: true,
  });
  Assert.equal(result.parenting, 2, "Threshold is applied");
  Assert.equal(
    result[SPECIAL_FEATURE_CLICK],
    0,
    "Should include thresholded raw click"
  );
});

add_task(function test_unaryEncoding() {
  const numValues = 4;

  Assert.equal(
    unaryEncodeDiffPrivacy(0, numValues, 1, 0),
    "1000",
    "Basic dp works with out of range p, q"
  );
  Assert.equal(
    unaryEncodeDiffPrivacy(1, numValues, 1, 0),
    "0100",
    "Basic dp works with out of range p, q"
  );
  Assert.equal(
    unaryEncodeDiffPrivacy(500, numValues, 0.75, 0.25).length,
    4,
    "Basic dp runs with unexpected input"
  );
  Assert.equal(
    unaryEncodeDiffPrivacy(-100, numValues, 0.75, 0.25).length,
    4,
    "Basic dp runs with unexpected input"
  );
  Assert.equal(
    unaryEncodeDiffPrivacy(1, numValues, 0.75, 0.25).length,
    4,
    "Basic dp runs with typical values"
  );
  Assert.equal(
    unaryEncodeDiffPrivacy(1, numValues, 0.8, 0.6).length,
    4,
    "Basic dp runs with typical values"
  );
});

add_task(function test_differentialPrivacy() {
  const modelData = { ...jsonModelData, rescale: true };
  const model = FeatureModel.fromJSON(modelData);
  const result = model.computeInterestVector({
    dataForIntervals: SQL_RESULT_DATA,
    indexSchema: SCHEMA,
    applyThresholding: true,
    applyDifferentialPrivacy: true,
  });
  Assert.equal(
    result.parenting,
    "001",
    "Threshold is applied with differential privacy"
  );
  Assert.equal(result[SPECIAL_FEATURE_CLICK].length, 3, "Apply DP to clicks");
});

add_task(function test_computeMultipleVectors() {
  const modelData = { ...jsonModelData, rescale: true };
  const model = FeatureModel.fromJSON(modelData);
  const result = model.computeInterestVectors({
    dataForIntervals: SQL_RESULT_DATA,
    indexSchema: SCHEMA,
    model_id: "test",
    condensePrivateValues: false,
  });
  Assert.equal(
    result.coarsePrivateInferredInterests.parenting,
    "001",
    "Threshold is applied with differential privacy"
  );
  Assert.ok(
    Number.isInteger(result.coarseInferredInterests.parenting),
    "Threshold is applied for coarse interest"
  );
  Assert.greater(
    result.inferredInterests.parenting,
    0,
    "Original inferred interest is returned"
  );
});

add_task(function test_computeMultipleVectorsCondensed() {
  const modelData = { ...jsonModelData, rescale: true };
  const model = FeatureModel.fromJSON(modelData);
  const result = model.computeInterestVectors({
    dataForIntervals: SQL_RESULT_DATA,
    indexSchema: SCHEMA,
    model_id: "test",
  });
  Assert.equal(
    result.coarsePrivateInferredInterests.values.length,
    3,
    "Items in an array"
  );
  Assert.equal(
    result.coarsePrivateInferredInterests.values[0].length,
    3,
    "One value in string per possible result"
  );
  Assert.ok(
    result.coarsePrivateInferredInterests.values[0]
      .split("")
      .every(a => a === "1" || a === "0"),
    "Combined coarse values are 1 and 0"
  );
  Assert.equal(
    result.coarsePrivateInferredInterests.model_id,
    "test",
    "Model id returned"
  );
  Assert.greater(
    result.inferredInterests.parenting,
    0,
    "Original inferred interest is returned"
  );
});

add_task(function test_computeMultipleVectorsNoPrivate() {
  const model = FeatureModel.fromJSON(jsonModelDataNoCoarseSupport);
  const result = model.computeInterestVectors({
    dataForIntervals: SQL_RESULT_DATA,
    indexSchema: SCHEMA,
    model_id: "test",
    condensePrivateValues: false,
  });
  Assert.ok(
    !result.coarsePrivateInferredInterests,
    "No coarse private interests available"
  );
  Assert.ok(!result.coarseInferredInterests, "No coarse interests available");
  Assert.greater(
    result.inferredInterests.parenting,
    0,
    "Original inferred interest is returned"
  );
});

const ctrModelDataNoDP = {
  model_type: "ctr",
  noise_scale: 0,
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    news_reader: {
      features: { pub_nytimes_com: 0.5, pub_cnn_com: 0.5 },
    },
    parenting: {
      features: { parenting: 1 },
    },
  },
};

const ctrModelDataNoDPWithTZ = {
  model_type: "ctr",
  noise_scale: 0,
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    news_reader: {
      features: { pub_nytimes_com: 0.5, pub_cnn_com: 0.5 },
    },
    parenting: {
      features: { parenting: 1 },
    },
    timeZoneOffset: {
      features: { timeZoneOffset: 1 },
    },
  },
};

const ctrModelData = {
  model_type: "ctr",
  noise_scale: 0,
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    news_reader: {
      features: { pub_nytimes_com: 0.5, pub_cnn_com: 0.5 },
      thresholds: [0.3, 0, 8],
      diff_p: 1,
      diff_q: 0,
    },
    parenting: {
      features: { parenting: 1 },
      thresholds: [0.3, 0, 8],
      diff_p: 1,
      diff_q: 0,
    },
  },
};

const ctrModelDataTZ = {
  model_type: "ctr",
  noise_scale: 0,
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    news_reader: {
      features: { pub_nytimes_com: 0.5, pub_cnn_com: 0.5 },
      thresholds: [0.3, 0, 8],
      diff_p: 1,
      diff_q: 0,
    },
    parenting: {
      features: { parenting: 1 },
      thresholds: [0.3, 0, 8],
      diff_p: 1,
      diff_q: 0,
    },
    timeZoneOffset: {
      features: { timeZoneOffset: 1 },
      thresholds: [16, 17, 18],
      diff_p: 1,
      diff_q: 0,
    },
  },
};

const ctrModelDataBayesian = {
  model_type: "ctr",
  ctr_prior_strength: 50,
  day_time_weighting: {
    days: [3, 14, 45],
    relative_weight: [1, 0.5, 0.3],
  },
  interest_vector: {
    food: {
      features: { t_food: 1 },
      thresholds: [0.8, 1.2, 2.0],
      diff_p: 1,
      diff_q: 0,
    },
    sports: {
      features: { t_sports: 1 },
      thresholds: [0.8, 1.2, 2.0],
      diff_p: 1,
      diff_q: 0,
    },
  },
};

add_task(function test_postProcessing() {
  let model = FeatureModel.fromJSON({
    ...ctrModelDataNoDP,
    normalize_l1: true,
  });
  ok(
    vectorLooseEquals(model.applyPostProcessing({ a: 0.3, b: 0.5 }), {
      a: 0.3 / 0.8,
      b: 0.5 / 0.8,
    }),
    "L1 normalization"
  );
  model = FeatureModel.fromJSON({ ...ctrModelDataNoDP, normalize: true });
  ok(
    vectorLooseEquals(model.applyPostProcessing({ a: 1, b: 1 }), {
      a: Math.sqrt(2) / 2,
      b: Math.sqrt(2) / 2,
    }),
    "L2 normalization"
  );
  model = FeatureModel.fromJSON({ ...ctrModelDataNoDP, rescale: true });
  ok(
    vectorLooseEquals(model.applyPostProcessing({ a: 1.3, b: 1.3 }), {
      a: 1,
      b: 1,
    }),
    "Rescale"
  );
  ok(
    vectorLooseEquals(model.applyPostProcessing({ a: 0.0, b: 0.0 }), {
      a: 0.0,
      b: 0,
    }),
    "Rescale"
  );
  model = FeatureModel.fromJSON({ ...ctrModelDataNoDP, normalize: true });
  ok(
    vectorLooseEquals(model.applyPostProcessing({ a: 0.0, b: 0.0 }), {
      a: 0.0,
      b: 0,
    }),
    "L1 0 vector"
  );
  model = FeatureModel.fromJSON({ ...ctrModelDataNoDP, rescale: true });
  ok(
    vectorLooseEquals(model.applyPostProcessing({ a: 0.0, b: 0.0 }), {
      a: 0.0,
      b: 0,
    }),
    "Rescale 0 vector"
  );
});

add_task(function test_computeCTRInterestVectorsNoNoise() {
  const model = FeatureModel.fromJSON(ctrModelDataNoDP);

  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };

  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
  });
  console.log(JSON.stringify(result));
  Assert.equal(
    result.inferredInterests.model_id,
    "test-ctr-model",
    "Model id is CTR"
  );
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.ok(!result.coarseInferredInterests, "No coarse inferred interests");
});

add_task(function test_computeCTRInterestReprocessing() {
  const model = FeatureModel.fromJSON({
    ...ctrModelData,
    normalize_l1: true,
  });
  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };
  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
  });
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.equal(result.coarseInferredInterests.parenting, 2); // ctr of 0.5, with vector normalized to 1
  Assert.equal(result.coarseInferredInterests.news_reader, 0);
});

add_task(function test_computeCTRInterestVectorsTimeZone() {
  const model = FeatureModel.fromJSON(ctrModelDataNoDPWithTZ);

  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };

  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
    timeZoneOffset: 17,
  });
  console.log(JSON.stringify(result));
  Assert.equal(
    result.inferredInterests.model_id,
    "test-ctr-model",
    "Model id is CTR"
  );
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.equal(result.inferredInterests.timeZoneOffset, undefined); // Time zone not returned without coarse interests

  Assert.ok(!result.coarseInferredInterests, "No coarse inferred interests");
});

add_task(function test_computeCTRInterestReprocessing() {
  const model = FeatureModel.fromJSON({
    ...ctrModelData,
    normalize_l1: true,
  });
  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };
  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
  });
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.equal(result.coarseInferredInterests.parenting, 2); // ctr of 0.5, with vector normalized to 1
  Assert.equal(result.coarseInferredInterests.news_reader, 0);
});

add_task(function test_computeCTRInterestReprocessingTZ() {
  const model = FeatureModel.fromJSON({
    ...ctrModelDataTZ,
    normalize_l1: true,
  });
  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };
  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
    timeZoneOffset: 19,
  });
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.equal(result.coarseInferredInterests.parenting, 2); // ctr of 0.5, with vector normalized to 1
  Assert.equal(result.coarseInferredInterests.news_reader, 0);
  Assert.equal(result.coarseInferredInterests.timeZoneOffset, 3);
});

add_task(function test_computeCTRInterestReprocessingPrivateTZ() {
  const model = FeatureModel.fromJSON({
    ...ctrModelDataTZ,
    privateFeatures: ["timeZoneOffset", "parenting", "news_reader"],
    normalize_l1: true,
  });
  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };
  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
    timeZoneOffset: 19,
  });
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.equal(result.inferredInterests.timeZoneOffset, undefined); // Time zone only returned in coarse interests
  Assert.equal(result.coarseInferredInterests.parenting, 2); // ctr of 0.5, with vector normalized to 1
  Assert.equal(result.coarseInferredInterests.news_reader, 0);
  Assert.equal(result.coarseInferredInterests.timeZoneOffset, 3);
});

add_task(function test_computeCTRInterestTZNotInModel() {
  const model = FeatureModel.fromJSON({
    ...ctrModelData,
    privateFeatures: ["parenting", "news_reader"],
    normalize_l1: true,
  });
  // Note these are typically computed with the model.inferredInterests function and are not raw
  // per feature impressions
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };
  const result = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
    timeZoneOffset: 19,
  });
  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.inferredInterests.news_reader, 0);
  Assert.equal(result.inferredInterests.timeZoneOffset, undefined);
  Assert.equal(result.coarseInferredInterests.parenting, 2); // ctr of 0.5, with vector normalized to 1
  Assert.equal(result.coarseInferredInterests.news_reader, 0);
  Assert.equal(result.coarseInferredInterests.timeZoneOffset, undefined);
});

add_task(function test_computeCTRInterestWithDebugOverride() {
  const model = FeatureModel.fromJSON({
    ...ctrModelData,
    normalize_l1: true,
  });
  const clickInferredInterests = { parenting: 1 };
  const impressionInferredInterests = { parenting: 2, news_reader: 4 };

  const resultWithoutOverride = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
  });

  Assert.equal(
    resultWithoutOverride.coarseInferredInterests.parenting,
    2,
    "Without override, parenting coarse value is 2"
  );
  Assert.equal(
    resultWithoutOverride.coarseInferredInterests.news_reader,
    0,
    "Without override, news_reader coarse value is 0"
  );

  const debugOverrides = {
    parenting: 1,
    news_reader: 2,
  };

  const resultWithOverride = model.computeCTRInterestVectors({
    clicks: clickInferredInterests,
    impressions: impressionInferredInterests,
    model_id: "test-ctr-model",
    debugOverrideCoarseValueDictionary: debugOverrides,
  });

  Assert.equal(
    resultWithOverride.inferredInterests.parenting,
    0.5,
    "Debug override doesn't affect raw inferred interests"
  );
  Assert.equal(
    resultWithOverride.inferredInterests.news_reader,
    0,
    "Debug override doesn't affect raw inferred interests"
  );
  Assert.equal(
    resultWithOverride.coarseInferredInterests.parenting,
    1,
    "Debug override sets parenting coarse value to 1"
  );
  Assert.equal(
    resultWithOverride.coarseInferredInterests.news_reader,
    2,
    "Debug override sets news_reader coarse value to 2"
  );
});

// Bayesian smoothing tests

add_task(function test_bayesianSmoothing_basic() {
  const model = FeatureModel.fromJSON(ctrModelDataBayesian);

  // averageCtr=0.04 passed externally (computed by feed from raw topic data)
  // k=50, alpha = 0.04*50 = 2.0
  // food: clicks=10, imp=100 → smoothed = (10+2)/(100+50) = 12/150 = 0.08
  //   normalized = 0.08 / 0.04 = 2.0 → not < threshold[2]=2.0 → bucket 3
  // sports: clicks=0, imp=50 → smoothed = (0+2)/(50+50) = 2/100 = 0.02
  //   normalized = 0.02 / 0.04 = 0.5 → < threshold[0]=0.8 → bucket 0
  const result = model.computeCTRInterestVectors({
    clicks: { food: 10 },
    impressions: { food: 100, sports: 50 },
    model_id: "test-bayesian",
    averageCtr: 0.04,
  });

  Assert.equal(result.inferredInterests.food, 0.1, "Raw CTR unchanged");
  Assert.equal(result.inferredInterests.sports, 0, "Raw CTR unchanged");
  Assert.equal(
    result.coarseInferredInterests.food,
    3,
    "Smoothed food normalized=2.0 → bucket 3"
  );
  Assert.equal(
    result.coarseInferredInterests.sports,
    0,
    "Smoothed sports normalized=0.5 → bucket 0"
  );
});

add_task(function test_bayesianSmoothing_zeroImpressions() {
  const model = FeatureModel.fromJSON(ctrModelDataBayesian);

  // averageCtr=0.04 passed externally
  // k=50, alpha = 0.04*50 = 2.0
  // food: smoothed = (0+2)/(0+50) = 0.04, normalized = 0.04/0.04 = 1.0
  //   → >= 0.8, < 1.2 → bucket 1
  const result = model.computeCTRInterestVectors({
    clicks: {},
    impressions: { food: 0, sports: 0 },
    model_id: "test-bayesian-zero",
    averageCtr: 0.04,
  });

  Assert.equal(
    result.coarseInferredInterests.food,
    1,
    "Zero impressions → normalized=1.0 → middle bucket"
  );
  Assert.equal(
    result.coarseInferredInterests.sports,
    1,
    "Zero impressions → normalized=1.0 → middle bucket"
  );
});

add_task(function test_bayesianSmoothing_largeImpressions() {
  const model = FeatureModel.fromJSON(ctrModelDataBayesian);

  // averageCtr=0.1 (computed from raw topic data externally)
  // k=50, alpha = 0.1*50 = 5
  // food: (900+5)/(5000+50) = 905/5050 ≈ 0.1792, normalized ≈ 1.792 → bucket 2
  // sports: (100+5)/(5000+50) = 105/5050 ≈ 0.02079, normalized ≈ 0.208 → bucket 0
  const result = model.computeCTRInterestVectors({
    clicks: { food: 900, sports: 100 },
    impressions: { food: 5000, sports: 5000 },
    model_id: "test-bayesian-large",
    averageCtr: 0.1,
  });

  Assert.equal(
    result.coarseInferredInterests.food,
    2,
    "Large impressions, above-avg feature → bucket 2"
  );
  Assert.equal(
    result.coarseInferredInterests.sports,
    0,
    "Large impressions, below-avg feature → bucket 0"
  );
});

add_task(function test_bayesianSmoothing_privateFeatures() {
  const model = FeatureModel.fromJSON({
    ...ctrModelDataBayesian,
    private_features: ["food"],
  });

  const result = model.computeCTRInterestVectors({
    clicks: { food: 10 },
    impressions: { food: 100, sports: 50 },
    model_id: "test-bayesian-private",
    condensePrivateValues: false,
    averageCtr: 0.04,
  });

  Assert.ok(
    "food" in result.coarsePrivateInferredInterests,
    "Private includes food"
  );
  Assert.ok(
    !("sports" in result.coarsePrivateInferredInterests) ||
      result.coarsePrivateInferredInterests.sports === undefined,
    "Private excludes sports"
  );
  Assert.ok("food" in result.coarseInferredInterests, "Coarse includes food");
  Assert.ok(
    "sports" in result.coarseInferredInterests,
    "Coarse includes sports"
  );
});

add_task(function test_bayesianSmoothing_backwardCompat() {
  const model = FeatureModel.fromJSON({
    ...ctrModelData,
    normalize_l1: true,
  });

  const result = model.computeCTRInterestVectors({
    clicks: { parenting: 1 },
    impressions: { parenting: 2, news_reader: 4 },
    model_id: "test-ctr-model",
  });

  Assert.equal(result.inferredInterests.parenting, 0.5);
  Assert.equal(result.coarseInferredInterests.parenting, 2);
  Assert.equal(result.coarseInferredInterests.news_reader, 0);
});

add_task(function test_applyBayesianSmoothing_direct() {
  const model = FeatureModel.fromJSON(ctrModelDataBayesian);

  const smoothed = model.applyBayesianSmoothing(
    { food: 10, sports: 0 },
    { food: 100, sports: 50 },
    0.04
  );

  // food: (10 + 0.04*50)/(100+50) = 12/150 = 0.08, /0.04 = 2.0
  ok(
    vectorLooseEquals({ food: smoothed.food }, { food: 2.0 }),
    "food smoothed to 2.0"
  );

  // sports: (0 + 2)/(50+50) = 2/100 = 0.02, /0.04 = 0.5
  ok(
    vectorLooseEquals({ sports: smoothed.sports }, { sports: 0.5 }),
    "sports smoothed to 0.5"
  );
});

add_task(function test_applyBayesianSmoothing_fallback_default_ctr() {
  const model = FeatureModel.fromJSON(ctrModelDataBayesian);

  // No averageCTR → falls back to DEFAULT_USER_CTR=0.002, normalized=1.0
  const smoothed = model.applyBayesianSmoothing({ a: 0 }, { a: 0 });

  ok(
    vectorLooseEquals({ a: smoothed.a }, { a: 1.0 }),
    "No averageCTR input → DEFAULT_USER_CTR, normalized=1.0"
  );
});

add_task(function test_bayesianSmoothing_noAverageCtr() {
  const model = FeatureModel.fromJSON(ctrModelDataBayesian);

  // When averageCtr is not passed, applyBayesianSmoothing falls back to
  // DEFAULT_USER_CTR=0.002. k=50, alpha=0.002*50=0.1
  // food: (0+0.1)/(0+50)=0.002, /0.002=1.0 → bucket 1
  const result = model.computeCTRInterestVectors({
    clicks: {},
    impressions: { food: 0, sports: 0 },
    model_id: "test-bayesian-no-avg",
  });

  Assert.equal(
    result.coarseInferredInterests.food,
    1,
    "No averageCtr passed → fallback DEFAULT_USER_CTR → middle bucket"
  );
});

add_task(function test_bayesianSmoothing_withTimeZoneOffset() {
  const model = FeatureModel.fromJSON({
    ...ctrModelDataBayesian,
    interest_vector: {
      ...ctrModelDataBayesian.interest_vector,
      timeZoneOffset: {
        features: { timeZoneOffset: 1 },
        thresholds: [16, 17, 18],
        diff_p: 1,
        diff_q: 0,
      },
    },
  });

  const result = model.computeCTRInterestVectors({
    clicks: { food: 10 },
    impressions: { food: 100, sports: 50 },
    model_id: "test-bayesian-tz",
    averageCtr: 0.04,
    timeZoneOffset: 17,
  });

  Assert.equal(
    result.inferredInterests.timeZoneOffset,
    undefined,
    "timeZoneOffset not in raw inferred interests"
  );
  Assert.equal(
    result.coarseInferredInterests.timeZoneOffset,
    2,
    "timeZoneOffset thresholded independently"
  );
  // Verify the smoothed features are unaffected by timeZoneOffset
  Assert.equal(
    result.coarseInferredInterests.food,
    3,
    "food smoothing unaffected by timeZoneOffset"
  );
  Assert.equal(
    result.coarseInferredInterests.sports,
    0,
    "sports smoothing unaffected by timeZoneOffset"
  );
});
