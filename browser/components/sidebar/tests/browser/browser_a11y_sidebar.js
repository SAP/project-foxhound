/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  GenAI: "resource:///modules/GenAI.sys.mjs",
});

async function focusAndActivateElement(elem, activateMethod) {
  elem.setAttribute("tabindex", "-1");
  elem.focus();
  try {
    await activateMethod(elem);
  } finally {
    elem.removeAttribute("tabindex");
  }
}

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.enabled", true],
      ["sidebar.main.tools", "aichat,syncedtabs,history,bookmarks"],
    ],
  });

  const sidebarLauncher = document.querySelector("sidebar-main");
  const sidebarButton = document.getElementById("sidebar-button");

  // This test expects the launcher and tools to be initially visible, so toggle it open
  // if necessary
  if (!BrowserTestUtils.isVisible(sidebarLauncher)) {
    await SimpleTest.promiseFocus(window);

    info("Focus on the button and send Space key to show the launcher.");
    await focusAndActivateElement(sidebarButton, () =>
      EventUtils.synthesizeKey("VK_SPACE")
    );

    Assert.ok(isActiveElement(sidebarButton), "Button has focus");
    await sidebarLauncher.updateComplete;
  }
  Assert.ok(
    BrowserTestUtils.isVisible(sidebarLauncher),
    "Sidebar launcher is now visible"
  );
});

function isActiveElement(el) {
  return el.getRootNode().activeElement == el;
}

add_task(async function test_keyboard_navigation() {
  const sidebar = document.querySelector("sidebar-main");
  let promisePanelFocused;
  info("Waiting for tool buttons to be present");
  await BrowserTestUtils.waitForMutationCondition(
    sidebar,
    { subTree: true, childList: true },
    () => !!sidebar.toolButtons.length
  );

  const toolButtons = sidebar.toolButtons;
  await BrowserTestUtils.waitForCondition(
    () => BrowserTestUtils.isVisible(toolButtons[0]),
    "The first toolbutton is rendered"
  );

  // When the launcher gets shown in setUp, the last button is the activeChild.
  // In order to focus and test keyboard navigation on the first button, we currently
  // need to manually update the activeChild before we focus it
  sidebar.buttonGroup.activeChild = toolButtons[0];
  toolButtons[0].focus();
  info(
    `activeElement view: ${toolButtons[0].getRootNode().activeElement.getAttribute("view")}`
  );
  ok(isActiveElement(toolButtons[0]), "First tool button is focused.");

  info("Press Arrow Down key.");
  EventUtils.synthesizeKey("KEY_ArrowDown", {});
  info(
    `activeElement view: ${toolButtons[1].getRootNode().activeElement.getAttribute("view")}`
  );
  ok(isActiveElement(toolButtons[1]), "Second tool button is focused.");

  // 2nd tool is synced tabs which is a less-moving target than the chat panel
  info("Press Enter key.");
  promisePanelFocused = BrowserTestUtils.waitForEvent(window, "SidebarFocused");
  EventUtils.synthesizeKey("KEY_Enter", {});
  await promisePanelFocused;
  await SidebarController.waitUntilStable();

  ok(sidebar.open, "Sidebar is open.");
  ok(
    isActiveElement(SidebarController.browser),
    "The focus moved to the sidebar panel browser"
  );

  info("selectedView is:" + sidebar.selectedView);
  is(
    sidebar.selectedView,
    toolButtons[1].getAttribute("view"),
    "Sidebar is showing the 2nd tool."
  );
  // Moz-button is passing an "aria-pressed" attribute to the actual buttonEl:
  is(
    toolButtons[1].buttonEl.getAttribute("aria-pressed"),
    "true",
    "aria-pressed is true for the active tool button."
  );
  is(
    toolButtons[0].buttonEl.getAttribute("aria-pressed"),
    "false",
    "aria-pressed is false for the inactive tool button."
  );

  info("Press Shift+tab to move focus to the close button in the panel");
  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true }, window);

  info("Press Enter key to click the panel close button.");
  let panelClosedPromise = BrowserTestUtils.waitForEvent(
    SidebarController._box,
    "sidebar-hide"
  );
  EventUtils.synthesizeKey("KEY_Enter", {});
  await panelClosedPromise;
  await SidebarController.waitUntilStable();
  ok(
    isActiveElement(gBrowser.selectedBrowser),
    "The focus moved to the selected browser when the panel closed"
  );

  ok(!sidebar.open, "Sidebar panel is closed.");
  is(
    toolButtons[1].buttonEl.getAttribute("aria-pressed"),
    "false",
    "Tool is no longer active, aria-pressed becomes false."
  );

  // We seem to need to wait here before re-focusing the tool button
  await waitForRepaint();
  info("Re-focus the first tool button");
  sidebar.buttonGroup.activeChild = toolButtons[0];
  toolButtons[0].focus();
  await SidebarController.waitUntilStable();

  const customizeButton = sidebar.customizeButton;

  info(
    "Press Tab key to the next control group - which should be the customize button"
  );
  EventUtils.synthesizeKey("KEY_Tab", {});
  ok(isActiveElement(customizeButton), "Customize button is focused.");

  info("Press Enter key to open the customize panel");
  promisePanelFocused = BrowserTestUtils.waitForEvent(window, "SidebarFocused");
  EventUtils.synthesizeKey("KEY_Enter", {});
  await promisePanelFocused;
  await SidebarController.waitUntilStable();
  ok(sidebar.open, "Sidebar is open.");

  let customizeDocument = SidebarController.browser.contentDocument;
  const customizeComponent =
    customizeDocument.querySelector("sidebar-customize");
  const sidebarPanelHeader = customizeComponent.shadowRoot.querySelector(
    "sidebar-panel-header"
  );
  let closeButton = sidebarPanelHeader.closeButton;
  info("Press Tab key.");
  EventUtils.synthesizeKey("KEY_Tab", {});
  ok(isActiveElement(closeButton), "Close button is focused.");

  info("Press Tab key.");
  EventUtils.synthesizeKey("KEY_Tab", {});
  ok(
    isActiveElement(customizeComponent.verticalTabsInput),
    "First customize component is focused"
  );

  info("Press Tab and Shift key.");
  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true }, window);
  ok(isActiveElement(closeButton), "Close button is focused.");
  EventUtils.synthesizeKey("KEY_Enter", {});
  await sidebar.updateComplete;
  ok(!sidebar.open, "Sidebar is closed.");
});

add_task(async function test_menu_items_labeled() {
  const sidebar = document.querySelector("sidebar-main");
  info("Waiting for tool buttons to be present");
  await BrowserTestUtils.waitForMutationCondition(
    sidebar,
    { subTree: true, childList: true },
    () => !!sidebar.toolButtons.length
  );
  const allButtons = sidebar.allButtons;
  const dynamicTooltips = Object.keys(SidebarController.sidebarMain.tooltips);

  await SidebarController.initializeUIState({ launcherExpanded: false });
  await sidebar.updateComplete;
  for (const button of allButtons) {
    const view = button.getAttribute("view");
    const title = button.title;
    ok(title, `${view} button has a tooltip.`);
    if (dynamicTooltips.includes(view)) {
      await SidebarController.show(view);
      isnot(
        title,
        button.title,
        `${view} button has a different tooltip when the panel is open.`
      );
      SidebarController.hide();
    }
    ok(!button.hasVisibleLabel, `Collapsed ${view} button has no label.`);
  }
});

add_task(async function test_genai_chat_sidebar_tooltip() {
  const chatbotButton = document
    .querySelector("sidebar-main")
    .shadowRoot.querySelector("[view=viewGenaiChatSidebar]");

  await SidebarController.initializeUIState({ launcherExpanded: false });

  const view = chatbotButton.getAttribute("view");
  ok(
    chatbotButton.title,
    `${view} chatbot button (${chatbotButton.title}) has a tooltip.`
  );
  const sandbox = sinon.createSandbox();

  const mockTooltipName = "test-tooltip-name";

  sandbox.stub(lazy.GenAI, "currentChatProviderInfo").value({
    name: mockTooltipName,
    iconUrl: "chrome://global/skin/icons/highlights.svg",
  });
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.chat.provider", "https://localhost"]],
  });

  Assert.ok(
    chatbotButton.title.includes(mockTooltipName),
    `${chatbotButton.title} should include ${mockTooltipName}.`
  );

  sandbox.restore();
});

add_task(async function test_keyboard_navigation_vertical_tabs() {
  SpecialPowers.pushPrefEnv({
    set: [[VERTICAL_TABS_PREF, true]],
  });
  await waitForTabstripOrientation("vertical");
  const sidebar = document.querySelector("sidebar-main");
  info("Waiting for tool buttons to be present");
  await BrowserTestUtils.waitForMutationCondition(
    sidebar,
    { subTree: true, childList: true },
    () => !!sidebar.toolButtons.length
  );
  const newTabButton = sidebar.querySelector("#tabs-newtab-button");

  window.gBrowser.tabs[0].focus();
  ok(isActiveElement(window.gBrowser.tabs[0]), "First tab is focused.");

  info("Tab to new tab button.");
  EventUtils.synthesizeKey("KEY_Tab", {});
  ok(isActiveElement(newTabButton), "New tab button is focused.");

  info("Press Enter key.");
  EventUtils.synthesizeKey("KEY_Enter", {});
  await TestUtils.waitForCondition(
    () => window.gBrowser.tabs.length === 2,
    "Two tabs are open."
  );

  // URL bar will be focused after opening a new tab,
  // so we need to move it back down to the new tab button
  newTabButton.focus();
  ok(isActiveElement(newTabButton), "New tab button is focused again.");

  info("Tab to get to tools.");
  EventUtils.synthesizeKey("KEY_Tab", {});
  ok(isActiveElement(sidebar.toolButtons[0]), "First tool button is focused.");

  info("Shift+Tab back to new tab button.");
  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true }, window);
  ok(isActiveElement(newTabButton), "New tab button is focused.");

  await SpecialPowers.popPrefEnv();
  cleanUpExtraTabs();
});
