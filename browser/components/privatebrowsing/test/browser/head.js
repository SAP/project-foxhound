/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  ASRouter: "resource:///modules/asrouter/ASRouter.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  ExperimentFakes: "resource://testing-common/NimbusTestUtils.sys.mjs",
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
  PanelTestProvider: "resource:///modules/asrouter/PanelTestProvider.sys.mjs",
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

function whenNewWindowLoaded(aOptions, aCallback) {
  let win = OpenBrowserWindow(aOptions);
  let focused = SimpleTest.promiseFocus(win);
  let startupFinished = TestUtils.topicObserved(
    "browser-delayed-startup-finished",
    subject => subject == win
  ).then(() => win);
  Promise.all([focused, startupFinished]).then(results =>
    executeSoon(() => aCallback(results[1]))
  );

  return win;
}

function openWindow(aParent, aOptions) {
  return BrowserWindowTracker.promiseOpenWindow({
    openerWindow: aParent,
    ...aOptions,
  });
}

/**
 * Opens a new private window and loads "about:privatebrowsing" there.
 */
async function openAboutPrivateBrowsing() {
  let win = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
    waitForTabURL: "about:privatebrowsing",
  });
  let tab = win.gBrowser.selectedBrowser;
  return { win, tab };
}

/**
 * Wrapper for openAboutPrivateBrowsing that returns after render is complete
 */
async function openTabAndWaitForRender() {
  let { win, tab } = await openAboutPrivateBrowsing();
  await SpecialPowers.spawn(tab, [], async function () {
    // Wait for render to complete
    await ContentTaskUtils.waitForCondition(() =>
      content.document.documentElement.hasAttribute(
        "PrivateBrowsingRenderComplete"
      )
    );
  });
  return { win, tab };
}

function newDirectory() {
  let dir = FileUtils.getDir("TmpD", ["testdir"]);
  dir.createUnique(Ci.nsIFile.DIRECTORY_TYPE, FileUtils.PERMS_DIRECTORY);
  return dir;
}

function newFileInDirectory(aDir) {
  let file = aDir.clone();
  file.append("testfile");
  file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, FileUtils.PERMS_FILE);
  return file;
}

function clearHistory() {
  // simulate clearing the private data
  Services.obs.notifyObservers(null, "browser:purge-session-history");
}

function _initTest() {
  // Don't use about:home as the homepage for new windows
  Services.prefs.setIntPref("browser.startup.page", 0);
  registerCleanupFunction(() =>
    Services.prefs.clearUserPref("browser.startup.page")
  );
}

function waitForTelemetryEvent(category, value) {
  info("waiting for telemetry event");
  return TestUtils.waitForCondition(() => {
    let events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
      false
    ).content;

    if (!events) {
      return null;
    }
    events = events.filter(e => e[1] == category);
    info(JSON.stringify(events));

    // Check for experimentId passed as value
    // if exists return events only for specific experimentId
    if (value) {
      events = events.filter(e => e[4].includes(value));
    }
    if (events.length) {
      return events[0];
    }
    return null;
  }, "wait and retrieve telemetry event");
}

async function setupMSExperimentWithMessage(message) {
  Services.telemetry.clearEvents();
  Services.telemetry.snapshotEvents(
    Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
    true
  );
  let doExperimentCleanup = await ExperimentFakes.enrollWithFeatureConfig({
    featureId: "pbNewtab",
    value: message,
  });
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.newtabpage.activity-stream.asrouter.providers.messaging-experiments",
        '{"id":"messaging-experiments","enabled":true,"type":"remote-experiments","updateCycleInMs":0}',
      ],
    ],
  });
  // Reload the provider
  await ASRouter._updateMessageProviders();
  // Wait to load the messages from the messaging-experiments provider
  await ASRouter.loadMessagesFromAllProviders();

  // XXX this only runs at the end of the file, so some of this stuff (eg unblockAll) should be run
  // at the bottom of various test functions too.  Quite possibly other stuff beside unblockAll too.
  registerCleanupFunction(async () => {
    // Clear telemetry side effects
    Services.telemetry.clearEvents();
    // Make sure the side-effects from dismisses are cleared.
    ASRouter.unblockAll();
    // put the disabled providers back
    SpecialPowers.popPrefEnv();
    // Reload the provider again at cleanup to remove the experiment message
    await ASRouter._updateMessageProviders();
    // Wait to load the messages from the messaging-experiments provider
    await ASRouter.loadMessagesFromAllProviders();
  });

  Assert.ok(
    ASRouter.state.messages.find(m => m.id.includes(message.id)),
    "Experiment message found in ASRouter state"
  );

  return doExperimentCleanup;
}

_initTest();
