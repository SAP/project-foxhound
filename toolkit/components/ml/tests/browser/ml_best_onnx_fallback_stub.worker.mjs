/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

import { _lazyForTestMocking } from "chrome://global/content/ml/MLEngine.worker.mjs";

_lazyForTestMocking.getBackend = async function (
  _mlEngineWorker,
  _wasm,
  options
) {
  if (options.backend === "onnx-native") {
    throw new Error("onnxruntime shared library could not be loaded");
  }

  return { run: () => ({}) };
};
