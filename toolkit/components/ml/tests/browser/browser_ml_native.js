/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/// <reference path="head.js" />

/**
 * Runs a full end-to-end test on the native ONNX backend
 */
add_task(async function test_ml_smoke_test_onnx() {
  const { cleanup } = await setup();

  info("Get the engine");
  const engineInstance = await createEngine({
    taskName: "text-classification",
    modelId: "acme/bert",
    dtype: "q8",
    backend: "onnx-native",
    modelHubUrlTemplate: "{model}/resolve/{revision}",
  });
  const inferencePromise = engineInstance.run({ args: ["dummy data"] });

  const res = await inferencePromise;
  Assert.equal(res[0].label, "LABEL_0", "The text gets classified");

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

async function llama_crash() {
  const { cleanup } = await setup();

  SimpleTest.expectChildProcessCrash();

  try {
    const crashMan = Services.crashmanager;
    const contentShutdown = TestUtils.topicObserved(
      "ipc:content-shutdown",
      (subject, data) => {
        info(`ipc:content-shutdown: data=${data} subject=${subject}`);
        return true;
      }
    );

    const engine = await createEngine({
      modelId: "Mozilla/test-llama",
      taskName: "text-classification",
      modelFile: "crash-me.gguf",
      kvCacheDtype: "q8_0",
      modelRevision: "main",
      backend: "llama.cpp",
      logLevel: "Debug",
    });
    const prompt = [
      { role: "system", content: "blah" },
      {
        role: "user",
        content: "This is a test that crashes",
      },
    ];
    info("Calling runWithGenerator");
    try {
      for await (const val of engine.runWithGenerator({
        prompt,
      })) {
        info(val.text);
      }
    } catch (err) {
      Assert.ok(true, `failed with error ${err.message}`);

      let [subject, data] = await contentShutdown;

      info(`ipc:content-shutdown: data=${data} subject=${subject}`);

      const dumpID = subject.get("dumpID");
      if (AppConstants.MOZ_CRASHREPORTER && dumpID === null) {
        // This test does not appear to generate minidumps, it is unclear why.
        // We should turn this into an `ok()` call once we fix the underlying
        // issue in bug 2003271.
        dump("There should be a dumpID");
      }

      if (AppConstants.MOZ_CRASHREPORTER && dumpID !== null) {
        await crashMan.ensureCrashIsPresent(dumpID);
        let minidumpDirectory = Services.dirsvc.get("ProfD", Ci.nsIFile);
        minidumpDirectory.append("minidumps");

        let dumpfile = minidumpDirectory.clone();
        dumpfile.append(dumpID + ".dmp");
        if (dumpfile.exists()) {
          info(`Removal of ${dumpfile.path}`);
          dumpfile.remove(false);
        }
        let extrafile = minidumpDirectory.clone();
        extrafile.append(dumpID + ".extra");
        info(`Removal of ${extrafile.path}`);
        if (extrafile.exists()) {
          extrafile.remove(false);
        }
        info(`cleaning up ${subject} ${data}`);
      }
    }
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
}

async function llama_works({
  prompt = [
    { role: "system", content: "blah" },
    {
      role: "user",
      content: "This is a test that works",
    },
  ],
  expectMultiChunkPrefill = false,
} = {}) {
  const { cleanup } = await setup();
  try {
    info("Create the engine for a normal run");
    const engine = await createEngine({
      taskName: "text-classification",
      modelId: "Mozilla/test-llama",
      modelFile: "TinyStories-656K.Q8_0.gguf",
      kvCacheDtype: "q8_0",
      modelRevision: "main",
      backend: "llama.cpp",
      logLevel: "Debug",
    });

    const samplers = [
      {
        type: "top-k",
        topK: 3,
      },
      {
        type: "top-p",
        topP: 0.95,
      },

      {
        type: "logit-bias",
        logitBias: [{ token: 5, bias: -1000 }],
      },

      {
        type: "dist",
      },
    ];

    info("Calling runWithGenerator for normal run");
    const generator = engine.runWithGenerator({
      prompt,
      samplers,
    });
    let result;
    do {
      result = await generator.next();
      if (!result.done) {
        info(result.value.text);
      }
    } while (!result.done);

    info("Normal run worked");

    const { metrics } = result.value;
    Assert.ok(metrics, "metrics should be present on the run result");
    Assert.ok(
      Array.isArray(metrics.runTimestamps),
      "metrics.runTimestamps should be an array"
    );
    const timestampNames = metrics.runTimestamps.map(t => t.name);
    for (const name of [
      "initializationStart",
      "initializationEnd",
      "runStart",
      "runEnd",
    ]) {
      Assert.ok(
        timestampNames.includes(name),
        `metrics.runTimestamps should include ${name}`
      );
    }
    Assert.greater(metrics.inputTokens, 0, "inputTokens should be > 0");
    Assert.greater(metrics.outputTokens, 0, "outputTokens should be > 0");
    Assert.greaterOrEqual(
      metrics.inferenceTime,
      0,
      "inferenceTime should be >= 0"
    );
    Assert.greaterOrEqual(
      metrics.decodingTime,
      0,
      "decodingTime should be >= 0"
    );
    Assert.greaterOrEqual(
      metrics.timeToFirstToken,
      0,
      "timeToFirstToken should be >= 0"
    );

    if (expectMultiChunkPrefill) {
      // Default minOutputBufferSize is 20: a prompt above that exercises
      // the multi-chunk prefill path where the runner flushes prompt chunks
      // before isPhaseCompleted=true.
      Assert.greater(
        metrics.inputTokens,
        20,
        "inputTokens should exceed the default minOutputBufferSize"
      );
    }
  } finally {
    info("Destroy the engine");
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
}

async function llama_fails_with_wrong_samplers() {
  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  const { cleanup } = await setup();
  try {
    info("Create the engine for a normal run");
    const engine = await createEngine({
      taskName: "text-classification",
      modelId: "Mozilla/test-llama",
      modelFile: "TinyStories-656K.Q8_0.gguf",
      kvCacheDtype: "q8_0",
      modelRevision: "main",
      backend: "llama.cpp",
      logLevel: "Debug",
    });

    const prompt = [
      { role: "system", content: "blah" },
      {
        role: "user",
        content: "This is a test that works",
      },
    ];

    const samplers = [
      {
        type: "top-k",
        topK: 3,
      },
      {
        type: "top-p",
        topP: 0.95,
      },

      {
        type: "logit-bias",
        logitBias: [{ token: 5, bias: -1000 }],
      },

      {
        type: "dist-invalid",
      },
    ];

    info("Calling runWithGenerator for normal run with expected failure");
    const runEngine = async () => {
      await engine.run({ prompt, samplers });
    };

    await Assert.rejects(
      runEngine(),
      err =>
        String(err?.message ?? err).includes(
          "LlamaRunner.createGenerationStream: 'dist-invalid'"
        ),
      "The call should be rejected because it used an invalid sampler"
    );
  } finally {
    info("Destroy the engine");
    await EngineProcess.destroyMLEngine();
    await IndexedDBCache.init({ reset: true });
    await cleanup();
  }
}

/**
 * Runs a full end-to-end test on the llama.cpp backend with samplers and expected failure.
 */
add_task(async function test_ml_smoke_test_llama_fails() {
  await llama_fails_with_wrong_samplers();
});

add_task(async function test_ml_smoke_test_llama_sequential_runs() {
  const { cleanup } = await setup();
  try {
    const engine = await createEngine({
      taskName: "text-generation",
      modelId: "Mozilla/test-llama",
      modelFile: "TinyStories-656K.Q8_0.gguf",
      kvCacheDtype: "q8_0",
      modelRevision: "main",
      backend: "llama.cpp",
      numContext: 128,
    });

    const request = {
      prompt: [
        { role: "system", content: "blah" },
        { role: "user", content: "Once upon a time there was" },
      ],
      nPredict: 16,
    };

    await engine.run(request);
    await engine.run(request);
    Assert.ok(true, "Two sequential run() calls completed without rejection");
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
});

add_task(async function test_ml_smoke_test_llama_overlap_guard() {
  const { cleanup } = await setup();
  try {
    const engine = await createEngine({
      taskName: "text-generation",
      modelId: "Mozilla/test-llama",
      modelFile: "TinyStories-656K.Q8_0.gguf",
      kvCacheDtype: "q8_0",
      modelRevision: "main",
      backend: "llama.cpp",
      numContext: 128,
    });

    const request = {
      prompt: [
        { role: "system", content: "blah" },
        { role: "user", content: "Once upon a time there was" },
      ],
      nPredict: 128,
    };

    const results = await Promise.allSettled([
      engine.run(request),
      engine.run(request),
    ]);

    const rejections = results
      .filter(r => r.status === "rejected")
      .map(r => String(r.reason?.message ?? r.reason));

    Assert.ok(
      rejections.some(m => m.includes("A generation is already in progress")),
      `Expected a rejection from the LlamaRunner guard, got: ${JSON.stringify(rejections)}`
    );
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
});

/**
 * Runs a full end-to-end test on the llama.cpp backend with a model that loads in llama but crashes during inference.
 */
add_task(async function test_ml_smoke_test_llama_crash() {
  info("Doing a crash call");
  await llama_crash();
  info(
    "Doing a normal call after the crash to verify it's up and running again"
  );
  await llama_works();
});

/**
 * Verifies metrics are correct when the prompt exceeds the runner's
 * default minOutputBufferSize (20), forcing the prefill phase to be
 * split across multiple chunks before isPhaseCompleted is set.
 */
add_task(async function test_ml_smoke_test_llama_long_prompt_metrics() {
  await llama_works({
    prompt: [
      { role: "system", content: "You are a friendly storyteller." },
      {
        role: "user",
        content:
          "Tell me a short story about a brave little mouse who travels " +
          "across a great forest, meets many friends along the way, and " +
          "finally finds a tiny treasure chest hidden behind a waterfall " +
          "at the top of the tallest hill in the whole valley.",
      },
    ],
    expectMultiChunkPrefill: true,
  });
});
