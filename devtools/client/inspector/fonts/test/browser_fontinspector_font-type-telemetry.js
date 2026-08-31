/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test that telemetry works for tracking the font type shown in the Font Editor.

const TEST_URI = URL_ROOT + "doc_browser_fontinspector.html";

add_task(async function () {
  const { inspector } = await openFontInspectorForURL(TEST_URI);

  await selectNode(".normal-text", inspector);
  await selectNode(".bold-text", inspector);
  Assert.greater(
    Glean.devtoolsInspector.fonteditorFontTypeDisplayed.nonvariable.testGetValue(),
    0
  );
});
