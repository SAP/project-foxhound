/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const LOGIN_LINK = `<html><body><a href="/unlock">login</a></body></html>`;
const LOGIN_URL = "http://localhost:8080/login";
const CANONICAL_SUCCESS_URL = "http://localhost:8080/success";
const CPS = Cc["@mozilla.org/network/captive-portal-service;1"].getService(
  Ci.nsICaptivePortalService
);
const META_CANONICAL_CONTENT = `<meta http-equiv=\"refresh\" content=\"0;url=http://support.mozilla.org:8080/sumo\"/>`;

const cps = Cc["@mozilla.org/network/captive-portal-service;1"].getService(
  Ci.nsICaptivePortalService
);

let server;
let loginPageShown = false;
let showSumo = false;
const SUMO_URL = "https://support.mozilla.org:8080/sumo";

function redirectHandler(request, response) {
  if (showSumo) {
    response.setHeader("Content-Type", "text/html");
    response.bodyOutputStream.write(
      META_CANONICAL_CONTENT,
      META_CANONICAL_CONTENT.length
    );
    return;
  }
  if (loginPageShown) {
    return;
  }
  response.setStatusLine(request.httpVersion, 302, "captive");
  response.setHeader("Content-Type", "text/html");
  response.setHeader("Location", LOGIN_URL);
}

function sumoHandler(request, response) {
  response.setHeader("Content-Type", "text/html");
  let content = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
  </head>
  <body>
    Testing
  </body>
</html>
`;
  response.bodyOutputStream.write(content, content.length);
}

function loginHandler(request, response) {
  response.setHeader("Content-Type", "text/html");
  response.bodyOutputStream.write(LOGIN_LINK, LOGIN_LINK.length);
  loginPageShown = true;
}

function unlockHandler(request, response) {
  response.setStatusLine(request.httpVersion, 302, "login complete");
  response.setHeader("Content-Type", "text/html");
  response.setHeader("Location", CANONICAL_SUCCESS_URL);
}

add_setup(async function () {
  // Set up a mock server for handling captive portal redirect.
  server = new HttpServer();
  server.identity.add("http", "support.mozilla.org", 8080);
  server.registerPathHandler("/success", redirectHandler);
  server.registerPathHandler("/login", loginHandler);
  server.registerPathHandler("/unlock", unlockHandler);
  server.registerPathHandler("/sumo", sumoHandler);
  server.start(8080);
  registerCleanupFunction(async () => await server.stop());
  info("Mock server is now set up for captive portal redirect");

  await SpecialPowers.pushPrefEnv({
    set: [
      ["captivedetect.canonicalURL", CANONICAL_SUCCESS_URL],
      ["captivedetect.canonicalContent", META_CANONICAL_CONTENT],
      ["network.dns.native-is-localhost", true],
    ],
  });
});

// This test checks if the captive portal tab is removed after the
// sucess/abort events are fired, assuming the tab has already redirected
// to the canonical URL before they are fired.
add_task(async function checkCaptivePortalTabCloseOnCanonicalURL_one() {
  await portalDetected();
  let errorTab = await openCaptivePortalErrorTab();
  let tab = await openCaptivePortalLoginTab(errorTab, LOGIN_URL);
  let browser = tab.linkedBrowser;

  let redirectedToCanonicalURL = BrowserTestUtils.browserLoaded(
    browser,
    false,
    CANONICAL_SUCCESS_URL
  );
  let errorPageReloaded = BrowserTestUtils.waitForErrorPage(
    errorTab.linkedBrowser
  );

  await SpecialPowers.spawn(browser, [], async () => {
    let doc = content.document;
    let loginButton = doc.querySelector("a");
    await ContentTaskUtils.waitForCondition(
      () => loginButton,
      "Login button on the captive portal tab is visible"
    );
    info("Clicking the login button on the captive portal tab page");
    await EventUtils.synthesizeMouseAtCenter(loginButton, {}, content);
  });

  await redirectedToCanonicalURL;
  info(
    "Re-direct to canonical URL in the captive portal tab was succcessful after login"
  );

  let tabClosed = BrowserTestUtils.waitForTabClosing(tab);
  Services.obs.notifyObservers(null, "captive-portal-login-success");
  await tabClosed;
  info(
    "Captive portal tab was closed on re-direct to canonical URL after login as expected"
  );

  await errorPageReloaded;
  info("Captive portal error page was reloaded");
  gBrowser.removeTab(errorTab);
});

// This test checks if the captive portal tab is removed on location change
// i.e. when it is re-directed to the canonical URL long after success/abort
// event handlers are executed.
add_task(async function checkCaptivePortalTabCloseOnCanonicalURL_two() {
  loginPageShown = false;
  await portalDetected();
  let errorTab = await openCaptivePortalErrorTab();
  let tab = await openCaptivePortalLoginTab(errorTab, LOGIN_URL);
  let browser = tab.linkedBrowser;

  let redirectedToCanonicalURL = BrowserTestUtils.waitForLocationChange(
    gBrowser,
    CANONICAL_SUCCESS_URL
  );
  let errorPageReloaded = BrowserTestUtils.waitForErrorPage(
    errorTab.linkedBrowser
  );

  Services.obs.notifyObservers(null, "captive-portal-login-success");
  await TestUtils.waitForCondition(
    () => CPS.state == CPS.UNLOCKED_PORTAL,
    "Captive portal is released"
  );

  let tabClosed = BrowserTestUtils.waitForTabClosing(tab);
  await SpecialPowers.spawn(browser, [], async () => {
    let doc = content.document;
    let loginButton = doc.querySelector("a");
    await ContentTaskUtils.waitForCondition(
      () => loginButton,
      "Login button on the captive portal tab is visible"
    );
    info("Clicking the login button on the captive portal tab page");
    await EventUtils.synthesizeMouseAtCenter(loginButton, {}, content);
  });

  await redirectedToCanonicalURL;
  info(
    "Re-direct to canonical URL in the captive portal tab was succcessful after login"
  );
  await tabClosed;
  info(
    "Captive portal tab was closed on re-direct to canonical URL after login as expected"
  );

  await errorPageReloaded;
  info("Captive portal error page was reloaded");
  gBrowser.removeTab(errorTab);
});

// Test that the captive portal page is closed after a successful login
// even if it's self-refreshed to support.mozilla.org
add_task(async function checkCaptivePortalTabCloseOnCanonicalURL_three() {
  loginPageShown = false;
  await portalDetected();
  let errorTab = await openCaptivePortalErrorTab();
  let tab = await openCaptivePortalLoginTab(errorTab, LOGIN_URL);
  let browser = tab.linkedBrowser;

  let errorPageReloaded = BrowserTestUtils.waitForErrorPage(
    errorTab.linkedBrowser
  );

  let tabClosed = BrowserTestUtils.waitForTabClosing(tab);
  showSumo = true;
  await SpecialPowers.spawn(browser, [], async () => {
    let doc = content.document;
    let loginButton = doc.querySelector("a");
    await ContentTaskUtils.waitForCondition(
      () => loginButton,
      "Login button on the captive portal tab is visible"
    );
    info("Clicking the login button on the captive portal tab page");
    await EventUtils.synthesizeMouseAtCenter(loginButton, {}, content);
  });

  Services.obs.notifyObservers(null, "captive-portal-login-success");

  await TestUtils.waitForCondition(
    () => CPS.state == CPS.UNLOCKED_PORTAL,
    "Captive portal is released"
  );

  await tabClosed;
  info(
    "Captive portal tab was closed on re-direct to canonical URL after login as expected"
  );

  await errorPageReloaded;
  info("Captive portal error page was reloaded");
  showSumo = false;
  gBrowser.removeTab(errorTab);
});
