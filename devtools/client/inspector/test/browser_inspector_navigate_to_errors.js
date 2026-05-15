/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Test that inspector works when navigating to error pages.

const TEST_URL_1 =
  'data:text/html,<html><body id="test-doc-1">page</body></html>';
const TEST_URL_2 = "http://127.0.0.1:36325/";
const TEST_URL_3 = "https://www.wronguri.wronguri/";
const TEST_URL_4 = "data:text/html,<html><body>test-doc-4</body></html>";

add_task(async function () {
  // Open the inspector on a valid URL
  const { inspector } = await openInspectorForURL(TEST_URL_1);

  info("Navigate to closed port");
  await navigateTo(TEST_URL_2, { isErrorPage: true });

  info("Wait for error page to initialize");
  await TestUtils.waitForTick();

  const documentURI = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      return content.document.documentURI;
    }
  );
  ok(documentURI.startsWith("about:neterror"), "content is correct.");

  const hasPage = await getNodeFront("#test-doc-1", inspector);
  ok(
    !hasPage,
    "Inspector actor is no longer able to reach previous page DOM node"
  );

  let errorSelector = "#netErrorIntro";
  let hasNetErrorNode = await getNodeFront(errorSelector, inspector);
  if (!hasNetErrorNode) {
    errorSelector = "#errorShortDesc";
    hasNetErrorNode = await getNodeFront(errorSelector, inspector);
  }
  if (!hasNetErrorNode) {
    errorSelector = "body";
    hasNetErrorNode = await getNodeFront(errorSelector, inspector);
  }
  ok(hasNetErrorNode, "Inspector actor is able to reach error page DOM node");

  const bodyNode = await getNodeFront("body", inspector);
  ok(bodyNode, "Inspector actor is able to reach body of error page");

  info("Navigate to unknown domain");
  await navigateTo(TEST_URL_3, { isErrorPage: true });

  info("Wait for error page to initialize");
  await TestUtils.waitForTick();

  const bodyNode2 = await getNodeFront("body", inspector);
  ok(bodyNode2, "Inspector still works after navigating to another error page");

  info("Navigate to a valid url");
  await navigateTo(TEST_URL_4);

  is(
    await getDisplayedNodeTextContent("body", inspector),
    "test-doc-4",
    "Inspector really inspects the valid url"
  );
});
