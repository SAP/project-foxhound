/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

AddonTestUtils.initMochitest(this);

// Installed locales should populate immediately even when the remote locale
// fetch is still pending.
add_task(async function testInstalledLocalesWhileRemotePending() {
  let sandbox = sinon.createSandbox();
  let resolveRemote;
  let remotePromise = new Promise(resolve => {
    resolveRemote = resolve;
  });
  sandbox
    .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
    .callsFake(() => remotePromise);

  await SpecialPowers.pushPrefEnv({
    set: [
      ["intl.multilingual.enabled", true],
      ["intl.multilingual.downloadEnabled", true],
    ],
  });

  let doc = await openLanguagesPrefs();
  let win = doc.defaultView;
  await waitForLanguageUI(doc);

  let sc = getSettingControl("browserLanguagePreferred", win);
  let children = Array.from(sc.controlEl.children);
  ok(
    children.some(el => el.value === "en-US"),
    "Installed en-US is shown while remote is pending"
  );
  ok(
    !children.some(el => el.localName === "hr"),
    "No separator present while remote is pending"
  );

  // Now resolve the remote fetch and verify remote locales appear.
  resolveRemote(["de"].map(createRemoteLangpack));
  await waitForRemoteSeparator(win);

  children = Array.from(sc.controlEl.children);
  let hrIndex = children.findIndex(el => el.localName === "hr");
  let remoteValues = children.slice(hrIndex + 1).map(el => el.value);
  Assert.deepEqual(remoteValues, ["de"], "Remote locales appear after resolve");

  sandbox.restore();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Remote locales should only be fetched once the user navigates to the
// languages pane, not when prefs are opened to a different pane.
add_task(async function testRemoteLocalesNotFetchedUntilLanguagesPaneShown() {
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
    .resolves(["de"].map(createRemoteLangpack));

  await SpecialPowers.pushPrefEnv({
    set: [
      ["intl.multilingual.enabled", true],
      ["intl.multilingual.downloadEnabled", true],
    ],
  });

  let paneInitialized = TestUtils.topicObserved("languages-pane-loaded");
  await openPreferencesViaOpenPreferencesAPI("paneSync", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  let win = doc.defaultView;

  // findInPage.js initializes all panes in a requestIdleCallback after the
  // initial pane loads. Wait for the browserLanguagePreferred select to be
  // populated so that the languages.mjs settings have run their refresh and
  // remote language fetching has had a chance to run. If it always loads we
  // should have hit the API at that point.
  await paneInitialized;
  let preferredLanguage = await settingControlRenders(
    "browserLanguagePreferred",
    win
  );
  await BrowserTestUtils.waitForMutationCondition(
    preferredLanguage,
    { childList: true, subtree: true },
    () => preferredLanguage.controlEl?.children?.length
  );

  is(
    LangPackMatcher.mockable.getAvailableLangpacks.callCount,
    0,
    "Remote langpacks aren't fetched while a different pane is shown"
  );

  let paneLoaded = waitForPaneChange("languages");
  synthesizeClick(doc.getElementById("category-languages"));
  await paneLoaded;
  await waitForRemoteSeparator(win);

  is(
    LangPackMatcher.mockable.getAvailableLangpacks.callCount,
    1,
    "Remote langpacks are fetched after switching to the languages pane"
  );

  let sc = getSettingControl("browserLanguagePreferred", win);
  let children = Array.from(sc.controlEl.children);
  let hrIndex = children.findIndex(el => el.localName === "hr");
  let remoteValues = children.slice(hrIndex + 1).map(el => el.value);
  Assert.deepEqual(
    remoteValues,
    ["de"],
    "Remote locales appear after switching to the languages pane"
  );

  sandbox.restore();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// When downloadEnabled is true, remote locales from AMO should appear after
// a separator below the installed locales.
add_task(async function testRemoteLocalesAppearAfterSeparator() {
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
    .resolves(["de", "fr"].map(createRemoteLangpack));

  await SpecialPowers.pushPrefEnv({
    set: [
      ["intl.multilingual.enabled", true],
      ["intl.multilingual.downloadEnabled", true],
    ],
  });

  let doc = await openLanguagesPrefs();
  let win = doc.defaultView;
  await waitForRemoteSeparator(win);

  let sc = getSettingControl("browserLanguagePreferred", win);
  let children = Array.from(sc.controlEl.children);
  let hrIndex = children.findIndex(el => el.localName === "hr");

  Assert.greater(hrIndex, 0, "Separator appears after installed locales");

  let installedValues = children.slice(0, hrIndex).map(el => el.value);
  let remoteValues = children.slice(hrIndex + 1).map(el => el.value);

  ok(installedValues.includes("en-US"), "en-US is in the installed section");
  Assert.deepEqual(
    remoteValues,
    ["de", "fr"],
    "Remote locales appear after separator"
  );

  is(
    LangPackMatcher.mockable.getAvailableLangpacks.callCount,
    1,
    "getAvailableLangpacks was called once to fetch remote locales"
  );

  // Trigger a setting refresh by toggling a pref that the remote locales
  // setting listens to, then verify the list was cached and not re-fetched.
  Services.prefs.setBoolPref("intl.multilingual.downloadEnabled", false);
  Services.prefs.setBoolPref("intl.multilingual.downloadEnabled", true);

  await waitForSettingControlChange(sc);

  is(
    LangPackMatcher.mockable.getAvailableLangpacks.callCount,
    1,
    "getAvailableLangpacks was not called again after refresh (cached)"
  );

  sandbox.restore();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Locales that are already installed should not also appear in the remote section.
add_task(async function testInstalledLocalesNotDuplicatedInRemoteSection() {
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
    .resolves(["de", "fr"].map(createRemoteLangpack));

  await SpecialPowers.pushPrefEnv({
    set: [
      ["intl.multilingual.enabled", true],
      ["intl.multilingual.downloadEnabled", true],
      ["extensions.langpacks.signatures.required", false],
    ],
  });

  let addon = await installLangpack("fr");
  let doc = await openLanguagesPrefs();
  let win = doc.defaultView;
  await waitForRemoteSeparator(win);

  let sc = getSettingControl("browserLanguagePreferred", win);
  let children = Array.from(sc.controlEl.children);
  let hrIndex = children.findIndex(el => el.localName === "hr");

  let installedValues = children.slice(0, hrIndex).map(el => el.value);
  let remoteValues = children.slice(hrIndex + 1).map(el => el.value);

  ok(
    installedValues.includes("fr"),
    "Installed fr appears in the installed section"
  );
  ok(
    !remoteValues.includes("fr"),
    "Installed fr is not duplicated in the remote section"
  );
  Assert.deepEqual(
    remoteValues,
    ["de"],
    "Only non-installed de appears in the remote section"
  );

  await addon.uninstall();
  sandbox.restore();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Selecting a remote locale should trigger langpack installation and, when
// liveReload is off, show the restart confirmation.
add_task(
  async function testSelectingRemoteLocaleInstallsLangpackAndShowsRestart() {
    let sandbox = sinon.createSandbox();
    sandbox
      .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
      .resolves(["fr"].map(createRemoteLangpack));
    sandbox.stub(LangPackMatcher.mockable, "installLangPack").resolves(true);

    await SpecialPowers.pushPrefEnv({
      set: [
        ["intl.multilingual.enabled", true],
        ["intl.multilingual.downloadEnabled", true],
        ["intl.multilingual.liveReload", false],
        ["intl.multilingual.liveReloadBidirectional", false],
        ["intl.locale.requested", "en-US"],
      ],
    });

    let doc = await openLanguagesPrefs();
    let win = doc.defaultView;
    await waitForRemoteSeparator(win);
    assertRestartMessageHidden(doc);

    let sc = getSettingControl("browserLanguagePreferred", win);
    await changeMozSelectValue(sc.controlEl, "fr");

    ok(
      LangPackMatcher.mockable.installLangPack.calledOnce,
      "installLangPack was called for the remote locale"
    );
    is(
      LangPackMatcher.mockable.installLangPack.firstCall.args[0].target_locale,
      "fr",
      "installLangPack was called with the fr langpack"
    );

    await waitForRestartMessage(doc);

    sandbox.restore();
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);

// If the langpack installation throws, set() should reset the dropdown to the
// current locale rather than leaving it on the failed remote locale.
add_task(async function testFailedRemoteLocaleInstallResetsDropdown() {
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
    .resolves(["fr"].map(createRemoteLangpack));
  sandbox
    .stub(LangPackMatcher.mockable, "installLangPack")
    .rejects(new Error("Simulated install failure"));

  await SpecialPowers.pushPrefEnv({
    set: [
      ["intl.multilingual.enabled", true],
      ["intl.multilingual.downloadEnabled", true],
      ["intl.locale.requested", "en-US"],
    ],
  });

  let doc = await openLanguagesPrefs();
  let win = doc.defaultView;
  await waitForRemoteSeparator(win);

  let sc = getSettingControl("browserLanguagePreferred", win);
  await changeMozSelectValue(sc.controlEl, "fr");

  is(
    sc.controlEl.value,
    "en-US",
    "Dropdown resets to current locale after failed install"
  );

  // An error message should be shown after a failed install.
  let messageControl = getSettingControl("browserLanguageMessage", win);
  await BrowserTestUtils.waitForMutationCondition(
    messageControl,
    { attributes: true, attributeFilter: ["hidden"] },
    () => !messageControl.hidden
  );
  ok(
    messageControl.controlEl.shadowRoot.querySelector(
      "moz-message-bar[type=error]"
    ),
    "Error message bar is shown after failed install"
  );

  sandbox.restore();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Both language selects should be disabled while a locale is being downloaded
// and re-enabled when the download completes.
add_task(async function testSelectsDisabledDuringDownload() {
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(LangPackMatcher.mockable, "getAvailableLangpacks")
    .resolves(["fr"].map(createRemoteLangpack));
  let resolveInstall;
  sandbox.stub(LangPackMatcher.mockable, "installLangPack").callsFake(
    () =>
      new Promise(resolve => {
        resolveInstall = resolve;
      })
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      ["intl.multilingual.enabled", true],
      ["intl.multilingual.downloadEnabled", true],
      ["intl.multilingual.liveReload", false],
      ["intl.multilingual.liveReloadBidirectional", false],
      ["intl.locale.requested", "en-US"],
      ["extensions.langpacks.signatures.required", false],
    ],
  });

  let addon = await installLangpack("de");
  let doc = await openLanguagesPrefs();
  let win = doc.defaultView;
  await waitForRemoteSeparator(win);

  let preferred = getSettingControl("browserLanguagePreferred", win);
  let fallback = getSettingControl("browserLanguageFallback", win);
  await changeMozSelectValue(preferred.controlEl, "de");
  await waitForSettingVisible("browserLanguageFallback", win);

  ok(!preferred.controlEl.disabled, "Preferred is enabled before download");
  ok(!fallback.controlEl.disabled, "Fallback is enabled before download");

  // Trigger a remote install (don't await, it will pend).
  let setPromise = changeMozSelectValue(preferred.controlEl, "fr");

  // Wait for the installing state to propagate to the UI.
  await waitForSettingControlChange(preferred);
  ok(preferred.controlEl.disabled, "Preferred is disabled during download");
  ok(fallback.controlEl.disabled, "Fallback is disabled during download");

  resolveInstall(true);
  await setPromise;

  // Wait for re-enable after download completes.
  await waitForSettingControlChange(preferred);
  ok(!preferred.controlEl.disabled, "Preferred is re-enabled after download");
  ok(!fallback.controlEl.disabled, "Fallback is re-enabled after download");

  await addon.uninstall();
  sandbox.restore();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
