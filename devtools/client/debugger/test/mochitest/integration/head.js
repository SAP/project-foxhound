/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

/* eslint-disable no-unused-vars */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/devtools/client/debugger/test/mochitest/head.js",
  this
);

/**
 * Helper function for `_loadAllIntegrationTests`.
 *
 * Implements this as a global method in order to please eslint.
 * This will be used by modules loaded from "integration-tests" folder
 * in order to register a new integration task, ran when executing `runAllIntegrationTests`.
 */
const integrationTasks = [];
function addIntegrationTask(fun) {
  integrationTasks.push(fun);
}

/**
 * Helper function for `runAllIntegrationTests`.
 *
 * Loads all the modules from "integration-tests" folder and return
 * all the task they implemented and registered by calling `addIntegrationTask`.
 */
function _loadAllIntegrationTests() {
  const testsDir = getChromeDir(getResolvedURI(gTestPath));
  testsDir.append("integration-tests");
  const entries = testsDir.directoryEntries;
  const urls = [];
  while (entries.hasMoreElements()) {
    const file = entries.nextFile;
    const url = Services.io.newFileURI(file).spec;
    if (url.endsWith(".js")) {
      urls.push(url);
    }
  }

  // We need to sort in order to run the test in a reliable order
  urls.sort();

  for (const url of urls) {
    Services.scriptloader.loadSubScript(url, this);
  }
  return integrationTasks;
}

/**
 * Method to be called by each integration tests which will
 * run all the "integration tasks" implemented in files from the "integration-tests" folder.
 * These files should call the `addIntegrationTask()` method to register something to run.
 *
 * @param {string} testFolder
 *        Define what folder in "examples" folder to load before opening the debugger.
 *        This is meant to be a versionized test folder with v1, v2, v3 folders.
 *        (See createVersionizedHttpTestServer())
 * @param {object} env
 *        Environment object passed down to each task to better know
 *        which particular integration test is being run.
 */
async function runAllIntegrationTests(testFolder, env) {
  const tasks = _loadAllIntegrationTests();

  const testServer = createVersionizedHttpTestServer(
    "../examples/" + testFolder
  );
  const testUrl = testServer.urlFor("index.html");

  for (const task of tasks) {
    info(` ==> Running integration task '${task.name}'`);
    await task(testServer, testUrl, env);
  }
}

const INTEGRATION_TEST_PAGE_SOURCES = [
  "index.html",
  "iframe.html",
  "script.js",
  "onload.js",
  "test-functions.js",
  "query.js?x=1",
  "query.js?x=2",
  "query2.js?y=3",
  "bundle.js",
  "original.js",
  "bundle-with-another-original.js",
  "original-with-no-update.js",
  "replaced-bundle.js",
  "removed-original.js",
  "named-eval.js",
  "react-component-module.js",
  // This is the JS file with encoded characters and custom protocol
  "文字コード.js",
  // Webpack generated some extra sources:
  "bootstrap 3b1a221408fdde86aa49",
  "bootstrap a1ecee2f86e1d0ea3fb5",
  "bootstrap d343aa81956b90d9f67e",
  // There is 3 occurences, one per target (main thread, worker and iframe).
  // But there is even more source actors (named evals and duplicated script tags).
  "same-url.sjs",
  "same-url.sjs",
  "log-worker.js",
  "same-url.sjs",
];
