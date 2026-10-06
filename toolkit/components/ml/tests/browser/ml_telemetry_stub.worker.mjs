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

// Change the getBackend to a mocked version that doesn't actually do inference
// but does initiate model downloads

_lazyForTestMocking.getBackend = async function (
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

  await mlEngineWorker.getModelFile({ url }).catch(() => {});

  // Download Another file using engineId as revision
  const url2 = lazy.createFileUrl({
    model: modelId,
    revision: engineId,
    file: modelFile,
    urlTemplate: modelHubUrlTemplate,
    rootUrl: modelHubRootUrl,
  });
  await mlEngineWorker.getModelFile({ url: url2 }).catch(() => {});

  return {
    run: () => {},
  };
};
