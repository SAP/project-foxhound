"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

let httpserver = null;
let lnaServer = null;

ChromeUtils.defineLazyGetter(this, "cpURI", function () {
  return (
    "http://localhost:" + httpserver.identity.primaryPort + "/captive.html"
  );
});

ChromeUtils.defineLazyGetter(this, "LNA_URL", function () {
  return "http://localhost:" + lnaServer.identity.primaryPort + "/test";
});

const SUCCESS_STRING =
  '<meta http-equiv="refresh" content="0;url=https://support.mozilla.org/kb/captive-portal"/>';
let cpResponse = SUCCESS_STRING;

function captivePortalHandler(metadata, response) {
  response.setHeader("Content-Type", "text/html");
  response.bodyOutputStream.write(cpResponse, cpResponse.length);
}

function lnaHandler(metadata, response) {
  response.setStatusLine(metadata.httpVersion, 200, "OK");
  let body = "success";
  response.bodyOutputStream.write(body, body.length);
}

const PREF_CAPTIVE_ENABLED = "network.captive-portal-service.enabled";
const PREF_CAPTIVE_TESTMODE = "network.captive-portal-service.testMode";
const PREF_CAPTIVE_ENDPOINT = "captivedetect.canonicalURL";
const PREF_CAPTIVE_MINTIME = "network.captive-portal-service.minInterval";
const PREF_CAPTIVE_MAXTIME = "network.captive-portal-service.maxInterval";
const PREF_DNS_NATIVE_IS_LOCALHOST = "network.dns.native-is-localhost";

const cps = Cc["@mozilla.org/network/captive-portal-service;1"].getService(
  Ci.nsICaptivePortalService
);

function makeChannel(url, triggeringPrincipalURI = null) {
  let uri = NetUtil.newURI(url);
  var principal = Services.scriptSecurityManager.createContentPrincipal(
    uri,
    {}
  );

  var triggeringPrincipal;
  if (triggeringPrincipalURI) {
    let triggeringURI = NetUtil.newURI(triggeringPrincipalURI);
    triggeringPrincipal = Services.scriptSecurityManager.createContentPrincipal(
      triggeringURI,
      {}
    );
  } else {
    let triggeringURI = NetUtil.newURI("https://public.example.com");
    triggeringPrincipal = Services.scriptSecurityManager.createContentPrincipal(
      triggeringURI,
      {}
    );
  }

  return NetUtil.newChannel({
    uri: url,
    loadingPrincipal: principal,
    triggeringPrincipal,
    securityFlags: Ci.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_INHERITS_SEC_CONTEXT,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  }).QueryInterface(Ci.nsIHttpChannel);
}

add_setup(async function () {
  // Setup captive portal detection server
  httpserver = new HttpServer();
  httpserver.registerPathHandler("/captive.html", captivePortalHandler);
  httpserver.start(-1);

  // Setup LNA target server
  lnaServer = new HttpServer();
  lnaServer.registerPathHandler("/test", lnaHandler);
  lnaServer.start(-1);

  // Configure captive portal service
  Services.prefs.setCharPref(PREF_CAPTIVE_ENDPOINT, cpURI);
  Services.prefs.setIntPref(PREF_CAPTIVE_MINTIME, 50);
  Services.prefs.setIntPref(PREF_CAPTIVE_MAXTIME, 100);
  Services.prefs.setBoolPref(PREF_CAPTIVE_TESTMODE, true);
  Services.prefs.setBoolPref(PREF_DNS_NATIVE_IS_LOCALHOST, true);

  // Configure LNA blocking
  Services.prefs.setBoolPref("network.lna.blocking", true);
  Services.prefs.setBoolPref("network.localhost.prompt.testing", true);
  Services.prefs.setBoolPref("network.localnetwork.prompt.testing", true);

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref(PREF_CAPTIVE_ENABLED);
    Services.prefs.clearUserPref(PREF_CAPTIVE_TESTMODE);
    Services.prefs.clearUserPref(PREF_CAPTIVE_ENDPOINT);
    Services.prefs.clearUserPref(PREF_CAPTIVE_MINTIME);
    Services.prefs.clearUserPref(PREF_CAPTIVE_MAXTIME);
    Services.prefs.clearUserPref(PREF_DNS_NATIVE_IS_LOCALHOST);
    Services.prefs.clearUserPref("network.lna.blocking");
    Services.prefs.clearUserPref("network.localhost.prompt.testing");
    Services.prefs.clearUserPref("network.localnetwork.prompt.testing");
    Services.prefs.clearUserPref("network.localhost.prompt.testing.allow");
    Services.prefs.clearUserPref("network.localnetwork.prompt.testing.allow");
    Services.prefs.clearUserPref("network.lna.address_space.private.override");

    await new Promise(resolve => {
      httpserver.stop(resolve);
    });
    await new Promise(resolve => {
      lnaServer.stop(resolve);
    });
  });
});

function observerPromise(topic) {
  return new Promise(resolve => {
    let observer = {
      QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
      observe(aSubject, aTopic, aData) {
        if (aTopic == topic) {
          Services.obs.removeObserver(observer, topic);
          resolve(aData);
        }
      },
    };
    Services.obs.addObserver(observer, topic);
  });
}

add_task(async function test_localnetwork_blocked_without_captive_portal() {
  // Override address space to treat this localhost:port as Private (local network)
  Services.prefs.setCharPref(
    "network.lna.address_space.private.override",
    "127.0.0.1:" + lnaServer.identity.primaryPort
  );

  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, false);
  Services.prefs.setBoolPref(
    "network.localnetwork.prompt.testing.allow",
    false
  );

  let chan = makeChannel(LNA_URL);
  chan.loadInfo.parentIpAddressSpace = Ci.nsILoadInfo.Public;

  await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_EXPECT_FAILURE));
  });

  Assert.equal(
    chan.status,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "Request should be blocked when captive portal is not active"
  );
  Services.prefs.clearUserPref("network.lna.address_space.private.override");
});

add_task(async function test_localnetwork_allowed_with_captive_portal() {
  // Override address space to treat this localhost:port as Private (local network)
  Services.prefs.setCharPref(
    "network.lna.address_space.private.override",
    "127.0.0.1:" + lnaServer.identity.primaryPort
  );
  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, false);
  Assert.equal(cps.state, Ci.nsICaptivePortalService.UNKNOWN);

  // Start captive portal service and wait for it to detect "no captive portal"
  let notification = observerPromise("network:captive-portal-connectivity");
  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, true);
  await notification;
  Assert.equal(cps.state, Ci.nsICaptivePortalService.NOT_CAPTIVE);

  // Trigger captive portal detection (locked state)
  cpResponse = "captive portal page";
  notification = observerPromise("captive-portal-login");
  cps.recheckCaptivePortal();
  await notification;
  Assert.equal(
    cps.state,
    Ci.nsICaptivePortalService.LOCKED_PORTAL,
    "Captive portal should be in LOCKED_PORTAL state"
  );

  // Set prompt to deny - but it should still succeed because captive portal is active
  Services.prefs.setBoolPref(
    "network.localnetwork.prompt.testing.allow",
    false
  );

  let chan = makeChannel(LNA_URL);
  chan.loadInfo.parentIpAddressSpace = Ci.nsILoadInfo.Public;

  await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, 0));
  });

  Assert.equal(
    chan.status,
    Cr.NS_OK,
    "Request should succeed when captive portal is active (locked)"
  );

  // Cleanup: unlock the captive portal
  cpResponse = SUCCESS_STRING;
  notification = observerPromise("captive-portal-login-success");
  cps.recheckCaptivePortal();
  await notification;
  Assert.equal(cps.state, Ci.nsICaptivePortalService.UNLOCKED_PORTAL);

  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, false);
  Services.prefs.clearUserPref("network.lna.address_space.private.override");
});

add_task(async function test_localhost_blocked_during_captive_portal() {
  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, false);
  Assert.equal(cps.state, Ci.nsICaptivePortalService.UNKNOWN);

  // Start captive portal service and wait for it to detect "no captive portal"
  let notification = observerPromise("network:captive-portal-connectivity");
  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, true);
  await notification;
  Assert.equal(cps.state, Ci.nsICaptivePortalService.NOT_CAPTIVE);

  // Trigger captive portal detection (locked state)
  cpResponse = "captive portal page";
  notification = observerPromise("captive-portal-login");
  cps.recheckCaptivePortal();
  await notification;
  Assert.equal(
    cps.state,
    Ci.nsICaptivePortalService.LOCKED_PORTAL,
    "Captive portal should be in LOCKED_PORTAL state"
  );

  // Set prompt to deny localhost access
  Services.prefs.setBoolPref("network.localhost.prompt.testing.allow", false);

  // Create a separate localhost server (without private override)
  // This will be treated as Local address space, not Private
  let localhostServer = new HttpServer();
  localhostServer.registerPathHandler("/test", lnaHandler);
  localhostServer.start(-1);

  let localhostURL =
    "http://localhost:" + localhostServer.identity.primaryPort + "/test";

  let chan = makeChannel(localhostURL);
  chan.loadInfo.parentIpAddressSpace = Ci.nsILoadInfo.Public;

  await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_EXPECT_FAILURE));
  });

  Assert.equal(
    chan.status,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "Localhost access should be blocked even when captive portal is active"
  );

  // Cleanup
  await new Promise(resolve => {
    localhostServer.stop(resolve);
  });

  // Unlock the captive portal
  cpResponse = SUCCESS_STRING;
  notification = observerPromise("captive-portal-login-success");
  cps.recheckCaptivePortal();
  await notification;
  Assert.equal(cps.state, Ci.nsICaptivePortalService.UNLOCKED_PORTAL);

  Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, false);
});

add_task(
  async function test_localnetwork_blocked_after_captive_portal_unlocked() {
    Services.prefs.setCharPref(
      "network.lna.address_space.private.override",
      "127.0.0.1:" + lnaServer.identity.primaryPort
    );

    Services.prefs.setBoolPref(PREF_CAPTIVE_ENABLED, false);
    Services.prefs.setBoolPref(
      "network.localnetwork.prompt.testing.allow",
      false
    );

    Assert.equal(cps.state, Ci.nsICaptivePortalService.UNKNOWN);

    let chan = makeChannel(LNA_URL);
    chan.loadInfo.parentIpAddressSpace = Ci.nsILoadInfo.Public;

    await new Promise(resolve => {
      chan.asyncOpen(new ChannelListener(resolve, null, CL_EXPECT_FAILURE));
    });

    Assert.equal(
      chan.status,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "Request should be blocked again when captive portal is no longer active"
    );
    Services.prefs.clearUserPref("network.lna.address_space.private.override");
  }
);
