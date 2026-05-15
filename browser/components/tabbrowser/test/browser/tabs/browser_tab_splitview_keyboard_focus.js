"use strict";

add_setup(() =>
  SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  })
);

/**
 * Presses Cmd + arrow key/Ctrl + arrow key in order to move the keyboard
 * focused item in the tab strip left or right
 *
 * @param {MozTabbrowserTab|MozTextLabel} element
 * @param {"KEY_ArrowUp"|"KEY_ArrowDown"|"KEY_ArrowLeft"|"KEY_ArrowRight"} keyName
 * @returns {Promise<true>}
 */
function synthesizeKeyToChangeKeyboardFocus(element, keyName) {
  let focused = TestUtils.waitForCondition(() => {
    return element.classList.contains("tablist-keyboard-focus");
  }, "Waiting for element to get keyboard focus");
  EventUtils.synthesizeKey(keyName, { accelKey: true });
  return focused;
}

/**
 * Presses an arrow key in order to change the active tab to the left or right.
 *
 * @param {MozTabbrowserTab|MozTextLabel} element
 * @param {"KEY_ArrowUp"|"KEY_ArrowDown"|"KEY_ArrowLeft"|"KEY_ArrowRight"} keyName
 * @returns {Promise<true>}
 */
function synthesizeKeyForKeyboardMovement(element, keyName) {
  let focused = TestUtils.waitForCondition(() => {
    return (
      element.classList.contains("tablist-keyboard-focus") ||
      document.activeElement == element
    );
  }, "Waiting for element to become active tab and/or get keyboard focus");
  EventUtils.synthesizeKey(keyName);
  return focused;
}

add_task(async function test_SplitViewKeyboardFocus() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab3 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab4 = BrowserTestUtils.addTab(gBrowser, "about:blank");

  const splitView = gBrowser.addTabSplitView([tab2, tab3], {
    insertBefore: tab2,
  });

  await BrowserTestUtils.switchTab(gBrowser, tab2);

  // The user normally needs to hit Tab/Shift+Tab in order to cycle
  // focused elements until the active tab is focused, but the number
  // of focusable elements in the browser changes depending on the user's
  // UI customizations. This code is forcing the focus to the active tab
  // to avoid any dependencies on specific UI configuration.
  info("Move focus to the active tab");
  Services.focus.setFocus(tab2, Services.focus.FLAG_BYKEY);

  is(document.activeElement, tab2, "Tab2 should be focused");
  is(
    gBrowser.tabContainer.ariaFocusedItem,
    tab2,
    "Tab2 should be keyboard-focused as well"
  );

  await synthesizeKeyToChangeKeyboardFocus(tab1, "KEY_ArrowLeft");
  is(
    gBrowser.tabContainer.ariaFocusedItem,
    tab1,
    "Tab1 should be keyboard-focused"
  );

  await synthesizeKeyToChangeKeyboardFocus(tab2, "KEY_ArrowRight");
  is(
    gBrowser.tabContainer.ariaFocusedItem,
    tab2,
    "keyboard focus should move right from tab1 to tab2"
  );

  await synthesizeKeyToChangeKeyboardFocus(tab1, "KEY_ArrowUp");
  is(
    gBrowser.tabContainer.ariaFocusedItem,
    tab1,
    "keyboard focus 'up' should move left from tab2 to tab1 with LTR GUI"
  );

  await synthesizeKeyToChangeKeyboardFocus(tab2, "KEY_ArrowDown");
  is(
    gBrowser.tabContainer.ariaFocusedItem,
    tab2,
    "keyboard focus 'down' should move down from tab1 to tab2 with LTR GUI"
  );

  splitView.close();
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab4);
});
