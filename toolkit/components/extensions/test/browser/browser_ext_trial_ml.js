/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { ExtensionPermissions } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);

/* import-globals-from ../../../ml/tests/browser/head.js */
loadTestSubscript("../../../ml/tests/browser/head.js");

async function happyPath() {
  const options = {
    taskName: "summarization",
    modelId: "test-echo",
    modelRevision: "main",
  };

  await browser.trial.ml.createEngine(options);

  const data = ["This gets echoed."];

  browser.test.sendMessage("model_created");
  const inferencePromise = browser.trial.ml.runEngine({
    args: data,
  });

  browser.test.sendMessage("promise_created");

  const res = (await inferencePromise).output;

  // The `test-echo` task does not load a real model but
  // creates a fully functional worker in the infefence engine that returns
  // the same values abd the options it received.
  browser.test.assertDeepEq(
    res,
    data,
    "The text get echoed exercising the whole flow."
  );
  browser.test.sendMessage("inference_finished");
}

async function disabledFeature() {
  const options = {
    taskName: "summarization",
    modelId: "test-echo",
    modelRevision: "main",
  };

  await browser.test.assertRejects(
    browser.trial.ml.createEngine(options),
    /Trial ML API is disabled/,
    "Got the expected error message on trial ML disabled through prefs"
  );

  browser.test.sendMessage("model_created");
  browser.test.sendMessage("promise_created");
  browser.test.sendMessage("inference_finished");
}

function createExtension(background, files) {
  const id = Services.uuid.generateUUID().number;
  ExtensionPermissions.add(id, { permissions: ["trialML"], origins: [] });

  return ExtensionTestUtils.loadExtension({
    manifest: {
      optional_permissions: ["trialML"],
      background: { persistent: false },
      browser_specific_settings: { gecko: { id } },
    },
    background,
    files,
  });
}

function createMlExtensionTest({
  testName,
  backgroundFunction = happyPath,
  prefs = [["extensions.ml.enabled", true]],
}) {
  const func = async function () {
    const { cleanup, remoteClients } = await setup({ prefs });
    let extension = createExtension(backgroundFunction);

    await extension.startup();
    try {
      await extension.awaitMessage("model_created");
      await extension.awaitMessage("promise_created");
      await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);
      await extension.awaitMessage("inference_finished");
    } finally {
      await extension.unload();
      await EngineProcess.destroyMLEngine();
      await cleanup();
      await SpecialPowers.popPrefEnv();
    }
  };

  Object.defineProperty(func, "name", { value: testName });
  return func;
}

/**
 * Testing that the API won't work if the preferences are not set
 */
add_task(
  createMlExtensionTest({
    testName: "no_pref",
    backgroundFunction: disabledFeature,
    prefs: [["extensions.ml.enabled", false]],
  })
);

add_task(async function test_mldisabled_at_runtime() {
  const { cleanup, remoteClients } = await setup({
    prefs: [["extensions.ml.enabled", true]],
  });
  const extension = createExtension(
    function backgroundPage() {
      browser.test.onMessage.addListener(async (msg, data) => {
        if (msg != "bgpage:callTrialMLAPI") {
          browser.test.fail(`Got unexpected test message ${msg}`);
          return;
        }
        const { method, args } = data;
        try {
          browser.trial.ml[method](...args).then(
            res => {
              browser.test.sendMessage(`${msg}:done`, {
                success: res,
              });
            },
            err => {
              browser.test.sendMessage(`${msg}:done`, {
                error: err?.message,
              });
            }
          );
        } catch (err) {
          browser.test.fail(
            `Got unexpected exception on trialML API call: ${err}`
          );
          throw err;
        }
      });
      browser.test.sendMessage("bgpage:ready");
    },
    {
      "extpage.html": `<script src="extpage.js"></script>`,
      "extpage.js": function extPage() {
        try {
          // Register a trialML API listener to force the API
          // to be loaded asynchronously before the call to runEngine,
          // which (before Bug 2012543 changes) was making runEngine
          // to reject the generic "An unexpected error occurred" due
          // to the getAPI in the parent process rejecting and leaving
          // the API implementation in an inconsistent internal state.
          browser.trial.ml.onProgress.addListener(() => {});
          browser.trial.ml.runEngine({ args: "echo-text" }).then(
            res => {
              browser.test.sendMessage(`extpage:runEngine:done`, {
                success: res,
              });
            },
            err => {
              browser.test.sendMessage(`extpage:runEngine:done`, {
                error: err?.message,
              });
            }
          );
        } catch (err) {
          browser.test.sendMessage(`extpage:runEngine:done`, {
            error: err?.message,
          });
          browser.test.fail(
            `Got unexpected exception on trialML API call: ${err}`
          );
          throw err;
        }
      },
    }
  );

  await extension.startup();
  await extension.awaitMessage("bgpage:ready");

  info("Test trialML createEngine successful when called while API is enabled");
  const createEngineOptions = {
    taskName: "summarization",
    modelId: "test-echo",
    modelRevision: "main",
  };
  extension.sendMessage("bgpage:callTrialMLAPI", {
    method: "createEngine",
    args: [createEngineOptions],
  });
  await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);
  Assert.deepEqual(
    await extension.awaitMessage("bgpage:callTrialMLAPI:done"),
    { success: undefined },
    "createEngine call was successful"
  );

  info(
    "Test trialML runEngine fails when called after API is globally disabled"
  );
  SpecialPowers.pushPrefEnv({
    set: [["extensions.ml.enabled", false]],
  });

  extension.sendMessage("bgpage:callTrialMLAPI", {
    method: "runEngine",
    args: [{ args: "echo-text" }],
  });
  const createEngineRes = await extension.awaitMessage(
    "bgpage:callTrialMLAPI:done"
  );
  Assert.ok(
    /Trial ML API is disabled/.test(createEngineRes?.error),
    `runEngine call should get the expected disabled API error, Got: ${JSON.stringify(createEngineRes)}`
  );

  info(
    "Test trialML runEngine call from extension page loaded after API has been disabled"
  );
  let extPageTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `moz-extension://${extension.uuid}/extpage.html`
  );
  const newExtPageRes = await extension.awaitMessage("extpage:runEngine:done");
  Assert.ok(
    /Trial ML API is disabled/.test(newExtPageRes?.error),
    `runEngine call should get the expected disabled API error, Got: ${JSON.stringify(newExtPageRes)}`
  );
  BrowserTestUtils.removeTab(extPageTab);
  SpecialPowers.popPrefEnv();

  await extension.unload();
  await EngineProcess.destroyMLEngine();
  await cleanup();
  await SpecialPowers.popPrefEnv();
});

/**
 * Testing the happy path.
 */
add_task(createMlExtensionTest({ testName: "happy_path" }));

/**
 * Testing errors when options are not valid
 */
add_task(
  createMlExtensionTest({
    testName: "options_error",
    backgroundFunction: async function backgroundScript() {
      const options = {
        taskName: "summari@#zation",
        modelId: "test-echo",
        modelRevision: "main",
      };

      try {
        await browser.trial.ml.createEngine(options);
        browser.test.fail("Bad options should be caught");
      } catch (err) {
        browser.test.assertTrue(
          err.message.startsWith("Unsupported task summari@#zation")
        );
      }

      browser.test.sendMessage("model_created");
      browser.test.sendMessage("promise_created");
      browser.test.sendMessage("inference_finished");
    },
  })
);

add_task(
  createMlExtensionTest({
    testName: "options_error_2",
    backgroundFunction: async function backgroundScript() {
      const options = {
        taskName: "summarization",
        modelId: "test-ec@ho",
        modelRevision: "main",
      };

      try {
        await browser.trial.ml.createEngine(options);
        browser.test.fail("Bad options should be caught");
      } catch (err) {
        browser.test.assertTrue(err.message.startsWith("Invalid value"));
      }

      browser.test.sendMessage("model_created");
      browser.test.sendMessage("promise_created");
      browser.test.sendMessage("inference_finished");
    },
  })
);

/**
 * Test re-creating the engine after the idle timeout drops it.
 */
add_task(async function test_idle_timeout() {
  const { cleanup, remoteClients } = await setup({
    prefs: [["extensions.ml.enabled", true]],
  });
  let extension = createExtension(async function background() {
    const options = {
      taskName: "summarization",
      modelId: "test-echo",
      modelRevision: "main",
    };

    await browser.trial.ml.createEngine(options);
    browser.test.sendMessage("model_created");

    browser.test.onMessage.addListener(async (_msg, data) => {
      const inferencePromise = browser.trial.ml.runEngine({ args: data });
      browser.test.sendMessage("promise_created");

      const res = (await inferencePromise).output;
      browser.test.assertDeepEq(
        res,
        data,
        "The text get echoed exercising the whole flow."
      );
      browser.test.sendMessage("inference_finished");
    });
  });

  await extension.startup();
  try {
    await extension.awaitMessage("model_created");

    // Run inference the first time.
    extension.sendMessage("run", "Marco");
    await extension.awaitMessage("promise_created");
    await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);
    await extension.awaitMessage("inference_finished");

    // Simulate the engine getting destroyed after an idle timeout.
    await EngineProcess.destroyMLEngine();
    ok(EngineProcess.areAllEnginesTerminated(), "Nothing is running.");

    // Run inference without calling createEngine again.
    extension.sendMessage("run", "Polo");
    await extension.awaitMessage("promise_created");
    await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);
    await extension.awaitMessage("inference_finished");
  } finally {
    await extension.unload();
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
});

add_task(async function test_deleteCachedModels() {
  const { cleanup } = await setup({
    prefs: [["extensions.ml.enabled", true]],
  });
  const extension = createExtension(async function background() {
    await browser.trial.ml.deleteCachedModels();
    browser.test.sendMessage("cached-models-deleted");
  });
  await extension.startup();

  await extension.awaitMessage("cached-models-deleted");

  await extension.unload();
  await EngineProcess.destroyMLEngine();
  await cleanup();
});
