/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test the ResourceWatcher API around SOURCE.

const {
  ResourceWatcher,
} = require("devtools/shared/resources/resource-watcher");

const TEST_URL = URL_ROOT + "sources.html";

add_task(async function() {
  const tab = await addTab(TEST_URL);

  const htmlRequest = await fetch(TEST_URL);
  const htmlContent = await htmlRequest.text();

  const { client, resourceWatcher, targetList } = await initResourceWatcher(
    tab
  );

  // Force the target list to cover workers
  targetList.listenForWorkers = true;
  await targetList.startListening();

  const targets = [];
  await targetList.watchTargets(targetList.ALL_TYPES, async function({
    targetFront,
  }) {
    targets.push(targetFront);
  });
  is(targets.length, 2, "Got expected number of targets");

  info("Check already available resources");
  const availableResources = [];
  await resourceWatcher.watchResources([ResourceWatcher.TYPES.SOURCE], {
    onAvailable: resources => availableResources.push(...resources),
  });

  const expectedExistingResources = [
    {
      description: "independent js file",
      sourceForm: {
        introductionType: "scriptElement",
        sourceMapBaseURL:
          "http://example.com/browser/devtools/shared/resources/tests/sources.js",
        url:
          "http://example.com/browser/devtools/shared/resources/tests/sources.js",
        isBlackBoxed: false,
        sourceMapURL: null,
        extensionName: null,
      },
      sourceContent: {
        contentType: "text/javascript",
        source: "/* eslint-disable */\nfunction scriptSource() {}\n",
      },
    },
    {
      description: "eval",
      sourceForm: {
        introductionType: "eval",
        sourceMapBaseURL:
          "http://example.com/browser/devtools/shared/resources/tests/sources.html",
        url: null,
        isBlackBoxed: false,
        sourceMapURL: null,
        extensionName: null,
      },
      sourceContent: {
        contentType: "text/javascript",
        source: "this.global = function evalFunction() {}",
      },
    },
    {
      description: "inline JS",
      sourceForm: {
        introductionType: "scriptElement",
        sourceMapBaseURL:
          "http://example.com/browser/devtools/shared/resources/tests/sources.html",
        url:
          "http://example.com/browser/devtools/shared/resources/tests/sources.html",
        isBlackBoxed: false,
        sourceMapURL: null,
        extensionName: null,
      },
      sourceContent: {
        contentType: "text/html",
        source: htmlContent,
      },
    },
    {
      description: "worker script",
      sourceForm: {
        introductionType: undefined,
        sourceMapBaseURL:
          "http://example.com/browser/devtools/shared/resources/tests/worker-sources.js",
        url:
          "http://example.com/browser/devtools/shared/resources/tests/worker-sources.js",
        isBlackBoxed: false,
        sourceMapURL: null,
        extensionName: null,
      },
      sourceContent: {
        contentType: "text/javascript",
        source: "/* eslint-disable */\nfunction workerSource() {}\n",
      },
    },
  ];
  await assertResources(availableResources, expectedExistingResources);

  await targetList.stopListening();
  await client.close();
});

async function assertResources(resources, expected) {
  is(
    resources.length,
    expected.length,
    "Length of existing resources is correct at initial"
  );
  for (let i = 0; i < resources.length; i++) {
    await assertResource(resources[i], expected);
  }
}

async function assertResource(source, expected) {
  info(`Checking resource "#${expected.description}"`);

  is(
    source.resourceType,
    ResourceWatcher.TYPES.SOURCE,
    "Resource type is correct"
  );

  const threadFront = await source.targetFront.getFront("thread");
  // `source` is SourceActor's form()
  // so try to instantiate the related SourceFront:
  const sourceFront = threadFront.source(source);
  // then fetch source content
  const sourceContent = await sourceFront.source();

  // Order of sources is random, so we have to find the best expected resource.
  // The only unique attribute is the JS Source text content.
  const matchingExpected = expected.find(res => {
    return res.sourceContent.source == sourceContent.source;
  });
  ok(
    matchingExpected,
    `This source was expected with source content being "${sourceContent.source}"`
  );
  assertObject(
    sourceContent,
    matchingExpected.sourceContent,
    matchingExpected.description
  );

  assertObject(
    source,
    matchingExpected.sourceForm,
    matchingExpected.description
  );
}

function assertObject(object, expected, description) {
  for (const field in expected) {
    is(
      object[field],
      expected[field],
      `The value of ${field} is correct for "#${description}"`
    );
  }
}
