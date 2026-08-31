/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests adding a rule on elements nested in iframes.

const TEST_URI = `<div>outer</div>
  <iframe id="frame1" src="data:text/html;charset=utf-8,<div>inner1</div>">
  </iframe>
  <iframe id="frame2" src="data:text/html;charset=utf-8,<div>inner2</div>">
  </iframe>`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("div", inspector);
  await addNewRuleAndDismissEditor(inspector, view, "div", 1);
  await addProperty(view, 1, "color", "red");

  await selectNodeInFrames(["#frame1", "div"], inspector);
  await addNewRuleAndDismissEditor(inspector, view, "div", 1);
  await addProperty(view, 1, "color", "blue");

  await selectNodeInFrames(["#frame2", "div"], inspector);
  await addNewRuleAndDismissEditor(inspector, view, "div", 1);
  await addProperty(view, 1, "color", "green");
});
