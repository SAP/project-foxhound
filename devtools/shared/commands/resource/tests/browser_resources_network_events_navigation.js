/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test the ResourceCommand API around NETWORK_EVENT when navigating

const TEST_URI = `${URL_ROOT_SSL}network_document_navigation.html`;
const JS_URI = TEST_URI.replace(
  "network_document_navigation.html",
  "network_navigation.js"
);
const IFRAME_URI = TEST_URI.replace(
  "network_document_navigation.html",
  "iframe_request.html"
);
const IFRAME_JS_URI = TEST_URI.replace(
  "network_document_navigation.html",
  "iframe_request.js"
);

add_task(async () => {
  const tab = await addTab(TEST_URI);
  const commands = await CommandsFactory.forTab(tab);
  await commands.targetCommand.startListening();
  const { resourceCommand } = commands;

  const receivedResources = [];
  const onAvailable = resources => {
    for (const resource of resources) {
      is(
        resource.resourceType,
        resourceCommand.TYPES.NETWORK_EVENT,
        "Received a network event resource"
      );
      receivedResources.push(resource);
    }
  };
  const onUpdated = updates => {
    for (const { resource } of updates) {
      is(
        resource.resourceType,
        resourceCommand.TYPES.NETWORK_EVENT,
        "Received a network update event resource"
      );
    }
  };

  // Ensure listening for DOCUMENT_EVENT so that requests are properly cleared on the backend side
  // (this generates the will-navigate used to clear requests)
  await resourceCommand.watchResources([resourceCommand.TYPES.DOCUMENT_EVENT], {
    onAvailable() {},
  });

  await resourceCommand.watchResources([resourceCommand.TYPES.NETWORK_EVENT], {
    ignoreExistingResources: true,
    onAvailable,
    onUpdated,
  });

  await reloadSelectedTab();

  await waitFor(() => receivedResources.length == 4);

  info("Remove the iframe, to ensure its request is still inspectable");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    content.document.querySelector("iframe").remove();
  });

  const navigationRequest = receivedResources.find(r => r.url === TEST_URI);
  ok(navigationRequest, "The navigation request exists");

  const jsRequest = receivedResources.find(r => r.url === JS_URI);
  ok(jsRequest, "The JavaScript request exists");

  const iframeRequest = receivedResources.find(r => r.url === IFRAME_URI);
  ok(iframeRequest, "The iframe request exists");

  const iframeJsRequest = receivedResources.find(r => r.url === IFRAME_JS_URI);
  ok(iframeJsRequest, "The iframe JavaScript request exists");

  async function getResponseContent(networkEvent) {
    const packet = {
      to: networkEvent.actor,
      type: "getResponseContent",
    };
    const response = await commands.client.request(packet);
    return response.content.text;
  }

  const HTML_CONTENT = await (await fetch(TEST_URI)).text();
  const JS_CONTENT = await (await fetch(JS_URI)).text();
  const IFRAME_CONTENT = await (await fetch(IFRAME_URI)).text();
  const IFRAME_JS_CONTENT = await (await fetch(IFRAME_JS_URI)).text();

  const isNavigationCacheEnabled = Services.prefs.getBoolPref(
    "dom.script_loader.experimental.navigation_cache"
  );

  const htmlContent = await getResponseContent(navigationRequest);
  is(htmlContent, HTML_CONTENT);
  const jsContent = await getResponseContent(jsRequest);
  is(jsContent, JS_CONTENT);
  const iframeContent = await getResponseContent(iframeRequest);
  is(iframeContent, IFRAME_CONTENT);
  const iframeJsContent = await getResponseContent(iframeJsRequest);
  is(iframeJsContent, IFRAME_JS_CONTENT);

  await reloadSelectedTab();

  await waitFor(() => receivedResources.length == 8);

  try {
    await getResponseContent(navigationRequest);
    ok(false, "Shouldn't work");
  } catch (e) {
    is(
      e.error,
      "noSuchActor",
      "Without persist, we can't fetch previous document network data"
    );
  }

  try {
    await getResponseContent(jsRequest);
    ok(false, "Shouldn't work");
  } catch (e) {
    is(
      e.error,
      "noSuchActor",
      "Without persist, we can't fetch previous document network data"
    );
  }

  const currentResources = receivedResources.slice(4);

  const navigationRequest2 = currentResources.find(r => r.url === TEST_URI);
  ok(navigationRequest2, "The navigation request exists");

  const jsRequest2 = currentResources.find(r => r.url === JS_URI);
  ok(jsRequest2, "The JavaScript request exists");

  const iframeRequest2 = currentResources.find(r => r.url === IFRAME_URI);
  ok(iframeRequest2, "The iframe request exists");

  const iframeJsRequest2 = currentResources.find(r => r.url === IFRAME_JS_URI);
  ok(iframeJsRequest2, "The iframe JavaScript request exists");

  info("But we can fetch data for the last/new document");
  const htmlContent2 = await getResponseContent(navigationRequest2);
  is(htmlContent2, HTML_CONTENT);
  const jsContent2 = await getResponseContent(jsRequest2);
  is(jsContent2, JS_CONTENT);
  const iframeContent2 = await getResponseContent(iframeRequest2);
  is(iframeContent2, IFRAME_CONTENT);
  const iframeJsContent2 = await getResponseContent(iframeJsRequest2);
  is(iframeJsContent2, IFRAME_JS_CONTENT);

  info("Enable persist");
  const networkParentFront =
    await commands.watcherFront.getNetworkParentActor();
  await networkParentFront.setPersist(true);

  await reloadSelectedTab();

  await waitFor(() => receivedResources.length == 12);

  info("With persist, we can fetch previous document network data");
  const htmlContent3 = await getResponseContent(navigationRequest2);
  is(htmlContent3, HTML_CONTENT);
  // If the resource comes from in-memory cache, jsRequest2 is associated with
  // a process, and the actor is no longer reachable.
  if (!isNavigationCacheEnabled) {
    const jsContent3 = await getResponseContent(jsRequest2);
    is(jsContent3, JS_CONTENT);
  }
  const iframeContent3 = await getResponseContent(iframeRequest2);
  is(iframeContent3, IFRAME_CONTENT);
  if (!isNavigationCacheEnabled) {
    const iframeJsContent3 = await getResponseContent(iframeJsRequest2);
    is(iframeJsContent3, IFRAME_JS_CONTENT);
  }

  await resourceCommand.unwatchResources(
    [resourceCommand.TYPES.NETWORK_EVENT],
    {
      onAvailable,
      onUpdated,
    }
  );

  await commands.destroy();
  BrowserTestUtils.removeTab(tab);
});
