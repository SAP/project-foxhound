/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const {
  arrayBufferToBlobURL,
  MultiProgressAggregator,
  ProgressAndStatusCallbackParams,
  ProgressStatusText,
  readResponse,
  modelToResponse,
} = ChromeUtils.importESModule("chrome://global/content/ml/Utils.sys.mjs");

/**
 * Test arrayBufferToBlobURL function.
 */
add_task(async function test_ml_utils_array_buffer_to_blob_url() {
  const buffer = new ArrayBuffer(8);
  const blobURL = arrayBufferToBlobURL(buffer);

  Assert.equal(
    typeof blobURL,
    "string",
    "arrayBufferToBlobURL should return a string"
  );
  Assert.equal(
    blobURL.startsWith("blob:"),
    true,
    "The returned string should be a Blob URL"
  );
});

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

    Assert.ok(currentData, "Received data should be defined");
    Assert.deepEqual(
      {
        statusText: currentData?.statusText,
        type: currentData?.type,
        id: currentData?.id,
        numDone,
        numCalls,
      },
      {
        statusText: ProgressStatusText.INITIATE,
        type: taskTypes[i],
        id: taskIds[i],
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

    Assert.deepEqual(
      {
        numDone,
        numCalls,
        total: currentData.total,
      },
      {
        numDone: 0,
        total: expectedTotalToLoad,
        numCalls: expectedNumCalls,
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
        currentLoaded: currentData?.currentLoaded,
        totalLoaded: currentData?.totalLoaded,
      },
      {
        numDone: 0,
        numCalls: expectedNumCalls,
        total: expectedTotalToLoad,
        currentLoaded: chunkSizes[chunkIndex],
        totalLoaded: expectedTotalLoaded,
      },
      "Data received after in progress should be correct"
    );

    // Notify of task is done
    if (chunkIsFinal[chunkIndex]) {
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

  Assert.equal(numDone, 1, "Done status should be received");
});

/**
 * Test modelToResponse function.
 */
add_task(async function test_ml_utils_model_to_response() {
  const cases = [
    {
      model: new ArrayBuffer(8),
      headers: null,
      expected: {},
      msg: "valid response with no headers",
    },
    {
      model: new ArrayBuffer(8),
      headers: { some: "header" },
      expected: { some: "header" },
      msg: "valid response",
    },

    {
      model: new ArrayBuffer(8),
      headers: { some: "header", int: 1234 },
      expected: { some: "header", int: "1234" },
      msg: "valid response with ints conversion",
    },
    {
      model: new ArrayBuffer(8),
      headers: { some: null, int: 1234 },
      expected: { int: "1234" },
      msg: "valid response with null keys ignored",
    },
  ];

  cases.forEach(case_ => {
    const response = modelToResponse(case_.model, case_.headers);

    for (const [key, value] of Object.entries(case_.expected)) {
      Assert.deepEqual(response.headers.get(key), value, case_.message);
    }
  });
});
