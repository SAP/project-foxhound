/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { DefaultBrowserCheck } = ChromeUtils.importESModule(
  "moz-src:///browser/components/DefaultBrowserCheck.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);

const { Spotlight } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/Spotlight.sys.mjs"
);
const CHECK_PREF = "browser.shell.checkDefaultBrowser";

async function showAndWaitForModal(callback) {
  const promise = BrowserTestUtils.promiseAlertDialog(null, undefined, {
    callback,
    isSubDialog: true,
  });
  await DefaultBrowserCheck.prompt(BrowserWindowTracker.getTopWindow());
  return promise;
}

const TELEMETRY_NAMES = ["accept check", "accept", "cancel check", "cancel"];

let testSetDefaultSpotlight = {
  id: "TEST_MESSAGE",
  template: "spotlight",
  content: {
    template: "multistage",
    id: "SET_DEFAULT_SPOTLIGHT",
    screens: [
      {
        id: "PROMPT_CLONE",
        content: {
          isSystemPromptStyleSpotlight: true,
          title: {
            fontSize: "13px",
            raw: "Make Nightly your default browser?",
          },
          subtitle: {
            fontSize: "13px",
            raw: "Keep Nightly at your fingertips — make it your default browser and keep it in your Dock.",
          },
        },
      },
    ],
  },
};
function AssertHistogram(histogram, name, expect = 1) {
  TelemetryTestUtils.assertHistogram(
    histogram,
    TELEMETRY_NAMES.indexOf(name),
    expect
  );
}
function getHistogram() {
  return TelemetryTestUtils.getAndClearHistogram("BROWSER_SET_DEFAULT_RESULT");
}

add_task(async function proton_shows_prompt() {
  mockShell();
  ShellService._checkedThisSession = false;

  await SpecialPowers.pushPrefEnv({
    set: [
      [CHECK_PREF, true],
      ["browser.shell.didSkipDefaultBrowserCheckOnFirstRun", true],
    ],
  });

  const willPrompt = await DefaultBrowserCheck.willCheckDefaultBrowser();

  Assert.equal(
    willPrompt,
    !AppConstants.DEBUG,
    "Show default browser prompt with proton on non-debug builds"
  );
});

add_task(async function not_now() {
  const histogram = getHistogram();
  await showAndWaitForModal(win => {
    win.document.querySelector("dialog").getButton("cancel").click();
  });

  Assert.equal(
    Services.prefs.getBoolPref(CHECK_PREF),
    true,
    "Canceling keeps pref true"
  );
  AssertHistogram(histogram, "cancel");
});

add_task(async function stop_asking() {
  const histogram = getHistogram();

  await showAndWaitForModal(win => {
    const dialog = win.document.querySelector("dialog");
    dialog.querySelector("checkbox").click();
    dialog.getButton("cancel").click();
  });

  Assert.equal(
    Services.prefs.getBoolPref(CHECK_PREF),
    false,
    "Canceling with checkbox checked clears the pref"
  );
  AssertHistogram(histogram, "cancel check");
});

add_task(async function primary_default() {
  const mock = mockShell({ isPinned: true, isPinnedToStartMenu: true });
  const histogram = getHistogram();

  await showAndWaitForModal(win => {
    win.document.querySelector("dialog").getButton("accept").click();
  });

  Assert.equal(
    mock.setAsDefault.callCount,
    1,
    "Primary button sets as default"
  );
  Assert.equal(
    mock.pinCurrentAppToTaskbarAsync.callCount,
    0,
    "Primary button doesn't pin if already pinned"
  );
  Assert.equal(
    mock.pinCurrentAppToStartMenuAsync.callCount,
    0,
    "Primary button doesn't pin if already pinned"
  );
  AssertHistogram(histogram, "accept");
});

add_task(async function primary_pin() {
  const mock = mockShell({ canPin: true });
  const histogram = getHistogram();

  await showAndWaitForModal(win => {
    win.document.querySelector("dialog").getButton("accept").click();
  });

  Assert.equal(
    mock.setAsDefault.callCount,
    1,
    "Primary button sets as default"
  );
  if (AppConstants.platform == "win") {
    Assert.equal(
      mock.pinCurrentAppToTaskbarAsync.callCount,
      1,
      "Primary button also pins"
    );
    if (Services.sysinfo.getProperty("hasWinPackageId")) {
      Assert.equal(
        mock.pinCurrentAppToStartMenuAsync.callCount,
        1,
        "Primary button also pins to Windows start menu on MSIX"
      );
    }
  }
  AssertHistogram(histogram, "accept");
});

add_task(async function showDefaultPrompt() {
  let sb = sinon.createSandbox();
  const win2 = await BrowserTestUtils.openNewBrowserWindow();

  const willPromptStub = sb
    .stub(DefaultBrowserCheck, "willCheckDefaultBrowser")
    .returns(true);
  const promptSpy = sb.spy(DefaultBrowserCheck, "prompt");
  await ExperimentAPI.ready();
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.setToDefaultPrompt.featureId,
      value: {
        showSpotlightPrompt: false,
        message: {},
      },
    },
    {
      slug: "test-prompt-style-spotlight",
    },
    {
      isRollout: true,
    }
  );

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  Assert.equal(willPromptStub.callCount, 1, "willCheckDefaultBrowser called");
  Assert.equal(promptSpy.callCount, 1, "default prompt should be called");

  await sb.restore();

  await doExperimentCleanup();
  await BrowserTestUtils.closeWindow(win2);
});

add_task(async function promptStoresImpressionAndDisableTimestamps() {
  await showAndWaitForModal(win => {
    const dialog = win.document.querySelector("dialog");
    dialog.querySelector("checkbox").click();
    dialog.getButton("cancel").click();
  });

  const impressionTimestamp = Services.prefs.getCharPref(
    "browser.shell.mostRecentDefaultPromptSeen"
  );
  const disabledTimestamp = Services.prefs.getCharPref(
    "browser.shell.userDisabledDefaultCheck"
  );

  const now = Math.floor(Date.now() / 1000);
  const oneHourInS = 60 * 60;

  Assert.ok(
    impressionTimestamp &&
      now - parseInt(impressionTimestamp, 10) <= oneHourInS,
    "Prompt impression timestamp is stored"
  );

  Assert.ok(
    disabledTimestamp && now - parseInt(disabledTimestamp, 10) <= oneHourInS,
    "Selecting checkbox stores timestamp of when user disabled the prompt"
  );
});

add_task(async function showPromptStyleSpotlight() {
  let sandbox = sinon.createSandbox();

  const win = await BrowserTestUtils.openNewBrowserWindow();

  const willPromptStub = sandbox
    .stub(DefaultBrowserCheck, "willCheckDefaultBrowser")
    .returns(true);
  const showSpotlightStub = sandbox
    .stub(Spotlight, "showSpotlightDialog")
    .resolves(false);

  await ExperimentAPI.ready();
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.setToDefaultPrompt.featureId,
      value: {
        showSpotlightPrompt: true,
        message: testSetDefaultSpotlight,
      },
    },
    {
      slug: "test-prompt-style-spotlight-2",
    },
    {
      isRollout: true,
    }
  );

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  Assert.equal(willPromptStub.callCount, 1, "willCheckDefaultBrowser called");
  Assert.equal(
    showSpotlightStub.callCount,
    1,
    "showSpotlightDialog should be called"
  );
  Assert.equal(
    showSpotlightStub.getCall(0).args[1],
    testSetDefaultSpotlight,
    "showSpotlightDialog called with right message"
  );

  await doExperimentCleanup();
  await sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function spotlightStoresImpressionTimestamp() {
  let sandbox = sinon.createSandbox();
  const mock = mockShell();

  const win = await BrowserTestUtils.openNewBrowserWindow();
  sandbox.stub(win, "getShellService").returns(mock);
  Services.prefs.clearUserPref("browser.shell.mostRecentDefaultPromptSeen");

  sandbox.stub(DefaultBrowserCheck, "willCheckDefaultBrowser").returns(true);
  sandbox.stub(Spotlight, "showSpotlightDialog").resolves(true);

  await ExperimentAPI.ready();
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.setToDefaultPrompt.featureId,
      value: {
        showSpotlightPrompt: true,
        message: testSetDefaultSpotlight,
      },
    },
    { slug: "test-spotlight-impression-ts" },
    { isRollout: true }
  );

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  const impressionTimestamp = Services.prefs.getCharPref(
    "browser.shell.mostRecentDefaultPromptSeen",
    ""
  );
  const now = Math.floor(Date.now() / 1000);
  const oneHourInS = 60 * 60;
  Assert.ok(
    impressionTimestamp &&
      now - parseInt(impressionTimestamp, 10) <= oneHourInS,
    "Spotlight impression timestamp is stored"
  );

  await doExperimentCleanup();
  await sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function spotlightRecordsTelemetryOnAccept() {
  const histogram = getHistogram();
  let sandbox = sinon.createSandbox();
  const mock = mockShell({ isDefault: true });

  const win = await BrowserTestUtils.openNewBrowserWindow();
  // _showSetToDefaultSpotlight calls browser.documentGlobal.getShellService(),
  // which is the new window, so stub it there too.
  sandbox.stub(win, "getShellService").returns(mock);

  sandbox.stub(DefaultBrowserCheck, "willCheckDefaultBrowser").returns(true);
  sandbox.stub(Spotlight, "showSpotlightDialog").resolves(true);

  await ExperimentAPI.ready();
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.setToDefaultPrompt.featureId,
      value: {
        showSpotlightPrompt: true,
        message: testSetDefaultSpotlight,
      },
    },
    { slug: "test-spotlight-telemetry-accept" },
    { isRollout: true }
  );

  await SpecialPowers.pushPrefEnv({
    set: [[CHECK_PREF, true]],
  });

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  // isNowDefault=true, shouldCheckDefaultBrowser=true → resultEnum = 0*2+1 = 1 → "accept"
  AssertHistogram(histogram, "accept");

  await doExperimentCleanup();
  await sandbox.restore();
  await SpecialPowers.popPrefEnv();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function spotlightRecordsTelemetryWhenNotDefault() {
  const histogram = getHistogram();
  let sandbox = sinon.createSandbox();

  const mock = mockShell({ isDefault: false });

  const win = await BrowserTestUtils.openNewBrowserWindow();
  sandbox.stub(win, "getShellService").returns(mock);

  sandbox.stub(DefaultBrowserCheck, "willCheckDefaultBrowser").returns(true);
  sandbox.stub(Spotlight, "showSpotlightDialog").resolves(true);

  await ExperimentAPI.ready();
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.setToDefaultPrompt.featureId,
      value: {
        showSpotlightPrompt: true,
        message: testSetDefaultSpotlight,
      },
    },
    { slug: "test-spotlight-telemetry-not-default" },
    { isRollout: true }
  );

  await SpecialPowers.pushPrefEnv({
    set: [[CHECK_PREF, true]],
  });

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  // isNowDefault=false, shouldCheckDefaultBrowser=true → resultEnum = 1*2+1 = 3 → "cancel"
  AssertHistogram(histogram, "cancel");

  await doExperimentCleanup();
  await sandbox.restore();
  await SpecialPowers.popPrefEnv();
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function spotlightNotShownDoesNotRecordTelemetry() {
  const histogram = getHistogram();
  let sandbox = sinon.createSandbox();
  mockShell();

  const win = await BrowserTestUtils.openNewBrowserWindow();
  Services.prefs.clearUserPref("browser.shell.mostRecentDefaultPromptSeen");

  sandbox.stub(DefaultBrowserCheck, "willCheckDefaultBrowser").returns(true);
  // Simulate spotlight being suppressed (e.g. gDialogBox already open)
  sandbox.stub(Spotlight, "showSpotlightDialog").resolves(false);

  await ExperimentAPI.ready();
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.setToDefaultPrompt.featureId,
      value: {
        showSpotlightPrompt: true,
        message: testSetDefaultSpotlight,
      },
    },
    { slug: "test-spotlight-not-shown" },
    { isRollout: true }
  );

  await BROWSER_GLUE._maybeShowDefaultBrowserPrompt();

  Assert.deepEqual(
    histogram.snapshot().values ?? {},
    {},
    "No telemetry recorded when spotlight is not shown"
  );
  Assert.equal(
    Services.prefs.getCharPref("browser.shell.mostRecentDefaultPromptSeen", ""),
    "",
    "Impression pref not set when spotlight is not shown"
  );

  await doExperimentCleanup();
  await sandbox.restore();
  await BrowserTestUtils.closeWindow(win);
});
