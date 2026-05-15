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

      let dumpID = null;

      try {
        dumpID = subject.getPropertyAsAString("dumpID");
        ok(dumpID, "There should be a dumpID");
      } catch (err) {
        info("No dumpID");
      }

      if (dumpID !== null) {
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

async function llama_works() {
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
        type: "dist",
      },
    ];

    info("Calling runWithGenerator for normal run");
    for await (const val of engine.runWithGenerator({
      prompt,
      samplers,
    })) {
      info(val.text);
    }

    info("Normal run worked");
    // TODO add an assertion
    Assert.equal(1, 1);
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
