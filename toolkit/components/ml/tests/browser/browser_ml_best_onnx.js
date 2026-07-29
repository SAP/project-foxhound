/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/// <reference path="head.js" />

/**
 * Runs a real best-onnx engine and verifies it resolves to onnx-native on
 * platforms that bundle the native runtime. The skip-if in browser.toml gates
 * this test to those platforms; see browser_ml_best_onnx_fallback.js for the
 * inverted case.
 */
const BEST_ONNX_OPTIONS = {
  taskName: "text-classification",
  modelId: "acme/bert",
  dtype: "q8",
  backend: "best-onnx",
  modelHubUrlTemplate: "{model}/resolve/{revision}",
};

add_task(async function test_best_onnx_resolves_to_native() {
  const { cleanup } = await setup();

  const engine = await createEngine(BEST_ONNX_OPTIONS);

  const res = await engine.run({ args: ["dummy data"] });
  Assert.equal(res[0].label, "LABEL_0", "Inference ran via best-onnx.");

  Assert.equal(
    engine.pipelineOptions.backend,
    "onnx-native",
    "best-onnx resolves to onnx-native when the native runtime is available."
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

/**
 * Repeated best-onnx requests with the same options must reuse the existing
 * engine instead of tearing it down and recreating it. Before
 * PipelineOptions.equals understood that "best-onnx" matches its resolved
 * concrete backends, the cached engine's backend ("onnx-native") never
 * equalled the new request's backend ("best-onnx") and the engine was
 * rebuilt on every call.
 */
add_task(async function test_best_onnx_engine_is_reused() {
  const { cleanup } = await setup();

  const engine1 = await createEngine(BEST_ONNX_OPTIONS);
  const engine2 = await createEngine(BEST_ONNX_OPTIONS);

  Assert.strictEqual(
    engine1,
    engine2,
    "Repeated best-onnx createEngine returns the cached engine instance."
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});
