/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const fxaDevices = [
  {
    id: 1,
    name: "Device 1",
    availableCommands: { "https://identity.mozilla.com/cmd/open-uri": "baz" },
    lastAccessTime: Date.now(),
  },
  {
    id: 2,
    name: "Device 2",
    availableCommands: { "https://identity.mozilla.com/cmd/open-uri": "boo" },
    lastAccessTime: Date.now() + 60000,
  },
];

let gSandbox;

add_setup(async function () {
  await promiseSyncReady();
  gSync.init();

  gSandbox = sinon.createSandbox();
  gSandbox
    .stub(Weave.Service.clientsEngine, "getClientByFxaDeviceId")
    .callsFake(fxaDeviceId => {
      let target = fxaDevices.find(c => c.id == fxaDeviceId);
      return target ? target.clientRecord : null;
    });
  gSandbox
    .stub(Weave.Service.clientsEngine, "getClientType")
    .returns("desktop");

  registerCleanupFunction(() => {
    gSandbox.restore();
  });
});

async function openFxaPanel() {
  let promiseViewShown = BrowserTestUtils.waitForEvent(
    PanelMultiView.getViewNode(document, "PanelUI-fxa"),
    "ViewShown"
  );
  await gSync.toggleAccountPanel(
    document.getElementById("fxa-toolbar-menu-button"),
    new MouseEvent("mousedown")
  );
  await promiseViewShown;
}

async function closeFxaPanel() {
  let widgetPanel = document.getElementById("customizationui-widget-panel");
  if (widgetPanel) {
    let panelHidden = BrowserTestUtils.waitForEvent(widgetPanel, "popuphidden");
    widgetPanel.hidePopup();
    await panelHidden;
  }
}

async function openFxaPanelFromAppMenu() {
  let mainViewShown = BrowserTestUtils.waitForEvent(PanelUI.panel, "ViewShown");
  PanelUI.show();
  await mainViewShown;
  let fxaViewShown = BrowserTestUtils.waitForEvent(
    PanelMultiView.getViewNode(document, "PanelUI-fxa"),
    "ViewShown"
  );
  document.getElementById("appMenu-fxa-label2").click();
  await fxaViewShown;
}

async function closeAppMenu() {
  if (PanelUI.panel.state == "closed") {
    return;
  }
  let panelHidden = BrowserTestUtils.waitForEvent(PanelUI.panel, "popuphidden");
  PanelUI.hide();
  await panelHidden;
}

/**
 * Basic sanity test that send_tab_exposed event is recorded when FxA avatar menu opens.
 */
add_task(async function test_sendtab_telemetry_basics() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await openFxaPanel();

  await Services.fog.testFlushAllChildren();
  let exposedEvents = Glean.fxaAvatarMenu.sendTabExposed.testGetValue();
  Assert.ok(
    exposedEvents && exposedEvents.length,
    "send_tab_exposed event was recorded"
  );
  Assert.equal(
    exposedEvents[0].extra.device_count,
    "2",
    "Correct device count"
  );

  await closeFxaPanel();
  sandbox.restore();
  info("Send Tab telemetry basic test passed!");
});

/**
 * Test that send_tab_opened event is recorded when Send Tab submenu is opened.
 */
add_task(async function test_sendtab_opened_event() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await openFxaPanel();

  // Click the Send Tab button to open the submenu
  let sendTabButton = PanelMultiView.getViewNode(
    document,
    "PanelUI-fxa-menu-sendtab-button"
  );
  let subviewShown = BrowserTestUtils.waitForEvent(
    PanelMultiView.getViewNode(document, "PanelUI-sendTabToDevice"),
    "ViewShown"
  );
  sendTabButton.click();
  await subviewShown;

  await Services.fog.testFlushAllChildren();
  let openedEvents = Glean.fxaAvatarMenu.sendTabOpened.testGetValue();
  Assert.ok(
    openedEvents && openedEvents.length,
    "send_tab_opened event was recorded"
  );
  Assert.equal(
    openedEvents[0].extra.device_count,
    "2",
    "Correct device count in opened event"
  );

  await closeFxaPanel();
  sandbox.restore();
  info("Send Tab opened event test passed!");
});

/**
 * Test that click_send_tab event is recorded when a device is selected.
 */
add_task(async function test_sendtab_click_device() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await openFxaPanel();

  // Open Send Tab submenu
  let sendTabButton = PanelMultiView.getViewNode(
    document,
    "PanelUI-fxa-menu-sendtab-button"
  );
  let subviewShown = BrowserTestUtils.waitForEvent(
    PanelMultiView.getViewNode(document, "PanelUI-sendTabToDevice"),
    "ViewShown"
  );
  sendTabButton.click();
  await subviewShown;

  // Click on the first device
  let sendTabView = PanelMultiView.getViewNode(
    document,
    "PanelUI-sendTabToDevice"
  );
  let firstDevice = sendTabView.querySelector(".sendtab-target[clientId='1']");
  Assert.ok(firstDevice, "First device button found");
  firstDevice.click();

  await Services.fog.testFlushAllChildren();
  let clickEvents = Glean.fxaAvatarMenu.clickSendTab.testGetValue();
  Assert.ok(
    clickEvents && clickEvents.length,
    "click_send_tab event was recorded"
  );
  Assert.equal(
    clickEvents[0].extra.device_count,
    "2",
    "Correct device count in click event"
  );
  Assert.equal(
    clickEvents[0].extra.action,
    "device",
    "Correct action for device click"
  );

  await closeFxaPanel();
  sandbox.restore();
  info("Send Tab click device event test passed!");
});

/**
 * Test that telemetry is recorded for tab context menu.
 */
add_task(async function test_sendtab_tab_context_menu() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  // Open a new tab
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  // Open tab context menu
  let contextMenu = document.getElementById("tabContextMenu");
  let popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");

  // Initialize TabContextMenu
  let evt = new Event("");
  tab.dispatchEvent(evt);
  gBrowser.selectedTab.focus();
  contextMenu.openPopup(tab, "end_after", 0, 0, true, false, evt);

  await popupShown;

  await Services.fog.testFlushAllChildren();
  let exposedEvents = Glean.tabContextMenu.sendTabExposed.testGetValue();
  Assert.ok(
    exposedEvents && exposedEvents.length,
    "send_tab_exposed event was recorded for tab context menu"
  );
  Assert.equal(
    exposedEvents[0].extra.device_count,
    "2",
    "Correct device count for tab context menu"
  );

  // Close the context menu
  let popupHidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await popupHidden;

  BrowserTestUtils.removeTab(tab);
  sandbox.restore();
  info("Tab context menu telemetry test passed!");
});

add_task(async function test_sendtab_exposed_app_menu() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await openFxaPanelFromAppMenu();

  await Services.fog.testFlushAllChildren();
  let appMenuExposed = Glean.fxaAppMenu.sendTabExposed.testGetValue();
  let avatarExposed = Glean.fxaAvatarMenu.sendTabExposed.testGetValue();
  Assert.ok(
    appMenuExposed && appMenuExposed.length,
    "send_tab_exposed recorded under fxa_app_menu when opened via hamburger"
  );
  Assert.ok(
    !avatarExposed || !avatarExposed.length,
    "send_tab_exposed not misattributed to fxa_avatar_menu"
  );

  await closeAppMenu();
  sandbox.restore();
});

add_task(async function test_sendtab_opened_app_menu() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await openFxaPanelFromAppMenu();

  let sendTabButton = PanelMultiView.getViewNode(
    document,
    "PanelUI-fxa-menu-sendtab-button"
  );
  let subviewShown = BrowserTestUtils.waitForEvent(
    PanelMultiView.getViewNode(document, "PanelUI-sendTabToDevice"),
    "ViewShown"
  );
  sendTabButton.click();
  await subviewShown;

  await Services.fog.testFlushAllChildren();
  let appMenuOpened = Glean.fxaAppMenu.sendTabOpened.testGetValue();
  let avatarOpened = Glean.fxaAvatarMenu.sendTabOpened.testGetValue();
  Assert.ok(
    appMenuOpened && appMenuOpened.length,
    "send_tab_opened recorded under fxa_app_menu when opened via hamburger"
  );
  Assert.ok(
    !avatarOpened || !avatarOpened.length,
    "send_tab_opened not misattributed to fxa_avatar_menu"
  );

  await closeAppMenu();
  sandbox.restore();
});

add_task(async function test_sendtab_click_device_app_menu() {
  const sandbox = setupSendTabMocks({ fxaDevices });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await openFxaPanelFromAppMenu();

  let sendTabButton = PanelMultiView.getViewNode(
    document,
    "PanelUI-fxa-menu-sendtab-button"
  );
  let subviewShown = BrowserTestUtils.waitForEvent(
    PanelMultiView.getViewNode(document, "PanelUI-sendTabToDevice"),
    "ViewShown"
  );
  sendTabButton.click();
  await subviewShown;

  let sendTabView = PanelMultiView.getViewNode(
    document,
    "PanelUI-sendTabToDevice"
  );
  let firstDevice = sendTabView.querySelector(".sendtab-target[clientId='1']");
  Assert.ok(firstDevice, "First device button found");
  firstDevice.click();

  await Services.fog.testFlushAllChildren();
  let appMenuClicks = Glean.fxaAppMenu.clickSendTab.testGetValue();
  let avatarClicks = Glean.fxaAvatarMenu.clickSendTab.testGetValue();
  Assert.ok(
    appMenuClicks && appMenuClicks.length,
    "click_send_tab recorded under fxa_app_menu when clicked via hamburger"
  );
  Assert.equal(
    appMenuClicks[0].extra.action,
    "device",
    "Correct action for device click"
  );
  Assert.ok(
    !avatarClicks || !avatarClicks.length,
    "click_send_tab not misattributed to fxa_avatar_menu"
  );

  await closeAppMenu();
  sandbox.restore();
});

/**
 * elements inside the Send Tab subviews
 * (PanelUI-fxa-menu-sendtab-{connect-phone,enable-sync,no-devices,
 * not-configured}) should resolve to "fxa_avatar_menu", so URL parameters and
 * telemetry are attributed correctly when the user is in those flows from
 * the avatar menu. These subviews are NOT nested inside PanelUI-fxa-menu
 * (they are siblings), so a contains() check would miss them. See
 * bug 2035981.
 */
add_task(async function test_get_entry_point_for_sendtab_subviews() {
  for (const id of [
    "PanelUI-fxa-menu-sendtab-connect-phone-button",
    "PanelUI-fxa-menu-sendtab-enable-sync-button",
  ]) {
    const button = PanelMultiView.getViewNode(document, id);
    Assert.ok(button, `${id} exists in the view cache`);
    Assert.equal(
      gSync._getEntryPointForElement(button),
      "fxa_avatar_menu",
      `${id} resolves to fxa_avatar_menu`
    );
  }
});
