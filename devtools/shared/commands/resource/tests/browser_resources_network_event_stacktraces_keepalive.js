/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test the ResourceCommand API for NETWORK_EVENT, NETWORK_EVENT_STACKTRACE with keepalive requests

const TEST_URI = `${URL_ROOT_SSL}network_document.html`;

const REQUEST_STUB = {
  code: `await fetch("/request_post_0.html", {
    method: "POST", 
    keepalive: true
  });`,
  expected: {
    url: "https://example.com/request_post_0.html",
    stacktraceAvailable: true,
    lastFrame: {
      filename:
        "https://example.com/browser/devtools/shared/commands/resource/tests/network_document.html",
      lineNumber: 1,
      columnNumber: 40,
      functionName: "triggerRequest",
      asyncCause: null,
    },
  },
};

add_task(async function () {
  info("Test network events and stacktraces for keepalive fetch requests");
  const tab = await addTab(TEST_URI);
  const { client, resourceCommand, targetCommand } =
    await initResourceCommand(tab);

  const networkEvents = new Map();
  let stacktraceReceived = false;
  let noOfNetworkUpdatesResources = 0;

  function onResourceAvailable(resources) {
    for (const resource of resources) {
      if (
        resource.resourceType === resourceCommand.TYPES.NETWORK_EVENT_STACKTRACE
      ) {
        is(
          resource.stacktraceAvailable,
          REQUEST_STUB.expected.stacktraceAvailable,
          "The stacktrace is available"
        );
        is(
          JSON.stringify(resource.lastFrame),
          JSON.stringify(REQUEST_STUB.expected.lastFrame),
          "The last frame of the stacktrace is available"
        );

        stacktraceReceived = true;
        return;
      }

      if (resource.resourceType === resourceCommand.TYPES.NETWORK_EVENT) {
        is(
          resource.url,
          REQUEST_STUB.expected.url,
          "The keepalive network request is available"
        );
        networkEvents.set(resource.resourceId, resource);
      }
    }
  }

  function onResourceUpdated(updates) {
    for (const { resource } of updates) {
      const networkResource = networkEvents.get(resource.resourceId);
      is(
        resource.url,
        networkResource.url,
        "Found a matching available notification for the update: " +
          resource.url
      );

      noOfNetworkUpdatesResources++;
    }
  }

  await resourceCommand.watchResources(
    [
      resourceCommand.TYPES.NETWORK_EVENT_STACKTRACE,
      resourceCommand.TYPES.NETWORK_EVENT,
    ],
    {
      onAvailable: onResourceAvailable,
      onUpdated: onResourceUpdated,
    }
  );

  await triggerNetworkRequests(tab.linkedBrowser, [REQUEST_STUB.code]);

  // Wait for the network updates related to the network event
  await waitUntil(() => noOfNetworkUpdatesResources >= 1);

  ok(stacktraceReceived, "Stack trace for keepalive request was received");
  Assert.greater(networkEvents.size, 0, "Keepalive network event was received");
  Assert.greater(
    noOfNetworkUpdatesResources,
    0,
    "Keepalive network updates were received"
  );

  resourceCommand.unwatchResources(
    [
      resourceCommand.TYPES.NETWORK_EVENT_STACKTRACE,
      resourceCommand.TYPES.NETWORK_EVENT,
    ],
    {
      onAvailable: onResourceAvailable,
      onUpdated: onResourceUpdated,
    }
  );

  targetCommand.destroy();
  await client.close();
  BrowserTestUtils.removeTab(tab);
});
