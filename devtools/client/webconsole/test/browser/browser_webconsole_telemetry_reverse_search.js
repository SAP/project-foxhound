/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that the console records the reverse search telemetry event with expected data
// on open, navigate forward, navigate back and evaluate expression.

"use strict";

const TEST_URI = `data:text/html,<!DOCTYPE html><meta charset=utf8>Test reverse_search telemetry event`;
const isMacOS = AppConstants.platform === "macosx";

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const hud = await openNewTabAndConsole(TEST_URI);

  info("Evaluate single line expressions");
  await keyboardExecuteAndWaitForResultMessage(hud, `"single line 1"`, "");
  await keyboardExecuteAndWaitForResultMessage(hud, `"single line 2"`, "");
  await keyboardExecuteAndWaitForResultMessage(hud, `"single line 3"`, "");

  info("Open editor mode");
  await toggleLayout(hud);

  info("Open reverse search from editor mode");
  hud.ui.outputNode
    .querySelector(".webconsole-editor-toolbar-reverseSearchButton")
    .click();

  info("Close reverse search");
  EventUtils.synthesizeKey("KEY_Escape");

  info("Open reverse search using keyboard shortcut");
  await openReverseSearch(hud);

  info("Send keys to reverse search");
  EventUtils.sendString("sin");

  info("Reverse search navigate next - keyboard");
  navigateReverseSearch("keyboard", "next", hud);

  info("Reverse search navigate previous - keyboard");
  navigateReverseSearch("keyboard", "previous", hud);

  info("Reverse search navigate next - mouse");
  navigateReverseSearch("mouse", "next", hud);

  info("Reverse search navigate previous - mouse");
  navigateReverseSearch("mouse", "previous", hud);

  info("Reverse search evaluate expression");
  const onMessage = waitForMessageByType(hud, "single line 3", ".result");
  EventUtils.synthesizeKey("KEY_Enter");
  await onMessage;

  info("Check reverse search telemetry");
  const events = Glean.devtoolsMain.reverseSearchWebconsole.testGetValue();
  is(7, events.length);
  const values = [
    "editor-toolbar-icon",
    "keyboard",
    "keyboard",
    "keyboard",
    "click",
    "click",
    undefined,
  ];
  const funcs = [
    "open",
    "open",
    "navigate next",
    "navigate previous",
    "navigate next",
    "navigate previous",
    "evaluate expression",
  ];
  for (const [ev, value, func] of Iterator.zip([events, values, funcs])) {
    is(value, ev.extra.value);
    is(func, ev.extra.functionality);
    Assert.greater(Number(ev.extra.session_id), 0);
  }

  info("Revert to inline layout");
  await toggleLayout(hud);
});

function triggerPreviousResultShortcut() {
  if (isMacOS) {
    EventUtils.synthesizeKey("r", { ctrlKey: true });
  } else {
    EventUtils.synthesizeKey("VK_F9");
  }
}

function triggerNextResultShortcut() {
  if (isMacOS) {
    EventUtils.synthesizeKey("s", { ctrlKey: true });
  } else {
    EventUtils.synthesizeKey("VK_F9", { shiftKey: true });
  }
}

function clickPreviousButton(hud) {
  const reverseSearchElement = getReverseSearchElement(hud);
  if (!reverseSearchElement) {
    return;
  }
  const button = reverseSearchElement.querySelector(
    ".search-result-button-prev"
  );
  if (!button) {
    return;
  }

  button.click();
}

function clickNextButton(hud) {
  const reverseSearchElement = getReverseSearchElement(hud);
  if (!reverseSearchElement) {
    return;
  }
  const button = reverseSearchElement.querySelector(
    ".search-result-button-next"
  );
  if (!button) {
    return;
  }
  button.click();
}

function navigateReverseSearch(access, direction, hud) {
  if (access == "keyboard") {
    if (direction === "previous") {
      triggerPreviousResultShortcut();
    } else {
      triggerNextResultShortcut();
    }
  } else if (access === "mouse") {
    if (direction === "previous") {
      clickPreviousButton(hud);
    } else {
      clickNextButton(hud);
    }
  }
}
