/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  RemoteRenderer: "resource://newtab/lib/RemoteRenderer.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
});

const TEST_BUNDLED_VERSION = "1.0.0";
const TEST_VERSION = "1.0.1";
const TEST_MANIFEST = JSON.stringify({
  version: TEST_VERSION,
  buildTime: "2026-03-10T00:00:00.000Z",
  file: "index.abc123.js",
  hash: "abc123",
  dataSchemaVersion: "1.2.1",
  cssFile: "renderer.def456.css",
});
const TEST_JS = "console.log('test js');";
const TEST_CSS = "body { color: red; }";

/**
 * Converts a string into an ArrayBuffer that can be streamed as an
 * nsIInputStream.
 *
 * @param {string} str
 * @returns {ArrayBuffer}
 */
function stringToArrayBuffer(str) {
  let encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Utility function to poke a fake renderer version into prefs to pretend like
 * it's the current available one. Does not actually write anything into the
 * cache.
 *
 * @param {string} version
 */
function setCachedVersionPref(version) {
  Services.prefs.setCharPref(
    "browser.newtabpage.activity-stream.remote-renderer.version",
    version
  );
}

add_task(async function test_updateAndReadCache() {
  info("RemoteRenderer should write and read manifest, JS, and CSS streams");

  let renderer = new RemoteRenderer();

  await renderer.updateFromRemoteSettings({
    manifest: stringToArrayBuffer(TEST_MANIFEST),
    js: stringToArrayBuffer(TEST_JS),
    css: stringToArrayBuffer(TEST_CSS),
    version: TEST_VERSION,
  });

  let manifestURI = renderer.makeManifestEntryURI(TEST_VERSION);
  let scriptURI = renderer.makeScriptEntryURI(TEST_VERSION);
  let styleURI = renderer.makeStyleEntryURI(TEST_VERSION);

  let [manifestEntry, scriptEntry, styleEntry] = await Promise.all([
    renderer.openCacheEntry(manifestURI),
    renderer.openCacheEntry(scriptURI),
    renderer.openCacheEntry(styleURI),
  ]);

  Assert.ok(manifestEntry, "Should have manifest entry");
  Assert.ok(scriptEntry, "Should have script entry");
  Assert.ok(styleEntry, "Should have style entry");

  Assert.equal(
    manifestEntry.getMetaDataElement("version"),
    TEST_VERSION,
    "Manifest version should match"
  );
  Assert.equal(
    scriptEntry.getMetaDataElement("version"),
    TEST_VERSION,
    "Script version should match"
  );
  Assert.equal(
    styleEntry.getMetaDataElement("version"),
    TEST_VERSION,
    "Style version should match"
  );

  let manifestStream = manifestEntry.openInputStream(0);
  let manifestData = await renderer.pumpInputStreamToString(manifestStream);
  Assert.equal(manifestData, TEST_MANIFEST, "Manifest content should match");

  let scriptStream = scriptEntry.openInputStream(0);
  let scriptData = await renderer.pumpInputStreamToString(scriptStream);
  Assert.equal(scriptData, TEST_JS, "JS content should match");

  let styleStream = styleEntry.openInputStream(0);
  let styleData = await renderer.pumpInputStreamToString(styleStream);
  Assert.equal(styleData, TEST_CSS, "CSS content should match");

  await renderer.resetCache();
});

add_task(async function test_incompleteCache() {
  info(
    "RemoteRenderer should handle cache with missing entries (not all three files present)"
  );

  let renderer = new RemoteRenderer();

  Services.prefs.clearUserPref(
    "browser.newtabpage.activity-stream.remote-renderer.version"
  );

  let manifestURI = renderer.makeManifestEntryURI(TEST_VERSION);
  let scriptURI = renderer.makeScriptEntryURI(TEST_VERSION);
  let styleURI = renderer.makeStyleEntryURI(TEST_VERSION);

  await Promise.all([
    renderer.doomCacheEntryOnShutdown(manifestURI),
    renderer.doomCacheEntryOnShutdown(scriptURI),
    renderer.doomCacheEntryOnShutdown(styleURI),
  ]);
  // Pretend that we've shutdown, to destroy these entries.
  renderer.onShutdown();

  await renderer.writeCacheEntry(
    scriptURI,
    stringToArrayBuffer(TEST_JS),
    TEST_VERSION
  );

  Services.prefs.setCharPref(
    "browser.newtabpage.activity-stream.remote-renderer.version",
    TEST_VERSION
  );

  let result = await renderer.assign();

  Assert.ok(
    !result.appProps.isCached,
    "Should fall back to bundled version when cache is incomplete"
  );

  await renderer.resetCache();
});

add_task(async function test_resetCache() {
  info(
    "RemoteRenderer.resetCache should clear prefs and scheduled cache entries to be doomed on shutdown"
  );

  let sandbox = sinon.createSandbox();
  let renderer = new RemoteRenderer();

  sandbox
    .stub(renderer.constructor, "BUNDLED_VERSION")
    .get(() => TEST_BUNDLED_VERSION);

  await renderer.updateFromRemoteSettings({
    manifest: stringToArrayBuffer(TEST_MANIFEST),
    js: stringToArrayBuffer(TEST_JS),
    css: stringToArrayBuffer(TEST_CSS),
    version: TEST_VERSION,
  });

  let versionPref = Services.prefs.getCharPref(
    "browser.newtabpage.activity-stream.remote-renderer.version",
    ""
  );
  Assert.equal(versionPref, TEST_VERSION, "Version pref should be set");

  let resultBefore = await renderer.assign();
  Assert.ok(
    resultBefore.appProps.isCached,
    "Should use cached version before reset"
  );

  let manifestURI = renderer.makeManifestEntryURI(TEST_VERSION);
  let scriptURI = renderer.makeScriptEntryURI(TEST_VERSION);
  let styleURI = renderer.makeStyleEntryURI(TEST_VERSION);

  Assert.ok(
    !renderer.willDoomOnShutdown(manifestURI),
    "Not yet scheduled to doom the manifest entry"
  );
  Assert.ok(
    !renderer.willDoomOnShutdown(scriptURI),
    "Not yet scheduled to doom the script entry"
  );
  Assert.ok(
    !renderer.willDoomOnShutdown(styleURI),
    "Not yet scheduled to doom the style entry"
  );

  await renderer.resetCache();

  versionPref = Services.prefs.getCharPref(
    "browser.newtabpage.activity-stream.remote-renderer.version",
    ""
  );
  Assert.equal(versionPref, "", "Version pref should be cleared after reset");

  Assert.ok(
    renderer.willDoomOnShutdown(manifestURI),
    "Scheduled to doom the manifest entry"
  );
  Assert.ok(
    renderer.willDoomOnShutdown(scriptURI),
    "Scheduled to doom the script entry"
  );
  Assert.ok(
    renderer.willDoomOnShutdown(styleURI),
    "Scheduled to doom the style entry"
  );

  let resultAfter = await renderer.assign();
  Assert.ok(
    !resultAfter.appProps.isCached,
    "Should fall back to bundled version after reset"
  );

  sandbox.restore();
});

add_task(async function test_emptyCacheBehavior() {
  info(
    "RemoteRenderer should fall back to bundled version when cache is empty"
  );

  let renderer = new RemoteRenderer();

  await renderer.resetCache();

  let result = await renderer.assign();

  Assert.ok(result, "Should return result");
  Assert.ok(result.appProps, "Should have appProps");
  Assert.equal(
    result.appProps.isCached,
    false,
    "Should not be using cached version"
  );
  Assert.ok(result.appProps.manifest, "Should have a manifest");
});

add_task(async function test_metadataTimestamp() {
  info("RemoteRenderer should store timestamp metadata");

  let renderer = new RemoteRenderer();

  let beforeWrite = Date.now();

  await renderer.updateFromRemoteSettings({
    manifest: stringToArrayBuffer(TEST_MANIFEST),
    js: stringToArrayBuffer(TEST_JS),
    css: stringToArrayBuffer(TEST_CSS),
    version: TEST_VERSION,
  });

  let afterWrite = Date.now();

  let scriptURI = renderer.makeScriptEntryURI(TEST_VERSION);
  let scriptEntry = await renderer.openCacheEntry(scriptURI);

  Assert.ok(scriptEntry, "Cache entry should exist");

  let timestamp = parseInt(scriptEntry.getMetaDataElement("timestamp"), 10);

  Assert.ok(
    timestamp >= beforeWrite && timestamp <= afterWrite,
    "Timestamp should be within write window"
  );

  await renderer.resetCache();
});

add_task(async function test_streamReusability() {
  info("Cache entries should allow opening multiple input streams");

  let renderer = new RemoteRenderer();

  await renderer.updateFromRemoteSettings({
    manifest: stringToArrayBuffer(TEST_MANIFEST),
    js: stringToArrayBuffer(TEST_JS),
    css: stringToArrayBuffer(TEST_CSS),
    version: TEST_VERSION,
  });

  let scriptURI = renderer.makeScriptEntryURI(TEST_VERSION);
  let scriptEntry = await renderer.openCacheEntry(scriptURI);

  Assert.ok(scriptEntry, "Cache entry should exist");

  let firstStream = scriptEntry.openInputStream(0);
  let firstRead = await renderer.pumpInputStreamToString(firstStream);
  Assert.equal(firstRead, TEST_JS, "First read should match");

  let secondStream = scriptEntry.openInputStream(0);
  let secondRead = await renderer.pumpInputStreamToString(secondStream);
  Assert.equal(secondRead, TEST_JS, "Second read should match");

  await renderer.resetCache();
});

add_task(async function test_versionedURIs() {
  info("RemoteRenderer should use version-based cache URIs");

  let renderer = new RemoteRenderer();

  let version1 = "1.0.0";
  let version2 = "2.0.0";

  let manifestURI1 = renderer.makeManifestEntryURI(version1);
  let manifestURI2 = renderer.makeManifestEntryURI(version2);

  Assert.notEqual(
    manifestURI1.spec,
    manifestURI2.spec,
    "Different versions should produce different URIs"
  );
  Assert.ok(manifestURI1.spec.includes(version1), "URI should contain version");

  let scriptURI1 = renderer.makeScriptEntryURI(version1);
  let scriptURI2 = renderer.makeScriptEntryURI(version2);

  Assert.notEqual(
    scriptURI1.spec,
    scriptURI2.spec,
    "Different versions should produce different script URIs"
  );

  let styleURI1 = renderer.makeStyleEntryURI(version1);
  let styleURI2 = renderer.makeStyleEntryURI(version2);

  Assert.notEqual(
    styleURI1.spec,
    styleURI2.spec,
    "Different versions should produce different style URIs"
  );
});

add_task(async function test_shutdownObserver() {
  info("RemoteRenderer should observer the quit topic");

  let sandbox = sinon.createSandbox();
  let renderer = new RemoteRenderer();
  sandbox.stub(renderer, "onShutdown");

  Services.obs.notifyObservers(null, "quit-application-granted");
  Assert.ok(
    renderer.onShutdown.calledOnce,
    "quit-application-granted caused onShutdown to be called"
  );
  sandbox.restore();
});

add_task(async function test_higher_bundled_version() {
  info(
    "RemoteRenderer should prefer the bundled version when its version number is higher than the cache."
  );

  let sandbox = sinon.createSandbox();
  let renderer = new RemoteRenderer();
  sandbox.stub(RemoteRenderer, "BUNDLED_VERSION").get(() => "1.0.1");
  setCachedVersionPref("1.0.0");

  sandbox.stub(renderer, "makeManifestEntryURI");
  sandbox.stub(renderer, "makeScriptEntryURI");
  sandbox.stub(renderer, "makeStyleEntryURI");

  sandbox.spy(renderer, "resetCache");
  let result = await renderer.assign();

  Assert.ok(
    !result.appProps.isCached,
    "Should use the bundled version when cache has a lower version number"
  );
  Assert.ok(
    renderer.resetCache.calledOnce,
    "We should have cleared the cache once we realized the bundled renderer " +
      "had a higher version"
  );

  sandbox.restore();
});

add_task(async function test_revalidate_on_calling_assign() {
  info("RemoteRenderer should attempt to revalidate after calling assign.");

  let sandbox = sinon.createSandbox();
  // We override this first because this static getter is read on
  // RemoteRenderer construction to set up the DeferredTask delay.
  sandbox.stub(RemoteRenderer, "REVALIDATION_DEBOUNCE_RATE_MS").get(() => 0);

  let renderer = new RemoteRenderer();
  sandbox.stub(renderer, "maybeRevalidate");

  await renderer.assign();
  await TestUtils.waitForCondition(() => {
    return renderer.maybeRevalidate.calledOnce;
  }, "Should call maybeRevalidate after assign");

  sandbox.restore();
});
