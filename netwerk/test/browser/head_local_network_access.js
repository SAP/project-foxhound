"use strict";

const PROMPT_ALLOW_BUTTON = -1;
const PROMPT_NOT_NOW_BUTTON = 0;

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const LNA_BASE_URL = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

async function restorePermissions() {
  info("Restoring permissions");
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
  Services.perms.removeAll();
}

function clickDoorhangerButton(buttonIndex, browser, notificationID) {
  let popup = PopupNotifications.getNotification(notificationID, browser);
  let notification = popup?.owner?.panel?.childNodes?.[0];
  ok(notification, "Notification popup is available");

  if (buttonIndex === PROMPT_ALLOW_BUTTON) {
    ok(true, "Triggering main action (allow)");
    notification.button.click();
  } else {
    ok(true, "Triggering secondary action (deny)");
    notification.secondaryButton.click();
  }
}

function observeAndCheck(testType, rand, expectedStatus, message) {
  return new Promise(resolve => {
    const url = `http://localhost:21555/?type=${testType}&rand=${rand}`;
    const observer = {
      observe(subject, topic) {
        if (topic !== "http-on-stop-request") {
          return;
        }

        let channel = subject.QueryInterface(Ci.nsIHttpChannel);
        if (!channel || channel.URI.spec !== url) {
          return;
        }

        is(channel.status, expectedStatus, message);
        Services.obs.removeObserver(observer, "http-on-stop-request");
        resolve();
      },
    };
    Services.obs.addObserver(observer, "http-on-stop-request");
  });
}

const testCases = [
  {
    type: "fetch",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "xhr",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "img",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "video",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "audio",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "iframe",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "script",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "font",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "websocket",
    allowStatus: Cr.NS_ERROR_WEBSOCKET_CONNECTION_REFUSED,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
];

function registerServerHandlers(server) {
  server.registerPathHandler("/", (request, response) => {
    const params = new URLSearchParams(request.queryString);
    const type = params.get("type");

    response.setHeader("Access-Control-Allow-Origin", "*", false);

    switch (type) {
      case "img":
        response.setHeader("Content-Type", "image/gif", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write(
          atob("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")
        );
        break;
      case "audio":
        response.setHeader("Content-Type", "audio/wav", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write(
          atob("UklGRhYAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=")
        );
        break;
      case "video":
        response.setHeader("Content-Type", "video/mp4", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write(
          atob(
            "GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA="
          )
        );
        break;
      default:
        response.setHeader("Content-Type", "text/plain", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write("hello");
    }
  });
}

async function runSingleTestCase(
  test,
  rand,
  expectedStatus,
  description,
  userAction = null,
  notificationID = null
) {
  info(description);

  const promise = observeAndCheck(test.type, rand, expectedStatus, description);
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${LNA_BASE_URL}page_with_non_trackers.html?test=${test.type}&rand=${rand}`
  );

  if (userAction && notificationID) {
    const buttonNum =
      userAction === "allow" ? PROMPT_ALLOW_BUTTON : PROMPT_NOT_NOW_BUTTON;

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(buttonNum, gBrowser.selectedBrowser, notificationID);
  }

  await promise;
  gBrowser.removeTab(tab);
}

async function runPromptedLnaTest(test, overrideLabel, notificationID) {
  const promptActions = ["allow", "deny"];
  for (const userAction of promptActions) {
    const rand = Math.random();
    const expectedStatus =
      userAction === "allow" ? test.allowStatus : test.denyStatus;

    await runSingleTestCase(
      test,
      rand,
      expectedStatus,
      `LNA test (${overrideLabel}) for ${test.type} with user action: ${userAction}`,
      userAction,
      notificationID
    );

    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    await runSingleTestCase(
      test,
      rand,
      expectedStatus,
      `LNA test (${overrideLabel}) for ${test.type} with user action: ${userAction}`,
      userAction,
      notificationID
    );
  }
}

var gLnaServer = null;

async function setupLnaServer() {
  if (gLnaServer) {
    return gLnaServer;
  }

  gLnaServer = new HttpServer();
  gLnaServer.start(21555);
  registerServerHandlers(gLnaServer);

  registerCleanupFunction(async () => {
    await restorePermissions();
    if (gLnaServer) {
      await new Promise(resolve => {
        gLnaServer.stop(resolve);
      });
      gLnaServer = null;
    }
  });

  return gLnaServer;
}

async function setupLnaPrefs() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.manager.defaultsUrl", ""],
      ["network.websocket.delay-failed-reconnects", false],
      ["network.websocket.max-connections", 1000],
      ["network.lna.block_trackers", true],
      ["network.lna.blocking", true],
      ["network.lna.websocket.enabled", true],
      ["network.lna.local-network-to-localhost.skip-checks", false],
      ["browser.ipProtection.enabled", false],
    ],
  });
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
}
