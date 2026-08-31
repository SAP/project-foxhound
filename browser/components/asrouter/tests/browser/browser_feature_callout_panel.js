/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function getTestMessage() {
  return {
    id: "TEST_PANEL_FEATURE_CALLOUT",
    template: "feature_callout",
    groups: [],
    content: {
      id: "TEST_PANEL_FEATURE_CALLOUT",
      template: "multistage",
      backdrop: "transparent",
      transitions: false,
      disableHistoryUpdates: true,
      screens: [
        {
          id: "TEST_PANEL_FEATURE_CALLOUT",
          anchors: [
            {
              selector: "#PanelUI-menu-button",
              panel_position: {
                anchor_attachment: "bottomcenter",
                callout_attachment: "topright",
              },
            },
          ],
          content: {
            position: "callout",
            title: { raw: "Panel Feature Callout" },
            dismiss_button: {
              action: { dismiss: true },
            },
          },
        },
      ],
    },
  };
}

/**
 * Set up a callout and show it.
 *
 * @param {MozBrowser} browser Probably the selected browser in the top window.
 * @param {object} message The message to show.
 * @returns {Promise<{featureCallout: FeatureCallout, showing: boolean, closed: Promise}>}
 *   A promise that resolves to an object containing the FeatureCallout
 *   instance, a boolean for whether the callout started showing correctly, and
 *   a promise that resolves when the callout is closed.
 */
async function showFeatureCallout(browser, message) {
  let resolveClosed;
  let closed = new Promise(resolve => {
    resolveClosed = resolve;
  });
  const config = {
    win: browser.documentGlobal,
    location: "chrome",
    context: "chrome",
    browser,
    theme: { preset: "chrome" },
    listener: (_, event) => {
      if (event === "end") {
        resolveClosed();
      }
    },
  };
  const featureCallout = new FeatureCallout(config);
  let showing = await featureCallout.showFeatureCallout(message);
  return { featureCallout, showing, closed };
}

/**
 * Make a new window, open a feature callout in it, run a function to hide the
 * callout, and assert that the callout is hidden correctly. Optionally run a
 * function after the callout is closed, for additional assertions. Finally,
 * close the window.
 *
 * @param {function(Window, Element, FeatureCallout)} hideFn A function that
 *   hides the callout. Passed the following params: window, callout container,
 *   and FeatureCallout instance.
 * @param {function(Window, Element, FeatureCallout)} afterCloseFn An optional
 *   function to run after the callout is closed. Same params as hideFn.
 * @param {object} message The message to show.
 */
async function testCalloutHiddenIf(
  hideFn,
  afterCloseFn,
  message = getTestMessage()
) {
  const win = await BrowserTestUtils.openNewBrowserWindow();
  win.focus();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;
  const { featureCallout, showing, closed } = await showFeatureCallout(
    browser,
    message
  );

  await waitForCalloutScreen(doc, message.content.screens[0].id);
  let calloutContainer = featureCallout._container;
  ok(showing && calloutContainer, "Feature callout should be showing");

  await hideFn(win, calloutContainer, featureCallout);

  await closed;
  await waitForCalloutRemoved(doc);
  ok(!doc.querySelector(calloutSelector), "Feature callout should be hidden");

  await afterCloseFn?.(win, calloutContainer, featureCallout);
  await BrowserTestUtils.closeWindow(win);
}

// Test that the callout is correctly created as a panel and positioned.
add_task(async function panel_feature_callout() {
  await testCalloutHiddenIf(async (win, calloutContainer) => {
    is(calloutContainer.localName, "panel", "Callout container is a panel");
    await BrowserTestUtils.waitForMutationCondition(
      calloutContainer,
      { attributeFilter: ["arrow-position"] },
      () => calloutContainer.getAttribute("arrow-position") === "top-end"
    );
    is(
      calloutContainer.anchorNode.id,
      "PanelUI-menu-button",
      "Callout container is anchored to the app menu button"
    );
    is(
      calloutContainer.getAttribute("arrow-position"),
      "top-end",
      "Callout container arrow is positioned correctly"
    );

    win.document.querySelector(calloutDismissSelector).click();
  });
});

// Test that the callout is hidden if another popup is shown.
add_task(async function panel_feature_callout_hidden_on_popupshowing() {
  await testCalloutHiddenIf(async win => {
    // Click the app menu button to open the panel.
    win.document.querySelector("#PanelUI-menu-button").click();
  });
});

// Test that the callout is hidden if its anchor node is hidden.
add_task(async function panel_feature_callout_hidden_on_anchor_hidden() {
  await testCalloutHiddenIf(async win => {
    // Hide the app menu button.
    win.document.querySelector("#PanelUI-menu-button").hidden = true;
  });
});

// Panels automatically track the movement of their anchor nodes, so test that
// the callout moves with its anchor node.
add_task(async function panel_feature_callout_follows_anchor() {
  await testCalloutHiddenIf(async (win, calloutContainer) => {
    let startingX = calloutContainer.getBoundingClientRect().x;

    // Move the app menu button away from the right edge of the window.
    calloutContainer.anchorNode.style.marginInlineEnd = "100px";

    // Wait for the callout to reposition itself.
    await BrowserTestUtils.waitForCondition(
      () => calloutContainer.getBoundingClientRect().x !== startingX,
      "Callout should reposition itself"
    );

    win.document.querySelector(calloutDismissSelector).click();
  });
});

// Panels normally set the `[open]` attribute on their anchor node when they're
// open, so that the anchor node can be styled differently when the panel is
// open. Not every anchor node has styles for this, but e.g. chrome buttons do.
add_task(async function panel_feature_callout_anchor_open_attr() {
  let anchor;
  await testCalloutHiddenIf(
    async (win, calloutContainer) => {
      anchor = calloutContainer.anchorNode;
      ok(
        anchor.hasAttribute("open"),
        "Callout container's anchor node should have its [open] attribute set"
      );

      win.document.querySelector(calloutDismissSelector).click();
    },
    () => {
      ok(
        !anchor.hasAttribute("open"),
        "Callout container's anchor node should not have its [open] attribute set"
      );
    }
  );
});

// However, some panels don't want to set the `[open]` attribute on their anchor
// node. Sometimes the panel is more of a hint than a menu, and the `[open]`
// style could give the impression that it's a menu. Or the anchor might already
// have its `[open]` attribute set by something else, and we may not want to
// interfere with that. So this feature is configurable by adding the
// no_open_on_anchor property to the anchor.
add_task(async function panel_feature_callout_no_anchor_open_attr() {
  let message = getTestMessage();
  message.content.screens[0].anchors[0].no_open_on_anchor = true;
  await testCalloutHiddenIf(
    async (win, calloutContainer) => {
      let anchor = calloutContainer.anchorNode;
      ok(
        !anchor.hasAttribute("open"),
        "Callout container's anchor node should not have its [open] attribute set"
      );

      win.document.querySelector(calloutDismissSelector).click();
    },
    null,
    message
  );
});

add_task(async function feature_callout_split_dismiss_button() {
  let message = getTestMessage();
  message.content.screens[0].content.secondary_button = {
    label: { raw: "Advance" },
    action: { navigate: true },
  };
  message.content.screens[0].content.submenu_button = {
    submenu: [
      {
        type: "action",
        label: { raw: "Item 1" },
        action: { navigate: true },
        id: "item1",
      },
      {
        type: "action",
        label: { raw: "Item 2" },
        action: { navigate: true },
        id: "item2",
      },
      {
        type: "menu",
        label: { raw: "Menu 1" },
        submenu: [
          {
            type: "action",
            label: { raw: "Item 3" },
            action: { navigate: true },
            id: "item3",
          },
          {
            type: "action",
            label: { raw: "Item 4" },
            action: { navigate: true },
            id: "item4",
          },
        ],
        id: "menu1",
      },
    ],
    attached_to: "secondary_button",
  };

  await testCalloutHiddenIf(
    async (win, calloutContainer) => {
      // Wait until the submenu markup exists, since SecondaryCTA targeting renders async
      await BrowserTestUtils.waitForCondition(
        () =>
          calloutContainer.querySelector(
            `#${calloutId} .fxms-multi-stage-submenu`
          ),
        "Wait for submenu to be attached"
      );
      let splitButtonContainer = calloutContainer.querySelector(
        `#${calloutId} .split-button-container`
      );
      let secondaryButton = calloutContainer.querySelector(
        `#${calloutId} .secondary:not(.submenu-button)`
      );
      let submenuButton = calloutContainer.querySelector(
        `#${calloutId} .submenu-button`
      );
      let submenu = calloutContainer.querySelector(
        `#${calloutId} .fxms-multi-stage-submenu`
      );
      ok(splitButtonContainer, "Callout should have a split button container");
      ok(secondaryButton, "Callout should have a split secondary button");
      ok(submenuButton, "Callout should have a split submenu button");
      ok(submenu, "Callout should have a submenu");

      // Click the submenu button and wait for the submenu (menupopup) to open.
      let opened = BrowserTestUtils.waitForEvent(submenu, "popupshown");
      submenuButton.click();
      await opened;

      // Assert that all the menu items are present and that the order and
      // structure is correct.
      async function recursiveTestMenuItems(items, popup) {
        let children = [...popup.children];
        for (let element of children) {
          let index = children.indexOf(element);
          let itemAtIndex = items[index];
          switch (element.localName) {
            case "menuitem":
              is(
                itemAtIndex.type,
                "action",
                `Menu item ${itemAtIndex.id} should be an action`
              );
              is(
                JSON.stringify(element.config),
                JSON.stringify(itemAtIndex),
                `Menu item ${itemAtIndex.id} should have correct config`
              );
              is(
                element.value,
                itemAtIndex.id,
                `Menu item ${itemAtIndex.id} should have correct value`
              );
              break;
            case "menu":
              is(
                itemAtIndex.type,
                "menu",
                `Menu item ${itemAtIndex.id} should be a menu`
              );
              is(
                element.value,
                itemAtIndex.id,
                `Menu item ${itemAtIndex.id} should have correct value`
              );
              info(`Testing submenu ${itemAtIndex.id}`);
              await recursiveTestMenuItems(
                itemAtIndex.submenu,
                element.querySelector("menupopup")
              );
              break;
            case "menuseparator":
              is(
                itemAtIndex.type,
                "separator",
                `Menu item ${index} should be a separator`
              );
              break;
            default:
              ok(false, "Child of unknown type in submenu");
          }
        }
      }

      info("Testing main menu");
      await recursiveTestMenuItems(
        message.content.screens[0].content.submenu_button.submenu,
        submenu
      );

      submenu.querySelector(`menuitem[value="item1"]`).click();
    },
    null,
    message
  );
});

// Test that the usual focus behavior works: focus remains where it is when the
// callout opens, and F6 must be pressed to focus the callout.
add_task(async function feature_callout_no_autofocus() {
  requestLongerTimeout(2);
  let message = getTestMessage();
  const win = await BrowserTestUtils.openNewBrowserWindow();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;

  win.focus();
  win.gURLBar.blur();
  let onFocused = BrowserTestUtils.waitForEvent(
    win.gURLBar.inputField,
    "focus"
  );
  win.gURLBar.focus();
  await onFocused;
  is(doc.activeElement, win.gURLBar.inputField, "URL bar should be focused");

  let focusedElement = doc.activeElement;

  let popupShown = BrowserTestUtils.waitForEvent(doc, "popupshown", true);
  let calloutShown = waitForCalloutScreen(doc, message.content.screens[0].id);
  const { featureCallout, showing, closed } = await showFeatureCallout(
    browser,
    message
  );

  await Promise.all([popupShown, calloutShown]);
  let calloutContainer = featureCallout._container;
  ok(showing && calloutContainer, "Feature callout should be showing");

  is(
    doc.activeElement,
    focusedElement,
    "Focus should not change when the callout is shown"
  );

  let dismissButton = doc.querySelector(calloutDismissSelector);
  ok(dismissButton, "Callout should have a dismiss button");
  let onFocused2 = BrowserTestUtils.waitForEvent(dismissButton, "focus", true);
  EventUtils.synthesizeKey("KEY_F6", {}, win);
  await onFocused2;
  is(
    doc.activeElement,
    dismissButton,
    "Callout dismiss button should be focused after F6"
  );

  EventUtils.synthesizeKey("VK_SPACE", {}, win);
  await closed;
  await waitForCalloutRemoved(doc);
  ok(!doc.querySelector(calloutSelector), "Feature callout should be hidden");

  await BrowserTestUtils.closeWindow(win);
});

// Test that the autofocus property causes the callout to be focused when shown,
// and that Tab and Shift+Tab cycle through elements as expected.
add_task(async function feature_callout_tab_order() {
  let message = getTestMessage();
  message.content.screens[0].content.secondary_button = {
    label: { raw: "Dismiss" },
    action: { dismiss: true },
  };
  message.content.screens[0].content.primary_button = {
    label: { raw: "Advance" },
    action: { navigate: true },
  };
  // enable autofocus on the anchor
  message.content.screens[0].anchors[0].autofocus = {};

  await testCalloutHiddenIf(
    async (win, calloutContainer) => {
      // Test that feature callout initially focuses the primary button.
      let primaryButton = calloutContainer.querySelector(
        `#${calloutId} .primary`
      );
      await BrowserTestUtils.waitForCondition(
        () => win.document.activeElement === primaryButton,
        "Primary button should be focused"
      );

      // Test that pressing Tab loops through the primary button, secondary
      // button, and dismiss button.
      let secondaryButton = calloutContainer.querySelector(
        `#${calloutId} .secondary`
      );
      let onFocused2 = BrowserTestUtils.waitForEvent(secondaryButton, "focus");
      EventUtils.synthesizeKey("KEY_Tab", {}, win);
      await onFocused2;
      is(
        win.document.activeElement,
        secondaryButton,
        "Secondary button should be focused"
      );

      let dismissButton = calloutContainer.querySelector(
        `#${calloutId} .dismiss-button`
      );
      let onFocused3 = BrowserTestUtils.waitForEvent(dismissButton, "focus");
      EventUtils.synthesizeKey("KEY_Tab", {}, win);
      await onFocused3;
      is(
        win.document.activeElement,
        dismissButton,
        "Dismiss button should be focused"
      );

      let onFocused4 = BrowserTestUtils.waitForEvent(primaryButton, "focus");
      EventUtils.synthesizeKey("KEY_Tab", {}, win);
      await onFocused4;
      is(
        win.document.activeElement,
        primaryButton,
        "Primary button should be focused"
      );

      // Test that pressing Shift+Tab loops back to the dismiss button.
      let onFocused5 = BrowserTestUtils.waitForEvent(dismissButton, "focus");
      EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true }, win);
      await onFocused5;
      is(
        win.document.activeElement,
        dismissButton,
        "Dismiss button should be focused"
      );

      EventUtils.synthesizeKey("VK_SPACE", {}, win);
    },

    null,
    message
  );
});

add_task(async function test_shadow_selector() {
  const win = await BrowserTestUtils.openNewBrowserWindow();
  const config = {
    win,
    location: "chrome",
    context: "chrome",
    browser: win.gBrowser.selectedBrowser,
    theme: { preset: "chrome" },
  };

  const message = getTestMessage();
  message.content.screens[0].anchors[0].selector =
    "#tabbrowser-arrowscrollbox::%shadow% scrollbox";
  const sandbox = sinon.createSandbox();

  const doc = win.document;
  const featureCallout = new FeatureCallout(config);
  const getAnchorSpy = sandbox.spy(featureCallout, "_getAnchor");
  featureCallout.showFeatureCallout(message);
  await waitForCalloutScreen(doc, message.content.screens[0].id);
  ok(
    getAnchorSpy.alwaysReturned(
      sandbox.match(message.content.screens[0].anchors[0])
    ),
    "The first anchor is selected and works in the shadowDOM"
  );
  ok(
    featureCallout._container.anchorNode.containingShadowRoot,
    "The anchor node is in a shadow root"
  );

  win.document.querySelector(calloutDismissSelector).click();
  await waitForCalloutRemoved(win.document);
  await BrowserTestUtils.closeWindow(win);
  sandbox.restore();
});

add_task(async function feature_callout_more_button() {
  let message = getTestMessage();
  message.content.screens[0].content.more_button = {
    submenu: [
      {
        type: "action",
        label: { raw: "Don't show again" },
        action: {
          type: "BLOCK_MESSAGE",
          data: { id: "TEST_PANEL_FEATURE_CALLOUT" },
          dismiss: true,
        },
        id: "dont_show_again",
      },
      {
        type: "action",
        label: { raw: "Show fewer" },
        action: {
          type: "SET_PREF",
          data: { pref: { name: "test.pref", value: true } },
          dismiss: true,
        },
        id: "show_fewer",
      },
      {
        type: "separator",
      },
      {
        type: "action",
        label: { raw: "Manage settings" },
        action: {
          type: "OPEN_ABOUT_PAGE",
          data: { args: "preferences", where: "tab" },
          dismiss: true,
        },
        id: "manage_settings",
      },
    ],
  };

  delete message.content.screens[0].content.dismiss_button;

  await testCalloutHiddenIf(
    async (win, calloutContainer) => {
      let moreButton = calloutContainer.querySelector(
        `#${calloutId} .more-button`
      );
      let submenu = calloutContainer.querySelector(
        `#${calloutId} .fxms-multi-stage-submenu`
      );

      ok(moreButton, "Callout should have a more button");
      ok(submenu, "Callout should have a submenu");
      is(moreButton.id, "more_button", "More button should have correct ID");
      is(
        moreButton.value,
        "more_button",
        "More button should have correct value"
      );
      ok(
        moreButton.classList.contains("more-button"),
        "More button should have correct class"
      );

      let opened = BrowserTestUtils.waitForEvent(submenu, "popupshown");
      moreButton.click();
      await opened;

      // submenu items are present and correctly configured
      let menuItems = submenu.querySelectorAll("menuitem");
      let separator = submenu.querySelector("menuseparator");

      is(menuItems.length, 3, "Should have 3 menu items");
      ok(separator, "Should have a separator");

      // Test first menu item
      is(
        menuItems[0].value,
        "dont_show_again",
        "First item should have correct ID"
      );
      is(
        menuItems[0].getAttribute("label"),
        "Don't show again",
        "First item should have correct label"
      );

      // Test second menu item
      is(
        menuItems[1].value,
        "show_fewer",
        "Second item should have correct ID"
      );
      is(
        menuItems[1].getAttribute("label"),
        "Show fewer",
        "Second item should have correct label"
      );

      // Test third menu item
      is(
        menuItems[2].value,
        "manage_settings",
        "Third item should have correct ID"
      );
      is(
        menuItems[2].getAttribute("label"),
        "Manage settings",
        "Third item should have correct label"
      );

      // Click the first menu item to dismiss
      menuItems[0].click();
    },
    null,
    message
  );
});

add_task(async function feature_callout_more_button_coexistence() {
  let message = getTestMessage();
  message.content.screens[0].content.secondary_button = {
    label: { raw: "Advance" },
    action: { navigate: true },
  };
  message.content.screens[0].content.submenu_button = {
    submenu: [
      {
        type: "action",
        label: { raw: "Item 1" },
        action: { navigate: true },
        id: "item1",
      },
      {
        type: "action",
        label: { raw: "Item 2" },
        action: { navigate: true },
        id: "item2",
      },
      {
        type: "menu",
        label: { raw: "Menu 1" },
        submenu: [
          {
            type: "action",
            label: { raw: "Item 3" },
            action: { navigate: true },
            id: "item3",
          },
          {
            type: "action",
            label: { raw: "Item 4" },
            action: { navigate: true },
            id: "item4",
          },
        ],
        id: "menu1",
      },
    ],
    attached_to: "secondary_button",
  };
  message.content.screens[0].content.more_button = {
    submenu: [
      {
        type: "action",
        label: { raw: "More Item 1" },
        action: { dismiss: true },
        id: "more_item1",
      },
    ],
  };

  delete message.content.screens[0].content.dismiss_button;

  await testCalloutHiddenIf(
    async (win, calloutContainer) => {
      // Both buttons should be present
      let submenuButton = calloutContainer.querySelector(
        `#${calloutId} .submenu-button`
      );
      let moreButton = calloutContainer.querySelector(
        `#${calloutId} .more-button`
      );

      ok(submenuButton, "Should have submenu button");
      ok(moreButton, "Should have more button");

      // They should have different IDs and classes
      is(
        submenuButton.id,
        "submenu_button",
        "Submenu button should have correct ID"
      );
      is(moreButton.id, "more_button", "More button should have correct ID");

      ok(
        submenuButton.classList.contains("submenu-button"),
        "Submenu button should have correct class"
      );
      ok(
        moreButton.classList.contains("more-button"),
        "More button should have correct class"
      );

      await BrowserTestUtils.waitForCondition(
        () => submenuButton.querySelector(".fxms-multi-stage-submenu"),
        "Wait for submenu button popup to be attached"
      );

      // Each button should open its own submenu
      let submenuPopup = submenuButton.querySelector(
        ".fxms-multi-stage-submenu"
      );
      let morePopup = moreButton.querySelector(".fxms-multi-stage-submenu");

      ok(submenuPopup, "Submenu button should have its own popup");
      ok(morePopup, "More button should have its own popup");
      Assert.notStrictEqual(
        submenuPopup,
        morePopup,
        "Popups should be different elements"
      );

      let opened = BrowserTestUtils.waitForEvent(morePopup, "popupshown");
      moreButton.click();
      await opened;

      let moreMenuItem = morePopup.querySelector(
        "menuitem[value='more_item1']"
      );
      ok(moreMenuItem, "More popup should have correct menu item");
      // Click to dismiss
      moreMenuItem.click();
    },
    null,
    message
  );
});

// Test that more_button renders nothing when no submenu items provided
add_task(async function feature_callout_more_button_empty_submenu() {
  let message = getTestMessage();
  message.content.screens[0].content.more_button = {
    submenu: [],
  };

  const win = await BrowserTestUtils.openNewBrowserWindow();
  win.focus();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;
  const { featureCallout, showing, closed } = await showFeatureCallout(
    browser,
    message
  );

  await waitForCalloutScreen(doc, message.content.screens[0].id);
  let calloutContainer = featureCallout._container;
  ok(showing && calloutContainer, "Feature callout should be showing");

  // More button should not be rendered when submenu is empty
  let moreButton = calloutContainer.querySelector(`#${calloutId} .more-button`);
  ok(!moreButton, "More button should not be rendered when submenu is empty");

  win.document.querySelector(calloutDismissSelector).click();
  await closed;
  await waitForCalloutRemoved(doc);
  await BrowserTestUtils.closeWindow(win);
});

// Test that the dismiss button takes precedence over the more button
add_task(async function feature_callout_more_button_with_dismiss() {
  let message = getTestMessage();
  message.content.screens[0].content.more_button = {
    submenu: [
      {
        type: "action",
        label: { raw: "More Item 1" },
        action: { dismiss: true },
        id: "more_item1",
      },
    ],
  };

  message.content.screens[0].content.dismiss_button = {
    action: {
      dismiss: true,
    },
    background: true,
    size: "small",
    marginInline: "0 20px",
    marginBlock: "20px 0",
  };

  const win = await BrowserTestUtils.openNewBrowserWindow();
  win.focus();
  const doc = win.document;
  const browser = win.gBrowser.selectedBrowser;
  const { featureCallout, showing, closed } = await showFeatureCallout(
    browser,
    message
  );

  await waitForCalloutScreen(doc, message.content.screens[0].id);
  let calloutContainer = featureCallout._container;
  ok(showing && calloutContainer, "Feature callout should be showing");

  // More button should not be rendered when dismiss button is present
  let moreButton = calloutContainer.querySelector(`#${calloutId} .more-button`);
  ok(!moreButton, "More button should not be rendered when submenu is empty");

  // Dismiss button should be present
  ok(
    win.document.querySelector(calloutDismissSelector),
    "Dismiss button is present when both more button and dismiss button configurations exist"
  );

  win.document.querySelector(calloutDismissSelector).click();
  await closed;
  await waitForCalloutRemoved(doc);
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_content_document_selector() {
  const { AIWindowAccountAuth } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs"
  );
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
    ],
  });
  const stub = sinon
    .stub(AIWindowAccountAuth, "ensureAIWindowAccess")
    .resolves(true);
  const win = await BrowserTestUtils.openNewBrowserWindow({ aiWindow: true });
  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true },
    () => win.document.documentElement.hasAttribute("ai-window")
  );
  const browser = win.gBrowser.selectedBrowser;
  const config = {
    win,
    location: "chrome",
    context: "chrome",
    browser,
    theme: { preset: "chrome" },
  };

  const message = getTestMessage();
  message.content.screens[0].anchors[0].selector =
    "hbox.deck-selected browser::%document% body";
  const sandbox = sinon.createSandbox();

  const doc = win.document;
  const featureCallout = new FeatureCallout(config);
  const getAnchorSpy = sandbox.spy(featureCallout, "_getAnchor");
  featureCallout.showFeatureCallout(message);
  await waitForCalloutScreen(doc, message.content.screens[0].id);
  ok(
    getAnchorSpy.alwaysReturned(
      sandbox.match(message.content.screens[0].anchors[0])
    ),
    "The first anchor is selected and works in a content document"
  );
  Assert.notStrictEqual(
    featureCallout._container.anchorNode.ownerDocument,
    win.document,
    "The anchor node is in a content document"
  );

  win.document.querySelector(calloutDismissSelector).click();
  await waitForCalloutRemoved(win.document);
  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
  sandbox.restore();
  stub.restore();
});
