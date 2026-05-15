/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);

SearchTestUtils.init(this);

add_setup(async function () {
  await SearchTestUtils.installSearchExtension({
    name: "engine1",
    search_url: "https://example.com/engine1",
    search_url_get_params: "search={searchTerms}",
  });
  await SearchTestUtils.installSearchExtension({
    name: "engine2",
    search_url: "https://example.com/engine2",
    search_url_get_params: "search={searchTerms}",
  });

  const defaultEngine = await SearchService.getDefault();
  const defaultPrivateEngine = await SearchService.getDefaultPrivate();

  registerCleanupFunction(async () => {
    await SearchService.setDefault(
      defaultEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
    await SearchService.setDefaultPrivate(
      defaultPrivateEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
  });
});

add_task(async function test_openWithPrivateDefaultNotEnabledFirst() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.separatePrivateDefault.ui.enabled", false],
      ["browser.search.separatePrivateDefault", false],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  const doc = gBrowser.selectedBrowser.contentDocument;
  const separateEngineCheckbox = doc.getElementById(
    "browserSeparateDefaultEngine"
  ).parentElement;
  const privateDefaultDropdown = doc.getElementById("defaultPrivateEngine");

  Assert.ok(
    separateEngineCheckbox.hidden,
    "Should have hidden the separate search engine checkbox"
  );
  Assert.ok(
    separateEngineCheckbox.hidden &&
      separateEngineCheckbox.contains(privateDefaultDropdown),
    "Should have hidden the private engine selection box"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.separatePrivateDefault.ui.enabled", true]],
  });

  Assert.ok(
    !separateEngineCheckbox.hidden,
    "Should have displayed the separate search engine checkbox"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(privateDefaultDropdown),
    "Private engine selection box should be visible"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.separatePrivateDefault", true]],
  });

  Assert.ok(
    !separateEngineCheckbox.hidden,
    "Should still be displaying the separate search engine checkbox"
  );
  Assert.ok(
    !privateDefaultDropdown.disabled,
    "Private engine selection box should be enabled"
  );

  gBrowser.removeCurrentTab();
});

add_task(async function test_openWithPrivateDefaultEnabledFirst() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.separatePrivateDefault.ui.enabled", true],
      ["browser.search.separatePrivateDefault", true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  const doc = gBrowser.selectedBrowser.contentDocument;
  const separateEngineCheckbox = doc.getElementById(
    "browserSeparateDefaultEngine"
  ).parentElement;
  const privateDefaultDropdown = doc.getElementById("defaultPrivateEngine");

  Assert.ok(
    !separateEngineCheckbox.hidden,
    "Should not have hidden the separate search engine checkbox"
  );
  Assert.ok(
    !privateDefaultDropdown.shadowRoot.getElementById("input").disabled,
    "Private engine selection box should be enabled"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.separatePrivateDefault", false]],
  });

  Assert.ok(
    !separateEngineCheckbox.hidden,
    "Should not have hidden the separate search engine checkbox"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(privateDefaultDropdown),
    "Private engine selection box should be visible"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.separatePrivateDefault.ui.enabled", false]],
  });

  Assert.ok(
    separateEngineCheckbox.hidden,
    "Should have hidden the separate private engine checkbox"
  );
  Assert.ok(
    separateEngineCheckbox.hidden &&
      separateEngineCheckbox.contains(privateDefaultDropdown),
    "Should have hidden the private engine selection box"
  );

  gBrowser.removeCurrentTab();
});

add_task(async function test_separatePrivateDefault() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.separatePrivateDefault.ui.enabled", true],
      ["browser.search.separatePrivateDefault", false],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  const doc = gBrowser.selectedBrowser.contentDocument;
  const separateEngineCheckbox = doc.getElementById(
    "browserSeparateDefaultEngine"
  );
  const privateDefaultDropdown = doc.getElementById("defaultPrivateEngine");

  Assert.ok(
    BrowserTestUtils.isVisible(privateDefaultDropdown),
    "Private engine selection box should be visible"
  );

  separateEngineCheckbox.click();
  await separateEngineCheckbox.parentElement.updateComplete;

  Assert.ok(
    Services.prefs.getBoolPref("browser.search.separatePrivateDefault"),
    "Should have correctly set the pref"
  );
  Assert.ok(
    !privateDefaultDropdown.shadowRoot.getElementById("input").disabled,
    "Private engine selection box should be enabled"
  );

  separateEngineCheckbox.click();
  await separateEngineCheckbox.parentElement.updateComplete;

  Assert.ok(
    !Services.prefs.getBoolPref("browser.search.separatePrivateDefault"),
    "Should have correctly turned the pref off"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(privateDefaultDropdown),
    "Private engine selection box should be visible"
  );

  gBrowser.removeCurrentTab();
});

async function setDefaultEngine(
  testPrivate,
  currentEngineName,
  expectedEngineName
) {
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });

  const doc = gBrowser.selectedBrowser.contentDocument;
  const input = doc.getElementById(
    testPrivate ? "defaultPrivateEngine" : "defaultEngineNormal"
  );
  const defaultEngineSelector = input.inputEl;
  const defaultEngineTrigger = input.shadowRoot.querySelector(".panel-trigger");

  Assert.ok(
    defaultEngineSelector.value.startsWith(currentEngineName),
    "Should have the correct engine as default on first open"
  );

  const popupShown = BrowserTestUtils.waitForEvent(
    defaultEngineSelector,
    "shown"
  );
  EventUtils.synthesizeMouseAtCenter(
    defaultEngineTrigger,
    {},
    defaultEngineTrigger.ownerGlobal
  );
  await popupShown;

  const items = Array.from(defaultEngineSelector.children);
  const engine2Item = items.find(item =>
    item.textContent.includes(expectedEngineName)
  );

  const defaultChanged = SearchTestUtils.promiseSearchNotification(
    testPrivate ? "engine-default-private" : "engine-default",
    "browser-search-engine-modified"
  );
  // Waiting for popupHiding here seemed to cause a race condition, however
  // as we're really just interested in the notification, we'll just use
  // that here.
  EventUtils.synthesizeMouseAtCenter(engine2Item, {}, engine2Item.ownerGlobal);
  await defaultChanged;

  const newDefault = testPrivate
    ? await SearchService.getDefaultPrivate()
    : await SearchService.getDefault();
  Assert.equal(
    newDefault.name,
    expectedEngineName,
    "Should have changed the default engine to engine2"
  );
}

add_task(async function test_setDefaultEngine() {
  const engine1 = SearchService.getEngineByName("engine1");

  // Set an initial default so we have a known engine.
  await SearchService.setDefault(engine1, SearchService.CHANGE_REASON.UNKNOWN);

  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await setDefaultEngine(false, "engine1", "engine2");

  let snapshot = Glean.searchEngineDefault.changed.testGetValue();
  delete snapshot[0].timestamp;
  Assert.deepEqual(
    snapshot[0],
    {
      category: "search.engine.default",
      name: "changed",
      extra: {
        change_reason: "user",
        previous_engine_id: engine1.telemetryId,
        new_engine_id: "other-engine2",
        new_display_name: "engine2",
        new_load_path: "[addon]engine2@tests.mozilla.org",
        new_submission_url: "",
      },
    },
    "Should have received the correct event details"
  );

  gBrowser.removeCurrentTab();
});

add_task(async function test_setPrivateDefaultEngine() {
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.separatePrivateDefault.ui.enabled", true],
      ["browser.search.separatePrivateDefault", true],
    ],
  });

  const engine2 = SearchService.getEngineByName("engine2");

  // Set an initial default so we have a known engine.
  await SearchService.setDefaultPrivate(
    engine2,
    SearchService.CHANGE_REASON.UNKNOWN
  );

  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await setDefaultEngine(true, "engine2", "engine1");

  let snapshot = Glean.searchEnginePrivate.changed.testGetValue();
  delete snapshot[0].timestamp;
  console.log(snapshot);
  Assert.deepEqual(
    snapshot[0],
    {
      category: "search.engine.private",
      name: "changed",
      extra: {
        change_reason: "user",
        previous_engine_id: engine2.telemetryId,
        new_engine_id: "other-engine1",
        new_display_name: "engine1",
        new_load_path: "[addon]engine1@tests.mozilla.org",
        new_submission_url: "",
      },
    },
    "Should have received the correct event details"
  );

  gBrowser.removeCurrentTab();
});
