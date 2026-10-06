/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/// <reference path="head.js" />

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const WORKER_STUB_URL =
  "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/ml_best_onnx_fallback_stub.worker.mjs";

const BEST_ONNX_OPTIONS = {
  taskName: "text-classification",
  modelId: "acme/bert",
  dtype: "q8",
  backend: "best-onnx",
  modelHubUrlTemplate: "{model}/resolve/{revision}",
};

/**
 * Stubs the worker's getBackend so any onnx-native engine creation rejects
 * with the same message InferenceSession.cpp uses when libonnxruntime is
 * missing. Returns a cleanup function the caller must invoke in `finally`.
 */
function stubNativeUnavailable() {
  const workerConfigStub = sinon
    .stub(MLEngineParent, "getWorkerConfig")
    .callsFake(() => ({ url: WORKER_STUB_URL, options: { type: "module" } }));
  return () => {
    workerConfigStub.restore();
  };
}

/**
 * Demonstrates the lazy-init contract for `gBestOnnxBackend` (see
 * MLEngineChild.sys.mjs). On the very first best-onnx call in an inference
 * child process the cache is null. `chooseBestBackend` is required to
 * tolerate that state — it returns "onnx-native" optimistically and lets
 * the engine-creation try/catch resolve the actual outcome, caching either
 * "onnx-native" (success) or "onnx" (ORT-unavailable). No priming step is
 * needed for correctness; if `chooseBestBackend` instead threw on null,
 * the very first best-onnx call in any inference child would fail.
 *
 * This test exercises the failure half of that contract by stubbing the
 * native attempt so the outcome is deterministic across platforms. Placed
 * first in this file so it runs against the freshest module state.
 */
add_task(async function test_best_onnx_lazy_init_handles_null_cache() {
  const { cleanup, remoteClients } = await setup();
  const restoreStub = stubNativeUnavailable();

  try {
    // First best-onnx call: cache may be null. The lazy-init path inside
    // chooseBestBackend returns "onnx-native" optimistically; the stub
    // forces the catch in initializeInferenceEngine, which caches "onnx"
    // and retries with wasm. If chooseBestBackend threw on null, this
    // createEngine would reject before any of that.
    const enginePromise = createEngine(BEST_ONNX_OPTIONS);
    await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);
    const engine = await enginePromise;

    Assert.equal(
      engine.pipelineOptions.backend,
      "onnx",
      "First best-onnx call resolves correctly without a primed cache."
    );
  } finally {
    restoreStub();
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
});

/**
 * Verifies best-onnx falls back to the wasm onnx backend when the native
 * runtime fails to load. The dispatcher's catch + retry path runs with
 * backend "onnx" and we observe the resolved backend on the parent-side
 * MLEngine.
 *
 * A non-mocked task (text-classification) is required so the child awaits
 * dispatcher.isReady() and runs initializeInferenceEngine; moz-echo would
 * short-circuit that path and the stub would never be reached.
 */
add_task(async function test_best_onnx_falls_back_to_wasm() {
  const { cleanup, remoteClients } = await setup();
  const restoreStub = stubNativeUnavailable();

  try {
    const enginePromise = createEngine(BEST_ONNX_OPTIONS);

    // Only the wasm retry pulls the runtime; the native attempt is stubbed
    // to throw before getWasmArrayBuffer is reached.
    await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);

    const engine = await enginePromise;

    Assert.equal(
      engine.pipelineOptions.backend,
      "onnx",
      "best-onnx falls back to wasm onnx when the native runtime is missing."
    );
  } finally {
    restoreStub();
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
});

/**
 * Repeated best-onnx requests with the same options must reuse the existing
 * engine even when "best-onnx" resolved via the wasm fallback path. Before
 * PipelineOptions.equals understood the sentinel, the cached engine's
 * backend ("onnx") never equalled the new request's backend ("best-onnx").
 */
add_task(async function test_best_onnx_engine_is_reused_after_fallback() {
  const { cleanup, remoteClients } = await setup();
  const restoreStub = stubNativeUnavailable();

  try {
    const enginePromise1 = createEngine(BEST_ONNX_OPTIONS);
    await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);
    const engine1 = await enginePromise1;

    const engine2 = await createEngine(BEST_ONNX_OPTIONS);

    Assert.strictEqual(
      engine1,
      engine2,
      "Repeated best-onnx createEngine returns the cached engine instance."
    );
  } finally {
    restoreStub();
    await EngineProcess.destroyMLEngine();
    await cleanup();
  }
});
