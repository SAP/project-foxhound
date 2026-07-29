/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the telemetry is correct when the flexbox highlighter is activated from
// the markup view.

const TEST_URI = `
  <style type="text/css">
    #flex {
      display: flex;
    }
  </style>
  <div id="flex"></div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  Services.fog.testResetFOG();

  const { inspector } = await openLayoutView();
  const HIGHLIGHTER_TYPE = inspector.highlighters.TYPES.FLEXBOX;
  const { waitForHighlighterTypeShown, waitForHighlighterTypeHidden } =
    getHighlighterTestHelpers(inspector);

  await selectNode("#flex", inspector);
  const flexContainer = await getContainerForSelector("#flex", inspector);
  const flexDisplayBadge = flexContainer.elt.querySelector(
    ".inspector-badge.interactive[data-display]"
  );

  info("Toggling ON the flexbox highlighter from the flex display badge.");
  const onHighlighterShown = waitForHighlighterTypeShown(HIGHLIGHTER_TYPE);
  flexDisplayBadge.click();
  await onHighlighterShown;

  info("Toggling OFF the flexbox highlighter from the flex display badge.");
  const onHighlighterHidden = waitForHighlighterTypeHidden(HIGHLIGHTER_TYPE);
  flexDisplayBadge.click();
  await onHighlighterHidden;

  checkResults();
});

function checkResults() {
  is(1, Glean.devtoolsMarkupFlexboxhighlighter.opened.testGetValue());
  Assert.greater(
    Glean.devtools.flexboxHighlighterTimeActive.testGetValue().sum,
    0
  );
}
