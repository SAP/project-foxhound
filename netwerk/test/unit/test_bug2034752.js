/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Regression test for bug 2034752: ProcessSecurityHeaders failure must not
// prevent HTTP authentication on a 401 response.

"use strict";

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

do_get_profile();
Cc["@mozilla.org/psm;1"].getService(Ci.nsISupports);

class AuthPrompt {
  constructor() {
    this.calls = 0;
  }

  QueryInterface = ChromeUtils.generateQI(["nsIAuthPrompt2"]);

  asyncPromptAuth(channel, callback, context, level, authInfo) {
    this.calls++;
    authInfo.username = "user";
    authInfo.password = "pass";
    executeSoon(() => callback.onAuthAvailable(context, authInfo));
  }
}

class Requestor {
  constructor() {
    this.prompt = new AuthPrompt();
  }

  QueryInterface = ChromeUtils.generateQI(["nsIInterfaceRequestor"]);

  getInterface(iid) {
    if (iid.equals(Ci.nsIAuthPrompt2)) {
      return this.prompt;
    }
    throw Components.Exception("", Cr.NS_ERROR_NO_INTERFACE);
  }
}

add_task(async function test_https_401_with_hsts_and_cert_override() {
  Services.prefs.setIntPref("network.auth.subresource-http-auth-allow", 2);

  // Use an untrusted cert so ProcessHSTSHeader fails (it rejects HSTS for
  // connections with cert errors). setDisableAllSecurityChecks lets the
  // connection proceed despite the bad cert.
  let server = new NodeHTTPSServer();
  server._skipCert = true;
  await server.start();

  let certOverrideService = Cc[
    "@mozilla.org/security/certoverride;1"
  ].getService(Ci.nsICertOverrideService);
  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.auth.subresource-http-auth-allow");
    certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
      false
    );
    await server.stop();
  });

  await server.registerPathHandler("/auth", (req, resp) => {
    if (req.headers.authorization) {
      resp.writeHead(200, { "Content-Type": "text/plain" });
      resp.end("ok");
      return;
    }
    resp.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="testrealm"',
      "Strict-Transport-Security": "max-age=600",
      "Content-Type": "text/plain",
    });
    resp.end("auth required");
  });

  let principal = Services.scriptSecurityManager.createContentPrincipal(
    Services.io.newURI(`https://localhost:${server.port()}`),
    {}
  );

  let chan = NetUtil.newChannel({
    uri: `https://localhost:${server.port()}/auth`,
    loadingPrincipal: principal,
    securityFlags: Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  }).QueryInterface(Ci.nsIHttpChannel);

  let requestor = new Requestor();
  chan.notificationCallbacks = requestor;

  let [request, buffer] = await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(
        (req, buff) => resolve([req, buff]),
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });

  Assert.equal(request.status, Cr.NS_OK, "channel succeeded");
  Assert.equal(
    request.QueryInterface(Ci.nsIHttpChannel).responseStatus,
    200,
    "server returned 200 after authentication"
  );
  Assert.equal(buffer, "ok", "got expected response body");
  Assert.equal(requestor.prompt.calls, 1, "auth prompt was invoked once");
});
