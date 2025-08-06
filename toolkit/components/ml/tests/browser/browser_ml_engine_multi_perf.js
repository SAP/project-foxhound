/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ENGINES = {
  intent: {
    engineId: "intent",
    taskName: "text-classification",
    modelId: "Mozilla/mobilebert-uncased-finetuned-LoRA-intent-classifier",
    modelRevision: "main",
    modelHubUrlTemplate: "{model}/{revision}",
    dtype: "q8",
    device: "wasm",
    request: {
      args: [["restaurants in seattle, wa"]],
    },
  },
  suggest: {
    engineId: "suggest",
    taskName: "token-classification",
    modelId: "Mozilla/distilbert-uncased-NER-LoRA",
    modelRevision: "main",
    dtype: "q8",
    device: "wasm",
    request: {
      args: [["restaurants in seattle, wa"]],
    },
  },
  engine3: {
    engineId: "engine3",
    taskName: "feature-extraction",
    modelId: "Xenova/all-MiniLM-L6-v2",
    modelRevision: "main",
    dtype: "q8",
    device: "wasm",
    request: {
      args: [["Yet another example sentence", "Checking sentence handling"]],
      options: {
        pooling: "mean",
        normalize: true,
      },
    },
  },
  engine4: {
    engineId: "engine4",
    taskName: "feature-extraction",
    modelId: "Xenova/all-MiniLM-L6-v2",
    modelRevision: "main",
    dtype: "q8",
    device: "wasm",
    request: {
      args: [["Final example sentence", "Ensuring unique inputs"]],
      options: {
        pooling: "mean",
        normalize: true,
      },
    },
  },
};

const BASE_METRICS = [
  PIPELINE_READY_LATENCY,
  INITIALIZATION_LATENCY,
  MODEL_RUN_LATENCY,
  PIPELINE_READY_MEMORY,
  INITIALIZATION_MEMORY,
  MODEL_RUN_MEMORY,
];

// Generate prefixed metrics for each engine
const METRICS = [];
for (let engineKey of Object.keys(ENGINES)) {
  for (let metric of BASE_METRICS) {
    METRICS.push(`${engineKey}-${metric}`);
  }
}
METRICS.push(TOTAL_MEMORY_USAGE);

const journal = {};
for (let metric of METRICS) {
  journal[metric] = [];
}

const perfMetadata = {
  owner: "GenAI Team",
  name: "ML Test Multi Model",
  description: "Testing model execution concurrenty",
  options: {
    default: {
      perfherder: true,
      perfherder_metrics: [
        {
          name: `intent-pipeline-ready-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        {
          name: `intent-initialization-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        { name: `intent-model-run-latency`, unit: "ms", shouldAlert: true },
        { name: `intent-pipeline-ready-memory`, unit: "MB", shouldAlert: true },
        { name: `intent-initialization-memory`, unit: "MB", shouldAlert: true },
        { name: `intent-model-run-memory`, unit: "MB", shouldAlert: true },
        { name: `intent-total-memory-usage`, unit: "MB", shouldAlert: true },
        {
          name: `suggest-pipeline-ready-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        {
          name: `suggest-initialization-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        { name: `suggest-model-run-latency`, unit: "ms", shouldAlert: true },
        {
          name: `suggest-pipeline-ready-memory`,
          unit: "MB",
          shouldAlert: true,
        },
        {
          name: `suggest-initialization-memory`,
          unit: "MB",
          shouldAlert: true,
        },
        { name: `suggest-model-run-memory`, unit: "MB", shouldAlert: true },

        { name: `suggest-total-memory-usage`, unit: "MB", shouldAlert: true },
        {
          name: `engine3-pipeline-ready-latency`,
          unit: "ms",
          shouldAlert: true,
        },

        {
          name: `engine3-initialization-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        { name: `engine3-model-run-latency`, unit: "ms", shouldAlert: true },
        {
          name: `engine3-pipeline-ready-memory`,
          unit: "MB",
          shouldAlert: true,
        },
        {
          name: `engine3-initialization-memory`,
          unit: "MB",
          shouldAlert: true,
        },
        { name: `engine3-model-run-memory`, unit: "MB", shouldAlert: true },

        { name: `engine3-total-memory-usage`, unit: "MB", shouldAlert: true },
        {
          name: `engine4-pipeline-ready-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        {
          name: `engine4-initialization-latency`,
          unit: "ms",
          shouldAlert: true,
        },
        { name: `engine4-model-run-latency`, unit: "ms", shouldAlert: true },
        {
          name: `engine4-pipeline-ready-memory`,
          unit: "MB",
          shouldAlert: true,
        },
        {
          name: `engine4-initialization-memory`,
          unit: "MB",
          shouldAlert: true,
        },
        { name: `engine4-model-run-memory`, unit: "MB", shouldAlert: true },
        { name: `engine4-total-memory-usage`, unit: "MB", shouldAlert: true },
      ],
      verbose: true,
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      try_platform: ["linux", "mac", "win"],
    },
  },
};

for (let metric of METRICS) {
  perfMetadata.options.default.perfherder_metrics.push({
    name: metric,
    unit: metric.includes("latency") ? "ms" : "MB",
    shouldAlert: true,
  });
}

requestLongerTimeout(120);

async function runEngineWithMetrics(
  engineInstance,
  engineConfig,
  iterations = 1
) {
  const journal = {};
  const engine = engineInstance.engine;
  for (let i = 0; i < iterations; i++) {
    const res = await engine.run(engineConfig.request);
    let metrics = fetchMetrics(res.metrics);

    // Collect metrics, prefixing each metric name with engineId
    for (const [metricName, metricVal] of Object.entries(metrics)) {
      const prefixedMetricName = `${engineConfig.engineId}-${metricName}`;
      if (!journal[prefixedMetricName]) {
        journal[prefixedMetricName] = [];
      }
      journal[prefixedMetricName].push(metricVal);
    }
  }
  return journal;
}

/**
 * Runs inference on an initialized engine instance using the specified request configuration
 * and collects metrics, prefixed with the engineId.
 *
 * @param {object} engineInstance - The engine instance on which to run inference.
 * @param {EngineConfig} engineConfig - Configuration object with request details for the engine.
 * @param {number} iterations - Number of times to run the inference for metrics collection.
 * @returns {Promise<object>} - Returns a promise that resolves with the journal of collected metrics.
 */

/**
 * Tests concurrent execution of the ml pipeline API by starting engines first, then running inference.
 */
add_task(async function test_ml_generic_pipeline_concurrent_separate_phases() {
  // Step 1: Initialize all engines concurrently
  const engineInstances = await Promise.all(
    Object.values(ENGINES).map(async engineConfig => {
      const { cleanup, engine } = await initializeEngine(
        new PipelineOptions(engineConfig)
      );
      return { cleanup, engine };
    })
  );
  info("All engines initialized successfully");

  // Step 2: Run inference on all initialized engines concurrently and collect metrics
  const allJournals = await Promise.all(
    engineInstances.map((engineInstance, index) =>
      runEngineWithMetrics(
        engineInstance,
        Object.values(ENGINES)[index],
        ITERATIONS
      )
    )
  );

  // Merge all journals into one for final reporting
  const combinedJournal = allJournals.reduce((acc, journal) => {
    Object.entries(journal).forEach(([key, values]) => {
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(...values);
    });
    return acc;
  }, {});

  Assert.ok(true);

  const memUsage = await getTotalMemoryUsage();
  (combinedJournal["total-memory-usage"] =
    combinedJournal["total-memory-usage"] || []).push(memUsage);

  // Final metrics report
  reportMetrics(combinedJournal);

  await EngineProcess.destroyMLEngine();

  // Cleanup and verify that all engines are terminated
  for (const instance of engineInstances) {
    await instance.cleanup();
  }
});
