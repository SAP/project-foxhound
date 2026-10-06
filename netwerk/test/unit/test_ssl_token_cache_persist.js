/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests for Bug 2035453: SSLTokensCache persistence.
//
// Verifies that ssl_tokens_cache.bin is written to the profile directory
// for each of the three triggers:
//   1. "idle-daily"         — once-a-day write
//   2. "application-background" — Android backgrounding write
//   3. profile-before-change via AsyncShutdown — on-quit write
//
// network.ssl_tokens_cache_persistence is set in the toml [prefs] block.
// SSLTokensCache::Init() runs early (triggered by the IO service start in
// head.js) and the pref may still be false at that point.  Init() therefore
// only registers the profile-after-change observer unconditionally; the
// write observers (idle-daily, application-background) and the shutdown
// blocker are registered in Observe("profile-after-change"), which fires
// after prefs are fully applied.

"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
const { AsyncShutdown } = ChromeUtils.importESModule(
  "resource://gre/modules/AsyncShutdown.sys.mjs"
);

let gProfileDir = null;
let gCacheFile = null;

add_setup({ skip_if: () => AppConstants.MOZ_SYSTEM_NSS }, async () => {
  const { HttpServer } = ChromeUtils.importESModule(
    "resource://testing-common/httpd.sys.mjs"
  );

  // head_http3.js and head_trr.js call do_get_profile() at load time, setting
  // _profileInitialized = true.  A subsequent do_get_profile(true) early-
  // returns without firing profile-after-change.  Fire it explicitly so that
  // SSLTokensCache::Observe() sets mBackingFile and schedules the shutdown
  // blocker.
  gProfileDir = do_get_profile();
  gCacheFile = PathUtils.join(gProfileDir.path, "ssl_tokens_cache.bin");
  Services.obs.notifyObservers(
    null,
    "profile-after-change",
    "xpcshell-persist-test"
  );

  // Yield so async setup triggered by the profile-after-change handler
  // (background load, etc.) has a chance to execute.
  await new Promise(resolve => do_timeout(0, resolve));

  let httpServer = new HttpServer();
  httpServer.registerPathHandler("/", (req, resp) => {
    resp.setStatusLine(req.httpVersion, 200, "OK");
    resp.setHeader("Content-Type", "text/plain");
    resp.bodyOutputStream.write("OK", 2);
  });
  httpServer.start(-1);
  registerCleanupFunction(async () => httpServer.stop());

  await asyncSetupFaultyServer(httpServer);
});

// Makes one HTTPS connection to a FaultyServer host.  The first connection
// always succeeds and the server issues a NewSessionTicket (MOZ_TLS_SERVER_0RTT
// is set by asyncSetupFaultyServer), populating the in-memory cache.
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

// Polls until ssl_tokens_cache.bin appears (or the timeout is reached).
async function waitForCacheFile() {
  for (let i = 0; i < 50; i++) {
    if (await IOUtils.exists(gCacheFile)) {
      return true;
    }
    await new Promise(resolve => do_timeout(100, resolve));
  }
  return false;
}

// --- Test 1: idle-daily --------------------------------------------------

add_task(
  { skip_if: () => AppConstants.MOZ_SYSTEM_NSS },
  async function test_ssl_token_cache_written_on_idle_daily() {
    await makeConnection();
    await IOUtils.remove(gCacheFile, { ignoreAbsent: true });

    Services.obs.notifyObservers(null, "idle-daily");

    ok(
      await waitForCacheFile(),
      "ssl_tokens_cache.bin written after idle-daily"
    );
    const info = await IOUtils.stat(gCacheFile);
    Assert.greater(
      info.size,
      0,
      `cache file is non-empty (${info.size} bytes)`
    );
  }
);

// --- Test 2: application-background -------------------------------------

add_task(
  { skip_if: () => AppConstants.MOZ_SYSTEM_NSS },
  async function test_ssl_token_cache_written_on_application_background() {
    await makeConnection();
    await IOUtils.remove(gCacheFile, { ignoreAbsent: true });

    Services.obs.notifyObservers(null, "application-background");

    ok(
      await waitForCacheFile(),
      "ssl_tokens_cache.bin written after application-background"
    );
    const info = await IOUtils.stat(gCacheFile);
    Assert.greater(
      info.size,
      0,
      `cache file is non-empty (${info.size} bytes)`
    );
  }
);

// --- Test 3: profile-before-change (on-quit) ----------------------------

add_task(
  { skip_if: () => AppConstants.MOZ_SYSTEM_NSS },
  async function test_ssl_token_cache_written_on_quit() {
    await makeConnection();
    await IOUtils.remove(gCacheFile, { ignoreAbsent: true });

    // Simulate the profile-before-change shutdown phase.  The async shutdown
    // blocker registered by SSLTokensCache calls BlockShutdown, which
    // dispatches DoWrite(true) to the write task queue.  _trigger() awaits
    // all blockers, so when it resolves the write has completed.
    Services.prefs.setBoolPref("toolkit.asyncshutdown.testing", true);
    registerCleanupFunction(() =>
      Services.prefs.clearUserPref("toolkit.asyncshutdown.testing")
    );
    await AsyncShutdown.profileBeforeChange._trigger();

    ok(
      await IOUtils.exists(gCacheFile),
      "ssl_tokens_cache.bin written after profile-before-change"
    );
    const info = await IOUtils.stat(gCacheFile);
    Assert.greater(
      info.size,
      0,
      `cache file is non-empty (${info.size} bytes)`
    );
  }
);
