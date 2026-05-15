/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const perfMetadata = {
  owner: "GenAI Team",
  name: "ML Smart Tab Clustering",
  description: "Testing Smart Tab Clustering",
  options: {
    default: {
      perfherder: true,
      perfherder_metrics: [
        {
          name: "latency",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "memory",
          unit: "MiB",
          shouldAlert: false,
        },
      ],
      verbose: true,
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      try_platform: ["linux", "mac", "win"],
    },
  },
};

requestLongerTimeout(10);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

// Clustering / Nearest Neighbor tests
const ROOT_URL =
  "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data/tab_grouping/";

/*
 * Generate n random samples by loading existing labels and embeddings
 */
function generateSamples(labels, embeddings, n) {
  let generatedLabels = [];
  let generatedEmbeddings = [];
  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * labels.length);
    generatedLabels.push(labels[randomIndex]);
    if (embeddings) {
      generatedEmbeddings.push(embeddings[randomIndex]);
    }
  }
  return {
    labels: generatedLabels,
    embeddings: generatedEmbeddings,
  };
}

async function generateEmbeddings(textList) {
  const options = new PipelineOptions({
    taskName: "feature-extraction",
    modelId: "Mozilla/smart-tab-embedding",
    modelHubUrlTemplate: "{model}/{revision}",
    modelRevision: "main",
    dtype: "q8",
    timeoutMS: -1,
  });
  const requestInfo = {
    inputArgs: textList,
    runOptions: {
      pooling: "mean",
      normalize: true,
    },
  };

  const request = {
    args: [requestInfo.inputArgs],
    options: requestInfo.runOptions,
  };
  const engine = await createEngine(options);
  const output = await engine.run(request);
  return output;
}

async function runTopicModel(texts, keywords = []) {
  const stgManager = new SmartTabGroupingManager();

  const options = new PipelineOptions({
    taskName: "text2text-generation",
    modelId: "Mozilla/smart-tab-topic",
    modelHubUrlTemplate: "{model}/{revision}",
    modelRevision: "main",
    dtype: "q8",
    timeoutMS: 2 * 60 * 1000,
  });
  const requestInfo = {
    inputArgs: stgManager.createModelInput(keywords, texts),
    runOptions: {
      max_length: 6,
    },
  };

  const request = {
    args: [requestInfo.inputArgs],
    options: requestInfo.runOptions,
  };
  const engine = await createEngine(options);
  const output = await engine.run(request);
  return output.map(o => o.generated_text);
}

// build tab object similar to what we'd expect for an actual tab
function makeUrlTab(url, label, { groupId = null } = {}) {
  return {
    label,
    url,
    group: groupId,
    pinned: false,
    linkedBrowser: {
      currentURI: {
        spec: url,
      },
    },
  };
}

const singleTabMetrics = {};
singleTabMetrics["SINGLE-TAB-LATENCY"] = [];
singleTabMetrics["SINGLE-TAB-LOGISTIC-REGRESSION-LATENCY"] = [];
singleTabMetrics["SINGLE-TAB-TOPIC-LATENCY"] = [];
// measure latency with domain feature
singleTabMetrics["SINGLE-TAB-LR-WITH-DOMAIN-LATENCY"] = [];

add_task(async function test_clustering_nearest_neighbors() {
  const modelHubRootUrl = Services.env.get("MOZ_MODELS_HUB");
  const { cleanup } = await perfSetup({
    prefs: [["browser.ml.modelHubRootUrl", modelHubRootUrl]],
  });

  const stgManager = new SmartTabGroupingManager();

  let generateEmbeddingsStub = sinon.stub(
    SmartTabGroupingManager.prototype,
    "_generateEmbeddings"
  );
  generateEmbeddingsStub.callsFake(async textList => {
    return await generateEmbeddings(textList);
  });

  const labelsPath = `gen_set_2_labels.tsv`;
  const rawLabels = await fetchFile(ROOT_URL, labelsPath);
  let labels = parseTsvStructured(rawLabels);
  labels = labels.map(l => ({ ...l, label: l.smart_group_label }));
  const startTime = performance.now();
  const similarTabs = await stgManager.findNearestNeighbors({
    allTabs: labels,
    groupedIndices: [1],
    alreadyGroupedIndices: [],
    groupLabel: "Travel Planning",
    thresholdMills: 275,
  });
  const endTime = performance.now();
  singleTabMetrics["SINGLE-TAB-LATENCY"].push(endTime - startTime);
  const titles = similarTabs.map(s => s.label);
  Assert.equal(
    titles.length,
    5,
    "Proper number of similar tabs should be returned"
  );
  Assert.equal(
    titles[0],
    "Tourist Behavior and Decision Making: A Research Overview"
  );
  Assert.equal(
    titles[1],
    "Impact of Tourism on Local Communities - Google Scholar"
  );
  Assert.equal(titles[2], "Cheap Flights, Airline Tickets & Airfare Deals");
  Assert.equal(titles[3], "Hotel Deals: Save Big on Hotels with Expedia");
  Assert.equal(
    titles[4],
    "The Influence of Travel Restrictions on the Spread of COVID-19 - Nature"
  );
  generateEmbeddingsStub.restore();
  await EngineProcess.destroyMLEngine();
  await cleanup();
});

add_task(async function test_clustering_logistic_regression() {
  const modelHubRootUrl = Services.env.get("MOZ_MODELS_HUB");
  const { cleanup } = await perfSetup({
    prefs: [["browser.ml.modelHubRootUrl", modelHubRootUrl]],
  });

  const stgManager = new SmartTabGroupingManager();

  let generateEmbeddingsStub = sinon.stub(
    SmartTabGroupingManager.prototype,
    "_generateEmbeddings"
  );
  generateEmbeddingsStub.callsFake(async textList => {
    return await generateEmbeddings(textList);
  });

  const labelsPath = `gen_set_2_labels.tsv`;
  const rawLabels = await fetchFile(ROOT_URL, labelsPath);
  let labels = parseTsvStructured(rawLabels);
  labels = labels.map(l => ({ ...l, label: l.smart_group_label }));
  const startTime = performance.now();
  const similarTabs = await stgManager.findSimilarTabsLogisticRegression({
    allTabs: labels,
    groupedIndices: [1],
    alreadyGroupedIndices: [],
    groupLabel: "Travel Planning",
  });
  const endTime = performance.now();
  singleTabMetrics["SINGLE-TAB-LOGISTIC-REGRESSION-LATENCY"].push(
    endTime - startTime
  );
  const titles = similarTabs.map(s => s.label);
  Assert.equal(
    titles.length,
    3,
    "Proper number of similar tabs should be returned"
  );
  Assert.equal(
    titles[0],
    "Tourist Behavior and Decision Making: A Research Overview"
  );
  Assert.equal(
    titles[1],
    "Impact of Tourism on Local Communities - Google Scholar"
  );
  Assert.equal(titles[2], "Cheap Flights, Airline Tickets & Airfare Deals");
  generateEmbeddingsStub.restore();
  await EngineProcess.destroyMLEngine();
  await cleanup();
});

// test domain feature for Logistic Regression
add_task(
  async function test_clustering_logistic_regression_domain_preference() {
    const modelHubRootUrl = Services.env.get("MOZ_MODELS_HUB");
    const { cleanup } = await perfSetup({
      prefs: [["browser.ml.modelHubRootUrl", modelHubRootUrl]],
    });

    const stgManager = new SmartTabGroupingManager();

    let generateEmbeddingsStub = sinon.stub(
      SmartTabGroupingManager.prototype,
      "_generateEmbeddings"
    );
    generateEmbeddingsStub.callsFake(async textList => {
      return await generateEmbeddings(textList);
    });

    const sharedTitle = "Smart Tab Grouping deep dive";

    const anchor0 = makeUrlTab(
      "https://docs.google.com/document/d/1-smart-tab-grouping-deep-dive/edit",
      sharedTitle,
      { groupId: "stg-group" }
    );
    const anchor1 = makeUrlTab(
      "https://docs.google.com/document/d/1-smart-tab-grouping-deep-dive-2/edit",
      sharedTitle,
      { groupId: "stg-group" }
    );

    const candidateSameDomain = makeUrlTab(
      "https://docs.google.com/document/d/1-smart-tab-grouping-deep-dive-3/edit",
      sharedTitle
    );
    const candidateOtherDomain = makeUrlTab(
      "https://example.com/smart-tab-grouping-deep-dive-3",
      sharedTitle
    );

    const unrelated = makeUrlTab(
      "https://www.youtube.com/watch?v=xyz",
      "Cute cat compilation 2025"
    );

    const allTabs = [
      anchor0,
      anchor1,
      candidateSameDomain,
      candidateOtherDomain,
      unrelated,
    ];

    const groupedIndices = [0, 1];
    const alreadyGroupedIndices = [];
    const groupLabel = sharedTitle;

    const startTime = performance.now();
    const similarTabs = await stgManager.findSimilarTabsLogisticRegression({
      allTabs,
      groupedIndices,
      alreadyGroupedIndices,
      groupLabel,
    });
    const endTime = performance.now();

    singleTabMetrics["SINGLE-TAB-LR-WITH-DOMAIN-LATENCY"].push(
      endTime - startTime
    );

    Assert.greaterOrEqual(
      similarTabs.length,
      1,
      "Logistic regression with domain should return at least one candidate"
    );

    const first = similarTabs[0];

    Assert.equal(
      first.linkedBrowser.currentURI.spec,
      candidateSameDomain.linkedBrowser.currentURI.spec,
      "Candidate sharing the anchors' base domain should be ranked first when text and group label match"
    );

    const titles = similarTabs.map(t => t.label);
    Assert.ok(
      !titles.includes("Cute cat compilation 2025"),
      "An obviously unrelated tab should not be selected"
    );

    generateEmbeddingsStub.restore();
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
);

/// test a trickier example with subdomains
add_task(async function test_clustering_nn_vs_lr_realistic_example() {
  const modelHubRootUrl = Services.env.get("MOZ_MODELS_HUB");
  const { cleanup } = await perfSetup({
    prefs: [["browser.ml.modelHubRootUrl", modelHubRootUrl]],
  });

  const stgManager = new SmartTabGroupingManager();

  let generateEmbeddingsStub = sinon.stub(
    SmartTabGroupingManager.prototype,
    "_generateEmbeddings"
  );
  generateEmbeddingsStub.callsFake(async textList => {
    return await generateEmbeddings(textList);
  });

  const anchor0 = makeUrlTab(
    "https://docs.google.com/document/d/1-smart-tab-grouping-design/edit",
    "Smart Tab Grouping – design document",
    { groupId: "stg-group" }
  );
  const anchor1 = makeUrlTab(
    "https://docs.google.com/document/d/1-smart-tab-grouping-logistic-regression/edit",
    "Smart Tab Grouping – logistic regression model notes",
    { groupId: "stg-group" }
  );

  const candGithub = makeUrlTab(
    "https://github.com/mozilla-mobile/firefox-android/issues/999999",
    "Smart Tab Grouping: tune logistic regression thresholds for mobile"
  );
  const candMdn = makeUrlTab(
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
    "Array.prototype.map() – JavaScript | MDN"
  );
  const candNba = makeUrlTab(
    "https://www.espn.com/nba/scoreboard",
    "NBA scoreboard – live scores and results"
  );
  const candRecipe = makeUrlTab(
    "https://www.seriouseats.com/best-lasagna-recipe",
    "The very best lasagna recipe"
  );

  const allTabs = [anchor0, anchor1, candGithub, candMdn, candNba, candRecipe];

  const groupedIndices = [0, 1];
  const alreadyGroupedIndices = [];
  const groupLabel = "Smart Tab Grouping";

  // Nearest neighbors
  const nnTabs = await stgManager.findNearestNeighbors({
    allTabs,
    groupedIndices,
    alreadyGroupedIndices,
    groupLabel,
    thresholdMills: 275,
  });

  Assert.greaterOrEqual(
    nnTabs.length,
    1,
    "Nearest neighbors should return at least one candidate in the realistic example"
  );

  // run LR
  const lrTabs = await stgManager.findSimilarTabsLogisticRegression({
    allTabs,
    groupedIndices,
    alreadyGroupedIndices,
    groupLabel,
  });

  Assert.greaterOrEqual(
    lrTabs.length,
    1,
    "Logistic regression should return at least one candidate in the realistic example"
  );

  const lrTitles = lrTabs.map(t => t.label);
  Assert.ok(
    !lrTitles.includes("The very best lasagna recipe"),
    "Logistic regression should not select a totally unrelated lasagna recipe tab"
  );

  generateEmbeddingsStub.restore();
  await EngineProcess.destroyMLEngine();
  await cleanup();
});

add_task(async function test_topic_model() {
  const modelHubRootUrl = Services.env.get("MOZ_MODELS_HUB");
  const { cleanup } = await perfSetup({
    prefs: [["browser.ml.modelHubRootUrl", modelHubRootUrl]],
  });

  const texts = [
    { input: "cheese crackers", output: " Cheese Crackers" },
    {
      input: "Smart Tab Groups - Usability Testing Script",
      output: " Usability",
    },
    { input: "Tutorials/Setting up a server Wiki", output: " Linux Tutorials" },
    { input: "The Best Trail Running Shoes", output: " Trail Running Shoes" },
    { input: "Top Web Sites Across the Web", output: " Web Sites" },
  ];
  for (const text of texts) {
    const startTime = performance.now();
    const output = await runTopicModel([text.input]);
    Assert.equal(
      output[0],
      text.output,
      "Output from topic model should match expected"
    );
    const endTime = performance.now();
    singleTabMetrics["SINGLE-TAB-TOPIC-LATENCY"].push(endTime - startTime);
  }

  reportMetrics(singleTabMetrics);
  await EngineProcess.destroyMLEngine();
  await cleanup();
});

const N_TABS = [5];
const methods = ["NEAREST_NEIGHBORS_ANCHOR", "LOGISTIC_REGRESSION_ANCHOR"];
const nTabMetrics = {};

for (let method of methods) {
  for (let n of N_TABS) {
    nTabMetrics[`${method}-${n}-TABS-latency`] = [];
  }
}

add_task(async function test_n_clustering() {
  const modelHubRootUrl = Services.env.get("MOZ_MODELS_HUB");
  const { cleanup } = await perfSetup({
    prefs: [["browser.ml.modelHubRootUrl", modelHubRootUrl]],
  });

  const stgManager = new SmartTabGroupingManager();

  let generateEmbeddingsStub = sinon.stub(
    SmartTabGroupingManager.prototype,
    "_generateEmbeddings"
  );
  generateEmbeddingsStub.callsFake(async textList => {
    return await generateEmbeddings(textList);
  });

  const labelsPath = `gen_set_2_labels.tsv`;
  const rawLabels = await fetchFile(ROOT_URL, labelsPath);
  const labels = parseTsvStructured(rawLabels);

  for (let n of N_TABS) {
    for (let method of methods) {
      for (let i = 0; i < 1; i++) {
        const samples = generateSamples(labels, null, n);
        let startTime = performance.now();
        if (method === "KMEANS_ANCHOR" && n <= 50) {
          await stgManager.generateClusters(
            samples.labels,
            null,
            0,
            null,
            [0],
            []
          );
        } else if (method === "NEAREST_NEIGHBORS_ANCHOR") {
          await stgManager.findNearestNeighbors({
            allTabs: samples.labels,
            groupedIndices: [0],
            alreadyGroupedIndices: [],
            groupLabel: "Random Group Name",
          });
        } else if (method === "LOGISTIC_REGRESSION_ANCHOR") {
          await stgManager.findSimilarTabsLogisticRegression({
            allTabs: samples.labels,
            groupedIndices: [0],
            alreadyGroupedIndices: [],
            groupLabel: "Random Group Name",
          });
        }
        let endTime = performance.now();
        const key = `${method}-${n}-TABS-latency`;
        if (key in nTabMetrics) {
          nTabMetrics[key].push(endTime - startTime);
        }
        await EngineProcess.destroyMLEngine();
      }
    }
  }
  reportMetrics(nTabMetrics);
  generateEmbeddingsStub.restore();
  await cleanup();
});
