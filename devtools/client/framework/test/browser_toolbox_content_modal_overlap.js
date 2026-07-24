/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URL =
  "data:text/html,<!DOCTYPE html><meta charset=utf-8>test the content modal doesn't overlap the toolbox";

const { PromptTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromptTestUtils.sys.mjs"
);

add_task(async function () {
  const tab = await addTab(TEST_URL);

  await gDevTools.showToolboxForTab(tab, {
    toolId: "webconsole",
  });

  info("Move focus to the content page");
  Services.focus.setFocus(gBrowser.selectedBrowser, Services.focus.FLAG_BYKEY);

  info("Call alert() in the content page");
  const onPrompt = PromptTestUtils.waitForPrompt(gBrowser.selectedBrowser, {
    modalType: Services.prompt.MODAL_TYPE_CONTENT,
    promptType: "alert",
  });
  const onSpawnedTaskResolved = SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      content.alert("woop woop");
    }
  );

  info("Wait for the alert dialog to be opened");
  const alertDialog = await onPrompt;

  info("Click at a position that would focus the console");
  const browserContainerEl =
    gBrowser.selectedBrowser.closest(".browserContainer");
  EventUtils.synthesizeMouse(
    browserContainerEl,
    // We want to click at the bottom center, so we focus the console input
    browserContainerEl.clientWidth / 2,
    browserContainerEl.clientHeight - 30,
    {},
    browserContainerEl.ownerGlobal
  );

  isnot(
    Services.focus.focusedElement.closest("#devtools-webconsole"),
    null,
    "console is now focused"
  );

  // Close the dialog
  PromptTestUtils.handlePrompt(alertDialog);
  await onSpawnedTaskResolved;
});
