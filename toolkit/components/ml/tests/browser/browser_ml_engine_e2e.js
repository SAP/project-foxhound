/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const { BACKENDS } = ChromeUtils.importESModule(
  "chrome://global/content/ml/EngineProcess.sys.mjs"
);

const { MLUtils } = ChromeUtils.importESModule(
  "chrome://global/content/ml/Utils.sys.mjs"
);

const E2E_TEST_BASE_URL =
  "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/";

/**
 * End to End test that the engine is indeed initialized with wllama when it is the
 * best-llama.
 */
add_task(async function test_e2e_choose_backend_best_wllama() {
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  const backendData = new Uint8Array([10, 20, 30]);
  const expectedBackendData = JSON.stringify(backendData);

  const workerURL = new URL(
    E2E_TEST_BASE_URL + "ml_engine_e2e_backend_stub.worker.mjs"
  );
  workerURL.searchParams.set("expectedBackendData", expectedBackendData);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: workerURL.href, options: { type: "module" } };
    });

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(backendData);

  let chooseBestBackendStub = sinon
    .stub(MLEngineParent, "chooseBestBackend")
    .returns(BACKENDS.wllama);

  try {
    await createEngine({
      engineId: "main",
      taskName: "real-wllama-text-generation",
      featureId: "link-preview",
      backend: BACKENDS.bestLlama,
      modelId: "acme/bert",
      modelHubUrlTemplate: "{model}/resolve/{revision}",
      modelRevision: "v0.4",
      modelHubRootUrl:
        "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
      modelFile: "onnx/config.json",
    });
  } finally {
    await EngineProcess.destroyMLEngine();
    await IndexedDBCache.init({ reset: true });
    wasmBufferStub.restore();
    promiseStub.restore();
    chooseBestBackendStub.restore();
  }
});

/**
 * End to End test that the engine can indeed fail if it doesn't use best-llama.
 */
add_task(async function test_e2e_choose_backend_can_detect_failure() {
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  const backendData = new Uint8Array([10, 20, 30]);
  const expectedBackendData = JSON.stringify("data so no matches");

  const workerURL = new URL(
    E2E_TEST_BASE_URL + "ml_engine_e2e_backend_stub.worker.mjs"
  );
  workerURL.searchParams.set("expectedBackendData", expectedBackendData);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: workerURL.href, options: { type: "module" } };
    });

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(backendData);

  let chooseBestBackendStub = sinon
    .stub(MLEngineParent, "chooseBestBackend")
    .returns(BACKENDS.wllama);

  try {
    await Assert.rejects(
      createEngine({
        engineId: "main",
        taskName: "real-wllama-text-generation",
        featureId: "link-preview",
        backend: BACKENDS.bestLlama,
        modelId: "acme/bert",
        modelHubUrlTemplate: "{model}/resolve/{revision}",
        modelRevision: "v0.4",
        modelHubRootUrl:
          "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
        modelFile: "onnx/config.json",
      }),
      /BackendData not equal Received:/,
      "The call should be rejected because it used the wrong backend"
    );
  } finally {
    await EngineProcess.destroyMLEngine();
    await IndexedDBCache.init({ reset: true });
    wasmBufferStub.restore();
    promiseStub.restore();
    chooseBestBackendStub.restore();
  }
});

/**
 * End to End test that the engine is indeed initialized with llama.cpp when it is the
 * best-llama.
 */
add_task(async function test_e2e_choose_backend_best_llamma_cpp() {
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  const backendData = new Uint8Array([10, 20, 30]);
  const expectedBackendData = JSON.stringify(null);

  const workerURL = new URL(
    E2E_TEST_BASE_URL + "ml_engine_e2e_backend_stub.worker.mjs"
  );
  workerURL.searchParams.set("expectedBackendData", expectedBackendData);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: workerURL.href, options: { type: "module" } };
    });

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(backendData);

  let chooseBestBackendStub = sinon
    .stub(MLEngineParent, "chooseBestBackend")
    .returns(BACKENDS.llamaCpp);

  try {
    await createEngine({
      engineId: "main",
      taskName: "real-wllama-text-generation",
      featureId: "link-preview",
      backend: BACKENDS.bestLlama,
      modelId: "acme/bert",
      modelHubUrlTemplate: "{model}/resolve/{revision}",
      modelRevision: "v0.4",
      modelHubRootUrl:
        "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
      modelFile: "onnx/config.json",
    });
  } finally {
    await EngineProcess.destroyMLEngine();
    await IndexedDBCache.init({ reset: true });
    wasmBufferStub.restore();
    promiseStub.restore();
    chooseBestBackendStub.restore();
  }
});

/**
 * End to End test that the engine can be cancelled.
 */
add_task(async function test_e2e_engine_can_be_cancelled() {
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  const backendData = new Uint8Array([10, 20, 30]);
  const workerURL = E2E_TEST_BASE_URL + "ml_engine_e2e_cancel_stub.worker.mjs";

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: workerURL, options: { type: "module" } };
    });

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(backendData);

  const controller = new AbortController();
  const { signal } = controller;
  controller.abort();

  try {
    await Assert.rejects(
      createEngine(
        {
          engineId: "main5",
          taskName: "real-wllama-text-generation",
          featureId: "link-preview",
          backend: BACKENDS.llamaCpp,
          modelId: "acme/bert",
          modelHubUrlTemplate: "{model}/resolve/{revision}",
          modelRevision: "v0.1",
          modelHubRootUrl:
            "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
          modelFile: "onnx/config.json",
        },
        null,
        signal
      ),
      /AbortError:/,
      "The call should be cancelled"
    );
  } catch (err) {
    Assert.ok(false, `Expected AbortError. Got ${err}`);
  } finally {
    await EngineProcess.destroyMLEngine();
    await IndexedDBCache.init({ reset: true });
    wasmBufferStub.restore();
    promiseStub.restore();
  }
});

/**
 * End to End test that the engine can be cancelled after fetch success.
 */
add_task(async function test_e2e_engine_can_be_cancelled_after_fetch() {
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  const backendData = new Uint8Array([10, 20, 30]);
  const workerURL = E2E_TEST_BASE_URL + "ml_engine_e2e_cancel_stub.worker.mjs";

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: workerURL, options: { type: "module" } };
    });

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(backendData);

  const controller = new AbortController();
  const { signal } = controller;

  const fetchUrlStub = sinon
    .stub(MLUtils, "fetchUrl")
    .callsFake((url, { signal: _, ...rest } = {}) => {
      const p = fetch(url, rest);

      controller.abort();

      return p;
    });

  try {
    await Assert.rejects(
      createEngine(
        {
          engineId: "main5",
          taskName: "real-wllama-text-generation",
          featureId: "link-preview",
          backend: BACKENDS.llamaCpp,
          modelId: "acme/bert",
          modelHubUrlTemplate: "{model}/resolve/{revision}",
          modelRevision: "v0.1",
          modelHubRootUrl:
            "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
          modelFile: "onnx/config.json",
        },
        null,
        signal
      ),
      /AbortError:/,
      "The call should be cancelled"
    );
  } catch (err) {
    Assert.ok(false, `Expected AbortError. Got ${err}`);
  } finally {
    await EngineProcess.destroyMLEngine();
    Assert.equal(MLEngine.getInstance("main5"), null);
    await IndexedDBCache.init({ reset: true });
    wasmBufferStub.restore();
    promiseStub.restore();
    fetchUrlStub.restore();
  }
});
