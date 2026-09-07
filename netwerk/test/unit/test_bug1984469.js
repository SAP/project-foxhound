/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_cache.js */
/* import-globals-from head_cookies.js */
/* import-globals-from head_channels.js */

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

function makeChan(uri, loadingUrl) {
  let principal = Services.scriptSecurityManager.createContentPrincipal(
    Services.io.newURI(loadingUrl),
    {}
  );
  return NetUtil.newChannel({
    uri,
    loadingPrincipal: principal,
    securityFlags: Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_OTHER,
  });
}

class AuthPrompt {
  constructor() {
    this.QueryInterface = ChromeUtils.generateQI(["nsIAuthPrompt2"]);
  }
  asyncPromptAuth(channel, callback, context, encryptionLevel, authInfo) {
    executeSoon(function () {
      authInfo.username = "guest";
      authInfo.password = "guest";
      callback.onAuthAvailable(context, authInfo);
    });
  }
}

class AuthRequestor {
  constructor(prompt) {
    this.prompt = prompt;
    this.QueryInterface = ChromeUtils.generateQI(["nsIInterfaceRequestor"]);
  }
  getInterface(iid) {
    if (iid.equals(Ci.nsIAuthPrompt2)) {
      return this.prompt();
    }
    throw Components.Exception("", Cr.NS_ERROR_NO_INTERFACE);
  }
}

/**
 * Verify HTTP/2 auth retry behavior: the server issues two 401 challenges
 * and only returns 200 OK on the third request.
 *
 * This test ensures the channel performs two auth retries and succeeds on the
 * third attempt.
 *
 */
add_task(async function test_http2_auth_retry_twice() {
  Services.prefs.setIntPref("network.auth.subresource-http-auth-allow", 2);

  let server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.registerPathHandler("/test", (req, res) => {
    const hasAuth =
      typeof req.headers.authorization === "string" &&
      !!req.headers.authorization.length;
    global.count ??= 0;
    global.count++;
    if (!hasAuth || global.count < 3) {
      res.stream.respond({
        ":status": 401,
        "content-type": "text/plain; charset=utf-8",
        "www-authenticate": 'Basic realm="secret"',
      });
      res.end("Unauthorized\n");
      return;
    }

    res.stream.respond({
      ":status": 200,
      "content-type": "text/plain; charset=utf-8",
    });
    res.end("OK\n");
  });

  let chan = makeChan(
    `https://localhost:${server.port()}/test`,
    `https://localhost:${server.port()}`
  );
  chan.notificationCallbacks = new AuthRequestor(() => new AuthPrompt());

  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
  equal(req.QueryInterface(Ci.nsIHttpChannel).protocolVersion, "h2");
});
