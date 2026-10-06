/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASE = "https://example.com/browser/dom/webserial/tests/browser/";
const TEST_URL = BASE + "serial_bfcache_page.html";
const TEST_URL2 = BASE + "blank.html";

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

add_task(async function test_serial_disallows_bfcache() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_URL,
    true
  );
  let browser = tab.linkedBrowser;

  // Request a serial port with autoselect (creates a SerialPort object,
  // which should call DisallowBFCaching in its constructor).
  await SpecialPowers.spawn(browser, [], async () => {
    content.navigator.serial.autoselectPorts = true;
    SpecialPowers.wrap(content.document).notifyUserGestureActivation();
    let port = await content.navigator.serial.requestPort();
    content._serialPort = port;
  });

  // Navigate to a different page.
  BrowserTestUtils.startLoadingURIString(browser, TEST_URL2);
  await BrowserTestUtils.browserLoaded(browser, false);

  // Navigate back.
  browser.goBack();
  await BrowserTestUtils.browserLoaded(browser, false);

  let persisted = await SpecialPowers.spawn(browser, [], async () => {
    return content.document.documentElement.getAttribute("persisted");
  });

  is(
    persisted,
    "false",
    "Page with serial port should not be restored from bfcache"
  );
});
