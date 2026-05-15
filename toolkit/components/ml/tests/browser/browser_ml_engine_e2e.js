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

/**
 * End to End test that the engine is indeed initialized with wllama when it is the
 * best-llama.
 */
add_task(async function test_e2e_choose_backend_best_wllama() {
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  const backendData = new Uint8Array([10, 20, 30]);

  const expectedBackendData = JSON.stringify(backendData);

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the MLEngine.worker.mjs code

  ${await getMLEngineWorkerCode()}

  // Stub
  ChromeUtils.defineESModuleGetters(
  lazy,
  {
    createFileUrl: "chrome://global/content/ml/Utils.sys.mjs",

  },
  { global: "current" }
);

  // Change the getBackend to a mocked version that doesn't actually do inference
  // but does initiate model downloads and engine initialization

  lazy.getBackend = async function (
    mlEngineWorker,
    backendData,
    {
      modelHubUrlTemplate,
      modelHubRootUrl,
      modelId,
      modelRevision,
      modelFile,
      engineId,
    } = {}
  ) {


    const receivedBackendData = JSON.stringify(backendData);
    if (receivedBackendData !== '${expectedBackendData}'){
      throw new Error("BackendData not equal Received: ".concat(receivedBackendData, " Expected: ", '${expectedBackendData}'));
    }

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
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

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the MLEngine.worker.mjs code

  ${await getMLEngineWorkerCode()}

  // Stub
  ChromeUtils.defineESModuleGetters(
  lazy,
  {
    createFileUrl: "chrome://global/content/ml/Utils.sys.mjs",

  },
  { global: "current" }
);

  // Change the getBackend to a mocked version that doesn't actually do inference
  // but does initiate model downloads and engine initialization

  lazy.getBackend = async function (
    mlEngineWorker,
    backendData,
    {
      modelHubUrlTemplate,
      modelHubRootUrl,
      modelId,
      modelRevision,
      modelFile,
      engineId,
    } = {}
  ) {


    const receivedBackendData = JSON.stringify(backendData);
    if (receivedBackendData !== '${expectedBackendData}'){
      throw new Error("BackendData not equal Received: ".concat(receivedBackendData, " Expected: ", '${expectedBackendData}'));
    }

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
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

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the MLEngine.worker.mjs code

  ${await getMLEngineWorkerCode()}

  // Stub
  ChromeUtils.defineESModuleGetters(
  lazy,
  {
    createFileUrl: "chrome://global/content/ml/Utils.sys.mjs",

  },
  { global: "current" }
);

  // Change the getBackend to a mocked version that doesn't actually do inference
  // but does initiate model downloads and engine initialization

  lazy.getBackend = async function (
    mlEngineWorker,
    backendData,
    {
      modelHubUrlTemplate,
      modelHubRootUrl,
      modelId,
      modelRevision,
      modelFile,
      engineId,
    } = {}
  ) {


    const receivedBackendData = JSON.stringify(backendData);
    if (receivedBackendData !== '${expectedBackendData}'){
      throw new Error("BackendData not equal Received: ".concat(receivedBackendData, " Expected: ", '${expectedBackendData}'));
    }

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
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

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the MLEngine.worker.mjs code

  ${await getMLEngineWorkerCode()}

  // Stub
  ChromeUtils.defineESModuleGetters(
  lazy,
  {
    createFileUrl: "chrome://global/content/ml/Utils.sys.mjs",

  },
  { global: "current" }
);

  // Change the getBackend to a mocked version that doesn't actually do inference
  // but does initiate model downloads and engine initialization

  lazy.getBackend = async function (
    mlEngineWorker,
    backendData,
    {
      modelHubUrlTemplate,
      modelHubRootUrl,
      modelId,
      modelRevision,
      modelFile,
      engineId,
    } = {}
  ) {

    const url = lazy.createFileUrl({
      model: modelId,
      revision: modelRevision,
      file: modelFile,
      urlTemplate: modelHubUrlTemplate,
      rootUrl: modelHubRootUrl,
    });

    await mlEngineWorker.getModelFile({url});

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
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

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the MLEngine.worker.mjs code

  ${await getMLEngineWorkerCode()}

  // Stub
  ChromeUtils.defineESModuleGetters(
  lazy,
  {
    createFileUrl: "chrome://global/content/ml/Utils.sys.mjs",

  },
  { global: "current" }
);

  // Change the getBackend to a mocked version that doesn't actually do inference
  // but does initiate model downloads and engine initialization

  lazy.getBackend = async function (
    mlEngineWorker,
    backendData,
    {
      modelHubUrlTemplate,
      modelHubRootUrl,
      modelId,
      modelRevision,
      modelFile,
      engineId,
    } = {}
  ) {

    const url = lazy.createFileUrl({
      model: modelId,
      revision: modelRevision,
      file: modelFile,
      urlTemplate: modelHubUrlTemplate,
      rootUrl: modelHubRootUrl,
    });

    await mlEngineWorker.getModelFile({url});

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
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
