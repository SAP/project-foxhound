/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/* Test that user-set metadata isn't lost on engine update */

"use strict";

const KEYWORD = "keyword";
let timerManager;

add_setup(async function () {
  let server = useHttpServer();
  server.registerContentType("sjs", "sjs");
  await Services.search.init();

  timerManager = Cc["@mozilla.org/updates/timer-manager;1"].getService(
    Ci.nsIUpdateTimerManager
  );
});

add_task(async function test_installEngine_with_updates_disabled() {
  const engineData = {
    baseURL: `${gHttpURL}/`,
    name: "test engine",
    method: "GET",
    updateFile: "opensearch/simple.xml",
  };

  Services.prefs.setBoolPref(SearchUtils.BROWSER_SEARCH_PREF + "update", false);
  Assert.ok(
    !("search-engine-update-timer" in timerManager.wrappedJSObject._timers),
    "Should not have registered the update timer already"
  );

  await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/sjs/engineMaker.sjs?${JSON.stringify(engineData)}`,
  });

  Assert.ok(
    Services.search.getEngineByName("test engine"),
    "Should have added the test engine."
  );
  Assert.ok(
    !("search-engine-update-timer" in timerManager.wrappedJSObject._timers),
    "Should have not registered the update timer when updates are disabled"
  );
});

add_task(async function test_installEngine_with_updates_enabled() {
  const engineData = {
    baseURL: `${gHttpURL}/`,
    name: "original engine",
    method: "GET",
    updateFile: "opensearch/simple.xml",
    imageURL: "data:image/png;base64,Zm9v", // engineMaker sets to te resolution to 16x16.
  };

  Services.prefs.setBoolPref(SearchUtils.BROWSER_SEARCH_PREF + "update", true);

  Assert.ok(
    !("search-engine-update-timer" in timerManager.wrappedJSObject._timers),
    "Should not have registered the update timer already"
  );

  let promiseIconChanged = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.ICON_CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  let engine = await SearchTestUtils.installOpenSearchEngine({
    url: `${gHttpURL}/sjs/engineMaker.sjs?${JSON.stringify(engineData)}`,
  });
  await promiseIconChanged;

  Assert.ok(
    "search-engine-update-timer" in timerManager.wrappedJSObject._timers,
    "Should have registered the update timer"
  );

  engine.alias = KEYWORD;
  await Services.search.moveEngine(engine, 0);

  Assert.ok(
    !!Services.search.getEngineByName("original engine"),
    "Should be able to get the engine by the original name"
  );
  Assert.ok(
    !Services.search.getEngineByName("simple"),
    "Should not be able to get the engine by the new name"
  );

  Assert.equal(
    await engine.getIconURL(16),
    "data:image/png;base64,Zm9v",
    "Has the original icon."
  );
});

add_task(async function test_engineUpdate() {
  const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

  let promiseUpdate = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );

  // set last update to 8 days ago, since the default interval is 7, then
  // trigger an update
  let engine = Services.search.getEngineByName("original engine");
  engine.wrappedJSObject.setAttr("updateexpir", Date.now() - ONE_DAY_IN_MS * 8);
  Services.search.QueryInterface(Ci.nsITimerCallback).notify(null);

  await promiseUpdate;

  Assert.equal(engine.name, "simple", "Should have updated the engine's name");

  Assert.equal(engine.alias, KEYWORD, "Should have kept the keyword");
  Assert.equal(
    engine.wrappedJSObject.getAttr("order"),
    1,
    "Should have kept the order"
  );

  Assert.ok(
    !!Services.search.getEngineByName("simple"),
    "Should be able to get the engine by the new name"
  );
  Assert.ok(
    !Services.search.getEngineByName("original engine"),
    "Should not be able to get the engine by the old name"
  );

  Assert.ok(
    (await engine.getIconURL(16)).startsWith("data:image/png;base64,iVBOR"),
    "Has the new icon."
  );
});
