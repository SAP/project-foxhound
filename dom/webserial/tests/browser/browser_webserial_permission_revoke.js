/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URL =
  "https://example.com/document-builder.sjs?html=<h1>Test serial permission revocation</h1>";

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

add_task(async function testPermissionRevocation() {
  info("Test that permission revocation calls forget() on open ports");

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = true;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    const port = await content.navigator.serial.requestPort();
    content.testPort = port;
    await port.open({ baudRate: 9600 });
  });

  await TestUtils.waitForCondition(() => {
    let serialIcon = document.getElementById("serial-sharing-icon");
    return serialIcon && BrowserTestUtils.isVisible(serialIcon);
  }, "Serial sharing icon should be visible when port is open");

  let portConnected = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      return content.testPort && content.testPort.readable !== null;
    }
  );
  ok(portConnected, "Port should be connected");

  SitePermissions.removeFromPrincipal(
    gBrowser.contentPrincipal,
    "serial",
    gBrowser.selectedBrowser
  );

  gSerialDeviceObserver.resetBrowserCount(gBrowser.selectedBrowser);
  gBrowser.updateBrowserSharing(gBrowser.selectedBrowser, { serial: false });

  // Give time for observer to be registered (it happens async)
  await new Promise(resolve => setTimeout(resolve, 0));

  info("Sending serial-permission-revoked notification");
  Services.obs.notifyObservers(
    gBrowser.selectedBrowser.browsingContext,
    "serial-permission-revoked"
  );

  let isForgotten = await TestUtils.waitForCondition(async () => {
    return SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      try {
        await content.testPort.open({ baudRate: 9600 });
        return false;
      } catch (e) {
        return (
          e.name === "InvalidStateError" && e.message.includes("forgotten")
        );
      }
    });
  }, "Waiting for port to be forgotten");

  ok(isForgotten, "Port should be forgotten after permission revocation");

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    is(
      content.testPort.readable,
      null,
      "readable should be null after permission revocation"
    );
    is(
      content.testPort.writable,
      null,
      "writable should be null after permission revocation"
    );
    const ports = await content.navigator.serial.getPorts();
    is(ports.length, 0, "getPorts() should return empty after revocation");
  });

  let serialIcon = document.getElementById("serial-sharing-icon");
  ok(
    !BrowserTestUtils.isVisible(serialIcon),
    "Serial sharing icon should not be visible after permission revocation"
  );

  BrowserTestUtils.removeTab(tab);
});
