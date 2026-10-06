/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URL =
  "https://example.com/document-builder.sjs?html=<h1>Test serial worker sharing icon</h1>";

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

add_task(async function testSharingIconAppearsFromWorker() {
  info("Test that the serial sharing icon appears when a worker opens a port");

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  // Request the port from the window context (requestPort is Window-only)
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = true;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    await content.navigator.serial.requestPort();
  });

  let serialIcon = document.getElementById("serial-sharing-icon");
  ok(serialIcon, "Serial sharing icon element should exist");
  ok(
    !BrowserTestUtils.isVisible(serialIcon),
    "Serial sharing icon should not be visible before port is opened"
  );

  // Spawn a worker and have it open the port
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const worker = new content.Worker(
      "https://example.com/browser/dom/webserial/tests/browser/worker_open_close.js"
    );
    content.testWorker = worker;

    await new Promise((resolve, reject) => {
      worker.onmessage = e => {
        if (e.data.type === "opened") {
          resolve();
        } else if (e.data.type === "error") {
          reject(new Error(e.data.message));
        }
      };
      worker.onerror = e => reject(new Error(e.message));
      worker.postMessage("open");
    });
  });

  info("Waiting for serial sharing icon to become visible");
  await TestUtils.waitForCondition(() => {
    return BrowserTestUtils.isVisible(
      document.getElementById("serial-sharing-icon")
    );
  }, "Serial sharing icon should be visible when worker has port open");

  // Now close the port from the worker
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await new Promise((resolve, reject) => {
      content.testWorker.onmessage = e => {
        if (e.data.type === "closed") {
          resolve();
        } else if (e.data.type === "error") {
          reject(new Error(e.data.message));
        }
      };
      content.testWorker.postMessage("close");
    });
  });

  info("Waiting for serial sharing icon to become hidden");
  await TestUtils.waitForCondition(() => {
    return !BrowserTestUtils.isVisible(
      document.getElementById("serial-sharing-icon")
    );
  }, "Serial sharing icon should be hidden after worker closes port");

  // Clean up the worker
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.testWorker.terminate();
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function testSharingIconWithMultiplePorts() {
  info(
    "Test that the serial sharing icon stays visible when one of two open ports is closed"
  );

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  // Request two different ports using USB vendor/product filters.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.navigator.serial.autoselectPorts = true;

    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.testPort1 = await content.navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x2341, usbProductId: 0x0043 }],
    });

    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    content.testPort2 = await content.navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x0403, usbProductId: 0x6002 }],
    });
  });

  let serialIcon = document.getElementById("serial-sharing-icon");
  ok(
    !BrowserTestUtils.isVisible(serialIcon),
    "Serial sharing icon should not be visible before any port is opened"
  );

  // Open port 1
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await content.testPort1.open({ baudRate: 9600 });
  });

  info(
    "Waiting for serial sharing icon to become visible after opening port 1"
  );
  await TestUtils.waitForCondition(() => {
    return BrowserTestUtils.isVisible(
      document.getElementById("serial-sharing-icon")
    );
  }, "Serial sharing icon should be visible when port 1 is open");

  // Open port 2
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await content.testPort2.open({ baudRate: 9600 });
  });

  // Allow the sharing state notification for port 2 to be processed
  await TestUtils.waitForTick();

  ok(
    BrowserTestUtils.isVisible(document.getElementById("serial-sharing-icon")),
    "Serial sharing icon should still be visible when both ports are open"
  );

  // Close port 1 while port 2 remains open
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await content.testPort1.close();
  });

  // Allow the sharing state notification for port 1 close to be processed
  await TestUtils.waitForTick();

  ok(
    BrowserTestUtils.isVisible(document.getElementById("serial-sharing-icon")),
    "Serial sharing icon should still be visible when port 2 is still open"
  );

  // Close port 2
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    await content.testPort2.close();
  });

  info(
    "Waiting for serial sharing icon to become hidden after closing both ports"
  );
  await TestUtils.waitForCondition(() => {
    return !BrowserTestUtils.isVisible(
      document.getElementById("serial-sharing-icon")
    );
  }, "Serial sharing icon should be hidden after both ports are closed");

  BrowserTestUtils.removeTab(tab);
});
