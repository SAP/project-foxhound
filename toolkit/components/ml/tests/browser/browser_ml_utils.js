/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const {
  MultiProgressAggregator,
  ProgressAndStatusCallbackParams,
  ProgressStatusText,
  readResponse,
  URLChecker,
  RejectionType,
  BlockListManager,
  RemoteSettingsManager,
  isAddonEngineId,
  addonIdToEngineId,
  engineIdToAddonId,
  stringifyForLog,
  parseNpy,
  MLUninstallService,
} = ChromeUtils.importESModule("chrome://global/content/ml/Utils.sys.mjs");

const { MLEngine: UtilsMLEngine } = ChromeUtils.importESModule(
  "resource://gre/actors/MLEngineParent.sys.mjs"
);

const { OPFS: UtilsOPFS } = ChromeUtils.importESModule(
  "chrome://global/content/ml/OPFS.sys.mjs"
);

// Root URL of the fake hub, see the `data` dir in the tests.
const FAKE_HUB =
  "chrome://mochitests/content/browser/toolkit/components/ml/tests/browser/data";
const FAKE_URL_TEMPLATE = "{model}/resolve/{revision}";

/**
 * Test that we can retrieve the correct content without a callback.
 */
add_task(async function test_correct_response_no_callback() {
  const content = "This is the expected response.";
  const blob = new Blob([content]);
  const response = new Response(blob, {
    headers: new Headers({ "Content-Length": blob.size }),
  });

  const responseArray = await readResponse(response);

  const responseContent = new TextDecoder().decode(responseArray);

  Assert.equal(content, responseContent, "The response content should match.");
});

/**
 * Test that we can retrieve the correct content with a callback.
 */
add_task(async function test_correct_response_callback() {
  const content = "This is the expected response.";
  const blob = new Blob([content]);
  const response = new Response(blob, {
    headers: new Headers({ "Content-Length": blob.size }),
  });

  const responseArray = await readResponse(response, data => {
    data;
  });

  const responseContent = new TextDecoder().decode(responseArray);

  Assert.equal(content, responseContent, "The response content should match.");
});

/**
 * Test that we can retrieve the correct content with a content-lenght lower than the actual len
 */
add_task(async function test_correct_response_content_length_under_reported() {
  const content = "This is the expected response.";
  const blob = new Blob([content]);
  const response = new Response(blob, {
    headers: new Headers({
      "Content-Length": 1,
    }),
  });

  const responseArray = await readResponse(response, data => {
    data;
  });

  const responseContent = new TextDecoder().decode(responseArray);

  Assert.equal(content, responseContent, "The response content should match.");
});

/**
 * Test that we can retrieve the correct content with a content-lenght larger than the actual len
 */
add_task(async function test_correct_response_content_length_over_reported() {
  const content = "This is the expected response.";
  const blob = new Blob([content]);
  const response = new Response(blob, {
    headers: new Headers({
      "Content-Length": 2 * blob.size + 20,
    }),
  });

  const responseArray = await readResponse(response, data => {
    data;
  });

  const responseContent = new TextDecoder().decode(responseArray);

  Assert.equal(content, responseContent, "The response content should match.");
});

/**
 * Test that we can retrieve and the callback provide correct information
 */
add_task(async function test_correct_response_callback_correct() {
  const contents = ["Carrot", "Broccoli", "Tomato", "Spinach"];

  let contentSizes = [];

  let totalSize = 0;

  for (const value of contents) {
    contentSizes.push(new Blob([value]).size);

    totalSize += contentSizes[contentSizes.length - 1];
  }

  const numChunks = contents.length;

  let encoder = new TextEncoder();

  // const stream = ReadableStream.from(contents);

  let streamId = -1;

  const stream = new ReadableStream({
    pull(controller) {
      streamId += 1;

      if (streamId < numChunks) {
        controller.enqueue(encoder.encode(contents[streamId]));
      } else {
        controller.close();
      }
    },
  });

  const response = new Response(stream, {
    headers: new Headers({
      "Content-Length": totalSize,
    }),
  });

  let chunkId = -1;
  let expectedTotalLoaded = 0;

  const responseArray = await readResponse(response, data => {
    chunkId += 1;
    // The callback is called on time with no data loaded and just the total
    if (chunkId == 0) {
      Assert.deepEqual(
        {
          total: data.total,
          currentLoaded: data.currentLoaded,
          totalLoaded: data.totalLoaded,
        },
        {
          total: totalSize,
          currentLoaded: 0,
          totalLoaded: 0,
        },
        "The callback should be called on time with an estimate of the total size and no data read. "
      );
    } else {
      Assert.less(
        chunkId - 1,
        numChunks,
        "The number of times the callback is called should be lower than the number of chunks"
      );

      expectedTotalLoaded += contentSizes[chunkId - 1];

      Assert.deepEqual(
        {
          total: data.total,
          currentLoaded: data.currentLoaded,
          totalLoaded: data.totalLoaded,
        },
        {
          total: totalSize,
          currentLoaded: contentSizes[chunkId - 1],
          totalLoaded: expectedTotalLoaded,
        },
        "The reported value by the callback should match the correct values"
      );
    }
  });

  Assert.equal(
    chunkId,
    numChunks,
    "The callback should be called exactly as many times as the number of chunks."
  );

  const responseContent = new TextDecoder().decode(
    responseArray.buffer.slice(
      responseArray.byteOffset,
      responseArray.byteLength + responseArray.byteOffset
    )
  );

  Assert.equal(
    contents.join(""),
    responseContent,
    "The response content should match."
  );
});

/**
 * Test that multi-aggregator only call the callback for the provided types.
 */
add_task(async function test_multi_aggregator_watchtypes() {
  let numCalls = 0;
  let aggregator = new MultiProgressAggregator({
    progressCallback: _ => {
      numCalls += 1;
    },
    watchedTypes: ["t1"],
  });

  aggregator.aggregateCallback(
    new ProgressAndStatusCallbackParams({
      type: "download",
    })
  );

  Assert.equal(numCalls, 0);

  aggregator.aggregateCallback(
    new ProgressAndStatusCallbackParams({
      type: "t1",
    })
  );

  Assert.equal(numCalls, 1);
});

/**
 * Test that multi-aggregator aggregate correctly.
 */
add_task(async function test_multi_aggregator() {
  // Ids for all available tasks. Should be unique per element.
  const taskIds = ["A", "B", "C", "D", "E", "F"];

  // The type for each available tasks.
  const taskTypes = ["t1", "t1", "t2", "t2", "t3", "t3"];

  // The total size available for each task
  const taskSizes = [5, 11, 13, 17, 19, 23];

  // The chunk sizes. The sum for indices with same chunk task index (according to chunkTaskIndex)
  // should be equal to the corresponding size in taskSizes
  const chunkSizes = [2, 3, 5, 6, 11, 7, 12, 6, 8, 9, 9, 10];

  // Task index for each chunk. Index in the array taskIds. Order was chosen so that we can simulate
  // overlaps in tasks.
  const chunkTaskIndex = [0, 0, 1, 2, 5, 2, 5, 1, 3, 4, 3, 4];

  // Indicating how much has been loaded for the task so far.
  const chunkTaskLoaded = [2, 5, 5, 6, 11, 13, 23, 11, 8, 9, 17, 19];

  // Whether the
  const chunkIsFinal = [0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1];

  let numDone = 0;

  let currentData = null;

  let expectedTotalToLoad = 0;

  let numCalls = 0;

  let expectedNumCalls = 0;

  let expectedTotalLoaded = 0;

  let taskIdsWithDataSet = new Set();

  const aggregator = new MultiProgressAggregator({
    progressCallback: data => {
      currentData = data;

      numCalls += 1;

      if (data.statusText == ProgressStatusText.DONE) {
        numDone += 1;
      }
    },
    watchedTypes: ["t1", "t2", "t3"],
  });

  // Initiate and advertise the size for each task
  for (const i in taskTypes) {
    currentData = null;
    expectedNumCalls += 1;
    aggregator.aggregateCallback(
      new ProgressAndStatusCallbackParams({
        type: taskTypes[i],
        statusText: ProgressStatusText.INITIATE,
        id: taskIds[i],
        total: taskSizes[i],
      })
    );
    Assert.equal(currentData.progress, 0, "Progress is 0%");

    Assert.ok(currentData, "Received data should be defined");
    Assert.deepEqual(
      {
        statusText: currentData?.statusText,
        type: currentData?.type,
        id: currentData?.id,
        totalObjectsSeen: currentData?.metadata?.totalObjectsSeen,
        numDone,
        numCalls,
      },
      {
        statusText: ProgressStatusText.INITIATE,
        type: taskTypes[i],
        id: taskIds[i],
        totalObjectsSeen: taskIdsWithDataSet.size,
        numDone: 0,
        numCalls: expectedNumCalls,
      },
      "Data received after initiate should be correct"
    );
    currentData = null;
    expectedNumCalls += 1;
    aggregator.aggregateCallback(
      new ProgressAndStatusCallbackParams({
        type: taskTypes[i],
        statusText: ProgressStatusText.SIZE_ESTIMATE,
        id: taskIds[i],
        total: taskSizes[i],
      })
    );
    Assert.ok(currentData, "Received data should be defined");

    expectedTotalToLoad += taskSizes[i];
    taskIdsWithDataSet.add(taskIds[i]);

    Assert.deepEqual(
      {
        numDone,
        numCalls,
        total: currentData.total,
        totalObjectsSeen: currentData?.metadata?.totalObjectsSeen,
      },
      {
        numDone: 0,
        total: expectedTotalToLoad,
        numCalls: expectedNumCalls,
        totalObjectsSeen: taskIdsWithDataSet.size,
      },
      "Data received after size estimate should be correct."
    );
  }

  // Send progress status for each chunk.
  for (const chunkIndex in chunkTaskIndex) {
    let taskIndex = chunkTaskIndex[chunkIndex];
    currentData = null;
    expectedNumCalls += 1;
    expectedTotalLoaded += chunkSizes[chunkIndex];
    aggregator.aggregateCallback(
      new ProgressAndStatusCallbackParams({
        type: taskTypes[taskIndex],
        statusText: ProgressStatusText.IN_PROGRESS,
        id: taskIds[taskIndex],
        total: taskSizes[taskIndex],
        currentLoaded: chunkSizes[chunkIndex],
        totalLoaded: chunkTaskLoaded[chunkIndex],
      })
    );

    Assert.ok(currentData, "Received data should be defined");

    Assert.deepEqual(
      {
        numDone,
        numCalls,
        total: currentData?.total,
        totalObjectsSeen: currentData?.metadata?.totalObjectsSeen,
        currentLoaded: currentData?.currentLoaded,
        totalLoaded: currentData?.totalLoaded,
      },
      {
        numDone: 0,
        numCalls: expectedNumCalls,
        total: expectedTotalToLoad,
        totalObjectsSeen: taskIdsWithDataSet.size,
        currentLoaded: chunkSizes[chunkIndex],
        totalLoaded: expectedTotalLoaded,
      },
      "Data received after in progress should be correct"
    );

    // Notify of task is done
    if (chunkIsFinal[chunkIndex]) {
      currentData = null;

      aggregator.aggregateCallback(
        new ProgressAndStatusCallbackParams({
          type: taskTypes[taskIndex],
          statusText: ProgressStatusText.IN_PROGRESS,
          id: taskIds[taskIndex],
          total: taskSizes[taskIndex],
          currentLoaded: chunkSizes[chunkIndex],
          totalLoaded: chunkTaskLoaded[chunkIndex],
        })
      );
      expectedNumCalls += 1;

      Assert.deepEqual(
        {
          numDone,
          numCalls,
          total: currentData?.total,
          totalObjectsSeen: currentData?.metadata?.totalObjectsSeen,
          currentLoaded: currentData?.currentLoaded,
          totalLoaded: currentData?.totalLoaded,
        },
        {
          numDone: 0,
          numCalls: expectedNumCalls,
          total: expectedTotalToLoad,
          totalObjectsSeen: taskIdsWithDataSet.size,
          currentLoaded: chunkSizes[chunkIndex],
          totalLoaded: expectedTotalLoaded,
        },
        "Extra data beyond what is expected or a process should not affect total downloaded"
      );

      currentData = null;
      expectedNumCalls += 1;
      aggregator.aggregateCallback(
        new ProgressAndStatusCallbackParams({
          type: taskTypes[taskIndex],
          statusText: ProgressStatusText.DONE,
          id: taskIds[taskIndex],
          total: taskSizes[chunkIndex],
        })
      );

      Assert.ok(currentData, "Received data should be defined");

      Assert.deepEqual(
        { total: currentData.total, numCalls },
        { total: expectedTotalToLoad, numCalls: expectedNumCalls },
        "Data received after completed tasks should be correct"
      );
    }
  }
  Assert.equal(currentData.progress, 100, "Progress is 100%");

  Assert.equal(numDone, 1, "Done status should be received");
});

/**
 * Tests the URLChecker class
 *
 */
add_task(async function testURLChecker() {
  // Example of result from remote settings
  const list = [
    { filter: "ALLOW", urlPrefix: "https://huggingface.co/mozilla/" },
    { filter: "ALLOW", urlPrefix: "https://model-hub.mozilla.org/" },
    {
      filter: "ALLOW",
      urlPrefix:
        "https://huggingface.co/typeform/distilbert-base-uncased-mnli/",
    },
    {
      filter: "ALLOW",
      urlPrefix: "https://huggingface.co/mozilla/distilvit/blob/v0.5.0/",
    },
    {
      filter: "DENY",
      urlPrefix: "https://huggingface.co/mozilla/restricted-model",
    },
    {
      filter: "ALLOW",
      urlPrefix: "https://localhost:8080/myhub",
    },
  ];

  const checker = new URLChecker(list);

  // Test cases
  const testCases = [
    {
      url: "https://huggingface.co/mozilla/",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description:
        "Allows all models and versions from Mozilla on Hugging Face",
    },
    {
      url: "https://huggingface.co/mozilla/distilvit/blob/v0.5.0/",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description:
        "Allows a specific model and version from Mozilla on Hugging Face",
    },
    {
      url: "https://huggingface.co/mozilla/restricted-model",
      expected: { allowed: false, rejectionType: RejectionType.DENIED },
      description:
        "Denies a specific restricted model from Mozilla on Hugging Face",
    },
    {
      url: "https://model-hub.mozilla.org/some-model",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows any model from Mozilla's model hub",
    },
    {
      url: "https://my.cool.hub/",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description: "Denies access to an unapproved hub URL",
    },
    {
      url: "https://sub.localhost/myhub",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description: "Denies access to a subdomain of an approved domain",
    },
    {
      url: "https://model-hub.mozilla.org.evil.com",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description:
        "Denies access to URL with allowed domain as a subdomain in another domain",
    },
    {
      url: "httpsz://localhost/myhub",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description: "Denies access with a similar-looking scheme",
    },
    {
      url: "https://localhost./",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description: "Denies access to URL with trailing dot in domain",
    },
    {
      url: "https://user@huggingface.co/mozilla/",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description: "Denies access to URL with user info",
    },
    {
      url: "ftp://localhost/myhub/",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description:
        "Denies access to URL with disallowed scheme but allowed host",
    },
    {
      url: "https://model-hub.mozilla.org.hack/",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description: "Denies access to domain containing an allowed domain",
    },
    {
      url: "https:///huggingface.co/mozilla/",
      expected: { allowed: false, rejectionType: RejectionType.DISALLOWED },
      description:
        "Denies access to URL with triple slashes, just type correctly",
    },
    {
      url: "https://localhost:8080/myhub",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows access to URL with port specified",
    },
    {
      url: "http://localhost/myhub",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows access to URL with HTTP scheme on localhost",
    },
    {
      url: "https://model-hub.mozilla.org/",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows access to Mozilla's approved model hub URL",
    },
    {
      url: "chrome://gre/somewhere/in/the/code/base",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows access to internal resource URL in code base",
    },
    {
      url: "http://localhost:37001/Xenova/all-M",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows access to URL with localhost with a port",
    },
    {
      url: "https://user@localhost/Xenova/all-M",
      expected: { allowed: true, rejectionType: RejectionType.NONE },
      description: "Allows access to URL with localhost with a user",
    },
  ];

  for (const { url, expected, description } of testCases) {
    const result = checker.allowedURL(url);
    Assert.deepEqual(
      result,
      expected,
      `URL check for '${url}' should return ${JSON.stringify(
        expected
      )}: ${description}`
    );
  }
});

/**
 * Test the Block List Manager with a single blocked n-grams at word boundaries
 *
 */
add_task(async function testBlockListManager_single_blocked_word() {
  const manager = new BlockListManager({
    blockNgrams: [BlockListManager.encodeBase64("would like")],
  });

  Assert.equal(
    manager.blockNgramSet.values().next().value,
    "would like",
    "decoded blocked n-grams should match the original value"
  );

  Assert.equal(
    BlockListManager.decodeBase64(BlockListManager.encodeBase64("would like")),
    "would like",
    "round trip encode/decode should give original input"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "People are here" }),
    false,
    "should have no match if blocked n-gram not in input"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "People would likes" }),
    false,
    "should have no match even if only part of blocked n-gram in input"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "People would do like" }),
    false,
    "should have no match if they are other words separating a blocked  2-grams"
  );
  Assert.equal(
    manager.matchAtWordBoundary({ text: "People wouldlike" }),
    false,
    "should have no match if text contains blocked n-grams but without the spaces"
  );
  Assert.equal(
    manager.matchAtWordBoundary({ text: "People would_like" }),
    false,
    "should have no match text contain special characters between a blocked 2-grams"
  );
  Assert.equal(
    manager.matchAtWordBoundary({ text: "People would liketo " }),
    false,
    "should have no match if the blocked 2-grams is not at word boundary"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "People are here and would like go" }),
    true,
    "should match if blocked 2-grams in input"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "would like to do it" }),
    true,
    "should match if blocked 2-grams is at the beginning of input"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "I need to would like." }),
    true,
    "should match if blocked 2-grams is at end of input even with punctuation"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "I need to would like" }),
    true,
    "should match if blocked 2-grams is at end of input"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "I need to would like  " }),
    true,
    "should match even if blocked 2-grams has extra spaces after it"
  );
});

/**
 * Test the Block List Manager with multiple blocked n-grams at word boundaries
 *
 */
add_task(async function testBlockListManager_multiple_blocked_ngrams() {
  const manager = new BlockListManager({
    blockNgrams: [
      BlockListManager.encodeBase64("would like"),
      BlockListManager.encodeBase64("vast"),

      BlockListManager.encodeBase64("blocked"),
    ],
  });

  Assert.equal(
    manager.matchAtWordBoundary({ text: "People are here" }),
    false,
    "should have no match if blocked n-grams are not present"
  );
  Assert.equal(
    manager.matchAtWordBoundary({ text: "People wouldlike iblocked" }),
    false,
    "should have no match if blocked n-grams are not at words boundary"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "People are here and blocked" }),
    true,
    "should match if blocked n-grams are at word boundary"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "would like to do it" }),
    true,
    "should match for all blocked n-grams in the list"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "I need to would like blocked." }),
    true,
    "should match for all blocked n-grams in the list"
  );
  Assert.equal(
    manager.matchAtWordBoundary({ text: "I have a vast amount." }),
    true,
    "should match for all blocked n-grams in the list"
  );
});

/**
 * Test the Block List Manager with multiple blocked n-grams anywhere
 *
 */
add_task(async function testBlockListManager_anywhere() {
  const manager = new BlockListManager({
    blockNgrams: [
      BlockListManager.encodeBase64("would like"),
      BlockListManager.encodeBase64("vast"),

      BlockListManager.encodeBase64("blocked"),
    ],
  });

  Assert.equal(
    manager.matchAnywhere({ text: "People are here" }),
    false,
    "should have no match if blocked n-grams are not present"
  );
  Assert.equal(
    manager.matchAnywhere({ text: "People wouldlike iblocked" }),
    true,
    "should match even if blocked n-grams are not at word boundary"
  );

  Assert.equal(
    manager.matchAnywhere({ text: "People are here and blocked" }),
    true,
    "should match for all blocked n-grams"
  );

  Assert.equal(
    manager.matchAnywhere({ text: "would like to do it" }),
    true,
    "should match for all blocked n-grams"
  );

  Assert.equal(
    manager.matchAnywhere({ text: "I need to would like blocked." }),
    true,
    "should match for all blocked n-grams"
  );
  Assert.equal(
    manager.matchAnywhere({ text: "I have a vast amount." }),
    true,
    "should match for all blocked n-grams"
  );
  Assert.equal(
    manager.matchAnywhere({ text: "I have avast amount." }),
    true,
    "should match for all blocked n-grams even if not at word boundary"
  );
});

/**
 * Get test data for remote settings manager test.
 *
 */
async function getMockedRemoteSettingsClients() {
  const client1 = await createRemoteClient({
    collectionName: "test-block-list",
    records: [
      {
        version: "1.0.0",
        name: "test-link-preview-en",
        blockList: ["cGVyc29u"], // person
        language: "en",
        id: "1",
      },
      {
        version: "1.0.0",
        name: "test-link-preview-fr",
        blockList: ["bW9p"], // moi
        language: "fr",
        id: "2",
      },
      {
        version: "1.0.0",
        name: "base-fr",
        blockList: [],
        language: "fr",
        id: "3",
      },
      {
        version: "2.0.0",
        name: "test-link-preview-en",
        blockList: ["b25l"], // one
        language: "en",
        id: "4",
      },

      {
        version: "1.1.0",
        name: "test-link-preview-en",
        blockList: ["dHdv"], // two
        language: "en",
        id: "5",
      },
    ],
  });

  const client2 = await createRemoteClient({
    collectionName: "test-request-options",
    records: [
      {
        version: "1.0.0",
        featureId: "test-link-preview",
        options: JSON.stringify({ param1: "value1", number: 2 }),
        id: "10",
      },
      {
        version: "1.0.0",
        featureId: "test-ml-suggest",
        options: JSON.stringify({ suggest: "val" }),
        id: "11",
      },
      {
        version: "1.0.0",
        featureId: "ml-i2t",
        options: JSON.stringify({ size: 2 }),
        id: "12",
      },
      {
        version: "2.0.0",
        featureId: "test-link-preview",
        options: JSON.stringify({ param2: "value2", number2: 20 }),
        id: "13",
      },

      {
        version: "1.1.0",
        featureId: "test-link-preview",
        options: JSON.stringify({ param1: "value2", number: 3 }),
        id: "14",
      },
    ],
  });

  const client3 = await createRemoteClient({
    collectionName: "test-inference-options",
    records: [
      {
        featureId: "test-link-preview",
        id: "20",
      },
      {
        featureId: "test-ml-suggest",
        id: "21",
      },
    ],
  });

  return {
    "test-block-list": client1,
    "test-request-options": client2,
    "test-inference-options": client3,
  };
}

/**
 * Test the Remote Settings Manager
 *
 */
add_task(async function testRemoteSettingsManager() {
  RemoteSettingsManager.mockRemoteSettings(
    await getMockedRemoteSettingsClients()
  );

  let data = await RemoteSettingsManager.getRemoteData({
    collectionName: "test-block-list",
    filters: {
      name: "test-link-preview-en",
    },
    majorVersion: 1,
  });

  Assert.deepEqual(
    data,
    {
      version: "1.1.0",
      name: "test-link-preview-en",
      blockList: ["dHdv"],
      language: "en",
      id: "5",
    },
    "should retrieve the latest revision ignoring previous one"
  );

  data = await RemoteSettingsManager.getRemoteData({
    collectionName: "test-block-list",
    filters: {
      name: "test-link-preview-en",
      language: "en",
    },
    majorVersion: 2,
  });

  Assert.deepEqual(
    data,
    {
      version: "2.0.0",
      name: "test-link-preview-en",
      blockList: ["b25l"],
      language: "en",
      id: "4",
    },
    "should retrieve the exact revision"
  );

  data = await RemoteSettingsManager.getRemoteData({
    collectionName: "test-request-options",
    filters: {
      featureId: "test-link-preview",
    },
    majorVersion: 1,
    lookupKey: record => record.featureId,
  });

  Assert.deepEqual(
    data,
    {
      version: "1.1.0",
      featureId: "test-link-preview",
      options: JSON.stringify({ param1: "value2", number: 3 }),
      id: "14",
    },
    "should retrieve from the correct collection even in presence of multiple"
  );

  data = await RemoteSettingsManager.getRemoteData({
    collectionName: "test-inference-options",
    filters: {
      featureId: "test-link-preview",
    },
  });

  Assert.deepEqual(
    data,
    {
      featureId: "test-link-preview",
      id: "20",
    },
    "should retrieve from the correct collection even in presence of multiple"
  );

  data = await RemoteSettingsManager.getRemoteData(
    {
      collectionName: "test-request-options",
      filters: {
        featureId: "test-link-previewP",
      },
      majorVersion: 1,
      lookupKey: record => record.featureId,
    },
    "should work with lookupKey"
  );

  Assert.equal(data, null);

  RemoteSettingsManager.removeMocks();
});

/**
 * Test the Remote data Manager
 *
 */
add_task(async function testBlockListManagerWithRS() {
  RemoteSettingsManager.mockRemoteSettings(
    await getMockedRemoteSettingsClients()
  );

  let manager = await BlockListManager.initializeFromRemoteSettings({
    blockListName: "test-link-preview-en",
    language: "en",
    fallbackToDefault: false,
    majorVersion: 1,
    collectionName: "test-block-list",
  });

  Assert.equal(
    manager.matchAtWordBoundary({ text: "two guy is here" }),
    true,
    "should retrieve the correct list and match <two> for the blocked word"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "one person is here, moi" }),
    false,
    "should retrieve the correct list and match nothing"
  );

  await Assert.rejects(
    BlockListManager.initializeFromRemoteSettings({
      blockListName: "test-link-preview-en-non-existing",
      language: "en",
      fallbackToDefault: false,
      majorVersion: 1,
      collectionName: "test-block-list",
    }),
    /./,
    "should fails since the block list does not exist"
  );

  manager = await BlockListManager.initializeFromRemoteSettings({
    blockListName: "test-link-preview-en-non-existing",
    language: "en",
    fallbackToDefault: true,
    majorVersion: 1,
    collectionName: "test-block-list",
  });

  Assert.equal(
    manager.matchAtWordBoundary({
      text: "the bells are ringing, ding dong ...",
    }),
    true,
    "should not fail but fallback to default list with a match for dong"
  );

  Assert.equal(
    manager.matchAtWordBoundary({ text: "two person is here, moi" }),
    false,
    "should not fail but fallback to default list with no matches found"
  );

  RemoteSettingsManager.removeMocks();
});

add_task(function test_addon_engine_id_utilities() {
  const prefix = "ML-ENGINE-";

  // Valid addon ID
  const addonId = "custom-addon";
  const engineId = addonIdToEngineId(addonId);

  Assert.equal(
    engineId,
    `${prefix}${addonId}`,
    "addonIdToEngineId should add the correct prefix"
  );
  Assert.ok(
    isAddonEngineId(engineId),
    "isAddonEngineId should detect prefixed engine ID"
  );
  Assert.equal(
    engineIdToAddonId(engineId),
    addonId,
    "engineIdToAddonId should return original addon ID"
  );

  // Invalid engine ID
  const invalidEngineId = "ENGINE-custom-addon";
  Assert.ok(
    !isAddonEngineId(invalidEngineId),
    "isAddonEngineId should reject non-prefixed engine ID"
  );
  Assert.equal(
    engineIdToAddonId(invalidEngineId),
    null,
    "engineIdToAddonId should return null for invalid ID"
  );

  // Edge case: empty string
  Assert.ok(!isAddonEngineId(""), "isAddonEngineId should reject empty string");
  Assert.equal(
    engineIdToAddonId(""),
    null,
    "engineIdToAddonId should return null for empty string"
  );
});

/**
 * stringifyForLog — primitives and core types.
 * Accept both JSON and summary-string outputs.
 */
add_task(function test_stringifyForLog_primitives_and_core_types() {
  // Primitives (avoid top-level undefined since some impls return undefined)
  Assert.equal(stringifyForLog(42), "42");
  Assert.equal(stringifyForLog(true), "true");
  Assert.equal(stringifyForLog(null), "null");
  Assert.equal(stringifyForLog("hi"), '"hi"');

  // BigInt & Symbol — could be quoted (JSON) or not (slow path)
  const bi = stringifyForLog(1n);
  Assert.ok(bi === "1" || bi === '"1"', "BigInt should stringify");

  const sym = stringifyForLog(Symbol("x"));
  Assert.ok(
    sym === "Symbol(x)" || sym === '"Symbol(x)"',
    "Symbol should stringify (quoted or not)"
  );

  // Date & RegExp — either embedded in JSON or as substrings in a summary
  const sample = { d: new Date("2020-01-01T00:00:00.000Z"), r: /abc/i };
  const s = stringifyForLog(sample);

  let parsed = null;
  try {
    parsed = JSON.parse(s);
  } catch {}

  if (parsed) {
    // Date must be somewhere (either as ISO string or an object fallback)
    Assert.ok(
      parsed.d === "2020-01-01T00:00:00.000Z" || typeof parsed.d === "object",
      "Date should be preserved as ISO or object"
    );
    // RegExp may collapse to {} in JSON; accept either the literal string or {}
    Assert.ok(
      parsed.r === "/abc/i" ||
        (typeof parsed.r === "object" && Object.keys(parsed.r).length === 0),
      'RegExp should be "/abc/i" or an empty object'
    );
  } else {
    // Summary string path
    Assert.ok(
      s.includes("2020-01-01T00:00:00.000Z"),
      "Summary should contain ISO date"
    );
    Assert.ok(s.includes("/abc/i"), "Summary should contain RegExp literal");
  }

  // Function — always a short descriptor
  function foo() {}
  const f = stringifyForLog({ f: foo });
  let parsedF = null;
  try {
    parsedF = JSON.parse(f);
  } catch {}
  const fVal = parsedF ? parsedF.f : f;
  Assert.ok(
    String(fVal).includes("[Function"),
    "Function should be described briefly"
  );

  // Error — JSON path may produce {}, summary path should contain 'Error: boom'
  const err = new Error("boom");
  const e = stringifyForLog({ e: err });
  let parsedE = null;
  try {
    parsedE = JSON.parse(e);
  } catch {}

  if (parsedE && typeof parsedE.e === "object" && parsedE.e) {
    // Accept either detailed fields or an empty object — do not require raw text.
    const hasFields =
      parsedE.e.name === "Error" ||
      parsedE.e.message === "boom" ||
      (parsedE.e.stack && typeof parsedE.e.stack === "string");
    const emptyObj = Object.keys(parsedE.e).length === 0;
    Assert.ok(
      hasFields || emptyObj,
      "Error should be detailed or {} in JSON mode"
    );
  } else {
    // Summary string path (non-JSON) should include something meaningful.
    Assert.ok(
      e.includes("Error") && e.includes("boom"),
      "Summary should include error text"
    );
  }
});

/**
 * stringifyForLog — collections, circular refs, and limits.
 * Do not assume Map/Set shapes; just validate useful, bounded output.
 */
add_task(function test_stringifyForLog_collections_and_limits() {
  const m = new Map([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ]);
  const st = new Set([10, 20, 30]);
  const ta = new Uint8Array(5);
  const ab = new ArrayBuffer(7);
  const obj = { m, st, ta, ab, cyc: null };
  obj.cyc = obj; // circular

  const out = stringifyForLog(obj, { maxKeysPerLevel: 2 });

  // Always a string and non-empty
  Assert.equal(typeof out, "string");
  Assert.greater(out.length, 0);

  // TypedArray / ArrayBuffer summaries should appear as strings in either path
  Assert.ok(
    out.includes("Uint8Array(5 bytes)"),
    "TypedArray size summary present"
  );

  // Circular marker must be present
  Assert.ok(out.includes("[Circular]"), "Circular marker present");

  // Map/Set can be summarized or JSON-ified or collapse to {}/[]; we only require *some* hint.
  // Accept any of these hints to avoid coupling to a specific implementation.
  const mapHints =
    out.includes("Map(") || out.includes('"m":') || out.includes("m:");
  const setHints =
    out.includes("Set(") || out.includes('"st":') || out.includes("st:");
  Assert.ok(mapHints, "Output should carry some hint of the Map");
  Assert.ok(setHints, "Output should carry some hint of the Set");
});

/**
 * stringifyForLog — output truncation guard.
 * Compute suffix length from the actual output to avoid off-by-one.
 */
add_task(function test_stringifyForLog_output_truncation() {
  const maxOutputLength = 200;
  const huge = "x".repeat(5000);
  const out = stringifyForLog({ huge }, { maxOutputLength });

  // Must end with a truncation marker
  Assert.ok(/…\[truncated]$/.test(out), "Should end with truncation suffix");

  // Validate that the prefix was clipped to maxOutputLength characters.
  const suffix = "…[truncated]";
  Assert.equal(out.length, maxOutputLength + suffix.length);
});

/**
 * stringifyForLog — slow path via throwing getter; depth limits and safety.
 * Keep the checks, but don’t assume specific summarization tokens.
 */
add_task(function test_stringifyForLog_slow_path_throwing_getter_and_depth() {
  const deep = { level: 0 };
  let cur = deep;
  for (let i = 1; i <= 5; i++) {
    cur.child = { level: i };
    cur = cur.child;
  }

  const host = {};
  Object.defineProperty(host, "bad", {
    enumerable: true,
    get() {
      throw new Error("nope");
    },
  });
  host.deep = deep;

  const out = stringifyForLog(host, {
    maxDepth: 2,
    maxKeysPerLevel: 50,
    maxOutputLength: 5000,
  });

  // Throwing getter recorded
  Assert.ok(
    out.includes('"bad": [Thrown:'),
    "Throwing getter should be caught and annotated"
  );

  // Depth limit — don’t pin to exact token; just ensure some summarization occurred
  Assert.ok(
    /\[Object [^\]]+\]|\[Array\(\d+\)\]/.test(out),
    "Deep object should be summarized at maxDepth"
  );
});

/**
 * stringifyForLog — always returns a string, even for hostile proxies.
 */
add_task(function test_stringifyForLog_always_string_with_proxy() {
  // Proxy that throws on get
  const target = {};
  const proxy = new Proxy(target, {
    get() {
      throw new Error("trap");
    },
    ownKeys() {
      // JSON.stringify inspects keys; make that safe too.
      throw new Error("ownKeys trap");
    },
  });

  const out = stringifyForLog(proxy);
  Assert.equal(typeof out, "string");
  Assert.ok(
    out.includes("[Uninspectable:") ||
      out.includes("Proxy") ||
      out.includes("[Thrown:"),
    "Should degrade gracefully on hostile proxies"
  );
});

/**
 * stringifyForLog — top-level BigInt should not throw and should stringify.
 * Accept both quoted and unquoted representations.
 */
add_task(function test_stringifyForLog_top_level_bigint() {
  const out = stringifyForLog(9007199254740993n);
  Assert.ok(
    out === "9007199254740993" || out === '"9007199254740993"',
    "Top-level BigInt should stringify (quoted or not)"
  );
});

add_task(function test_npy_parsing() {
  // # Generate some npy arrays with python:
  // import numpy as np
  // import io
  // fib5 = [0, 1, 1, 2, 3]
  // fib5_u8 = np.array(fib5, dtype=np.uint8)
  // fib5_f16 = np.array(fib5, dtype=np.float16)
  // fib5_f32 = np.array(fib5, dtype=np.float32)
  // def to_npy_uint8array(arr: np.ndarray) -> str:
  //     buf = io.BytesIO()
  //     np.save(buf, arr)
  //     b = buf.getvalue()
  //     return "new Uint8Array([" + ", ".join(str(x) for x in b) + "])"
  // npy_u8_5 = to_npy_uint8array(fib5_u8)
  // npy_f16_5 = to_npy_uint8array(fib5_f16)
  // npy_f32_5 = to_npy_uint8array(fib5_f32)
  // npy_u8_5, npy_f16_5, npy_f32_5

  // prettier-ignore
  const u8 = new Uint8Array([147, 78, 85, 77, 80, 89, 1, 0, 118, 0, 123, 39, 100, 101, 115, 99, 114, 39, 58, 32, 39, 124, 117, 49, 39, 44, 32, 39, 102, 111, 114, 116, 114, 97, 110, 95, 111, 114, 100, 101, 114, 39, 58, 32, 70, 97, 108, 115, 101, 44, 32, 39, 115, 104, 97, 112, 101, 39, 58, 32, 40, 53, 44, 41, 44, 32, 125, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 10, 0, 1, 1, 2, 3])
  // prettier-ignore
  const fp16 = new Uint8Array([147, 78, 85, 77, 80, 89, 1, 0, 118, 0, 123, 39, 100, 101, 115, 99, 114, 39, 58, 32, 39, 60, 102, 50, 39, 44, 32, 39, 102, 111, 114, 116, 114, 97, 110, 95, 111, 114, 100, 101, 114, 39, 58, 32, 70, 97, 108, 115, 101, 44, 32, 39, 115, 104, 97, 112, 101, 39, 58, 32, 40, 53, 44, 41, 44, 32, 125, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 10, 0, 0, 0, 60, 0, 60, 0, 64, 0, 66])
  // prettier-ignore
  const fp32 = new Uint8Array([147, 78, 85, 77, 80, 89, 1, 0, 118, 0, 123, 39, 100, 101, 115, 99, 114, 39, 58, 32, 39, 60, 102, 52, 39, 44, 32, 39, 102, 111, 114, 116, 114, 97, 110, 95, 111, 114, 100, 101, 114, 39, 58, 32, 70, 97, 108, 115, 101, 44, 32, 39, 115, 104, 97, 112, 101, 39, 58, 32, 40, 53, 44, 41, 44, 32, 125, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 10, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 0, 64, 0, 0, 64, 64])

  const everyoneLovesSprintPlanning = [0, 1, 1, 2, 3];

  const testCases = [
    { name: "u8", npy: u8, expectedDtype: "u1" },
    { name: "fp16", npy: fp16, expectedDtype: "f2" },
    { name: "fp32", npy: fp32, expectedDtype: "f4" },
  ];

  for (const { name, npy, expectedDtype } of testCases) {
    const { data, shape, dtype } = parseNpy(npy.buffer);
    SimpleTest.isDeeply(
      data,
      everyoneLovesSprintPlanning,
      `${name} encoding matches`
    );
    SimpleTest.isDeeply(shape, [5], `${name} shape matches`);
    SimpleTest.isDeeply(dtype, expectedDtype, `${name} shape matches`);
  }
});

/**
 * Check that round tripping works for the numpy parsing, and the generation from
 * test fixtures.
 */
add_task(function test_npy_fixture() {
  const vocabSize = 3;
  const dimensions = 4;
  const { numbers, encoding } = generateFloat16Numpy(vocabSize, dimensions);
  const { data, shape, dtype } = parseNpy(encoding.buffer);
  SimpleTest.isDeeply(numbers, data, "Round tripping produces the same array");
  SimpleTest.isDeeply(shape, [vocabSize, dimensions], "The shape is preserved");
  is(dtype, "f2", "The datatype is correctly fp16");
});

/**
 * Test that feature uninstall works as expected
 */
add_task(async function test_feature_uninstall() {
  const cache = await initializeCache();

  const hub = new ModelHub({
    rootUrl: FAKE_HUB,
    urlTemplate: FAKE_URL_TEMPLATE,
    allowDenyList: [],
  });
  hub.cache = cache;

  const testData = createBlob();
  const engineOne = crypto.randomUUID();
  const engineTwo = crypto.randomUUID();
  const model = "org/model";
  const revision = "v1";

  // a file is stored by engineOne
  await cache.put({
    engineId: engineOne,
    taskName: crypto.randomUUID(),
    model: "org/model",
    revision: "v1",
    file: "file.txt",
    data: createBlob(),
    headers: null,
  });

  // The file is read by engineTwo
  let retrievedData = await cache.getFile({
    engineId: engineTwo,
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });

  Assert.deepEqual(
    retrievedData[0],
    testData,
    "The retrieved data should match the stored data."
  );

  // We should have two engines associated with the model file
  let retrievedFiles = await cache.listFiles({ model, revision });
  Assert.equal(retrievedFiles.metadata.engineIds.length, 2);

  // Create engine instance
  new UtilsMLEngine({
    mlEngineParent: {},
    pipelineOptions: {
      engineId: engineOne,
      featureId: engineOne,
      taskName: "test-task",
    },
    notificationsCallback: null,
  });

  // Create engine instance
  new UtilsMLEngine({
    mlEngineParent: {},
    pipelineOptions: {
      engineId: engineTwo,
      featureId: engineTwo,
      taskName: "test-task",
    },
    notificationsCallback: null,
  });

  Assert.notEqual(UtilsMLEngine.getInstance(engineOne), null);
  Assert.notEqual(UtilsMLEngine.getInstance(engineTwo), null);

  // if we delete the model by engineOne, it will still be around for engineTwo
  await MLUninstallService.uninstall({ engineIds: [engineOne], hub });
  Assert.equal(UtilsMLEngine.getInstance(engineOne), null);

  retrievedData = await cache.getFile({
    engineId: engineTwo,
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });
  Assert.deepEqual(
    retrievedData[0],
    testData,
    "The retrieved data should match the stored data."
  );

  // We should now have one engine associated with the model file
  retrievedFiles = await cache.listFiles({ model, revision });
  Assert.equal(retrievedFiles.metadata.engineIds.length, 1);
  Assert.equal(retrievedFiles.metadata.engineIds[0], engineTwo);

  // now deleting via engineTwo
  await MLUninstallService.uninstall({ engineIds: [engineTwo], hub });
  Assert.equal(UtilsMLEngine.getInstance(engineTwo), null);

  // at this point we should not have anymore files
  const dataAfterDelete = await cache.getFile({
    engineId: engineOne,
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });
  Assert.equal(
    dataAfterDelete,
    null,
    "The data for the deleted model should not exist."
  );

  // Now we should have no more engine
  Assert.equal(await cache._testGetData(cache.enginesStoreName), null);

  await deleteCache(cache);
  await MLEngine.removeInstance(engineOne, false, false);
  await MLEngine.removeInstance(engineTwo, false, false);
});

/**
 * Test that full ml uninstall works as expected
 */
add_task(async function test_full_ml_uninstall() {
  const cache = await initializeCache();

  const hub = new ModelHub({
    rootUrl: FAKE_HUB,
    urlTemplate: FAKE_URL_TEMPLATE,
    allowDenyList: [],
  });
  hub.cache = cache;

  const testData = createBlob();
  const engineOne = crypto.randomUUID();
  const engineTwo = crypto.randomUUID();
  const model = "org/model";
  const revision = "v1";

  // a file is stored by engineOne
  await cache.put({
    engineId: engineOne,
    taskName: crypto.randomUUID(),
    model: "org/model",
    revision: "v1",
    file: "file.txt",
    data: createBlob(),
    headers: null,
  });

  // The file is read by engineTwo
  let retrievedData = await cache.getFile({
    engineId: engineTwo,
    model: "org/model",
    revision: "v1",
    file: "file.txt",
  });

  Assert.deepEqual(
    retrievedData[0],
    testData,
    "The retrieved data should match the stored data."
  );

  // We should have two engines associated with the model file
  let retrievedFiles = await cache.listFiles({ model, revision });
  Assert.equal(retrievedFiles.metadata.engineIds.length, 2);

  // Create engine instance
  new UtilsMLEngine({
    mlEngineParent: {},
    pipelineOptions: {
      engineId: engineOne,
      featureId: engineOne,
      taskName: "test-task",
    },
    notificationsCallback: null,
  });

  // Create engine instance
  new UtilsMLEngine({
    mlEngineParent: {},
    pipelineOptions: {
      engineId: engineTwo,
      featureId: engineTwo,
      taskName: "test-task",
    },
    notificationsCallback: null,
  });

  Assert.notEqual(UtilsMLEngine.getInstance(engineOne), null);
  Assert.notEqual(UtilsMLEngine.getInstance(engineTwo), null);

  await MLUninstallService.uninstallAll({ hub });

  Assert.ok(!(await indexedDBExists(cache.dbName)));

  let opfsExists = true;

  try {
    await UtilsOPFS.getDirectoryHandle(cache.dbName, { create: false });
  } catch (e) {
    if (e.name === "NotFoundError") {
      opfsExists = false;
    } else {
      throw e;
    }
  }

  Assert.ok(!opfsExists);

  await deleteCache(cache);
  await MLEngine.removeInstance(engineOne, false, false);
  await MLEngine.removeInstance(engineTwo, false, false);
});
