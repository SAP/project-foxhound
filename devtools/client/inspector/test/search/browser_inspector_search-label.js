/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Check that search label updated correctly based on the search result.

const TEST_URL = URL_ROOT + "doc_inspector_search.html";

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URL);
  const { searchResultsLabel } = inspector;

  info("Searching for test node #d1");
  await searchInMarkupView(inspector, "#d1");
  is(searchResultsLabel.textContent, "1 of 1");

  info(`Searching for word visible in element attribute and in text node`);
  await searchInMarkupView(inspector, "blah");
  is(searchResultsLabel.textContent, "1 of 2");

  info(
    `Searching for word visible in element attribute and its inlined text node`
  );
  await searchInMarkupView(inspector, "yo");
  is(searchResultsLabel.textContent, "1 of 1");

  info("Click the clear button");
  // Expect the label is cleared after clicking the clear button.

  inspector.searchClearButton.click();
  is(searchResultsLabel.textContent, "");

  // Catch-all event for remaining server requests when searching for the new
  // node.
  await inspector.once("inspector-updated");
});
