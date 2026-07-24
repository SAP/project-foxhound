/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

requestLongerTimeout(2);

const RAW_PIPELINE_OPTIONS = {
  taskName: "moz-echo",
  timeoutMS: -1,
  modelId: "Mozilla/test",
  featureId: "test-feature",
  backend: "test-backend",
};

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const { MLTelemetry } = ChromeUtils.importESModule(
  "chrome://global/content/ml/MLTelemetry.sys.mjs"
);

function getGleanCount(metricsName, engineId = "default-engine") {
  var metrics = Glean.firefoxAiRuntime[metricsName];

  // events
  if (["runInferenceFailure", "engineCreationFailure"].includes(metricsName)) {
    return metrics.testGetValue()?.length || 0;
  }

  // labeled timing distribution
  return metrics[engineId]?.testGetValue()?.count || 0;
}

/**
 * Check that we record the engine creation and the inference run
 */
add_task(async function test_default_telemetry() {
  const { cleanup, remoteClients } = await setup();
  const engineCreationSuccessCount = getGleanCount("engineCreationSuccess");
  const runInferenceSuccessCount = getGleanCount("runInferenceSuccess");
  const runInferenceFailureCount = getGleanCount("runInferenceFailure");
  const engineCreationFailureCount = getGleanCount("engineCreationFailure");

  info("Get the engine");
  const engineInstance = await createEngine(RAW_PIPELINE_OPTIONS);

  info("Run the inference");
  const inferencePromise = engineInstance.run({
    data: "This gets echoed.",
  });

  info("Wait for the pending downloads.");
  await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);

  const res = await inferencePromise;
  Assert.equal(
    res.output.echo,
    "This gets echoed.",
    "The text get echoed exercising the whole flow."
  );

  {
    info("Test the run_inference_success_flow event");
    const inferenceFlowEvents =
      Glean.firefoxAiRuntime.runInferenceSuccessFlow.testGetValue();
    Assert.ok(
      inferenceFlowEvents && !!inferenceFlowEvents.length,
      "At least one run_inference_success_flow event was recorded"
    );
    const lastInferenceEvent = inferenceFlowEvents.at(-1);
    const { extra: inferenceExtra } = lastInferenceEvent;

    // Helper to check that a number field is present and >= 0
    const checkNumber = (key, isOptional = false) => {
      const value = inferenceExtra[key];
      if (isOptional && (value === null || value === undefined)) {
        return; // Optional field not present is OK
      }
      Assert.notEqual(value, null, `${key} should be present`);
      const number = Number(value); // Quantities are stored as strings
      Assert.ok(!Number.isNaN(number), `${key} should be a number`);
      Assert.greaterOrEqual(number, 0, `${key} should be >= 0`);
    };

    // Check flow_id is present
    Assert.ok(inferenceExtra.flow_id, "flow_id should be present");

    // Check all required timing/token metrics
    checkNumber("tokenizing_time", true);
    checkNumber("inference_time", true);
    checkNumber("decoding_time", true);
    checkNumber("input_tokens", true);
    checkNumber("output_tokens", true);
    checkNumber("time_to_first_token", true);
    checkNumber("tokens_per_second", true);
    checkNumber("time_per_output_token", true);
  }

  {
    info("Test the engine_run event");
    const value = Glean.firefoxAiRuntime.engineRun.testGetValue();
    Assert.ok(
      value && !!value.length,
      "At least one engine_run event was recorded"
    );
    const lastEngineRunEvent = value.at(-1);
    const { extra } = lastEngineRunEvent;
    const checkNumber = key => {
      const value = extra[key];
      Assert.notEqual(value, null, `${key} should be present`);
      const number = Number(value); // Quantities are stored as strings.
      Assert.ok(!Number.isNaN(number), `${key} should be a number`);
      Assert.greater(number, 0, `${key} should be greater than 0`);
    };
    checkNumber("cpu_milliseconds");
    checkNumber("wall_milliseconds");
    checkNumber("cores");
    checkNumber("cpu_utilization");
    checkNumber("memory_bytes");

    Assert.equal(extra.feature_id, "test-feature");
    Assert.equal(extra.engine_id, "default-engine");
    Assert.equal(extra.model_id, "Mozilla/test");
    Assert.equal(extra.backend, "test-backend");
  }

  Assert.equal(res.output.dtype, "q8", "The config was enriched by RS");
  ok(
    !EngineProcess.areAllEnginesTerminated(),
    "The engine process is still active."
  );

  Assert.equal(
    getGleanCount("engineCreationSuccess"),
    engineCreationSuccessCount + 1
  );

  Assert.equal(
    getGleanCount("engineCreationSuccess"),
    engineCreationSuccessCount + 1
  );

  Assert.equal(
    getGleanCount("runInferenceSuccess"),
    runInferenceSuccessCount + 1
  );

  Assert.equal(getGleanCount("runInferenceFailure"), runInferenceFailureCount);

  Assert.equal(
    getGleanCount("engineCreationFailure"),
    engineCreationFailureCount
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

/**
 * Check that we record the engine creation and the inference failure
 */
add_task(async function test_ml_engine_run_failure() {
  const { cleanup, remoteClients } = await setup();
  const engineCreationSuccessCount = getGleanCount("engineCreationSuccess");
  const runInferenceSuccessCount = getGleanCount("runInferenceSuccess");
  const runInferenceFailureCount = getGleanCount("runInferenceFailure");
  const engineCreationFailureCount = getGleanCount("engineCreationFailure");

  info("Get the engine");
  const engineInstance = await createEngine(RAW_PIPELINE_OPTIONS);

  info("Run the inference with a throwing example.");
  const inferencePromise = engineInstance.run("throw");

  info("Wait for the pending downloads.");
  await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);

  let error;
  try {
    await inferencePromise;
  } catch (e) {
    error = e;
  }
  is(
    error?.message,
    'Error: Received the message "throw", so intentionally throwing an error.',
    "The error is correctly surfaced."
  );

  Assert.equal(
    getGleanCount("engineCreationSuccess"),
    engineCreationSuccessCount + 1
  );

  Assert.equal(getGleanCount("runInferenceSuccess"), runInferenceSuccessCount);

  Assert.equal(
    getGleanCount("runInferenceFailure"),
    runInferenceFailureCount + 1
  );

  Assert.equal(
    getGleanCount("engineCreationFailure"),
    engineCreationFailureCount
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

/**
 * Check that we record the engine creation failure
 */
add_task(async function test_engine_creation_failure() {
  const { cleanup } = await setup();
  const engineCreationSuccessCount = getGleanCount("engineCreationSuccess");
  const engineCreationFailureCount = getGleanCount("engineCreationFailure");
  const runInferenceSuccessCount = getGleanCount("runInferenceSuccess");
  const runInferenceFailureCount = getGleanCount("runInferenceFailure");

  try {
    await createEngine({ taskName: "moz-echo", featureId: "I DONT EXIST" });
  } catch (e) {}

  Assert.equal(
    getGleanCount("engineCreationSuccess"),
    engineCreationSuccessCount
  );

  Assert.equal(
    getGleanCount("engineCreationSuccess"),
    engineCreationSuccessCount
  );

  Assert.equal(getGleanCount("runInferenceSuccess"), runInferenceSuccessCount);

  Assert.equal(getGleanCount("runInferenceFailure"), runInferenceFailureCount);

  Assert.equal(
    getGleanCount("engineCreationFailure"),
    engineCreationFailureCount + 1
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

/**
 * Check that model download telemetry is working as expected
 */
add_task(async function test_model_download_telemetry_success() {
  let initialModelDownloadsCount =
    Glean.firefoxAiRuntime.modelDownload.testGetValue()?.length || 0;
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the original worker code

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
  // but does initiate model downloads

  lazy.getBackend = async function (
    mlEngineWorker,
    _,
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

    const result = await mlEngineWorker.getModelFile({url}).catch(() => {});

    // Download Another file using engineId as revision
    const url2 = lazy.createFileUrl({
      model: modelId,
      revision: engineId,
      file: modelFile,
      urlTemplate: modelHubUrlTemplate,
      rootUrl: modelHubRootUrl,
    });
    const result2 = await mlEngineWorker.getModelFile({url: url2}).catch(() => {});

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(new ArrayBuffer(16));

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
    });

  await IndexedDBCache.init({ reset: true });
  await EngineProcess.destroyMLEngine();

  await createEngine({
    engineId: "main",
    taskName: "real-wllama-text-generation",
    featureId: "link-preview",
    backend: "wllama",
    modelId: "acme/bert",
    modelHubUrlTemplate: "{model}/resolve/{revision}",
    modelRevision: "v0.1",
    modelHubRootUrl:
      "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
    modelFile: "onnx/config.json",
  });

  let observed = Glean.firefoxAiRuntime.modelDownload.testGetValue();

  Assert.equal(observed?.length || 0, initialModelDownloadsCount + 6);

  observed = observed.slice(-6);

  Assert.equal(new Set(observed.map(obj => obj.extra.modelDownloadId)).size, 1);

  Assert.deepEqual(
    observed.map(obj => obj.extra.step),
    [
      "start_download",
      "start_file_download",
      "end_file_download_success",
      "start_file_download",
      "end_file_download_success",
      "end_download_success",
    ]
  );
  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  wasmBufferStub.restore();
  promiseStub.restore();
});

/**
 * Check that model download telemetry is working as expected
 */
add_task(async function test_model_download_telemetry_fail() {
  let initialModelDownloadsCount =
    Glean.firefoxAiRuntime.modelDownload.testGetValue()?.length || 0;
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the original worker code

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
  // but does initiate model downloads

  lazy.getBackend = async function (
    mlEngineWorker,
    _,
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

    const result = await mlEngineWorker.getModelFile({url}).catch(() => {});

    // Download Another file using engineId as revision
    const url2 = lazy.createFileUrl({
      model: modelId,
      revision: engineId,
      file: modelFile,
      urlTemplate: modelHubUrlTemplate,
      rootUrl: modelHubRootUrl,
    });
    const result2 = await mlEngineWorker.getModelFile({url: url2}).catch(() => {});

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(new ArrayBuffer(16));

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
    });

  await IndexedDBCache.init({ reset: true });
  await EngineProcess.destroyMLEngine();
  await createEngine({
    engineId: "main",
    taskName: "real-wllama-text-generation",
    featureId: "link-preview",
    backend: "wllama",
    modelId: "acme-not-found/bert",
    modelHubUrlTemplate: "{model}/resolve/{revision}",
    modelRevision: "v0.1",
    modelHubRootUrl:
      "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
    modelFile: "onnx/config.json",
  }).catch(() => {});

  let observed = Glean.firefoxAiRuntime.modelDownload.testGetValue();

  Assert.equal(observed?.length || 0, initialModelDownloadsCount + 6);

  observed = observed.slice(-6);

  Assert.equal(new Set(observed.map(obj => obj.extra.modelDownloadId)).size, 1);

  Assert.deepEqual(
    observed.map(obj => obj.extra.step),
    [
      "start_download",
      "start_file_download",
      "end_file_download_failed",
      "start_file_download",
      "end_file_download_failed",
      "end_download_failed",
    ]
  );

  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  wasmBufferStub.restore();
  promiseStub.restore();
});

/**
 * Check that model download telemetry is working as expected
 */
add_task(async function test_model_download_telemetry_mixed() {
  let initialModelDownloadsCount =
    Glean.firefoxAiRuntime.modelDownload.testGetValue()?.length || 0;
  // Allow any url
  Services.env.set("MOZ_ALLOW_EXTERNAL_ML_HUB", "true");

  // Mocking function used in the workers or child doesn't work.
  // So we are stubbing the code run by the worker.
  const workerCode = `
  // Inject the original worker code

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
  // but does initiate model downloads

  lazy.getBackend = async function (
    mlEngineWorker,
    _,
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

    const result = await mlEngineWorker.getModelFile({url}).catch(() => {});

    // Download Another file using engineId as revision
    const url2 = lazy.createFileUrl({
      model: modelId,
      revision: engineId,
      file: modelFile,
      urlTemplate: modelHubUrlTemplate,
      rootUrl: modelHubRootUrl,
    });
    const result2 = await mlEngineWorker.getModelFile({url: url2}).catch(() => {});

    return {
      run: () => {},
    };
  };
`;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const blobURL = URL.createObjectURL(blob);

  let wasmBufferStub = sinon
    .stub(MLEngineParent, "getWasmArrayBuffer")
    .returns(new ArrayBuffer(16));

  let promiseStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(function () {
      return { url: blobURL, options: { type: "module" } };
    });

  await createEngine({
    engineId: "main",
    taskName: "real-wllama-text-generation",
    featureId: "link-preview",
    backend: "wllama",
    modelId: "acme/bert",
    modelHubUrlTemplate: "{model}/resolve/{revision}",
    modelRevision: "v0.4",
    modelHubRootUrl:
      "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data",
    modelFile: "onnx/config.json",
  }).catch(() => {});

  let observed = Glean.firefoxAiRuntime.modelDownload.testGetValue();

  Assert.equal(observed?.length || 0, initialModelDownloadsCount + 6);

  observed = observed.slice(-6);

  Assert.equal(new Set(observed.map(obj => obj.extra.modelDownloadId)).size, 1);

  Assert.deepEqual(
    observed.map(obj => obj.extra.step),
    [
      "start_download",
      "start_file_download",
      "end_file_download_failed",
      "start_file_download",
      "end_file_download_success",
      "end_download_success",
    ]
  );
  await EngineProcess.destroyMLEngine();
  await IndexedDBCache.init({ reset: true });

  wasmBufferStub.restore();
  promiseStub.restore();
});

function getLastEvent(gleanMetric) {
  const events = gleanMetric.testGetValue() || [];
  return events.length ? events.at(-1) : null;
}

// A helper to wait for a new Glean event
async function waitForGleanEvent(gleanMetric) {
  const originalEvent = getLastEvent(gleanMetric);
  await TestUtils.waitForCondition(() => {
    return getLastEvent(gleanMetric) !== originalEvent;
  }, "Waiting for new Glean event");
  return getLastEvent(gleanMetric);
}

/**
 * Tests that the MLTelemetry constructor auto-generates a flowId
 * if one is not provided.
 */
add_task(async function test_ml_telemetry_flow_id_auto_generated() {
  info("Starting MLTelemetry test: Constructor auto-generates flowId");

  const telemetry1 = new MLTelemetry({ featureId: "feature-auto-id" });
  telemetry1.sessionStart({ interaction: "test-1" });
  let recordedEvent = await waitForGleanEvent(
    Glean.firefoxAiRuntime.sessionStart
  );

  Assert.ok(
    recordedEvent.extra.flow_id,
    "An event was recorded with a flow_id"
  );
  Assert.equal(
    recordedEvent.extra.flow_id,
    telemetry1.flowId,
    "Glean's recorded flow_id matches the instance's flowId"
  );
  Assert.equal(
    recordedEvent.extra.flow_id.length,
    36,
    "The auto-generated flow_id looks like a UUID"
  );
});

/**
 * Tests that the MLTelemetry constructor correctly uses a flowId
 * when one is provided.
 */
add_task(async function test_ml_telemetry_flow_id_provided() {
  info("Starting MLTelemetry test: Constructor accepts provided flowId");

  const telemetry2 = new MLTelemetry({
    featureId: "feature-custom-id",
    flowId: "my-custom-flow-id-69420",
  });
  telemetry2.sessionStart({ interaction: "test-2" });

  let recordedEvent = await waitForGleanEvent(
    Glean.firefoxAiRuntime.sessionStart
  );

  Assert.ok(
    recordedEvent.extra.flow_id,
    "An event was recorded with a flow_id"
  );
  Assert.equal(
    recordedEvent.extra.flow_id,
    "my-custom-flow-id-69420",
    "Glean's recorded flow_id matches the provided flowId"
  );
  Assert.equal(
    recordedEvent.extra.flow_id,
    telemetry2.flowId,
    "Glean's recorded flow_id also matches the instance's flowId"
  );
});

/**
 * Tests that the flowId set on the instance is used by all
 * telemetry methods (e.g., sessionStart and sessionEnd).
 */
add_task(async function test_ml_telemetry_flow_id_persistent_on_instance() {
  info("Starting MLTelemetry test: Instance flowId persists across methods");

  const telemetry3 = new MLTelemetry({
    featureId: "feature-persistent",
    flowId: "my-instance-flow-id-789",
  });

  // Check sessionStart
  telemetry3.sessionStart({ interaction: "test-3" });
  let startEvent = await waitForGleanEvent(Glean.firefoxAiRuntime.sessionStart);
  Assert.equal(
    startEvent.extra.flow_id,
    "my-instance-flow-id-789",
    "sessionStart event used the instance flowId"
  );

  // Check sessionEnd
  telemetry3.endSession({
    status: "ok",
  });
  let endEvent = await waitForGleanEvent(Glean.firefoxAiRuntime.sessionEnd);

  Assert.ok(
    endEvent.extra.flow_id,
    "endSession event was recorded with a flow_id"
  );
  Assert.equal(
    endEvent.extra.flow_id,
    "my-instance-flow-id-789",
    "endSession event used the *same* instance flowId"
  );

  // Final check that the instance property itself wasn't modified
  Assert.equal(
    telemetry3.flowId,
    "my-instance-flow-id-789",
    "The instance's flowId property remained unchanged"
  );
});

add_task(async function test_run_with_generator_telemetry() {
  const { cleanup } = await setup();
  const { server: mockServer, port } = startMockOpenAI({
    echo: "Streaming response.",
  });

  info("Create the engine with OpenAI backend");
  const engineInstance = await createEngine({
    taskName: "text-generation",
    featureId: "about-inference",
    backend: "openai",
    modelId: "test-model",
    apiKey: "test-key",
    baseURL: `http://localhost:${port}/v1`,
  });

  info("Call runWithGenerator");
  const generator = engineInstance.runWithGenerator({
    args: [{ role: "user", content: "test streaming" }],
    streamOptions: { enabled: true },
  });

  info("Manually iterate to capture both chunks and return value");
  let iterResult;
  while (true) {
    iterResult = await generator.next();
    if (iterResult.done) {
      break;
    }
  }

  {
    info("Test the engine_run event for runWithGenerator");
    const value = Glean.firefoxAiRuntime.engineRun.testGetValue();
    Assert.ok(
      value && !!value.length,
      "At least one engine_run event was recorded"
    );
    const lastEngineRunEvent = value.at(-1);
    const { extra } = lastEngineRunEvent;
    info("Recorded Glean engine_run event: " + JSON.stringify(extra, null, 2));
    const checkNumber = key => {
      const value = extra[key];
      Assert.notEqual(value, null, `${key} should be present`);
      const number = Number(value);
      Assert.ok(!Number.isNaN(number), `${key} should be a number`);
      Assert.greater(number, 0, `${key} should be greater than 0`);
    };
    checkNumber("cpu_milliseconds");
    checkNumber("wall_milliseconds");
    checkNumber("cores");
    checkNumber("cpu_utilization");
    checkNumber("memory_bytes");
    checkNumber("character_count");
    Assert.ok(!extra.token_count, "Token count is not implemented yet.");

    Assert.equal(extra.feature_id, "about-inference");
    Assert.equal(extra.backend, "openai");
  }

  await EngineProcess.destroyMLEngine();
  await cleanup();
  await stopMockOpenAI(mockServer);
});
