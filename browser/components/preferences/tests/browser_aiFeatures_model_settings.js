/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(3);
describe("Smart Window model settings", () => {
  let doc, win;

  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.preferences.aiControls", true],
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.tos.consentTime", 1770830464],
      ],
    });
  });

  afterEach(async () => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);

    // Clean up prefs that changed by tests
    Services.prefs.clearUserPref("browser.smartwindow.apiKey");
    Services.prefs.clearUserPref("browser.smartwindow.endpoint");
    Services.prefs.clearUserPref("browser.smartwindow.firstrun.modelChoice");
    Services.prefs.clearUserPref("browser.smartwindow.model");
    Services.prefs.clearUserPref("browser.smartwindow.preferences.endpoint");

    await SpecialPowers.popPrefEnv();
  });

  async function openPreferencesPage() {
    await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
    doc = gBrowser.selectedBrowser.contentDocument;
    win = doc.ownerGlobal;
  }

  async function openSmartWindowPanel() {
    await openPreferencesPage();

    const paneLoaded = waitForPaneChange("ai");
    const categoryButton = doc.getElementById("category-ai-features");
    categoryButton.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(categoryButton, {}, win);
    await paneLoaded;

    const personalizeButton = doc.getElementById(
      "personalizeSmartWindowButton"
    );
    personalizeButton.scrollIntoView();
    const panelLoaded = waitForPaneChange("personalizeSmartWindow");
    EventUtils.synthesizeMouseAtCenter(personalizeButton, {}, win);
    await panelLoaded;
  }

  it("shows model selection when AI Window is enabled", async () => {
    await openSmartWindowPanel();

    const modelSelection = doc.getElementById("modelSelection");
    Assert.ok(modelSelection, "Model selection exists");
    Assert.ok(
      BrowserTestUtils.isVisible(modelSelection),
      "Model selection is visible"
    );
  });

  it("selects no model on initial load if user didn't select from onboarding", async () => {
    await openSmartWindowPanel();

    const modelSelection = doc.getElementById("modelSelection");
    Assert.equal(
      modelSelection.value,
      null,
      "No radio is selected if user didn't select model choices"
    );
  });

  it("selects model from onboarding choice", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "2"]],
    });

    await openSmartWindowPanel();

    const modelSelection = doc.getElementById("modelSelection");
    Assert.equal(
      modelSelection.value,
      "2",
      "Model from onboarding choice is selected"
    );
  });

  it("saves preset model immediately when selected", async () => {
    await openSmartWindowPanel();

    const fastRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-fast"]'
    );

    await BrowserTestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(fastRadio),
      "Waiting for radio to be visible"
    );

    fastRadio.click();

    await BrowserTestUtils.waitForCondition(
      () =>
        Services.prefs.getStringPref(
          "browser.smartwindow.firstrun.modelChoice",
          ""
        ) === "1",
      "Waiting for model pref to be saved"
    );

    Assert.equal(
      Services.prefs.getStringPref("browser.smartwindow.firstrun.modelChoice"),
      "1",
      "Model pref is saved immediately"
    );

    fastRadio.focus();
    EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        Services.prefs.getStringPref(
          "browser.smartwindow.firstrun.modelChoice",
          ""
        ) === "2",
      "Waiting for model pref to be saved via keyboard"
    );

    Assert.equal(
      Services.prefs.getStringPref("browser.smartwindow.firstrun.modelChoice"),
      "2",
      "Model pref is saved via keyboard"
    );
  });

  it("shows custom fields when custom radio is selected", async () => {
    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(doc.getElementById("customModelName")),
      "Waiting for custom fields to be visible"
    );

    const customModelName = doc.getElementById("customModelName");
    const customModelEndpoint = doc.getElementById("customModelEndpoint");
    const customModelAuthToken = doc.getElementById("customModelAuthToken");
    const customModelSaveButton = doc.getElementById("customModelSaveButton");

    Assert.ok(
      BrowserTestUtils.isVisible(customModelName),
      "Custom model name input is visible"
    );
    Assert.ok(
      BrowserTestUtils.isVisible(customModelEndpoint),
      "Custom model endpoint input is visible"
    );
    Assert.ok(
      BrowserTestUtils.isVisible(customModelAuthToken),
      "Custom model auth token input is visible"
    );
    Assert.ok(
      BrowserTestUtils.isVisible(customModelSaveButton),
      "Custom model save button is visible"
    );

    // Reset to preset for keyboard test
    const fastRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-fast"]'
    );
    fastRadio.click();

    await BrowserTestUtils.waitForCondition(
      () => !BrowserTestUtils.isVisible(doc.getElementById("customModelName")),
      "Waiting for custom fields to be hidden"
    );

    fastRadio.focus();
    // Arrow down 3 times to get to custom (All-purpose -> Fast -> Personalization -> Custom)
    EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);
    EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);
    EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);

    await BrowserTestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(doc.getElementById("customModelName")),
      "Waiting for custom fields to be visible via keyboard"
    );

    Assert.ok(
      BrowserTestUtils.isVisible(doc.getElementById("customModelName")),
      "Custom model name input is visible via keyboard"
    );
  });

  it("save button is disabled when endpoint is empty", async () => {
    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        BrowserTestUtils.isVisible(doc.getElementById("customModelSaveButton")),
      "Waiting for save button to be visible"
    );

    const customModelSaveButton = doc.getElementById("customModelSaveButton");
    Assert.ok(
      customModelSaveButton.disabled,
      "Save button is disabled when endpoint is empty"
    );
  });

  it("disables save button when endpoint URL is invalid", async () => {
    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        BrowserTestUtils.isVisible(doc.getElementById("customModelEndpoint")),
      "Waiting for custom fields to be visible"
    );

    const customModelEndpoint = doc.getElementById("customModelEndpoint");
    customModelEndpoint.value = "example.com";
    customModelEndpoint.dispatchEvent(new Event("input"));

    await BrowserTestUtils.waitForCondition(
      () => doc.getElementById("customModelSaveButton").disabled,
      "Waiting for save button to be disabled because endpoint is not valid"
    );

    const customModelSaveButton = doc.getElementById("customModelSaveButton");
    Assert.ok(
      customModelSaveButton.disabled,
      "Save button is disabled when URL is not HTTPS or localhost"
    );
  });

  it("enables save button when endpoint URL is valid HTTPS", async () => {
    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        BrowserTestUtils.isVisible(doc.getElementById("customModelEndpoint")),
      "Waiting for custom fields to be visible"
    );

    const customModelEndpoint = doc.getElementById("customModelEndpoint");
    customModelEndpoint.value = "https://example.com";
    customModelEndpoint.dispatchEvent(new Event("change", { bubbles: true }));

    await BrowserTestUtils.waitForCondition(
      () => !doc.getElementById("customModelSaveButton").disabled,
      "Waiting for save button to be enabled"
    );

    const customModelSaveButton = doc.getElementById("customModelSaveButton");
    Assert.ok(
      !customModelSaveButton.disabled,
      "Save button is enabled when URL is HTTPS"
    );
  });

  it("enables save button when endpoint URL is localhost", async () => {
    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        BrowserTestUtils.isVisible(doc.getElementById("customModelEndpoint")),
      "Waiting for custom fields to be visible"
    );

    const customModelEndpoint = doc.getElementById("customModelEndpoint");
    customModelEndpoint.value = "http://localhost:8080";
    customModelEndpoint.dispatchEvent(new Event("change", { bubbles: true }));

    await BrowserTestUtils.waitForCondition(
      () => !doc.getElementById("customModelSaveButton").disabled,
      "Waiting for save button to be enabled"
    );

    const customModelSaveButton = doc.getElementById("customModelSaveButton");
    Assert.ok(
      !customModelSaveButton.disabled,
      "Save button is enabled when URL is localhost"
    );
  });

  it("saves custom model when save button is clicked", async () => {
    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        BrowserTestUtils.isVisible(doc.getElementById("customModelEndpoint")),
      "Waiting for custom fields to be visible"
    );

    const customModelName = doc.getElementById("customModelName");
    const customModelEndpoint = doc.getElementById("customModelEndpoint");
    const customModelAuthToken = doc.getElementById("customModelAuthToken");

    customModelEndpoint.value = "https://example.com";
    customModelEndpoint.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait for button to be enabled
    const customModelSaveButton = doc.getElementById("customModelSaveButton");
    await BrowserTestUtils.waitForCondition(
      () => !customModelSaveButton.disabled,
      "Waiting for save button to be enabled"
    );

    customModelName.value = "my-custom-model";
    customModelName.dispatchEvent(new Event("input", { bubbles: true }));
    customModelAuthToken.value = "my-token";
    customModelAuthToken.dispatchEvent(new Event("input", { bubbles: true }));

    customModelSaveButton.scrollIntoView({});
    EventUtils.synthesizeMouseAtCenter(customModelSaveButton, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        Services.prefs.getStringPref("browser.smartwindow.model", "") ===
        "my-custom-model",
      "Waiting for model to be saved via mouse"
    );

    Assert.equal(
      Services.prefs.getStringPref("browser.smartwindow.model"),
      "my-custom-model",
      "Model pref is saved via mouse"
    );

    // Reset for keyboard test
    Services.prefs.clearUserPref("browser.smartwindow.model");
    Services.prefs.clearUserPref("browser.smartwindow.endpoint");
    Services.prefs.clearUserPref("browser.smartwindow.apiKey");

    customModelName.value = "keyboard-model";
    customModelEndpoint.value = "https://example.com";
    customModelEndpoint.dispatchEvent(new Event("change", { bubbles: true }));
    customModelAuthToken.value = "keyboard-token";

    // Keyboard test to focus and space bar
    customModelSaveButton.focus();
    EventUtils.synthesizeKey(" ", {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        Services.prefs.getStringPref("browser.smartwindow.model", "") ===
        "keyboard-model",
      "Waiting for model to be saved via keyboard"
    );

    Assert.equal(
      Services.prefs.getStringPref("browser.smartwindow.model"),
      "keyboard-model",
      "Model pref is saved via keyboard"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.smartwindow.endpoint"),
      "https://example.com",
      "Endpoint pref is saved via keyboard"
    );
  });

  it("restores custom endpoint when switching back to custom", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.preferences.endpoint", "https://example.com"],
      ],
    });

    await openSmartWindowPanel();

    const customRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-custom"]'
    );
    EventUtils.synthesizeMouseAtCenter(customRadio, {}, win);

    await BrowserTestUtils.waitForCondition(
      () =>
        BrowserTestUtils.isVisible(doc.getElementById("customModelEndpoint")),
      "Waiting for custom fields to be visible"
    );

    const customModelEndpoint = doc.getElementById("customModelEndpoint");

    await BrowserTestUtils.waitForCondition(
      () => customModelEndpoint.value === "https://example.com",
      "Waiting for endpoint to be restored in input"
    );

    Assert.equal(
      customModelEndpoint.value,
      "https://example.com",
      "Custom endpoint is restored in input"
    );
  });

  it("hides custom fields when preset model is selected", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.firstrun.modelChoice", "0"]],
    });

    await openSmartWindowPanel();

    const fastRadio = doc.querySelector(
      'moz-radio[data-l10n-id="smart-window-model-fast"]'
    );
    fastRadio.click();

    await BrowserTestUtils.waitForCondition(
      () => !BrowserTestUtils.isVisible(doc.getElementById("customModelName")),
      "Waiting for custom fields to be hidden"
    );

    const customModelName = doc.getElementById("customModelName");
    Assert.ok(
      !BrowserTestUtils.isVisible(customModelName),
      "Custom fields are hidden when preset is selected"
    );
  });

  it("shows custom as selected when user has custom endpoint", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.endpoint", "https://example.com"],
        ["browser.smartwindow.firstrun.modelChoice", "0"],
      ],
    });

    await openSmartWindowPanel();

    const modelSelection = doc.getElementById("modelSelection");
    Assert.equal(
      modelSelection.value,
      "0",
      "Custom radio is selected when user has custom endpoint"
    );
  });

  it("populates custom fields with saved values", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.model", "saved-model"],
        ["browser.smartwindow.endpoint", "https://example.com"],
        ["browser.smartwindow.apiKey", "saved-token"],
        ["browser.smartwindow.firstrun.modelChoice", "0"],
      ],
    });

    await openSmartWindowPanel();

    const customModelName = doc.getElementById("customModelName");
    const customModelEndpoint = doc.getElementById("customModelEndpoint");
    const customModelAuthToken = doc.getElementById("customModelAuthToken");

    Assert.equal(
      customModelName.value,
      "saved-model",
      "Model name will be populated"
    );
    Assert.equal(
      customModelEndpoint.value,
      "https://example.com",
      "Endpoint is populated"
    );
    Assert.equal(
      customModelAuthToken.value,
      "saved-token",
      "Auth token is populated"
    );
  });
});
