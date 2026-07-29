/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI =
  "<style>" +
  "#div1 { box-sizing: border-box; width: 200px; height: 100px; padding: 10px; border: 5px solid black; }" +
  "</style>" +
  "<div id='div1'></div>";

add_task(async function () {
  await pushPref("devtools.toolbox.footer.height", 500);

  await addTab("data:text/html," + encodeURIComponent(TEST_URI));
  const { inspector, boxmodel } = await openLayoutView();

  await testBorderBoxWidthIsEditable(inspector, boxmodel);
  await testBorderBoxHeightIsEditable(inspector, boxmodel);
});

async function testBorderBoxWidthIsEditable(inspector, boxmodel) {
  info("Test that width is editable for border-box elements");

  await selectNode("#div1", inspector);

  const span = boxmodel.document.querySelector(
    ".boxmodel-content.boxmodel-width > span"
  );
  ok(span, "Should have the width span in the box model.");

  EventUtils.synthesizeMouseAtCenter(span, {}, boxmodel.document.defaultView);
  const editor = boxmodel.document.querySelector(
    ".styleinspector-propertyeditor"
  );
  ok(editor, "Should have opened the editor for border-box width.");

  let onUpdate = waitForUpdate(inspector);
  EventUtils.synthesizeKey("1", {}, boxmodel.document.defaultView);
  await onUpdate;

  onUpdate = waitForUpdate(inspector);
  EventUtils.synthesizeKey("VK_ESCAPE", {}, boxmodel.document.defaultView);
  await onUpdate;
}

async function testBorderBoxHeightIsEditable(inspector, boxmodel) {
  info("Test that height is editable for border-box elements");

  await selectNode("#div1", inspector);

  const span = boxmodel.document.querySelector(
    ".boxmodel-content.boxmodel-height > span"
  );
  ok(span, "Should have the height span in the box model.");

  EventUtils.synthesizeMouseAtCenter(span, {}, boxmodel.document.defaultView);
  const editor = boxmodel.document.querySelector(
    ".styleinspector-propertyeditor"
  );
  ok(editor, "Should have opened the editor for border-box height.");

  let onUpdate = waitForUpdate(inspector);
  EventUtils.synthesizeKey("1", {}, boxmodel.document.defaultView);
  await onUpdate;

  onUpdate = waitForUpdate(inspector);
  EventUtils.synthesizeKey("VK_ESCAPE", {}, boxmodel.document.defaultView);
  await onUpdate;
}
