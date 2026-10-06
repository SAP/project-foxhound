/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const WORKER_TEST_PAGE =
  "https://example.com/browser/remote/shared/test/browser/workers/test_worker.html";
const WORKER_URL =
  "https://example.com/browser/remote/shared/test/browser/workers/worker.js";
const SHARED_WORKER_TEST_PAGE =
  "https://example.com/browser/remote/shared/test/browser/workers/test_shared_worker.html";
const SHARED_WORKER_URL =
  "https://example.com/browser/remote/shared/test/browser/workers/shared_worker.js";
const SERVICE_WORKER_TEST_PAGE =
  "https://example.com/browser/remote/shared/test/browser/workers/test_service_worker.html";
const SERVICE_WORKER_URL =
  "https://example.com/browser/remote/shared/test/browser/workers/service_worker.js";
const CHROME_WORKER_URL =
  "chrome://mochitests/content/browser/remote/shared/test/browser/workers/chrome_worker.js";

function assertWorkerData(data, expectedData) {
  is(typeof data.id, "string", "Event data contains an id");
  is(typeof data.url, "string", "Event data contains a url");
  is(typeof data.type, "number", "Event data contains a type");
  ok(Array.isArray(data.windowIDs), "Event data contains a type");

  if (typeof expectedData.alreadyRegistered === "boolean") {
    Assert.strictEqual(
      data.alreadyRegistered,
      expectedData.alreadyRegistered,
      "Worker is not marked as alreadyRegistered"
    );
  }

  if (typeof expectedData.url === "string") {
    is(data.url, expectedData.url, "Event data has the expected URL");
  } else if (typeof expectedData.checkUrl === "function") {
    ok(expectedData.checkUrl(data.url), "Event data has a correct URL");
  }

  if (typeof expectedData.type === "number") {
    is(data.type, expectedData.type, "Event data has the expected type");
  }

  // By default, assume we are asserting non-chrome workers.
  Assert.strictEqual(
    data.isChrome,
    !!expectedData.isChrome,
    "Worker has the expected isChrome value"
  );

  if (expectedData.windowIDs) {
    is(
      data.windowIDs.length,
      expectedData.windowIDs.length,
      "Event data has the expected number owner window ids"
    );
    for (const id of expectedData.windowIDs) {
      ok(
        data.windowIDs.includes(id),
        `Event data has the expected window id ${id}`
      );
    }
  }
}

async function waitForWorkersByURL(workers, expectedUrl, expectedCount) {
  const filterFn = worker => {
    if (typeof expectedUrl === "string") {
      return worker.url === expectedUrl;
    }

    if (typeof expectedUrl === "function") {
      return expectedUrl(worker.url);
    }

    return false;
  };

  return waitForWorkersByFilter(workers, filterFn, expectedCount);
}

async function waitForWorkersByIds(workers, expectedIds, expectedCount) {
  const filterFn = w => expectedIds.includes(w.id);

  return waitForWorkersByFilter(workers, filterFn, expectedCount);
}

async function waitForWorkersByFilter(workers, filterFn, expectedCount) {
  await BrowserTestUtils.waitForCondition(
    () => workers.filter(filterFn).length === expectedCount,
    `Wait for ${expectedCount} worker event(s) to be received`
  );

  is(
    workers.filter(filterFn).length,
    expectedCount,
    "Received the expected number of worker events"
  );

  return workers.filter(filterFn);
}
