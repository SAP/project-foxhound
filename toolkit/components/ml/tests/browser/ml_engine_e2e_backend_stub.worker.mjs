/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

import { _lazyForTestMocking } from "chrome://global/content/ml/MLEngine.worker.mjs";

const params = new URLSearchParams(self.location.search);
const expectedBackendData = params.get("expectedBackendData");

_lazyForTestMocking.getBackend = async function (
  mlEngineWorker,
  backendData,
  _options
) {
  const receivedBackendData = JSON.stringify(backendData);
  if (receivedBackendData !== expectedBackendData) {
    throw new Error(
      `BackendData not equal Received: ${receivedBackendData} Expected: ${expectedBackendData}`
    );
  }

  return {
    run: () => {},
  };
};
