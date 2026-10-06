/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests for Bug 2040637: SSLTokensCache persistence teardown.
//
// The toml [prefs] block sets network.ssl_tokens_cache_persistence=true so
// Init() sets up persistence (write observers, mBackingFile, etc.).  The
// test then sets the pref to false *before* firing profile-after-change,
// simulating a user whose user.js disables the pref.  The handler must
// tear down persistence so no cache file is written on idle-daily.

"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

let gProfileDir = null;
let gCacheFile = null;

add_setup({ skip_if: () => AppConstants.MOZ_SYSTEM_NSS }, async () => {
  const { HttpServer } = ChromeUtils.importESModule(
    "resource://testing-common/httpd.sys.mjs"
  );

  gProfileDir = do_get_profile();
  gCacheFile = PathUtils.join(gProfileDir.path, "ssl_tokens_cache.bin");

  // Disable persistence *before* profile-after-change fires, simulating
  // a user.js override that is applied after Init() but before
  // profile-after-change.
  Services.prefs.setBoolPref("network.ssl_tokens_cache_persistence", false);

  Services.obs.notifyObservers(
    null,
    "profile-after-change",
    "xpcshell-persist-disabled-test"
  );

  await new Promise(resolve => do_timeout(0, resolve));

  let httpServer = new HttpServer();
  httpServer.registerPathHandler("/", (req, resp) => {
    resp.setStatusLine(req.httpVersion, 200, "OK");
    resp.setHeader("Content-Type", "text/plain");
    resp.bodyOutputStream.write("OK", 2);
  });
  httpServer.start(-1);
  registerCleanupFunction(async () => {
    await httpServer.stop();
    Services.prefs.clearUserPref("network.ssl_tokens_cache_persistence");
  });

  await asyncSetupFaultyServer(httpServer);
});

async function makeConnection() {
  const kHost = "decrypt-error-on-resume.example.com";
  Services.prefs.setCharPref("network.dns.localDomains", kHost);
  registerCleanupFunction(() =>
    Services.prefs.clearUserPref("network.dns.localDomains")
  );
  let chan = makeChan(`https://${kHost}:8443/`);
  let [, buf] = await channelOpenPromise(chan, CL_ALLOW_UNKNOWN_CL);
  ok(buf, "connection succeeded and NewSessionTicket was issued");
}

add_task(
  { skip_if: () => AppConstants.MOZ_SYSTEM_NSS },
  async function test_ssl_token_cache_not_written_when_pref_disabled() {
    await makeConnection();
    await IOUtils.remove(gCacheFile, { ignoreAbsent: true });

    Services.obs.notifyObservers(null, "idle-daily");

    // Give any async write a chance to complete.
    await new Promise(resolve => do_timeout(500, resolve));

    ok(
      !(await IOUtils.exists(gCacheFile)),
      "ssl_tokens_cache.bin must NOT be written when pref is disabled"
    );
  }
);
