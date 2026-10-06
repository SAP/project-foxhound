/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

import { _lazyForTestMocking } from "chrome://global/content/ml/MLEngine.worker.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(
  lazy,
  {
    createFileUrl: "chrome://global/content/ml/Utils.sys.mjs",
  },
  { global: "current" }
);

_lazyForTestMocking.getBackend = async function (
  mlEngineWorker,
  backendData,
  {
    modelHubUrlTemplate,
    modelHubRootUrl,
    modelId,
    modelRevision,
    modelFile,
  } = {}
) {
  const url = lazy.createFileUrl({
    model: modelId,
    revision: modelRevision,
    file: modelFile,
    urlTemplate: modelHubUrlTemplate,
    rootUrl: modelHubRootUrl,
  });

  await mlEngineWorker.getModelFile({ url });

  return {
    run: () => {},
  };
};
