/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const perfMetadata = {
  owner: "GenAI Team",
  name: "ML Test Model",
  description: "Template test for latency for ml models",
  options: {
    default: {
      perfherder: true,
      perfherder_metrics: [
        {
          name: "latency",
          unit: "ms",
          shouldAlert: true,
        },
        {
          name: "memory",
          unit: "MiB",
          shouldAlert: true,
        },
        {
          name: "tokenSpeed",
          unit: "tokens/s",
          shouldAlert: true,
          lowerIsBetter: false,
        },
        {
          name: "charactersSpeed",
          unit: "chars/s",
          shouldAlert: true,
          lowerIsBetter: false,
        },
      ],
      verbose: true,
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      try_platform: ["linux", "mac", "win"],
    },
  },
};

requestLongerTimeout(120);

/**
 * Tests remote ml model
 */
add_task(async function test_ml_generic_pipeline() {
  const options = {
    taskName: "feature-extraction",
    modelId: "Xenova/all-MiniLM-L6-v2",
    modelHubUrlTemplate: "{model}/{revision}",
    modelRevision: "main",
    timeoutMS: -1,
  };

  const args = ["The quick brown fox jumps over the lazy dog."];
  const request = {
    args,
    options: { pooling: "mean", normalize: true },
  };
  await perfTest({
    name: "example",
    options,
    request,
    iterations: ITERATIONS,
    addColdStart: true,
  });
});
