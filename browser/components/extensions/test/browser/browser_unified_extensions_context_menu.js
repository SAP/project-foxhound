/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(2);

ChromeUtils.defineModuleGetter(
  this,
  "AbuseReporter",
  "resource://gre/modules/AbuseReporter.jsm"
);

const { EnterprisePolicyTesting } = ChromeUtils.importESModule(
  "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
);
const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

const TELEMETRY_EVENTS_FILTERS = {
  category: "addonsManager",
  method: "action",
};

loadTestSubscript("head_unified_extensions.js");

// We expect this rejection when the abuse report dialog window is
// being forcefully closed as part of the related test task.
PromiseTestUtils.allowMatchingRejectionsGlobally(/report dialog closed/);

const promiseExtensionUninstalled = extensionId => {
  return new Promise(resolve => {
    let listener = {};
    listener.onUninstalled = addon => {
      if (addon.id == extensionId) {
        AddonManager.removeAddonListener(listener);
        resolve();
      }
    };
    AddonManager.addAddonListener(listener);
  });
};

function waitClosedWindow(win) {
  return new Promise(resolve => {
    function onWindowClosed() {
      if (win && !win.closed) {
        // If a specific window reference has been passed, then check
        // that the window is closed before resolving the promise.
        return;
      }
      Services.obs.removeObserver(onWindowClosed, "xul-window-destroyed");
      resolve();
    }
    Services.obs.addObserver(onWindowClosed, "xul-window-destroyed");
  });
}

function assertVisibleContextMenuItems(contextMenu, expected) {
  let visibleItems = contextMenu.querySelectorAll(
    ":is(menuitem, menuseparator):not([hidden])"
  );
  is(visibleItems.length, expected, `expected ${expected} visible menu items`);
}

add_task(async function test_context_menu() {
  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  // Open the extension panel.
  await openExtensionsPanel();

  // Get the menu button of the extension and verify the mouseover/mouseout
  // behavior. We expect a help message (in the message deck) to be selected
  // (and therefore displayed) when the menu button is hovered/focused.
  const item = getUnifiedExtensionsItem(extension.id);
  ok(item, "expected an item for the extension");

  const messageDeck = item.querySelector(
    ".unified-extensions-item-message-deck"
  );
  Assert.ok(messageDeck, "expected message deck");
  is(
    messageDeck.selectedIndex,
    gUnifiedExtensions.MESSAGE_DECK_INDEX_DEFAULT,
    "expected selected message in the deck to be the default message"
  );

  const hoverMenuButtonMessage = item.querySelector(
    ".unified-extensions-item-message-hover-menu-button"
  );
  Assert.deepEqual(
    document.l10n.getAttributes(hoverMenuButtonMessage),
    { id: "unified-extensions-item-message-manage", args: null },
    "expected correct l10n attributes for the hover message"
  );

  const menuButton = item.querySelector(".unified-extensions-item-menu-button");
  ok(menuButton, "expected menu button");

  let hovered = BrowserTestUtils.waitForEvent(menuButton, "mouseover");
  EventUtils.synthesizeMouseAtCenter(menuButton, { type: "mouseover" });
  await hovered;
  is(
    messageDeck.selectedIndex,
    gUnifiedExtensions.MESSAGE_DECK_INDEX_MENU_HOVER,
    "expected selected message in the deck to be the message when hovering the menu button"
  );

  let notHovered = BrowserTestUtils.waitForEvent(menuButton, "mouseout");
  // Move mouse somewhere else...
  EventUtils.synthesizeMouseAtCenter(item, { type: "mouseover" });
  await notHovered;
  is(
    messageDeck.selectedIndex,
    gUnifiedExtensions.MESSAGE_DECK_INDEX_HOVER,
    "expected selected message in the deck to be the hover message"
  );

  // Open the context menu for the extension.
  const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);
  const doc = contextMenu.ownerDocument;

  const manageButton = contextMenu.querySelector(
    ".unified-extensions-context-menu-manage-extension"
  );
  ok(manageButton, "expected manage button");
  is(manageButton.hidden, false, "expected manage button to be visible");
  is(manageButton.disabled, false, "expected manage button to be enabled");
  Assert.deepEqual(
    doc.l10n.getAttributes(manageButton),
    { id: "unified-extensions-context-menu-manage-extension", args: null },
    "expected correct l10n attributes for manage button"
  );

  const removeButton = contextMenu.querySelector(
    ".unified-extensions-context-menu-remove-extension"
  );
  ok(removeButton, "expected remove button");
  is(removeButton.hidden, false, "expected remove button to be visible");
  is(removeButton.disabled, false, "expected remove button to be enabled");
  Assert.deepEqual(
    doc.l10n.getAttributes(removeButton),
    { id: "unified-extensions-context-menu-remove-extension", args: null },
    "expected correct l10n attributes for remove button"
  );

  const reportButton = contextMenu.querySelector(
    ".unified-extensions-context-menu-report-extension"
  );
  ok(reportButton, "expected report button");
  is(reportButton.hidden, false, "expected report button to be visible");
  is(reportButton.disabled, false, "expected report button to be enabled");
  Assert.deepEqual(
    doc.l10n.getAttributes(reportButton),
    { id: "unified-extensions-context-menu-report-extension", args: null },
    "expected correct l10n attributes for report button"
  );

  await closeChromeContextMenu(contextMenu.id, null);
  await closeExtensionsPanel();

  await extension.unload();
});

add_task(
  async function test_context_menu_report_button_hidden_when_abuse_report_disabled() {
    await SpecialPowers.pushPrefEnv({
      set: [["extensions.abuseReport.enabled", false]],
    });

    const [extension] = createExtensions([{ name: "an extension" }]);
    await extension.startup();

    // Open the extension panel, then open the contextMenu for the extension.
    await openExtensionsPanel();
    const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

    const reportButton = contextMenu.querySelector(
      ".unified-extensions-context-menu-report-extension"
    );
    ok(reportButton, "expected report button");
    is(reportButton.hidden, true, "expected report button to be hidden");

    await closeChromeContextMenu(contextMenu.id, null);
    await closeExtensionsPanel();

    await extension.unload();
  }
);

add_task(
  async function test_context_menu_remove_button_disabled_when_extension_cannot_be_uninstalled() {
    const [extension] = createExtensions([{ name: "an extension" }]);
    await extension.startup();

    await EnterprisePolicyTesting.setupPolicyEngineWithJson({
      policies: {
        Extensions: {
          Locked: [extension.id],
        },
      },
    });

    // Open the extension panel, then open the context menu for the extension.
    await openExtensionsPanel();
    const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

    const removeButton = contextMenu.querySelector(
      ".unified-extensions-context-menu-remove-extension"
    );
    ok(removeButton, "expected remove button");
    is(removeButton.disabled, true, "expected remove button to be disabled");

    await closeChromeContextMenu(contextMenu.id, null);
    await closeExtensionsPanel();

    await extension.unload();
    await EnterprisePolicyTesting.setupPolicyEngineWithJson("");
  }
);

add_task(async function test_manage_extension() {
  Services.telemetry.clearEvents();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:robots" },
    async () => {
      const [extension] = createExtensions([{ name: "an extension" }]);
      await extension.startup();

      // Open the extension panel, then open the context menu for the extension.
      await openExtensionsPanel();
      const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

      const manageButton = contextMenu.querySelector(
        ".unified-extensions-context-menu-manage-extension"
      );
      ok(manageButton, "expected manage button");

      // Click the "manage extension" context menu item, and wait until the menu is
      // closed and about:addons is open.
      const hidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
      const aboutAddons = BrowserTestUtils.waitForNewTab(
        gBrowser,
        "about:addons",
        true
      );
      contextMenu.activateItem(manageButton);
      const [aboutAddonsTab] = await Promise.all([aboutAddons, hidden]);

      // Close the tab containing about:addons because we don't need it anymore.
      BrowserTestUtils.removeTab(aboutAddonsTab);

      await extension.unload();

      TelemetryTestUtils.assertEvents(
        [
          {
            object: "unifiedExtensions",
            value: null,
            extra: { addonId: extension.id, action: "manage" },
          },
        ],
        TELEMETRY_EVENTS_FILTERS
      );
    }
  );
});

add_task(async function test_report_extension() {
  SpecialPowers.pushPrefEnv({
    set: [["extensions.abuseReport.enabled", true]],
  });

  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  await BrowserTestUtils.withNewTab({ gBrowser }, async () => {
    // Open the extension panel, then open the context menu for the extension.
    await openExtensionsPanel();
    const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

    const reportButton = contextMenu.querySelector(
      ".unified-extensions-context-menu-report-extension"
    );
    ok(reportButton, "expected report button");

    // Click the "report extension" context menu item, and wait until the menu is
    // closed and about:addons is open with the "abuse report dialog".
    const hidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
    const abuseReportOpen = BrowserTestUtils.waitForCondition(
      () => AbuseReporter.getOpenDialog(),
      "wait for the abuse report dialog to have been opened"
    );
    contextMenu.activateItem(reportButton);
    const [reportDialogWindow] = await Promise.all([abuseReportOpen, hidden]);

    const reportDialogParams = reportDialogWindow.arguments[0].wrappedJSObject;
    is(
      reportDialogParams.report.addon.id,
      extension.id,
      "abuse report dialog has the expected addon id"
    );
    is(
      reportDialogParams.report.reportEntryPoint,
      "unified_context_menu",
      "abuse report dialog has the expected reportEntryPoint"
    );

    let promiseClosedWindow = waitClosedWindow();
    reportDialogWindow.close();
    // Wait for the report dialog window to be completely closed
    // (to prevent an intermittent failure due to a race between
    // the dialog window being closed and the test tasks that follows
    // opening the unified extensions button panel to not lose the
    // focus and be suddently closed before the task has done with
    // its assertions, see Bug 1782304).
    await promiseClosedWindow;
  });

  await extension.unload();
});

add_task(async function test_remove_extension() {
  Services.telemetry.clearEvents();

  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  // Open the extension panel, then open the context menu for the extension.
  await openExtensionsPanel();
  const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

  const removeButton = contextMenu.querySelector(
    ".unified-extensions-context-menu-remove-extension"
  );
  ok(removeButton, "expected remove button");

  // Set up a mock prompt service that returns 0 to indicate that the user
  // pressed the OK button.
  const { prompt } = Services;
  const promptService = {
    QueryInterface: ChromeUtils.generateQI(["nsIPromptService"]),
    confirmEx() {
      return 0;
    },
  };
  Services.prompt = promptService;
  registerCleanupFunction(() => {
    Services.prompt = prompt;
  });

  // Click the "remove extension" context menu item, and wait until the menu is
  // closed and the extension is uninstalled.
  const uninstalled = promiseExtensionUninstalled(extension.id);
  const hidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.activateItem(removeButton);
  await Promise.all([uninstalled, hidden]);

  await extension.unload();
  // Restore prompt service.
  Services.prompt = prompt;

  TelemetryTestUtils.assertEvents(
    [
      {
        object: "unifiedExtensions",
        value: "accepted",
        extra: { addonId: extension.id, action: "uninstall" },
      },
    ],
    TELEMETRY_EVENTS_FILTERS
  );
});

add_task(async function test_remove_extension_cancelled() {
  Services.telemetry.clearEvents();

  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  // Open the extension panel, then open the context menu for the extension.
  await openExtensionsPanel();
  const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

  const removeButton = contextMenu.querySelector(
    ".unified-extensions-context-menu-remove-extension"
  );
  ok(removeButton, "expected remove button");

  // Set up a mock prompt service that returns 1 to indicate that the user
  // refused to uninstall the extension.
  const { prompt } = Services;
  const promptService = {
    QueryInterface: ChromeUtils.generateQI(["nsIPromptService"]),
    confirmEx() {
      return 1;
    },
  };
  Services.prompt = promptService;
  registerCleanupFunction(() => {
    Services.prompt = prompt;
  });

  // Click the "remove extension" context menu item, and wait until the menu is
  // closed.
  const hidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.activateItem(removeButton);
  await hidden;

  // Re-open the panel to make sure the extension is still there.
  await openExtensionsPanel();
  const item = getUnifiedExtensionsItem(extension.id);
  is(
    item.querySelector(".unified-extensions-item-name").textContent,
    "an extension",
    "expected extension to still be listed"
  );
  await closeExtensionsPanel();

  await extension.unload();
  // Restore prompt service.
  Services.prompt = prompt;

  TelemetryTestUtils.assertEvents(
    [
      {
        object: "unifiedExtensions",
        value: "cancelled",
        extra: { addonId: extension.id, action: "uninstall" },
      },
    ],
    TELEMETRY_EVENTS_FILTERS
  );
});

add_task(async function test_open_context_menu_on_click() {
  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  // Open the extension panel.
  await openExtensionsPanel();

  const button = getUnifiedExtensionsItem(extension.id).querySelector(
    ".unified-extensions-item-menu-button"
  );
  ok(button, "expected menu button");

  const contextMenu = document.getElementById(
    "unified-extensions-context-menu"
  );
  ok(contextMenu, "expected menu");

  // Open the context menu with a "right-click".
  const shown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(button, { type: "contextmenu" });
  await shown;

  await closeChromeContextMenu(contextMenu.id, null);
  await closeExtensionsPanel();

  await extension.unload();
});

add_task(async function test_open_context_menu_with_keyboard() {
  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  // Open the extension panel.
  await openExtensionsPanel();

  const button = getUnifiedExtensionsItem(extension.id).querySelector(
    ".unified-extensions-item-menu-button"
  );
  ok(button, "expected menu button");
  // Make this button focusable because those (toolbar) buttons are only made
  // focusable when a user is navigating with the keyboard, which isn't exactly
  // what we are doing in this test.
  button.setAttribute("tabindex", "-1");

  const contextMenu = document.getElementById(
    "unified-extensions-context-menu"
  );
  ok(contextMenu, "expected menu");

  // Open the context menu by focusing the button and pressing the SPACE key.
  let shown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  button.focus();
  is(button, document.activeElement, "expected button to be focused");
  EventUtils.synthesizeKey(" ", {});
  await shown;

  await closeChromeContextMenu(contextMenu.id, null);

  if (AppConstants.platform != "macosx") {
    // Open the context menu by focusing the button and pressing the ENTER key.
    // TODO(emilio): Maybe we should harmonize this behavior across platforms,
    // we're inconsistent right now.
    shown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
    button.focus();
    is(button, document.activeElement, "expected button to be focused");
    EventUtils.synthesizeKey("KEY_Enter", {});
    await shown;
    await closeChromeContextMenu(contextMenu.id, null);
  }

  await closeExtensionsPanel();

  await extension.unload();
});

add_task(async function test_context_menu_without_browserActionFor_global() {
  const { ExtensionParent } = ChromeUtils.import(
    "resource://gre/modules/ExtensionParent.jsm"
  );
  const { browserActionFor } = ExtensionParent.apiManager.global;
  const cleanup = () => {
    ExtensionParent.apiManager.global.browserActionFor = browserActionFor;
  };
  registerCleanupFunction(cleanup);
  // This is needed to simulate the case where the browserAction API hasn't
  // been loaded yet (since it is lazy-loaded). That could happen when only
  // extensions without browser actions are installed. In which case, the
  // `global.browserActionFor()` function would not be defined yet.
  delete ExtensionParent.apiManager.global.browserActionFor;

  const [extension] = createExtensions([{ name: "an extension" }]);
  await extension.startup();

  // Open the extension panel and then the context menu for the extension that
  // has been loaded above. We expect the context menu to be displayed and no
  // error caused by the lack of `global.browserActionFor()`.
  await openExtensionsPanel();
  // This promise rejects with an error if the implementation does not handle
  // the case where `global.browserActionFor()` is undefined.
  const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);
  assertVisibleContextMenuItems(contextMenu, 3);

  await closeChromeContextMenu(contextMenu.id, null);
  await closeExtensionsPanel();

  await extension.unload();

  cleanup();
});

add_task(async function test_page_action_context_menu() {
  const extWithMenuPageAction = ExtensionTestUtils.loadExtension({
    manifest: {
      page_action: {},
      permissions: ["contextMenus"],
    },
    background() {
      browser.contextMenus.create(
        {
          id: "some-menu-id",
          title: "Click me!",
          contexts: ["all"],
        },
        () => browser.test.sendMessage("menu-created")
      );
    },
    useAddonManager: "temporary",
  });
  const extWithoutMenu1 = ExtensionTestUtils.loadExtension({
    manifest: {
      name: "extension without any menu",
    },
    useAddonManager: "temporary",
  });

  const extensions = [extWithMenuPageAction, extWithoutMenu1];

  await Promise.all(extensions.map(extension => extension.startup()));

  await extWithMenuPageAction.awaitMessage("menu-created");

  await openExtensionsPanel();

  info("extension with page action and a menu");
  // This extension declares a page action so its menu shouldn't be added to
  // the unified extensions context menu.
  let contextMenu = await openUnifiedExtensionsContextMenu(
    extWithMenuPageAction.id
  );
  assertVisibleContextMenuItems(contextMenu, 3);
  await closeChromeContextMenu(contextMenu.id, null);

  info("extension with no browser action and no menu");
  // There is no context menu created by this extension, so there should only
  // be 3 menu items corresponding to the default manage/remove/report items.
  contextMenu = await openUnifiedExtensionsContextMenu(extWithoutMenu1.id);
  assertVisibleContextMenuItems(contextMenu, 3);
  await closeChromeContextMenu(contextMenu.id, null);

  await closeExtensionsPanel();

  await Promise.all(extensions.map(extension => extension.unload()));
});

add_task(async function test_pin_to_toolbar() {
  const [extension] = createExtensions([
    { name: "an extension", browser_action: {} },
  ]);
  await extension.startup();

  // Open the extension panel, then open the context menu for the extension.
  await openExtensionsPanel();
  const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

  const pinToToolbarItem = contextMenu.querySelector(
    ".unified-extensions-context-menu-pin-to-toolbar"
  );
  ok(pinToToolbarItem, "expected 'pin to toolbar' menu item");

  const hidden = BrowserTestUtils.waitForEvent(
    gUnifiedExtensions.panel,
    "popuphidden",
    true
  );
  contextMenu.activateItem(pinToToolbarItem);
  await hidden;

  // Undo the 'pin to toolbar' action.
  await CustomizableUI.reset();
  await extension.unload();
});

add_task(async function test_contextmenu_command_closes_panel() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      name: "an extension",
      browser_action: {},
      permissions: ["contextMenus"],
    },
    background() {
      browser.contextMenus.create(
        {
          id: "some-menu-id",
          title: "Click me!",
          contexts: ["all"],
        },
        () => browser.test.sendMessage("menu-created")
      );
    },
    useAddonManager: "temporary",
  });
  await extension.startup();
  await extension.awaitMessage("menu-created");

  await openExtensionsPanel();
  const contextMenu = await openUnifiedExtensionsContextMenu(extension.id);

  const firstMenuItem = contextMenu.querySelector("menuitem");
  is(
    firstMenuItem?.getAttribute("label"),
    "Click me!",
    "expected custom menu item as first child"
  );

  const hidden = BrowserTestUtils.waitForEvent(
    gUnifiedExtensions.panel,
    "popuphidden",
    true
  );
  contextMenu.activateItem(firstMenuItem);
  await hidden;

  await extension.unload();
});
