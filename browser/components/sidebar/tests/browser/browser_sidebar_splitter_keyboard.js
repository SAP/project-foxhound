/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function elementStr(elem) {
  let str = elem.localName;
  if (elem.id) {
    str += `#${elem.id}`;
  }
  return str;
}

async function expectFocusAfterKey(expectedActiveElement, keyName, keyOptions) {
  // Use capture phase when the target is a browser element, since focus may
  // land on an element inside the content document rather than the browser
  // itself. The capture listener on the browser will still fire.
  let useCapture = expectedActiveElement.localName === "browser";
  let focused = BrowserTestUtils.waitForEvent(
    expectedActiveElement,
    "focus",
    useCapture
  );
  EventUtils.synthesizeKey(keyName, keyOptions);
  await focused;
  Assert.equal(
    document.activeElement,
    expectedActiveElement,
    `After ${keyName}${keyOptions?.shiftKey ? " (Shift)" : ""}, the expected element has focus (${elementStr(document.activeElement)})`
  );
}

async function openSidebarPanel(commandID = "viewBookmarksSidebar") {
  let promiseFocused = BrowserTestUtils.waitForEvent(window, "SidebarFocused");
  await SidebarController.show(commandID);
  await promiseFocused;
  await SidebarController.waitUntilStable();
}

async function setupSplitterTest() {
  await openSidebarPanel();

  const splitter = document.getElementById("sidebar-splitter");
  const sidebarBrowser = SidebarController.browser;
  const contentBrowser = gBrowser.selectedBrowser;

  Assert.ok(
    BrowserTestUtils.isVisible(splitter),
    "The splitter is visible when the sidebar is open"
  );
  return { splitter, sidebarBrowser, contentBrowser };
}

async function tabThroughSidebarToSplitter(splitter, sidebarBrowser) {
  Assert.equal(
    document.activeElement,
    sidebarBrowser,
    "Sidebar browser has focus"
  );
  // Tab through the sidebar panel's focusable content.
  // The panel header has a close button, and the synced tabs panel has a
  // search input. Tab through all of those until we reach the splitter.
  info("Tab until we reach the splitter");
  let maxTabs = 20;
  while (document.activeElement !== splitter && --maxTabs > 0) {
    EventUtils.synthesizeKey("KEY_Tab");
    await TestUtils.waitForTick();
  }
  Assert.equal(
    document.activeElement,
    splitter,
    "Splitter has focus after tabbing through the sidebar panel"
  );
}
/**
 * Tab order with sidebar open on the left (LTR, right with RTL) (default position).
 * Focus should move through the panel's focusable elements, then to the
 * splitter, then to the content browser.
 */
async function test_sidebarSplitterTabOrder() {
  await BrowserTestUtils.withNewTab("https://example.com", async function () {
    const { splitter, sidebarBrowser, contentBrowser } =
      await setupSplitterTest();

    Services.focus.setFocus(sidebarBrowser, Services.focus.FLAG_BYKEY);
    await tabThroughSidebarToSplitter(splitter, sidebarBrowser);

    info("Tab from splitter -> content browser");
    await expectFocusAfterKey(contentBrowser, "KEY_Tab");

    info("Shift+Tab from content browser -> splitter");
    await expectFocusAfterKey(splitter, "KEY_Tab", { shiftKey: true });

    info("Shift+Tab from splitter -> sidebar browser");
    await expectFocusAfterKey(sidebarBrowser, "KEY_Tab", { shiftKey: true });

    SidebarController.hide();
  });
}

add_task(async function test_sidebarSplitterTabOrder_LTR() {
  Assert.ok(
    document.documentElement.matches(":dir(ltr)"),
    "UI is in LTR order"
  );
  await test_sidebarSplitterTabOrder();
});

add_task(async function test_sidebarSplitterTabOrder_RTL() {
  await SpecialPowers.pushPrefEnv({ set: [["intl.l10n.pseudo", "bidi"]] });
  Assert.ok(
    document.documentElement.matches(":dir(rtl)"),
    "UI is in LTR order"
  );
  await test_sidebarSplitterTabOrder();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tab order with sidebar on the right side.
 * When the sidebar is on the right (LTR, left in RTL), the content browser
 * comes first in focus order, then the splitter, then the sidebar panel.
 */
add_task(async function test_sidebarSplitterTabOrder_rightSide() {
  await SpecialPowers.pushPrefEnv({ set: [[POSITION_SETTING_PREF, false]] });
  const { splitter, sidebarBrowser, contentBrowser } =
    await setupSplitterTest();

  Services.focus.setFocus(contentBrowser, Services.focus.FLAG_BYKEY);
  await TestUtils.waitForTick();
  info("Tab from content browser -> splitter");
  await expectFocusAfterKey(splitter, "KEY_Tab");

  info("Tab from splitter -> sidebar browser");
  await expectFocusAfterKey(sidebarBrowser, "KEY_Tab");

  info("Shift+Tab from sidebar browser back to splitter");
  await expectFocusAfterKey(splitter, "KEY_Tab", { shiftKey: true });

  info("Shift+Tab from splitter -> content browser");
  await expectFocusAfterKey(contentBrowser, "KEY_Tab", { shiftKey: true });

  SidebarController.hide();
  await SpecialPowers.popPrefEnv();
}).skip(); // Bug 2024362

/**
 * Splitter is not focusable when the sidebar is closed.
 */
add_task(async function test_sidebarSplitterNotFocusableWhenHidden() {
  SidebarController.hide();
  await SidebarController.waitUntilStable();

  const splitter = document.getElementById("sidebar-splitter");
  Assert.ok(splitter.hidden, "Splitter is hidden when sidebar is closed");

  info("Focus the content browser and tab backward");
  const contentBrowser = gBrowser.selectedBrowser;
  Services.focus.setFocus(contentBrowser, Services.focus.FLAG_BYKEY);
  await TestUtils.waitForTick();
  Assert.equal(
    document.activeElement,
    contentBrowser,
    "Content browser has focus"
  );

  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
  await TestUtils.waitForTick();

  Assert.notEqual(
    document.activeElement,
    splitter,
    "Splitter does not receive focus when hidden"
  );
});

/**
 * Keyboard resizing of the sidebar via the splitter.
 * Arrow keys should resize the sidebar when the splitter has focus.
 */
add_task(async function test_sidebarSplitterKeyboardResize() {
  const { splitter } = await setupSplitterTest();
  Services.focus.setFocus(splitter, Services.focus.FLAG_BYKEY);

  const sidebarBox = document.getElementById("sidebar-box");
  let beforeWidth = sidebarBox.getBoundingClientRect().width;
  info(`Sidebar width before arrow key: ${beforeWidth}`);

  info("Press ArrowRight to grow the sidebar");
  let cmdEventPromise = BrowserTestUtils.waitForEvent(splitter, "command");
  EventUtils.synthesizeKey("KEY_ArrowRight");
  await cmdEventPromise;
  await waitForRepaint();

  let afterWidth = sidebarBox.getBoundingClientRect().width;
  info(`Sidebar width after ArrowRight: ${afterWidth}`);
  Assert.greater(
    afterWidth,
    beforeWidth,
    "The sidebar grew when pressing ArrowRight (sidebar on left)"
  );

  info("Press ArrowLeft to shrink the sidebar");
  beforeWidth = afterWidth;
  cmdEventPromise = BrowserTestUtils.waitForEvent(splitter, "command");
  EventUtils.synthesizeKey("KEY_ArrowLeft");
  await cmdEventPromise;
  await waitForRepaint();

  afterWidth = sidebarBox.getBoundingClientRect().width;
  info(`Sidebar width after ArrowLeft: ${afterWidth}`);
  Assert.less(
    afterWidth,
    beforeWidth,
    "The sidebar shrank when pressing ArrowLeft (sidebar on left)"
  );

  SidebarController.hide();
  await SpecialPowers.popPrefEnv();
});
