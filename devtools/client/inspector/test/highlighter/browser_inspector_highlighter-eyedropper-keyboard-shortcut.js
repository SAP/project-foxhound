/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// Test that the eye-dropper shortcut works.
add_task(async function () {
  const { toolbox, highlighterTestFront } = await openInspectorForURL(
    "data:text/html;charset=utf-8,eye-dropper test"
  );

  info("Checking that the eyedropper is hidden by default");
  const eyeDropperVisible = await highlighterTestFront.isEyeDropperVisible();
  is(eyeDropperVisible, false, "The eyedropper is hidden by default");

  info("Display the eyedropper by pressing the related keyboard shortcut");

  synthesizeKeyShortcut(INSPECTOR_L10N.getStr("inspector.eyedropper.key"));

  await waitFor(
    () => highlighterTestFront.isEyeDropperVisible(),
    "Eye dropper is visible after pressing the shortcut"
  );

  const style = await highlighterTestFront.getEyeDropperElementAttribute(
    "eye-dropper-root",
    "style"
  );
  is(style, "top:100px;left:100px;", "The eyedropper is correctly positioned");

  info("Hide the eyedropper by pressing Escape");
  EventUtils.synthesizeKey("VK_ESCAPE", {}, toolbox.win);
  await waitFor(async () => {
    const visible = await highlighterTestFront.isEyeDropperVisible();
    return !visible;
  }, "Eye dropper is not visible anymore");
  ok(true);
});
