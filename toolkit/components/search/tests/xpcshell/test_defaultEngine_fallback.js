/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This test is checking the fallbacks when an engine that is default is
 * removed or hidden.
 *
 * The fallback procedure is:
 *
 * - Region/Locale default (if visible)
 * - First visible engine
 * - If no other visible engines, unhide the region/locale default and use it.
 */

let appDefault;
let appPrivateDefault;

const CONFIG = [
  { identifier: "default", base: { classification: "unknown" } },
  { identifier: "defaultPrivate", base: { classification: "unknown" } },
  { identifier: "generalEngine", base: { classification: "general" } },
  { identifier: "otherEngine", base: { classification: "unknown" } },
  {
    globalDefault: "default",
    globalDefaultPrivate: "defaultPrivate",
  },
];

add_setup(async function () {
  useHttpServer();
  SearchTestUtils.setRemoteSettingsConfig(CONFIG);

  Services.prefs.setCharPref(SearchUtils.BROWSER_SEARCH_PREF + "region", "US");
  Services.prefs.setBoolPref(
    SearchUtils.BROWSER_SEARCH_PREF + "separatePrivateDefault.ui.enabled",
    true
  );
  Services.prefs.setBoolPref(
    SearchUtils.BROWSER_SEARCH_PREF + "separatePrivateDefault",
    true
  );

  appDefault = await SearchService.getDefault();
  appPrivateDefault = await SearchService.getDefaultPrivate();
});

function getDefault(privateMode) {
  return privateMode
    ? SearchService.getDefaultPrivate()
    : SearchService.getDefault();
}

function setDefault(privateMode, engine) {
  return privateMode
    ? SearchService.setDefaultPrivate(
        engine,
        SearchService.CHANGE_REASON.UNKNOWN
      )
    : SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);
}

async function checkFallbackDefaultRegion(checkPrivate) {
  let defaultEngine = checkPrivate ? appPrivateDefault : appDefault;
  let expectedDefaultNotification = checkPrivate
    ? SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE
    : SearchUtils.MODIFIED_TYPE.DEFAULT;
  SearchService.restoreDefaultEngines();

  let otherEngine = SearchService.getEngineByName("otherEngine");
  await setDefault(checkPrivate, otherEngine);

  Assert.notEqual(
    otherEngine,
    defaultEngine,
    "Sanity check engines are different"
  );

  const observer = new SearchObserver([
    [expectedDefaultNotification, defaultEngine.name],
    [
      // For hiding (removing) the engine.
      SearchUtils.MODIFIED_TYPE.CHANGED,
      otherEngine.name,
    ],
    [SearchUtils.MODIFIED_TYPE.REMOVED, otherEngine.name],
  ]);

  await SearchService.removeEngine(otherEngine);

  await observer.promise;

  Assert.ok(otherEngine.hidden, "Should have hidden the removed engine");
  Assert.equal(
    (await getDefault(checkPrivate)).name,
    defaultEngine.name,
    "Should have reverted the defaultEngine to the region default"
  );
}

add_task(async function test_default_fallback_to_region_default() {
  await checkFallbackDefaultRegion(false);
});

add_task(async function test_default_private_fallback_to_region_default() {
  await checkFallbackDefaultRegion(true);
});

async function checkFallbackFirstVisible(checkPrivate) {
  let defaultEngine = checkPrivate ? appPrivateDefault : appDefault;
  let expectedDefaultNotification = checkPrivate
    ? SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE
    : SearchUtils.MODIFIED_TYPE.DEFAULT;
  SearchService.restoreDefaultEngines();

  let otherEngine = SearchService.getEngineByName("otherEngine");
  await setDefault(checkPrivate, otherEngine);
  await SearchService.removeEngine(defaultEngine);

  Assert.notEqual(
    otherEngine,
    defaultEngine,
    "Sanity check engines are different"
  );

  const observer = new SearchObserver([
    [expectedDefaultNotification, "generalEngine"],
    [SearchUtils.MODIFIED_TYPE.CHANGED, otherEngine.name],
    [SearchUtils.MODIFIED_TYPE.REMOVED, otherEngine.name],
  ]);

  await SearchService.removeEngine(otherEngine);

  await observer.promise;

  Assert.equal(
    (await getDefault(checkPrivate)).name,
    "generalEngine",
    "Should have set the default engine to the first visible general engine"
  );
}

add_task(async function test_default_fallback_to_first_gen_visible() {
  await checkFallbackFirstVisible(false);
});

add_task(async function test_default_private_fallback_to_first_gen_visible() {
  await checkFallbackFirstVisible(true);
});

// Removing all visible engines affects both the default and private default
// engines.
add_task(async function test_default_fallback_when_no_others_visible() {
  // Remove all but one of the visible engines.
  let visibleEngines = await SearchService.getVisibleEngines();
  for (let i = 0; i < visibleEngines.length - 1; i++) {
    await SearchService.removeEngine(visibleEngines[i]);
  }
  Assert.equal(
    (await SearchService.getVisibleEngines()).length,
    1,
    "Should only have one visible engine"
  );

  let lastEngine = visibleEngines.at(-1);

  const observer = new SearchObserver([
    // Unhiding of the default engine.
    [SearchUtils.MODIFIED_TYPE.CHANGED, appDefault.name],
    // Change of the default.
    [SearchUtils.MODIFIED_TYPE.DEFAULT, appDefault.name],
    // Unhiding of the default private.
    [SearchUtils.MODIFIED_TYPE.CHANGED, appPrivateDefault.name],
    [SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE, appPrivateDefault.name],
    // Hiding the engine.
    [SearchUtils.MODIFIED_TYPE.CHANGED, lastEngine.name],
    [SearchUtils.MODIFIED_TYPE.REMOVED, lastEngine.name],
  ]);

  // Now remove the last engine, which should set the new default.
  await SearchService.removeEngine(visibleEngines[visibleEngines.length - 1]);

  await observer.promise;

  Assert.equal(
    (await getDefault(false)).name,
    appDefault.name,
    "Should fallback to the app default engine after removing all engines"
  );
  Assert.equal(
    (await getDefault(true)).name,
    appPrivateDefault.name,
    "Should fallback to the app default private engine after removing all engines"
  );
  Assert.ok(
    !appPrivateDefault.hidden,
    "Should have unhidden the app default private engine"
  );
  Assert.equal(
    (await SearchService.getVisibleEngines()).length,
    2,
    "Should now have two engines visible"
  );
});

add_task(async function test_default_fallback_remove_default_no_visible() {
  // Remove all but the default engine.

  await SearchService.setDefaultPrivate(
    SearchService.defaultEngine,
    SearchService.CHANGE_REASON.UNKNOWN
  );
  let visibleEngines = await SearchService.getVisibleEngines();
  for (let engine of visibleEngines) {
    if (engine.name != appDefault.name) {
      await SearchService.removeEngine(engine);
    }
  }
  Assert.equal(
    (await SearchService.getVisibleEngines()).length,
    1,
    "Should only have one visible engine"
  );

  const observer = new SearchObserver([
    // Unhiding of the default engine.
    [SearchUtils.MODIFIED_TYPE.CHANGED, "generalEngine"],
    // Change of the default.
    [SearchUtils.MODIFIED_TYPE.DEFAULT, "generalEngine"],
    [SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE, "generalEngine"],
    // Hiding the engine.
    [SearchUtils.MODIFIED_TYPE.CHANGED, appDefault.name],
    [SearchUtils.MODIFIED_TYPE.REMOVED, appDefault.name],
  ]);

  // Now remove the last engine, which should set the new default.
  await SearchService.removeEngine(appDefault);

  await observer.promise;

  Assert.equal(
    (await getDefault(false)).name,
    "generalEngine",
    "Should fallback the default engine to the first general search engine"
  );
  Assert.equal(
    (await getDefault(true)).name,
    "generalEngine",
    "Should fallback the default private engine to the first general search engine"
  );
  Assert.ok(
    !SearchService.getEngineByName("generalEngine").hidden,
    "Should have unhidden the new engine"
  );
  Assert.equal(
    (await SearchService.getVisibleEngines()).length,
    1,
    "Should now have one engines visible"
  );
});

add_task(
  async function test_default_fallback_remove_default_no_visible_or_general() {
    SearchService.restoreDefaultEngines();

    // For this test, we need to change any general search engines to unknown,
    // so that we can test what happens in the unlikely event that there are no
    // general search engines.
    let searchConfig = structuredClone(CONFIG);
    for (let entry of searchConfig) {
      if (entry.base?.classification == "general") {
        entry.base.classification = "unknown";
      }
    }
    SearchTestUtils.setRemoteSettingsConfig(searchConfig);
    SearchService.reset();
    await SearchService.init();

    appPrivateDefault = await SearchService.getDefaultPrivate();

    await SearchService.setDefault(
      appPrivateDefault,
      SearchService.CHANGE_REASON.UNKNOWN
    );

    // Remove all but the default engine.
    let visibleEngines = await SearchService.getVisibleEngines();
    for (let engine of visibleEngines) {
      if (engine.name != appPrivateDefault.name) {
        await SearchService.removeEngine(engine);
      }
    }
    Assert.deepEqual(
      (await SearchService.getVisibleEngines()).map(e => e.name),
      appPrivateDefault.name,
      "Should only have one visible engine"
    );

    const observer = new SearchObserver([
      // Unhiding of the default engine.
      [SearchUtils.MODIFIED_TYPE.CHANGED, "default"],
      // Change of the default.
      [SearchUtils.MODIFIED_TYPE.DEFAULT, "default"],
      [SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE, "default"],
      // Hiding the engine.
      [SearchUtils.MODIFIED_TYPE.CHANGED, appPrivateDefault.name],
      [SearchUtils.MODIFIED_TYPE.REMOVED, appPrivateDefault.name],
    ]);

    // Now remove the last engine, which should set the new default.
    await SearchService.removeEngine(appPrivateDefault);

    await observer.promise;

    Assert.equal(
      (await getDefault(false)).name,
      "default",
      "Should fallback to the first engine that isn't a general search engine"
    );
    Assert.equal(
      (await getDefault(true)).name,
      "default",
      "Should fallback the private engine to the first engine that isn't a general search engine"
    );
    Assert.ok(
      !SearchService.getEngineByName("default").hidden,
      "Should have unhidden the new engine"
    );
    Assert.equal(
      (await SearchService.getVisibleEngines()).length,
      1,
      "Should now have one engines visible"
    );
  }
);

// Test the other remove engine route - for removing non-application provided
// engines.

async function checkNonBuiltinFallback(checkPrivate) {
  let defaultEngine = checkPrivate ? appPrivateDefault : appDefault;
  let expectedDefaultNotification = checkPrivate
    ? SearchUtils.MODIFIED_TYPE.DEFAULT_PRIVATE
    : SearchUtils.MODIFIED_TYPE.DEFAULT;
  SearchService.restoreDefaultEngines();

  let addedEngine = await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/opensearch/generic2.xml`,
  });

  await setDefault(checkPrivate, addedEngine);

  const observer = new SearchObserver([
    [expectedDefaultNotification, defaultEngine.name],
    [SearchUtils.MODIFIED_TYPE.REMOVED, addedEngine.name],
  ]);

  // Remove the current engine...
  await SearchService.removeEngine(addedEngine);

  // ... and verify we've reverted to the normal default engine.
  Assert.equal(
    (await getDefault(checkPrivate)).name,
    defaultEngine.name,
    "Should revert to the app default engine"
  );

  await observer.promise;
}

add_task(async function test_default_fallback_non_builtin() {
  await checkNonBuiltinFallback(false);
});

add_task(async function test_default_fallback_non_builtin_private() {
  await checkNonBuiltinFallback(true);
});
