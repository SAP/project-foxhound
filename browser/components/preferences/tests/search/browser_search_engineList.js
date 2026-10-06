/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// This tests the search engine list in about:preferences#search.

"use strict";

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);
const { SearchUtils } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/search/SearchUtils.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

SearchTestUtils.init(this);

const CONFIG = [
  { identifier: "engine1" },
  { identifier: "engine2" },
  {
    identifier: "de_only_engine",
    base: {
      urls: {
        search: {
          base: "https://moz.test/",
          searchTermParamName: "search",
        },
      },
    },
    variants: [
      {
        environment: { locales: ["de"] },
      },
    ],
  },
];

let userEngine;
let extensionEngine;
let installedEngines;
let userInstalledAppEngine;

function getCellText(tree, i, cellName) {
  return tree.view.getCellText(i, tree.columns.getNamedColumn(cellName));
}

async function engine_list_test(fn) {
  let task = async () => {
    let prefs = await openPreferencesViaOpenPreferencesAPI("search", {
      leaveOpen: true,
    });
    Assert.equal(
      prefs.selectedPane,
      "paneSearch",
      "Search pane is selected by default"
    );
    let doc = gBrowser.contentDocument;
    let engineList = doc.querySelector(
      SRD_PREF_VALUE ? "moz-box-group#engineList" : "#engineList"
    );
    Assert.ok(
      !engineList.hidden,
      "The search engine list should be visible when Search is requested"
    );
    // Scroll the engine list into view since mouse operations off screen can
    // act confusingly.
    engineList.scrollIntoView();
    await fn(engineList, doc);
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  };

  // Make sure the name of the passed function is used in logs.
  Object.defineProperty(task, "name", { value: fn.name });
  add_task(task);
}

async function selectEngine(tree, index) {
  let rect = tree.getCoordsForCellItem(
    index,
    tree.columns.getNamedColumn("engineName"),
    "text"
  );
  let x = rect.x + rect.width / 2;
  let y = rect.y + rect.height / 2;
  let promise = BrowserTestUtils.waitForEvent(tree, "click");
  EventUtils.synthesizeMouse(
    tree.body,
    x,
    y,
    { clickCount: 1 },
    tree.documentGlobal
  );
  return promise;
}

add_setup(async function () {
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
  installedEngines = await SearchService.getAppProvidedEngines();

  await SearchTestUtils.installSearchExtension({
    keyword: ["testing", "customkeyword"],
    search_url: "https://example.com/engine1",
    search_url_get_params: "search={searchTerms}",
    name: "Extension Engine",
  });
  extensionEngine = SearchService.getEngineByName("Extension Engine");
  installedEngines.push(extensionEngine);

  userEngine = await SearchService.addUserEngine({
    name: "User Engine",
    url: "https://example.com/user?q={searchTerms}&b=ff",
    alias: "u",
  });
  installedEngines.push(userEngine);

  userInstalledAppEngine =
    await SearchService.findContextualSearchEngineByHost("moz.test");

  await SearchService.addSearchEngine(userInstalledAppEngine);

  registerCleanupFunction(async () => {
    let leftover = SearchService.getEngineByName("User Engine");
    if (leftover) {
      await SearchService.removeEngine(leftover);
    }
  });
});

async function test_engine_list(engineList) {
  for (let i = 0; i < installedEngines.length; i++) {
    let engine = installedEngines[i];
    let row = engineList.children[i].lastChild;
    let displayedName = row.getAttribute("label");
    Assert.equal(
      displayedName,
      engine.name,
      "Search engine " + engine.name + " displayed correctly."
    );
  }
}

async function test_engine_list_legacy(tree) {
  let userEngineIndex = installedEngines.length - 1;
  for (let i = 0; i < installedEngines.length; i++) {
    let engine = installedEngines[i];
    Assert.equal(
      getCellText(tree, i, "engineName"),
      engine.name,
      "Search engine " + engine.name + " displayed correctly."
    );
    Assert.equal(
      tree.view.isEditable(i, tree.columns.getNamedColumn("engineName")),
      i == userEngineIndex,
      "Only user engine name is editable."
    );
  }
}

engine_list_test(SRD_PREF_VALUE ? test_engine_list : test_engine_list_legacy);

async function test_change_keyword(engineList) {
  let extensionEngineIndex = installedEngines.length - 2;
  let row = engineList.children[extensionEngineIndex].lastChild;
  let extensionEditBtn = row.children[0].children[0];

  Assert.equal(
    row.description,
    "testing, customkeyword",
    "Internal keywords are displayed."
  );

  // Open new subdialog and add "keyword" as the keyword.
  let promiseSubDialogLoaded = promiseLoadSubDialog(
    "chrome://browser/content/search/addEngine.xhtml"
  );
  extensionEditBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    extensionEditBtn,
    {},
    gBrowser.selectedBrowser.contentWindow
  );
  await promiseSubDialogLoaded;

  let prefsWin = gBrowser.selectedBrowser.contentWindow;
  let subDialog = prefsWin.gSubDialog;
  let dialogDoc = subDialog._topDialog._frame.contentDocument;

  let inputElem = dialogDoc.getElementById("engineAlias");
  let acceptBtn = dialogDoc.getElementById("add-engine-dialog")._buttons.accept;

  let keywordBefore = "keyword";
  inputElem.value = keywordBefore;
  inputElem.dispatchEvent(new Event("input", { bubbles: true }));
  acceptBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(acceptBtn, {}, dialogDoc.defaultView);

  // Open new subdialog and add "Keyword" as the keyword (note capitalization).
  promiseSubDialogLoaded = promiseLoadSubDialog(
    "chrome://browser/content/search/addEngine.xhtml"
  );
  extensionEditBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    extensionEditBtn,
    {},
    gBrowser.selectedBrowser.contentWindow
  );
  await promiseSubDialogLoaded;

  // Need to re-access things, as this is a new subdialog.
  dialogDoc = subDialog._topDialog._frame.contentDocument;
  inputElem = dialogDoc.getElementById("engineAlias");
  acceptBtn = dialogDoc.getElementById("add-engine-dialog")._buttons.accept;

  inputElem.value = "Keyword";
  inputElem.dispatchEvent(new Event("input", { bubbles: true }));
  acceptBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(acceptBtn, {}, dialogDoc.defaultView);
  await BrowserTestUtils.waitForCondition(
    () =>
      inputElem.parentElement.querySelector(".error-label").textContent !=
      "valid",
    "Wait for error label to appear"
  );
  let errorLabel =
    inputElem.parentElement.querySelector(".error-label").textContent;
  Assert.notEqual(
    errorLabel,
    "valid",
    "Should have an error message because of duplicate keywords"
  );
  Assert.ok(
    acceptBtn.disabled,
    "Should not be able to submit an invalid keyword"
  );

  // Open new subdialog and ensure keyword has not changed.
  promiseSubDialogLoaded = promiseLoadSubDialog(
    "chrome://browser/content/search/addEngine.xhtml"
  );
  extensionEditBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(
    extensionEditBtn,
    {},
    gBrowser.selectedBrowser.contentWindow
  );
  await promiseSubDialogLoaded;

  // Need to re-access things, as this is a new subdialog.
  dialogDoc = subDialog._topDialog._frame.contentDocument;
  inputElem = dialogDoc.getElementById("engineAlias");
  acceptBtn = dialogDoc.getElementById("add-engine-dialog")._buttons.accept;

  Assert.equal(
    inputElem.value,
    keywordBefore,
    "Should not have modified original keyword"
  );
}

async function test_change_keyword_legacy(tree) {
  let extensionEngineIndex = installedEngines.length - 2;
  Assert.equal(
    getCellText(tree, extensionEngineIndex, "engineKeyword"),
    "testing, customkeyword",
    "Internal keywords are displayed."
  );
  let rect = tree.getCoordsForCellItem(
    extensionEngineIndex,
    tree.columns.getNamedColumn("engineKeyword"),
    "text"
  );

  // Test editing keyword of extension engine because it
  // has user-defined and extension-provided keywords.
  let x = rect.x + rect.width / 2;
  let y = rect.y + rect.height / 2;
  let win = tree.documentGlobal;

  let promise = BrowserTestUtils.waitForEvent(tree, "dblclick");
  EventUtils.synthesizeMouse(tree.body, x, y, { clickCount: 1 }, win);
  EventUtils.synthesizeMouse(tree.body, x, y, { clickCount: 2 }, win);
  await promise;

  promise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  EventUtils.sendString("newkeyword");
  EventUtils.sendKey("RETURN");
  await promise;

  Assert.equal(
    getCellText(tree, extensionEngineIndex, "engineKeyword"),
    "newkeyword, testing, customkeyword",
    "User-defined keyword was added."
  );

  // Test duplicated keywords (different capitalization).
  tree.view.setCellText(
    0,
    tree.columns.getNamedColumn("engineKeyword"),
    "keyword"
  );
  await TestUtils.waitForTick();

  let keywordBefore = getCellText(tree, 1, "engineKeyword");
  let alertSpy = sinon.spy(win, "alert");
  tree.view.setCellText(
    1,
    tree.columns.getNamedColumn("engineKeyword"),
    "Keyword"
  );
  await TestUtils.waitForTick();

  Assert.ok(alertSpy.calledOnce, "Warning was shown.");
  Assert.equal(
    getCellText(tree, 1, "engineKeyword"),
    keywordBefore,
    "Did not modify keywords."
  );
  alertSpy.restore();
}

engine_list_test(
  SRD_PREF_VALUE ? test_change_keyword : test_change_keyword_legacy
);

engine_list_test(async function test_rename_engines(tree) {
  if (SRD_PREF_VALUE) {
    Assert.ok(true, "New settings redesign UI is enabled.");
    // Bail early, as this test doesn't apply to the redesigned settings.
    return;
  }

  // Test editing name of user search engine because
  // only the names of user engines can be edited.
  let userEngineIndex = installedEngines.length - 1;
  let rect = tree.getCoordsForCellItem(
    userEngineIndex,
    tree.columns.getNamedColumn("engineName"),
    "text"
  );
  let x = rect.x + rect.width / 2;
  let y = rect.y + rect.height / 2;
  let win = tree.documentGlobal;

  let promise = BrowserTestUtils.waitForEvent(tree, "dblclick");
  EventUtils.synthesizeMouse(tree.body, x, y, { clickCount: 1 }, win);
  EventUtils.synthesizeMouse(tree.body, x, y, { clickCount: 2 }, win);
  await promise;

  EventUtils.sendString("User Engine 2");
  promise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  EventUtils.sendKey("RETURN");
  await promise;

  Assert.equal(userEngine.name, "User Engine 2", "Engine was renamed.");

  // Avoid duplicated engine names.
  let alertSpy = sinon.spy(win, "alert");
  tree.view.setCellText(
    userEngineIndex,
    tree.columns.getNamedColumn("engineName"),
    "Extension Engine"
  );
  await TestUtils.waitForTick();

  Assert.ok(alertSpy.calledOnce, "Warning was shown.");
  Assert.equal(
    getCellText(tree, userEngineIndex, "engineName"),
    "User Engine 2",
    "Name was not modified."
  );

  alertSpy.restore();
});

engine_list_test(async function test_remove_button_disabled_state(tree, doc) {
  if (SRD_PREF_VALUE) {
    Assert.ok(true, "New settings redesign UI is enabled.");
    // Bail early, as this test doesn't apply to the redesigned settings.
    return;
  }

  let appProvidedEngines = await SearchService.getAppProvidedEngines();
  for (let i = 0; i < appProvidedEngines.length; i++) {
    let engine = appProvidedEngines[i];
    let isDefaultSearchEngine =
      engine.id == SearchService.defaultEngine.id ||
      engine.id == SearchService.defaultPrivateEngine.id;

    await selectEngine(tree, i);
    Assert.equal(
      doc.querySelector("#removeEngineButton").disabled,
      isDefaultSearchEngine,
      "Remove button is in correct disabled state."
    );
  }
});

async function test_remove_button_legacy(tree, doc) {
  let win = tree.documentGlobal;
  let alertSpy = sinon.stub(win, "alert");
  let removeBtn = doc.querySelector("#removeEngineButton");

  info("Removing user engine.");
  let userEngineIndex = installedEngines.findIndex(e => e.id == userEngine.id);
  await selectEngine(tree, userEngineIndex);

  let promptPromise = PromptTestUtils.handleNextPrompt(
    gBrowser.selectedBrowser,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 0 } // 0 = cancel, 1 = remove
  );
  let removedPromise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.REMOVED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );

  removeBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(removeBtn, {}, win);
  await promptPromise;
  let removedEngine = await removedPromise;
  Assert.equal(
    removedEngine.id,
    userEngine.id,
    "User engine was removed after a prompt."
  );

  // Re-fetch the engines since removing the user engine changed it.
  installedEngines = await SearchService.getEngines();

  info("Removing extension engine.");
  let extensionEngineIndex = installedEngines.findIndex(
    e => e.id == extensionEngine.id
  );
  await selectEngine(tree, extensionEngineIndex);

  removeBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(removeBtn, {}, win);
  await TestUtils.waitForCondition(() => alertSpy.calledOnce);
  Assert.ok(true, "Alert is shown when attempting to remove extension engine.");

  info("Removing user installed app engine.");
  let index = installedEngines.findIndex(
    e => e.id == userInstalledAppEngine.id
  );

  await selectEngine(tree, index);

  promptPromise = PromptTestUtils.handleNextPrompt(
    gBrowser.selectedBrowser,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick: 0 } // 0 = cancel, 1 = remove
  );
  removedPromise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.REMOVED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  removeBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(removeBtn, {}, win);
  await promptPromise;
  removedEngine = await removedPromise;
  Assert.equal(
    removedEngine.id,
    userInstalledAppEngine.id,
    "User installed app engine was removed after a prompt."
  );

  info("Removing (last) app provided engine.");
  let appProvidedEngines = await SearchService.getAppProvidedEngines();
  let lastAppEngine = appProvidedEngines[appProvidedEngines.length - 1];
  let lastAppEngineIndex = installedEngines.findIndex(
    e => e.id == lastAppEngine.id
  );
  await selectEngine(tree, lastAppEngineIndex);

  let defaultEngineDropdown = doc.getElementById("defaultEngineNormal");
  let includesLastAppEngine = () =>
    defaultEngineDropdown.options.some(opt => opt.value == lastAppEngine.id);
  // Validate that the engine is included in the dropdown before we remove it.
  Assert.ok(
    includesLastAppEngine(),
    "Last app-provided engine is included in the default engine dropdown."
  );

  let dropdownChanged = waitForSettingControlChange(defaultEngineDropdown);
  removeBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(removeBtn, {}, win);
  removedEngine = await SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.REMOVED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  Assert.equal(
    removedEngine.id,
    lastAppEngine.id,
    "Last app provided engine was removed without a prompt."
  );
  await dropdownChanged;
  // Last app-provided engine should be removed from the default engine
  // dropdown. (See bug 2007059)
  Assert.ok(
    !includesLastAppEngine(),
    "Last app-provided engine is not displayed in the default engine dropdown."
  );

  // Cleanup.
  alertSpy.restore();
  let updatedPromise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  let restoreBtn = doc.getElementById("restoreDefaultSearchEngines");
  restoreBtn.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(restoreBtn, {}, win);
  await updatedPromise;
  // The user engine is purposefully not re-added.
  // The extension engine is removed automatically on cleanup.
}

async function test_toggle_engine(engineList, doc) {
  let appProvidedEngines = await SearchService.getAppProvidedEngines();
  let defaultEngineId = SearchService.defaultEngine.id;
  let defaultPrivateEngineId = SearchService.defaultPrivateEngine?.id;
  let engineToHide = appProvidedEngines.find(
    e => e.id != defaultEngineId && e.id != defaultPrivateEngineId
  );
  let defaultEngineDropdown = doc.getElementById("defaultEngineNormal");
  let includesHiddenEngine = () =>
    defaultEngineDropdown.options.some(opt => opt.value == engineToHide.id);

  Assert.ok(
    engineToHide,
    "Found a non-default app-provided engine to hide via toggle."
  );
  registerCleanupFunction(() => {
    engineToHide.hidden = false;
  });
  // Validate that the engine is included in the dropdown before we toggle it off.
  Assert.ok(
    includesHiddenEngine(),
    "Non-default app-provided engine is included in the default engine dropdown."
  );

  info(`Hiding app-provided engine "${engineToHide.name}".`);
  let toggle = doc.getElementById(`toggleEngine-${engineToHide.id}`);
  let editButton = doc.getElementById(`editEngine-${engineToHide.id}`);
  Assert.ok(toggle.pressed, "Toggle is initially pressed (engine visible).");
  Assert.ok(
    !editButton.disabled,
    "Edit button is initially enabled (engine visible)."
  );

  let dropdownChanged = waitForSettingControlChange(defaultEngineDropdown);
  let changedPromise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  let editChanged = waitForSettingControlChange(editButton);

  toggle.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(toggle, {}, doc.defaultView);

  await changedPromise;
  Assert.ok(engineToHide.hidden, "Engine should be hidden after toggling off.");
  await dropdownChanged;
  // Hidden engines (i.e. app-provided engines not displayed in the UI) should
  // be removed from the default engine dropdown. (See bug 2007059)
  Assert.ok(
    !includesHiddenEngine(),
    "Hidden engine is not displayed in the default engine dropdown."
  );
  await editChanged;
  Assert.ok(
    editButton.disabled,
    "Edit button is disabled when engine is hidden."
  );

  info(
    `Re-show app-provided engine "${engineToHide.name}" when toggled back on.`
  );
  let dropdownRestored = waitForSettingControlChange(defaultEngineDropdown);
  let restoredPromise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  toggle.scrollIntoView();
  EventUtils.synthesizeMouseAtCenter(toggle, {}, doc.defaultView);
  await restoredPromise;
  Assert.ok(
    !engineToHide.hidden,
    "Engine should be visible again after toggling on."
  );
  await dropdownRestored;
  Assert.ok(
    includesHiddenEngine(),
    "Re-shown engine is included in the default engine dropdown again."
  );
  Assert.ok(
    !editButton.disabled,
    "Edit button becomes enabled again when engine is visible."
  );
}

engine_list_test(
  SRD_PREF_VALUE ? test_toggle_engine : test_remove_button_legacy
);

engine_list_test(
  async function test_no_toggle_for_non_config_engines(engineList, doc) {
    if (!SRD_PREF_VALUE) {
      Assert.ok(true, "Legacy settings UI has no per-engine toggle.");
      return;
    }

    Assert.equal(
      doc.getElementById(`toggleEngine-${userEngine.id}`),
      null,
      "User engine has no toggle."
    );
    Assert.ok(
      doc.getElementById(`deleteEngine-${userEngine.id}`),
      "User engine has a delete button instead."
    );

    Assert.equal(
      doc.getElementById(`toggleEngine-${extensionEngine.id}`),
      null,
      "Extension (addon) engine has no toggle."
    );
    Assert.equal(
      doc.getElementById(`deleteEngine-${extensionEngine.id}`),
      null,
      "Extension (addon) engine has no delete button."
    );
  }
);
