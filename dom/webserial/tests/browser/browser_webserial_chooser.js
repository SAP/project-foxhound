/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URL =
  "https://example.com/document-builder.sjs?html=<h1>Test serial port chooser</h1>";
const TEST_URL_AFTER_NAV =
  "https://example.org/document-builder.sjs?html=<h1>After navigation</h1>";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.webserial.gated", false]],
  });

  registerCleanupFunction(() => {
    while (gBrowser.tabs.length > 1) {
      BrowserTestUtils.removeTab(gBrowser.selectedTab);
    }
  });
});

add_task(async function testChooserCancel() {
  info("Test that canceling the port chooser throws NotFoundError");

  await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let popupShown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = false;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.portRequestPromise = content.navigator.serial.requestPort();
  });

  await popupShown;

  is(
    PopupNotifications.panel.querySelector("popupnotification").id,
    "webSerial-choosePort-notification",
    "Port chooser notification was displayed"
  );

  PopupNotifications.panel
    .querySelector(".popup-notification-secondary-button")
    .click();

  let errorInfo = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      let errorName, errorMessage;
      try {
        await content.portRequestPromise;
      } catch (e) {
        errorName = e.name;
        errorMessage = e.message;
      }
      delete content.portRequestPromise;
      return { name: errorName, message: errorMessage };
    }
  );

  is(errorInfo.name, "NotFoundError", "Rejection is NotFoundError");
  is(errorInfo.message, "No port selected", "Error message is correct");
});

add_task(async function testChooserNoPorts() {
  info("Test that the port chooser is shown even if there are no ports");

  await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let popupShown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await content.navigator.serial.removeAllMockDevices();
    content.navigator.serial.autoselectPorts = false;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.portRequestPromise = content.navigator.serial.requestPort();
  });

  await popupShown;

  is(
    PopupNotifications.panel.querySelector("popupnotification").id,
    "webSerial-choosePort-notification",
    "Port chooser notification was displayed"
  );

  let menulist = document.getElementById("webSerial-selectPort-menulist");
  ok(menulist, "Found the port selection menulist");
  is(menulist.hidden, true, "menulist should be hidden");
  let noPortsMsg = document.getElementById("webSerial-no-ports-available");
  ok(noPortsMsg, "Found the no ports message");
  is(noPortsMsg.hidden, false, "no ports message should be visible");

  PopupNotifications.panel
    .querySelector(".popup-notification-secondary-button")
    .click();

  let errorInfo = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      let errorName, errorMessage;
      try {
        await content.portRequestPromise;
      } catch (e) {
        errorName = e.name;
        errorMessage = e.message;
      }
      delete content.portRequestPromise;
      return { name: errorName, message: errorMessage };
    }
  );

  is(errorInfo.name, "NotFoundError", "Rejection is NotFoundError");
  is(errorInfo.message, "No port selected", "Error message is correct");

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await content.navigator.serial.resetToDefaultMockDevices();
  });
});

add_task(async function testChooserSelection() {
  info("Test that selecting a port from the chooser resolves the promise");

  await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let popupShown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  let originalPortsLength = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      return (await content.navigator.serial.getPorts()).length;
    }
  );
  is(
    originalPortsLength,
    0,
    "getPorts() returns empty list before requestPort() is called"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = false;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.portRequestPromise = content.navigator.serial.requestPort();
  });

  await popupShown;

  PopupNotifications.panel
    .querySelector(".popup-notification-primary-button")
    .click();

  let gotPort = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      try {
        const port = await content.portRequestPromise;
        delete content.portRequestPromise;
        return !!port;
      } catch (e) {
        return false;
      }
    }
  );

  ok(gotPort, "requestPort resolved with a port");
  let portsLength = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      let ports = await content.navigator.serial.getPorts();
      return ports.length;
    }
  );
  is(
    portsLength,
    1,
    "getPorts() returns non-empty list after requestPort() is called"
  );
});

add_task(async function testChooserDismissedOnNavigation() {
  info(
    "Test that navigating the tab while the chooser is open dismisses it and " +
      "does not leave stale parent-side state"
  );

  await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let popupShown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = false;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    // Swallow the rejection; the document is about to be replaced and we
    // don't want an unhandled-rejection warning in the test log.
    content.navigator.serial.requestPort().catch(() => {});
  });

  await popupShown;

  is(
    PopupNotifications.panel.querySelector("popupnotification").id,
    "webSerial-choosePort-notification",
    "Port chooser notification was displayed"
  );

  let loaded = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  BrowserTestUtils.startLoadingURIString(
    gBrowser.selectedBrowser,
    TEST_URL_AFTER_NAV
  );
  await loaded;

  await TestUtils.waitForCondition(
    () =>
      !PopupNotifications.getNotification(
        "webSerial-choosePort",
        gBrowser.selectedBrowser
      ),
    "Chooser notification should be removed after navigation"
  );

  // The new page should be able to open its own chooser. This exercises the
  // parent-side cleanup: a new WindowGlobalParent spawns a new
  // SerialManagerParent, and the prior one's in-flight state is gone.
  let secondPopupShown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = false;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.portRequestPromise = content.navigator.serial.requestPort();
  });

  await secondPopupShown;

  is(
    PopupNotifications.panel.querySelector("popupnotification").id,
    "webSerial-choosePort-notification",
    "Second port chooser notification was displayed after navigation"
  );

  PopupNotifications.panel
    .querySelector(".popup-notification-primary-button")
    .click();

  let gotPort = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      try {
        const port = await content.portRequestPromise;
        delete content.portRequestPromise;
        return !!port;
      } catch (e) {
        return false;
      }
    }
  );

  ok(gotPort, "Post-navigation requestPort resolved with a port");
});

add_task(async function testChooserSelectSecondDevice() {
  info(
    "Test that selecting the second device from the chooser works correctly"
  );

  await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let popupShown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = false;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.portRequestPromise = content.navigator.serial.requestPort();
  });

  await popupShown;

  is(
    PopupNotifications.panel.querySelector("popupnotification").id,
    "webSerial-choosePort-notification",
    "Port chooser notification was displayed"
  );

  let menulist = document.getElementById("webSerial-selectPort-menulist");
  ok(menulist, "Found the port selection menulist");
  is(menulist.hidden, false, "menulist should be visible");
  let noPortsMsg = document.getElementById("webSerial-no-ports-available");
  ok(noPortsMsg, "Found the no ports message");
  is(noPortsMsg.hidden, true, "no ports message should be hidden");

  let itemCount = menulist.itemCount;
  info(`Menulist has ${itemCount} items`);

  if (itemCount < 2) {
    ok(
      false,
      "Need at least 2 ports to test selecting the second device, this should be guaranteed by dom.webserial.testing.enabled."
    );
    PopupNotifications.panel
      .querySelector(".popup-notification-secondary-button")
      .click();
    return;
  }

  let firstPortLabel = menulist.getItemAtIndex(0).label;
  let secondPortLabel = menulist.getItemAtIndex(1).label;
  is(firstPortLabel, "test-device-1", "First port has correct label");
  is(secondPortLabel, "test-device-2", "Second port has correct label");

  menulist.selectedIndex = 1;
  is(menulist.selectedIndex, 1, "Selected second item in menulist");
  is(
    menulist.selectedItem.label,
    secondPortLabel,
    "Selected item label matches second port"
  );

  PopupNotifications.panel
    .querySelector(".popup-notification-primary-button")
    .click();

  let portInfo = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    async () => {
      try {
        const port = await content.portRequestPromise;
        delete content.portRequestPromise;
        const info = port.getInfo();
        return {
          success: true,
          usbVendorId: info.usbVendorId || 0,
          usbProductId: info.usbProductId || 0,
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  );

  ok(portInfo.success, "requestPort resolved with a port");
  is(portInfo.usbVendorId, 0x0403, "Second port has correct vendor ID");
  is(portInfo.usbProductId, 0x6002, "Second port has correct product ID");
});
