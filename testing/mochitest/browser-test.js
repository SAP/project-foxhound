/* -*- js-indent-level: 2; tab-width: 2; indent-tabs-mode: nil -*- */

/* eslint-env mozilla/browser-window */
/* import-globals-from chrome-harness.js */
/* import-globals-from mochitest-e10s-utils.js */

// Test timeout (seconds)
var gTimeoutSeconds = 45;
var gConfig;

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

ChromeUtils.defineESModuleGetters(this, {
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
});

const SIMPLETEST_OVERRIDES = [
  "ok",
  "record",
  "is",
  "isnot",
  "todo",
  "todo_is",
  "todo_isnot",
  "info",
  "expectAssertions",
  "requestCompleteLog",
];

setTimeout(testInit, 0);

var TabDestroyObserver = {
  outstanding: new Set(),
  promiseResolver: null,

  init() {
    Services.obs.addObserver(this, "message-manager-close");
    Services.obs.addObserver(this, "message-manager-disconnect");
  },

  destroy() {
    Services.obs.removeObserver(this, "message-manager-close");
    Services.obs.removeObserver(this, "message-manager-disconnect");
  },

  observe(subject, topic, data) {
    if (topic == "message-manager-close") {
      this.outstanding.add(subject);
    } else if (topic == "message-manager-disconnect") {
      this.outstanding.delete(subject);
      if (!this.outstanding.size && this.promiseResolver) {
        this.promiseResolver();
      }
    }
  },

  wait() {
    if (!this.outstanding.size) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.promiseResolver = resolve;
    });
  },
};

function testInit() {
  gConfig = readConfig();
  if (gConfig.testRoot == "browser") {
    // Make sure to launch the test harness for the first opened window only
    var prefs = Services.prefs;
    if (prefs.prefHasUserValue("testing.browserTestHarness.running")) {
      return;
    }

    prefs.setBoolPref("testing.browserTestHarness.running", true);

    if (prefs.prefHasUserValue("testing.browserTestHarness.timeout")) {
      gTimeoutSeconds = prefs.getIntPref("testing.browserTestHarness.timeout");
    }

    var sstring = Cc["@mozilla.org/supports-string;1"].createInstance(
      Ci.nsISupportsString
    );
    sstring.data = location.search;

    Services.ww.openWindow(
      window,
      "chrome://mochikit/content/browser-harness.xhtml",
      "browserTest",
      "chrome,centerscreen,dialog=no,resizable,titlebar,toolbar=no,width=800,height=600",
      sstring
    );
  } else {
    // This code allows us to redirect without requiring specialpowers for chrome and a11y tests.
    let messageHandler = function (m) {
      // eslint-disable-next-line no-undef
      messageManager.removeMessageListener("chromeEvent", messageHandler);
      var url = m.json.data;

      // Window is the [ChromeWindow] for messageManager, so we need content.window
      // Currently chrome tests are run in a content window instead of a ChromeWindow
      // eslint-disable-next-line no-undef
      var webNav = content.window.docShell.QueryInterface(Ci.nsIWebNavigation);
      let loadURIOptions = {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      };
      webNav.fixupAndLoadURIString(url, loadURIOptions);
    };

    var listener =
      'data:,function doLoad(e) { var data=e.detail&&e.detail.data;removeEventListener("contentEvent", function (e) { doLoad(e); }, false, true);sendAsyncMessage("chromeEvent", {"data":data}); };addEventListener("contentEvent", function (e) { doLoad(e); }, false, true);';
    // eslint-disable-next-line no-undef
    messageManager.addMessageListener("chromeEvent", messageHandler);
    // eslint-disable-next-line no-undef
    messageManager.loadFrameScript(listener, true);
  }
  if (gConfig.e10s) {
    e10s_init();

    let processCount = prefs.getIntPref("dom.ipc.processCount", 1);
    if (processCount > 1) {
      // Currently starting a content process is slow, to aviod timeouts, let's
      // keep alive content processes.
      prefs.setIntPref("dom.ipc.keepProcessesAlive.web", processCount);
    }

    Services.mm.loadFrameScript(
      "chrome://mochikit/content/shutdown-leaks-collector.js",
      true
    );
  } else {
    // In non-e10s, only run the ShutdownLeaksCollector in the parent process.
    ChromeUtils.importESModule(
      "chrome://mochikit/content/ShutdownLeaksCollector.sys.mjs"
    );
  }
}

function isGenerator(value) {
  return value && typeof value === "object" && typeof value.next === "function";
}

function Tester(aTests, structuredLogger, aCallback) {
  this.structuredLogger = structuredLogger;
  this.tests = aTests;
  this.callback = aCallback;

  this._scriptLoader = Services.scriptloader;
  this.EventUtils = {};
  this._scriptLoader.loadSubScript(
    "chrome://mochikit/content/tests/SimpleTest/EventUtils.js",
    this.EventUtils
  );

  this._scriptLoader.loadSubScript(
    "chrome://mochikit/content/tests/SimpleTest/AccessibilityUtils.js",
    // AccessibilityUtils are integrated with EventUtils to perform additional
    // accessibility checks for certain user interactions (clicks, etc). Load
    // them into the EventUtils scope here.
    this.EventUtils
  );
  this.AccessibilityUtils = this.EventUtils.AccessibilityUtils;

  this.AccessibilityUtils.init();

  // Make sure our SpecialPowers actor is instantiated, in case it was
  // registered after our DOMWindowCreated event was fired (which it
  // most likely was).
  void window.windowGlobalChild.getActor("SpecialPowers");

  var simpleTestScope = {};
  this._scriptLoader.loadSubScript(
    "chrome://mochikit/content/tests/SimpleTest/SimpleTest.js",
    simpleTestScope
  );
  this._scriptLoader.loadSubScript(
    "chrome://mochikit/content/tests/SimpleTest/MemoryStats.js",
    simpleTestScope
  );
  this._scriptLoader.loadSubScript(
    "chrome://mochikit/content/chrome-harness.js",
    simpleTestScope
  );
  this.SimpleTest = simpleTestScope.SimpleTest;

  window.SpecialPowers.SimpleTest = this.SimpleTest;
  window.SpecialPowers.setAsDefaultAssertHandler();

  var extensionUtilsScope = {
    registerCleanupFunction: fn => {
      this.currentTest.scope.registerCleanupFunction(fn);
    },
  };
  extensionUtilsScope.SimpleTest = this.SimpleTest;
  this._scriptLoader.loadSubScript(
    "chrome://mochikit/content/tests/SimpleTest/ExtensionTestUtils.js",
    extensionUtilsScope
  );
  this.ExtensionTestUtils = extensionUtilsScope.ExtensionTestUtils;

  this.SimpleTest.harnessParameters = gConfig;

  this.MemoryStats = simpleTestScope.MemoryStats;
  this.ContentTask = ChromeUtils.importESModule(
    "resource://testing-common/ContentTask.sys.mjs"
  ).ContentTask;
  this.BrowserTestUtils = ChromeUtils.importESModule(
    "resource://testing-common/BrowserTestUtils.sys.mjs"
  ).BrowserTestUtils;
  this.TestUtils = ChromeUtils.importESModule(
    "resource://testing-common/TestUtils.sys.mjs"
  ).TestUtils;
  this.PromiseTestUtils = ChromeUtils.importESModule(
    "resource://testing-common/PromiseTestUtils.sys.mjs"
  ).PromiseTestUtils;
  this.Assert = ChromeUtils.importESModule(
    "resource://testing-common/Assert.sys.mjs"
  ).Assert;
  this.PerTestCoverageUtils = ChromeUtils.importESModule(
    "resource://testing-common/PerTestCoverageUtils.sys.mjs"
  ).PerTestCoverageUtils;

  this.PromiseTestUtils.init();

  this.SimpleTestOriginal = {};
  SIMPLETEST_OVERRIDES.forEach(m => {
    this.SimpleTestOriginal[m] = this.SimpleTest[m];
  });

  this._coverageCollector = null;

  const { XPCOMUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/XPCOMUtils.sys.mjs"
  );

  // Avoid failing tests when XPCOMUtils.defineLazyScriptGetter is used.
  XPCOMUtils.overrideScriptLoaderForTests({
    loadSubScript: (url, obj) => {
      let before = Object.keys(window);
      try {
        return this._scriptLoader.loadSubScript(url, obj);
      } finally {
        for (let property of Object.keys(window)) {
          if (
            !before.includes(property) &&
            !this._globalProperties.includes(property)
          ) {
            this._globalProperties.push(property);
            this.SimpleTest.info(
              `Global property added while loading ${url}: ${property}`
            );
          }
        }
      }
    },
    loadSubScriptWithOptions: this._scriptLoader.loadSubScriptWithOptions.bind(
      this._scriptLoader
    ),
  });

  // ensure the mouse is reset before each test run
  if (Services.env.exists("MOZ_AUTOMATION")) {
    this.EventUtils.synthesizeNativeMouseEvent({
      type: "mousemove",
      screenX: 1000,
      screenY: 10,
    });
  }
}
Tester.prototype = {
  EventUtils: {},
  AccessibilityUtils: {},
  SimpleTest: {},
  ContentTask: null,
  ExtensionTestUtils: null,
  Assert: null,

  repeat: 0,
  a11y_checks: false,
  runUntilFailure: false,
  checker: null,
  currentTestIndex: -1,
  lastStartTime: null,
  lastStartTimestamp: null,
  lastAssertionCount: 0,
  failuresFromInitialWindowState: 0,

  get currentTest() {
    return this.tests[this.currentTestIndex];
  },
  get done() {
    return this.currentTestIndex == this.tests.length - 1 && this.repeat <= 0;
  },

  start: function Tester_start() {
    TabDestroyObserver.init();

    // if testOnLoad was not called, then gConfig is not defined
    if (!gConfig) {
      gConfig = readConfig();
    }

    if (gConfig.runUntilFailure) {
      this.runUntilFailure = true;
    }

    if (gConfig.a11y_checks != undefined) {
      this.a11y_checks = gConfig.a11y_checks;
    }

    if (gConfig.repeat) {
      this.repeat = gConfig.repeat;
    }

    if (gConfig.jscovDirPrefix) {
      let coveragePath = gConfig.jscovDirPrefix;
      let { CoverageCollector } = ChromeUtils.importESModule(
        "resource://testing-common/CoverageUtils.sys.mjs"
      );
      this._coverageCollector = new CoverageCollector(coveragePath);
    }

    this.structuredLogger.info("*** Start BrowserChrome Test Results ***");
    Services.console.registerListener(this);
    this._globalProperties = Object.keys(window);
    this._globalPropertyWhitelist = [
      "navigator",
      "constructor",
      "top",
      "Application",
      "__SS_tabsToRestore",
      "__SSi",
      "webConsoleCommandController",
      // Thunderbird
      "MailMigrator",
      "SearchIntegration",
      // lit
      "reactiveElementVersions",
      "litHtmlVersions",
      "litElementVersions",
    ];

    this._repeatingTimers = this._getRepeatingTimers();

    this.PerTestCoverageUtils.beforeTestSync();

    if (this.tests.length) {
      this.waitForWindowsReady().then(() => {
        this.nextTest();
      });
    } else {
      this.finish();
    }
  },

  _getRepeatingTimers() {
    const kNonRepeatingTimerTypes = [
      Ci.nsITimer.TYPE_ONE_SHOT,
      Ci.nsITimer.TYPE_ONE_SHOT_LOW_PRIORITY,
    ];
    return Cc["@mozilla.org/timer-manager;1"]
      .getService(Ci.nsITimerManager)
      .getTimers()
      .filter(t => !kNonRepeatingTimerTypes.includes(t.type));
  },

  async waitForWindowsReady() {
    await this.setupDefaultTheme();
    await new Promise(resolve =>
      this.waitForGraphicsTestWindowToBeGone(resolve)
    );
    await this.promiseMainWindowReady();
  },

  async promiseMainWindowReady() {
    if (window.gBrowserInit) {
      await window.gBrowserInit.idleTasksFinishedPromise;
    }
  },

  async setupDefaultTheme() {
    // Developer Edition enables the wrong theme by default. Make sure
    // the ordinary default theme is enabled.
    let theme = await AddonManager.getAddonByID("default-theme@mozilla.org");
    await theme.enable();
  },

  waitForGraphicsTestWindowToBeGone(aCallback) {
    for (let win of Services.wm.getEnumerator(null)) {
      if (
        win != window &&
        !win.closed &&
        win.document.documentURI ==
          "chrome://gfxsanity/content/sanityparent.html"
      ) {
        this.BrowserTestUtils.domWindowClosed(win).then(aCallback);
        return;
      }
    }
    // graphics test window is already gone, just call callback immediately
    aCallback();
  },

  waitForWindowsState: function Tester_waitForWindowsState(aCallback) {
    let timedOut = this.currentTest && this.currentTest.timedOut;
    // eslint-disable-next-line no-nested-ternary
    let baseMsg = timedOut
      ? "Found a {elt} after previous test timed out"
      : this.currentTest
      ? "Found an unexpected {elt} at the end of test run"
      : "Found an unexpected {elt}";

    // Remove stale tabs
    if (
      this.currentTest &&
      window.gBrowser &&
      AppConstants.MOZ_APP_NAME != "thunderbird" &&
      gBrowser.tabs.length > 1
    ) {
      let lastURI = "";
      let lastURIcount = 0;
      while (gBrowser.tabs.length > 1) {
        let lastTab = gBrowser.tabs[gBrowser.tabs.length - 1];
        if (!lastTab.closing) {
          // Report the stale tab as an error only when they're not closing.
          // Tests can finish without waiting for the closing tabs.
          if (lastURI != lastTab.linkedBrowser.currentURI.spec) {
            lastURI = lastTab.linkedBrowser.currentURI.spec;
          } else {
            lastURIcount++;
            if (lastURIcount >= 3) {
              this.currentTest.addResult(
                new testResult({
                  name: "terminating browser early - unable to close tabs; skipping remaining tests in folder",
                  allowFailure: this.currentTest.allowFailure,
                })
              );
              this.finish();
            }
          }
          this.currentTest.addResult(
            new testResult({
              name:
                baseMsg.replace("{elt}", "tab") +
                ": " +
                lastTab.linkedBrowser.currentURI.spec,
              allowFailure: this.currentTest.allowFailure,
            })
          );
        }
        gBrowser.removeTab(lastTab);
      }
    }

    // Replace the last tab with a fresh one
    if (window.gBrowser && AppConstants.MOZ_APP_NAME != "thunderbird") {
      gBrowser.addTab("about:blank", {
        skipAnimation: true,
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
      gBrowser.removeTab(gBrowser.selectedTab, { skipPermitUnload: true });
      gBrowser.stop();
    }

    // Remove stale windows
    this.structuredLogger.info("checking window state");
    for (let win of Services.wm.getEnumerator(null)) {
      let type = win.document.documentElement.getAttribute("windowtype");
      if (
        win != window &&
        !win.closed &&
        win.document.documentElement.getAttribute("id") !=
          "browserTestHarness" &&
        type != "devtools:webconsole"
      ) {
        switch (type) {
          case "navigator:browser":
            type = "browser window";
            break;
          case "mail:3pane":
            type = "mail window";
            break;
          case null:
            type =
              "unknown window with document URI: " +
              win.document.documentURI +
              " and title: " +
              win.document.title;
            break;
        }
        let msg = baseMsg.replace("{elt}", type);
        if (this.currentTest) {
          this.currentTest.addResult(
            new testResult({
              name: msg,
              allowFailure: this.currentTest.allowFailure,
            })
          );
        } else {
          this.failuresFromInitialWindowState++;
          this.structuredLogger.error("browser-test.js | " + msg);
        }

        win.close();
      }
    }

    // Make sure the window is raised before each test.
    this.SimpleTest.waitForFocus(aCallback);
  },

  finish: function Tester_finish(aSkipSummary) {
    var passCount = this.tests.reduce((a, f) => a + f.passCount, 0);
    var failCount = this.tests.reduce((a, f) => a + f.failCount, 0);
    var todoCount = this.tests.reduce((a, f) => a + f.todoCount, 0);

    // Include failures from window state checking prior to running the first test
    failCount += this.failuresFromInitialWindowState;

    TabDestroyObserver.destroy();
    Services.console.unregisterListener(this);

    this.AccessibilityUtils.uninit();

    // It's important to terminate the module to avoid crashes on shutdown.
    this.PromiseTestUtils.uninit();

    // In the main process, we print the ShutdownLeaksCollector message here.
    let pid = Services.appinfo.processID;
    dump("Completed ShutdownLeaks collections in process " + pid + "\n");

    this.structuredLogger.info("TEST-START | Shutdown");

    if (this.tests.length) {
      let e10sMode = window.gMultiProcessBrowser ? "e10s" : "non-e10s";
      this.structuredLogger.info("Browser Chrome Test Summary");
      this.structuredLogger.info("Passed:  " + passCount);
      this.structuredLogger.info("Failed:  " + failCount);
      this.structuredLogger.info("Todo:    " + todoCount);
      this.structuredLogger.info("Mode:    " + e10sMode);
    } else {
      this.structuredLogger.error(
        "browser-test.js | No tests to run. Did you pass invalid test_paths?"
      );
    }
    this.structuredLogger.info("*** End BrowserChrome Test Results ***");

    // Tests complete, notify the callback and return
    this.callback(this.tests);
    this.callback = null;
    this.tests = null;
  },

  haltTests: function Tester_haltTests() {
    // Do not run any further tests
    this.currentTestIndex = this.tests.length - 1;
    this.repeat = 0;
  },

  observe: function Tester_observe(aSubject, aTopic, aData) {
    if (!aTopic) {
      this.onConsoleMessage(aSubject);
    }
  },

  onConsoleMessage: function Tester_onConsoleMessage(aConsoleMessage) {
    // Ignore empty messages.
    if (!aConsoleMessage.message) {
      return;
    }

    try {
      var msg = "Console message: " + aConsoleMessage.message;
      if (this.currentTest) {
        this.currentTest.addResult(new testMessage(msg));
      } else {
        this.structuredLogger.info(
          "TEST-INFO | (browser-test.js) | " + msg.replace(/\n$/, "") + "\n"
        );
      }
    } catch (ex) {
      // Swallow exception so we don't lead to another error being reported,
      // throwing us into an infinite loop
    }
  },

  async ensureVsyncDisabled() {
    // The WebExtension process keeps vsync enabled forever in headless mode.
    // See bug 1782541.
    if (Services.env.get("MOZ_HEADLESS")) {
      return;
    }

    try {
      await this.TestUtils.waitForCondition(
        () => !ChromeUtils.vsyncEnabled(),
        "waiting for vsync to be disabled"
      );
    } catch (e) {
      this.Assert.ok(false, e);
      this.Assert.ok(
        false,
        "vsync remained enabled at the end of the test. " +
          "Is there an animation still running? " +
          "Consider talking to the performance team for tips to solve this."
      );
    }
  },

  getNewRepeatingTimers() {
    let repeatingTimers = this._getRepeatingTimers();
    let results = [];
    for (let timer of repeatingTimers) {
      let { name, delay } = timer;
      // For now ignore long repeating timers (typically from nsExpirationTracker).
      if (delay >= 10000) {
        continue;
      }

      // Also ignore the nsAvailableMemoryWatcher timer that is started when the
      // user-interaction-active notification is fired, and stopped when the
      // user-interaction-inactive notification occurs.
      // On Linux it's a 5s timer, on other platforms it's 10s, which is already
      // ignored by the previous case.
      if (
        AppConstants.platform == "linux" &&
        name == "nsAvailableMemoryWatcher"
      ) {
        continue;
      }

      // Ignore nsHttpConnectionMgr timers which show up on browser mochitests
      // running with http3. See Bug 1829841.
      if (name == "nsHttpConnectionMgr") {
        continue;
      }

      if (
        !this._repeatingTimers.find(t => t.delay == delay && t.name == name)
      ) {
        results.push(timer);
      }
    }
    if (results.length) {
      ChromeUtils.addProfilerMarker(
        "NewRepeatingTimers",
        { category: "Test" },
        results.map(t => `${t.name}: ${t.delay}ms`).join(", ")
      );
    }
    return results;
  },

  async ensureNoNewRepeatingTimers() {
    let newTimers;
    try {
      await this.TestUtils.waitForCondition(
        async function () {
          // The array returned by nsITimerManager.getTimers doesn't include
          // timers that are queued in the event loop of their target thread.
          // By waiting for a tick, we ensure the timers that might fire about
          // at the same time as our waitForCondition timer will be included.
          await this.TestUtils.waitForTick();

          newTimers = this.getNewRepeatingTimers();
          return !newTimers.length;
        }.bind(this),
        "waiting for new repeating timers to be cancelled"
      );
    } catch (e) {
      this.Assert.ok(false, e);
      for (let { name, delay } of newTimers) {
        this.Assert.ok(
          false,
          `test left unexpected repeating timer ${name} (duration: ${delay}ms)`
        );
      }
      // Once the new repeating timers have been reported, add them to
      // this._repeatingTimers to avoid reporting them again for the next
      // tests of the manifest.
      this._repeatingTimers.push(...newTimers);
    }
  },

  async nextTest() {
    if (this.currentTest) {
      if (this._coverageCollector) {
        this._coverageCollector.recordTestCoverage(this.currentTest.path);
      }

      this.PerTestCoverageUtils.afterTestSync();

      // Run cleanup functions for the current test before moving on to the
      // next one.
      let testScope = this.currentTest.scope;
      while (testScope.__cleanupFunctions.length) {
        let func = testScope.__cleanupFunctions.shift();
        try {
          let result = await func.apply(testScope);
          if (isGenerator(result)) {
            this.SimpleTest.ok(false, "Cleanup function returned a generator");
          }
        } catch (ex) {
          this.currentTest.addResult(
            new testResult({
              name: "Cleanup function threw an exception",
              ex,
              allowFailure: this.currentTest.allowFailure,
            })
          );
        }
      }

      // Spare tests cleanup work.
      // Reset gReduceMotionOverride in case the test set it.
      if (typeof gReduceMotionOverride == "boolean") {
        gReduceMotionOverride = null;
      }

      Services.obs.notifyObservers(null, "test-complete");

      // Ensure to reset the clipboard in case the test has modified it,
      // so it won't affect the next tests.
      window.SpecialPowers.clipboardCopyString("");

      if (
        this.currentTest.passCount === 0 &&
        this.currentTest.failCount === 0 &&
        this.currentTest.todoCount === 0
      ) {
        this.currentTest.addResult(
          new testResult({
            name:
              "This test contains no passes, no fails and no todos. Maybe" +
              " it threw a silent exception? Make sure you use" +
              " waitForExplicitFinish() if you need it.",
          })
        );
      }

      let winUtils = window.windowUtils;
      if (winUtils.isTestControllingRefreshes) {
        this.currentTest.addResult(
          new testResult({
            name: "test left refresh driver under test control",
          })
        );
        winUtils.restoreNormalRefresh();
      }

      if (this.SimpleTest.isExpectingUncaughtException()) {
        this.currentTest.addResult(
          new testResult({
            name:
              "expectUncaughtException was called but no uncaught" +
              " exception was detected!",
            allowFailure: this.currentTest.allowFailure,
          })
        );
      }

      this.resolveFinishTestPromise();
      this.resolveFinishTestPromise = null;
      this.TestUtils.promiseTestFinished = null;

      this.PromiseTestUtils.ensureDOMPromiseRejectionsProcessed();
      this.PromiseTestUtils.assertNoUncaughtRejections();
      this.PromiseTestUtils.assertNoMoreExpectedRejections();
      await this.ensureVsyncDisabled();

      Object.keys(window).forEach(function (prop) {
        if (parseInt(prop) == prop) {
          // This is a string which when parsed as an integer and then
          // stringified gives the original string.  As in, this is in fact a
          // string representation of an integer, so an index into
          // window.frames.  Skip those.
          return;
        }
        if (!this._globalProperties.includes(prop)) {
          this._globalProperties.push(prop);
          if (!this._globalPropertyWhitelist.includes(prop)) {
            this.currentTest.addResult(
              new testResult({
                name: "test left unexpected property on window: " + prop,
                allowFailure: this.currentTest.allowFailure,
              })
            );
          }
        }
      }, this);

      await this.ensureNoNewRepeatingTimers();

      // eslint-disable-next-line no-undef
      await new Promise(resolve => SpecialPowers.flushPrefEnv(resolve));

      if (gConfig.cleanupCrashes) {
        let gdir = Services.dirsvc.get("UAppData", Ci.nsIFile);
        gdir.append("Crash Reports");
        gdir.append("pending");
        if (gdir.exists()) {
          let entries = gdir.directoryEntries;
          while (entries.hasMoreElements()) {
            let entry = entries.nextFile;
            if (entry.isFile()) {
              let msg = "this test left a pending crash report; ";
              try {
                entry.remove(false);
                msg += "deleted " + entry.path;
              } catch (e) {
                msg += "could not delete " + entry.path;
              }
              this.structuredLogger.info(msg);
            }
          }
        }
      }

      // Notify a long running test problem if it didn't end up in a timeout.
      if (this.currentTest.unexpectedTimeouts && !this.currentTest.timedOut) {
        this.currentTest.addResult(
          new testResult({
            name:
              "This test exceeded the timeout threshold. It should be" +
              " rewritten or split up. If that's not possible, use" +
              " requestLongerTimeout(N), but only as a last resort.",
          })
        );
      }

      // If we're in a debug build, check assertion counts.  This code
      // is similar to the code in TestRunner.testUnloaded in
      // TestRunner.js used for all other types of mochitests.
      let debugsvc = Cc["@mozilla.org/xpcom/debug;1"].getService(Ci.nsIDebug2);
      if (debugsvc.isDebugBuild) {
        let newAssertionCount = debugsvc.assertionCount;
        let numAsserts = newAssertionCount - this.lastAssertionCount;
        this.lastAssertionCount = newAssertionCount;

        let max = testScope.__expectedMaxAsserts;
        let min = testScope.__expectedMinAsserts;
        if (numAsserts > max) {
          // TEST-UNEXPECTED-FAIL
          this.currentTest.addResult(
            new testResult({
              name:
                "Assertion count " +
                numAsserts +
                " is greater than expected range " +
                min +
                "-" +
                max +
                " assertions.",
              pass: true, // TEMPORARILY TEST-KNOWN-FAIL
              todo: true,
              allowFailure: this.currentTest.allowFailure,
            })
          );
        } else if (numAsserts < min) {
          // TEST-UNEXPECTED-PASS
          this.currentTest.addResult(
            new testResult({
              name:
                "Assertion count " +
                numAsserts +
                " is less than expected range " +
                min +
                "-" +
                max +
                " assertions.",
              todo: true,
              allowFailure: this.currentTest.allowFailure,
            })
          );
        } else if (numAsserts > 0) {
          // TEST-KNOWN-FAIL
          this.currentTest.addResult(
            new testResult({
              name:
                "Assertion count " +
                numAsserts +
                " is within expected range " +
                min +
                "-" +
                max +
                " assertions.",
              pass: true,
              todo: true,
              allowFailure: this.currentTest.allowFailure,
            })
          );
        }
      }

      if (this.currentTest.allowFailure) {
        if (this.currentTest.expectedAllowedFailureCount) {
          this.currentTest.addResult(
            new testResult({
              name:
                "Expected " +
                this.currentTest.expectedAllowedFailureCount +
                " failures in this file, got " +
                this.currentTest.allowedFailureCount +
                ".",
              pass:
                this.currentTest.expectedAllowedFailureCount ==
                this.currentTest.allowedFailureCount,
            })
          );
        } else if (this.currentTest.allowedFailureCount == 0) {
          this.currentTest.addResult(
            new testResult({
              name:
                "We expect at least one assertion to fail because this" +
                " test file is marked as fail-if in the manifest.",
              todo: true,
              knownFailure: this.currentTest.allowFailure,
            })
          );
        }
      }

      // Dump memory stats for main thread.
      if (
        Services.appinfo.processType == Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT
      ) {
        this.MemoryStats.dump(
          this.currentTestIndex,
          this.currentTest.path,
          gConfig.dumpOutputDirectory,
          gConfig.dumpAboutMemoryAfterTest,
          gConfig.dumpDMDAfterTest
        );
      }

      // Note the test run time
      let name = this.currentTest.path;
      name = name.slice(name.lastIndexOf("/") + 1);
      ChromeUtils.addProfilerMarker(
        "browser-test",
        { category: "Test", startTime: this.lastStartTimestamp },
        name
      );

      // See if we should upload a profile of a failing test.
      if (this.currentTest.failCount) {
        // If MOZ_PROFILER_SHUTDOWN is set, the profiler got started from --profiler
        // and a profile will be shown even if there's no test failure.
        if (
          Services.env.exists("MOZ_UPLOAD_DIR") &&
          !Services.env.exists("MOZ_PROFILER_SHUTDOWN") &&
          Services.profiler.IsActive()
        ) {
          let filename = `profile_${name}.json`;
          let path = Services.env.get("MOZ_UPLOAD_DIR");
          let profilePath = PathUtils.join(path, filename);
          try {
            const { profile } =
              await Services.profiler.getProfileDataAsGzippedArrayBuffer();
            await IOUtils.write(profilePath, new Uint8Array(profile));
            this.currentTest.addResult(
              new testResult({
                name:
                  "Found unexpected failures during the test; profile uploaded in " +
                  filename,
              })
            );
          } catch (e) {
            // If the profile is large, we may encounter out of memory errors.
            this.currentTest.addResult(
              new testResult({
                name:
                  "Found unexpected failures during the test; failed to upload profile: " +
                  e,
              })
            );
          }
        }
      }

      let time = Date.now() - this.lastStartTime;

      this.structuredLogger.testEnd(
        this.currentTest.path,
        "OK",
        undefined,
        "finished in " + time + "ms"
      );
      this.currentTest.setDuration(time);

      if (this.runUntilFailure && this.currentTest.failCount > 0) {
        this.haltTests();
      }

      // Restore original SimpleTest methods to avoid leaks.
      SIMPLETEST_OVERRIDES.forEach(m => {
        this.SimpleTest[m] = this.SimpleTestOriginal[m];
      });

      this.ContentTask.setTestScope(null);
      testScope.destroy();
      this.currentTest.scope = null;
    }

    // Check the window state for the current test before moving to the next one.
    // This also causes us to check before starting any tests, since nextTest()
    // is invoked to start the tests.
    this.waitForWindowsState(() => {
      if (this.done) {
        if (this._coverageCollector) {
          this._coverageCollector.finalize();
        } else if (
          !AppConstants.RELEASE_OR_BETA &&
          !AppConstants.DEBUG &&
          !AppConstants.MOZ_CODE_COVERAGE &&
          !AppConstants.ASAN &&
          !AppConstants.TSAN
        ) {
          this.finish();
          return;
        }

        // Uninitialize a few things explicitly so that they can clean up
        // frames and browser intentionally kept alive until shutdown to
        // eliminate false positives.
        if (gConfig.testRoot == "browser") {
          // Skip if SeaMonkey
          if (AppConstants.MOZ_APP_NAME != "seamonkey") {
            // Replace the document currently loaded in the browser's sidebar.
            // This will prevent false positives for tests that were the last
            // to touch the sidebar. They will thus not be blamed for leaking
            // a document.
            let sidebar = document.getElementById("sidebar");
            if (sidebar) {
              sidebar.setAttribute("src", "data:text/html;charset=utf-8,");
              sidebar.docShell.createAboutBlankDocumentViewer(null, null);
              sidebar.setAttribute("src", "about:blank");
            }
          }

          // Destroy BackgroundPageThumbs resources.
          let { BackgroundPageThumbs } = ChromeUtils.importESModule(
            "resource://gre/modules/BackgroundPageThumbs.sys.mjs"
          );
          BackgroundPageThumbs._destroy();

          if (window.gBrowser) {
            NewTabPagePreloading.removePreloadedBrowser(window);
          }
        }

        // Schedule GC and CC runs before finishing in order to detect
        // DOM windows leaked by our tests or the tested code. Note that we
        // use a shrinking GC so that the JS engine will discard JIT code and
        // JIT caches more aggressively.

        let shutdownCleanup = aCallback => {
          Cu.schedulePreciseShrinkingGC(() => {
            // Run the GC and CC a few times to make sure that as much
            // as possible is freed.
            let numCycles = 3;
            for (let i = 0; i < numCycles; i++) {
              Cu.forceGC();
              Cu.forceCC();
            }
            aCallback();
          });
        };

        let { AsyncShutdown } = ChromeUtils.importESModule(
          "resource://gre/modules/AsyncShutdown.sys.mjs"
        );

        let barrier = new AsyncShutdown.Barrier(
          "ShutdownLeaks: Wait for cleanup to be finished before checking for leaks"
        );
        Services.obs.notifyObservers(
          { wrappedJSObject: barrier },
          "shutdown-leaks-before-check"
        );

        barrier.client.addBlocker(
          "ShutdownLeaks: Wait for tabs to finish closing",
          TabDestroyObserver.wait()
        );

        barrier.wait().then(() => {
          // Simulate memory pressure so that we're forced to free more resources
          // and thus get rid of more false leaks like already terminated workers.
          Services.obs.notifyObservers(
            null,
            "memory-pressure",
            "heap-minimize"
          );

          Services.ppmm.broadcastAsyncMessage("browser-test:collect-request");

          shutdownCleanup(() => {
            setTimeout(() => {
              shutdownCleanup(() => {
                this.finish();
              });
            }, 1000);
          });
        });

        return;
      }

      if (this.repeat > 0) {
        --this.repeat;
        if (this.currentTestIndex < 0) {
          this.currentTestIndex = 0;
        }
        this.execTest();
      } else {
        this.currentTestIndex++;
        if (gConfig.repeat) {
          this.repeat = gConfig.repeat;
        }
        this.execTest();
      }
    });
  },

  async handleTask(task, currentTest, PromiseTestUtils, isSetup = false) {
    let currentScope = currentTest.scope;
    let desc = isSetup ? "setup" : "test";
    currentScope.SimpleTest.info(`Entering ${desc} ${task.name}`);
    let startTimestamp = performance.now();
    try {
      let result = await task();
      if (isGenerator(result)) {
        currentScope.SimpleTest.ok(false, "Task returned a generator");
      }
    } catch (ex) {
      if (currentTest.timedOut) {
        currentTest.addResult(
          new testResult({
            name: `Uncaught exception received from previously timed out ${desc} ${task.name}`,
            pass: false,
            ex,
            stack: typeof ex == "object" && "stack" in ex ? ex.stack : null,
            allowFailure: currentTest.allowFailure,
          })
        );
        // We timed out, so we've already cleaned up for this test, just get outta here.
        return;
      }
      currentTest.addResult(
        new testResult({
          name: `Uncaught exception in ${desc} ${task.name}`,
          pass: currentScope.SimpleTest.isExpectingUncaughtException(),
          ex,
          stack: typeof ex == "object" && "stack" in ex ? ex.stack : null,
          allowFailure: currentTest.allowFailure,
        })
      );
    }
    PromiseTestUtils.assertNoUncaughtRejections();
    ChromeUtils.addProfilerMarker(
      isSetup ? "setup-task" : "task",
      { category: "Test", startTime: startTimestamp },
      task.name.replace(/^bound /, "") || undefined
    );
    currentScope.SimpleTest.info(`Leaving ${desc} ${task.name}`);
  },

  async _runTaskBasedTest(currentTest) {
    let currentScope = currentTest.scope;

    // First run all the setups:
    let setupFn;
    while ((setupFn = currentScope.__setups.shift())) {
      await this.handleTask(
        setupFn,
        currentTest,
        this.PromiseTestUtils,
        true /* is setup task */
      );
    }

    // Allow for a task to be skipped; we need only use the structured logger
    // for this, whilst deactivating log buffering to ensure that messages
    // are always printed to stdout.
    let skipTask = task => {
      let logger = this.structuredLogger;
      logger.deactivateBuffering();
      logger.testStatus(this.currentTest.path, task.name, "SKIP");
      logger.warning("Skipping test " + task.name);
      logger.activateBuffering();
    };

    let task;
    while ((task = currentScope.__tasks.shift())) {
      if (
        task.__skipMe ||
        (currentScope.__runOnlyThisTask &&
          task != currentScope.__runOnlyThisTask)
      ) {
        skipTask(task);
        continue;
      }
      await this.handleTask(task, currentTest, this.PromiseTestUtils);
    }
    currentScope.finish();
  },

  execTest: function Tester_execTest() {
    this.structuredLogger.testStart(this.currentTest.path);

    this.SimpleTest.reset();
    // Reset accessibility environment.
    this.AccessibilityUtils.reset(this.a11y_checks, this.currentTest.path);

    // Load the tests into a testscope
    let currentScope = (this.currentTest.scope = new testScope(
      this,
      this.currentTest,
      this.currentTest.expected
    ));
    let currentTest = this.currentTest;

    // HTTPS-First (Bug 1704453) TODO: in case a test is annoated
    // with https_first_disabled then we explicitly flip the pref
    // dom.security.https_first to false for the duration of the test.
    if (currentTest.https_first_disabled) {
      window.SpecialPowers.pushPrefEnv({
        set: [["dom.security.https_first", false]],
      });
    }

    if (currentTest.allow_xul_xbl) {
      window.SpecialPowers.pushPermissions([
        { type: "allowXULXBL", allow: true, context: "http://mochi.test:8888" },
        { type: "allowXULXBL", allow: true, context: "http://example.org" },
      ]);
    }

    // Import utils in the test scope.
    let { scope } = this.currentTest;
    scope.EventUtils = this.EventUtils;
    scope.AccessibilityUtils = this.AccessibilityUtils;
    scope.SimpleTest = this.SimpleTest;
    scope.gTestPath = this.currentTest.path;
    scope.ContentTask = this.ContentTask;
    scope.BrowserTestUtils = this.BrowserTestUtils;
    scope.TestUtils = this.TestUtils;
    scope.ExtensionTestUtils = this.ExtensionTestUtils;
    // Pass a custom report function for mochitest style reporting.
    scope.Assert = new this.Assert(function (err, message, stack) {
      currentTest.addResult(
        new testResult(
          err
            ? {
                name: err.message,
                ex: err.stack,
                stack: err.stack,
                allowFailure: currentTest.allowFailure,
              }
            : {
                name: message,
                pass: true,
                stack,
                allowFailure: currentTest.allowFailure,
              }
        )
      );
    }, true);

    this.ContentTask.setTestScope(currentScope);

    // Allow Assert.sys.mjs methods to be tacked to the current scope.
    scope.export_assertions = function () {
      for (let func in this.Assert) {
        this[func] = this.Assert[func].bind(this.Assert);
      }
    };

    // Override SimpleTest methods with ours.
    SIMPLETEST_OVERRIDES.forEach(function (m) {
      this.SimpleTest[m] = this[m];
    }, scope);

    // load the tools to work with chrome .jar and remote
    try {
      this._scriptLoader.loadSubScript(
        "chrome://mochikit/content/chrome-harness.js",
        scope
      );
    } catch (ex) {
      /* no chrome-harness tools */
    }

    // Ensure we are not idle at the beginning of the test. If we don't do this,
    // the browser may behave differently if the previous tests ran long.
    // eg. the session store behavior changes 3 minutes after the last user event.
    Cc["@mozilla.org/widget/useridleservice;1"]
      .getService(Ci.nsIUserIdleServiceInternal)
      .resetIdleTimeOut(0);

    // Import head.js script if it exists.
    var currentTestDirPath = this.currentTest.path.substr(
      0,
      this.currentTest.path.lastIndexOf("/")
    );
    var headPath = currentTestDirPath + "/head.js";
    try {
      this._scriptLoader.loadSubScript(headPath, scope);
    } catch (ex) {
      // Bug 755558 - Ignore loadSubScript errors due to a missing head.js.
      const isImportError = /^Error opening input stream/.test(ex.toString());

      // Bug 1503169 - head.js may call loadSubScript, and generate similar errors.
      // Only swallow errors that are strictly related to loading head.js.
      const containsHeadPath = ex.toString().includes(headPath);

      if (!isImportError || !containsHeadPath) {
        this.currentTest.addResult(
          new testResult({
            name: "head.js import threw an exception",
            ex,
          })
        );
      }
    }

    // Import the test script.
    try {
      this.lastStartTimestamp = performance.now();
      this.TestUtils.promiseTestFinished = new Promise(resolve => {
        this.resolveFinishTestPromise = resolve;
      });
      this._scriptLoader.loadSubScript(this.currentTest.path, scope);
      // Run the test
      this.lastStartTime = Date.now();
      if (this.currentTest.scope.__tasks) {
        // This test consists of tasks, added via the `add_task()` API.
        if ("test" in this.currentTest.scope) {
          throw new Error(
            "Cannot run both a add_task test and a normal test at the same time."
          );
        }
        // Spin off the async work without waiting for it to complete.
        // It'll call finish() when it's done.
        this._runTaskBasedTest(this.currentTest);
      } else if (typeof scope.test == "function") {
        scope.test();
      } else {
        throw new Error(
          "This test didn't call add_task, nor did it define a generatorTest() function, nor did it define a test() function, so we don't know how to run it."
        );
      }
    } catch (ex) {
      if (!this.SimpleTest.isIgnoringAllUncaughtExceptions()) {
        this.currentTest.addResult(
          new testResult({
            name: "Exception thrown",
            pass: this.SimpleTest.isExpectingUncaughtException(),
            ex,
            allowFailure: this.currentTest.allowFailure,
          })
        );
        this.SimpleTest.expectUncaughtException(false);
      } else {
        this.currentTest.addResult(new testMessage("Exception thrown: " + ex));
      }
      this.currentTest.scope.finish();
    }

    // If the test ran synchronously, move to the next test, otherwise the test
    // will trigger the next test when it is done.
    if (this.currentTest.scope.__done) {
      this.nextTest();
    } else {
      var self = this;
      var timeoutExpires = Date.now() + gTimeoutSeconds * 1000;
      var waitUntilAtLeast = timeoutExpires - 1000;
      this.currentTest.scope.__waitTimer =
        this.SimpleTest._originalSetTimeout.apply(window, [
          function timeoutFn() {
            // We sometimes get woken up long before the gTimeoutSeconds
            // have elapsed (when running in chaos mode for example). This
            // code ensures that we don't wrongly time out in that case.
            if (Date.now() < waitUntilAtLeast) {
              self.currentTest.scope.__waitTimer = setTimeout(
                timeoutFn,
                timeoutExpires - Date.now()
              );
              return;
            }

            if (--self.currentTest.scope.__timeoutFactor > 0) {
              // We were asked to wait a bit longer.
              self.currentTest.scope.info(
                "Longer timeout required, waiting longer...  Remaining timeouts: " +
                  self.currentTest.scope.__timeoutFactor
              );
              self.currentTest.scope.__waitTimer = setTimeout(
                timeoutFn,
                gTimeoutSeconds * 1000
              );
              return;
            }

            // If the test is taking longer than expected, but it's not hanging,
            // mark the fact, but let the test continue.  At the end of the test,
            // if it didn't timeout, we will notify the problem through an error.
            // To figure whether it's an actual hang, compare the time of the last
            // result or message to half of the timeout time.
            // Though, to protect against infinite loops, limit the number of times
            // we allow the test to proceed.
            const MAX_UNEXPECTED_TIMEOUTS = 10;
            if (
              Date.now() - self.currentTest.lastOutputTime <
                (gTimeoutSeconds / 2) * 1000 &&
              ++self.currentTest.unexpectedTimeouts <= MAX_UNEXPECTED_TIMEOUTS
            ) {
              self.currentTest.scope.__waitTimer = setTimeout(
                timeoutFn,
                gTimeoutSeconds * 1000
              );
              return;
            }

            let knownFailure = false;
            if (gConfig.timeoutAsPass) {
              knownFailure = true;
            }
            self.currentTest.addResult(
              new testResult({
                name: "Test timed out",
                allowFailure: knownFailure,
              })
            );
            self.currentTest.timedOut = true;
            self.currentTest.scope.__waitTimer = null;
            if (gConfig.timeoutAsPass) {
              self.nextTest();
            } else {
              self.finish();
            }
          },
          gTimeoutSeconds * 1000,
        ]);
    }
  },

  QueryInterface: ChromeUtils.generateQI(["nsIConsoleListener"]),
};

// Note: duplicated in SimpleTest.js . See also bug 1820150.
function isErrorOrException(err) {
  // It'd be nice if we had either `Error.isError(err)` or `Error.isInstance(err)`
  // but we don't, so do it ourselves:
  if (!err) {
    return false;
  }
  if (err instanceof Ci.nsIException) {
    return true;
  }
  try {
    let glob = Cu.getGlobalForObject(err);
    return err instanceof glob.Error;
  } catch {
    // getGlobalForObject can be upset if it doesn't get passed an object.
    // Just do a standard instanceof check using this global and cross fingers:
  }
  return err instanceof Error;
}

/**
 * Represents the result of one test assertion. This is described with a string
 * in traditional logging, and has a "status" and "expected" property used in
 * structured logging. Normally, results are mapped as follows:
 *
 *   pass:    todo:    Added to:    Described as:           Status:  Expected:
 *     true     false    passCount    TEST-PASS               PASS     PASS
 *     true     true     todoCount    TEST-KNOWN-FAIL         FAIL     FAIL
 *     false    false    failCount    TEST-UNEXPECTED-FAIL    FAIL     PASS
 *     false    true     failCount    TEST-UNEXPECTED-PASS    PASS     FAIL
 *
 * The "allowFailure" argument indicates that this is one of the assertions that
 * should be allowed to fail, for example because "fail-if" is true for the
 * current test file in the manifest. In this case, results are mapped this way:
 *
 *   pass:    todo:    Added to:    Described as:           Status:  Expected:
 *     true     false    passCount    TEST-PASS               PASS     PASS
 *     true     true     todoCount    TEST-KNOWN-FAIL         FAIL     FAIL
 *     false    false    todoCount    TEST-KNOWN-FAIL         FAIL     FAIL
 *     false    true     todoCount    TEST-KNOWN-FAIL         FAIL     FAIL
 */
function testResult({ name, pass, todo, ex, stack, allowFailure }) {
  this.info = false;
  this.name = name;
  this.msg = "";

  if (allowFailure && !pass) {
    this.allowedFailure = true;
    this.pass = true;
    this.todo = false;
  } else if (allowFailure && pass) {
    this.pass = true;
    this.todo = false;
  } else {
    this.pass = !!pass;
    this.todo = todo;
  }

  this.expected = this.todo ? "FAIL" : "PASS";

  if (this.pass) {
    this.status = this.expected;
    return;
  }

  this.status = this.todo ? "PASS" : "FAIL";

  if (ex) {
    if (typeof ex == "object" && "fileName" in ex) {
      // we have an exception - print filename and linenumber information
      this.msg += "at " + ex.fileName + ":" + ex.lineNumber + " - ";
    }

    if (
      typeof ex == "string" ||
      (typeof ex == "object" && isErrorOrException(ex))
    ) {
      this.msg += String(ex);
    } else {
      try {
        this.msg += JSON.stringify(ex);
      } catch {
        this.msg += String(ex);
      }
    }
  }

  if (stack) {
    this.msg += "\nStack trace:\n";
    let normalized;
    if (stack instanceof Ci.nsIStackFrame) {
      let frames = [];
      for (
        let frame = stack;
        frame;
        frame = frame.asyncCaller || frame.caller
      ) {
        let msg = `${frame.filename}:${frame.name}:${frame.lineNumber}`;
        frames.push(frame.asyncCause ? `${frame.asyncCause}*${msg}` : msg);
      }
      normalized = frames.join("\n");
    } else {
      normalized = "" + stack;
    }
    this.msg += normalized;
  }

  if (gConfig.debugOnFailure) {
    // You've hit this line because you requested to break into the
    // debugger upon a testcase failure on your test run.
    // eslint-disable-next-line no-debugger
    debugger;
  }
}

function testMessage(msg) {
  this.msg = msg || "";
  this.info = true;
}

// Need to be careful adding properties to this object, since its properties
// cannot conflict with global variables used in tests.
function testScope(aTester, aTest, expected) {
  this.__tester = aTester;

  aTest.allowFailure = expected == "fail";

  var self = this;
  this.ok = function test_ok(condition, name) {
    if (arguments.length > 2) {
      const ex = "Too many arguments passed to ok(condition, name)`.";
      self.record(false, name, ex);
    } else {
      self.record(condition, name);
    }
  };
  this.record = function test_record(condition, name, ex, stack, expected) {
    if (expected == "fail") {
      aTest.addResult(
        new testResult({
          name,
          pass: !condition,
          todo: true,
          ex,
          stack: stack || Components.stack.caller,
          allowFailure: aTest.allowFailure,
        })
      );
    } else {
      aTest.addResult(
        new testResult({
          name,
          pass: condition,
          ex,
          stack: stack || Components.stack.caller,
          allowFailure: aTest.allowFailure,
        })
      );
    }
  };
  this.is = function test_is(a, b, name) {
    self.record(
      Object.is(a, b),
      name,
      `Got ${self.repr(a)}, expected ${self.repr(b)}`,
      false,
      Components.stack.caller
    );
  };
  this.isfuzzy = function test_isfuzzy(a, b, epsilon, name) {
    self.record(
      a >= b - epsilon && a <= b + epsilon,
      name,
      `Got ${self.repr(a)}, expected ${self.repr(b)} epsilon: +/- ${self.repr(
        epsilon
      )}`,
      false,
      Components.stack.caller
    );
  };
  this.isnot = function test_isnot(a, b, name) {
    self.record(
      !Object.is(a, b),
      name,
      `Didn't expect ${self.repr(a)}, but got it`,
      false,
      Components.stack.caller
    );
  };
  this.todo = function test_todo(condition, name, ex, stack) {
    aTest.addResult(
      new testResult({
        name,
        pass: !condition,
        todo: true,
        ex,
        stack: stack || Components.stack.caller,
        allowFailure: aTest.allowFailure,
      })
    );
  };
  this.todo_is = function test_todo_is(a, b, name) {
    self.todo(
      Object.is(a, b),
      name,
      `Got ${self.repr(a)}, expected ${self.repr(b)}`,
      Components.stack.caller
    );
  };
  this.todo_isnot = function test_todo_isnot(a, b, name) {
    self.todo(
      !Object.is(a, b),
      name,
      `Didn't expect ${self.repr(a)}, but got it`,
      Components.stack.caller
    );
  };
  this.info = function test_info(name) {
    aTest.addResult(new testMessage(name));
  };
  this.repr = function repr(o) {
    if (typeof o == "undefined") {
      return "undefined";
    } else if (o === null) {
      return "null";
    }
    try {
      if (typeof o.__repr__ == "function") {
        return o.__repr__();
      } else if (typeof o.repr == "function" && o.repr != repr) {
        return o.repr();
      }
    } catch (e) {}
    try {
      if (
        typeof o.NAME == "string" &&
        (o.toString == Function.prototype.toString ||
          o.toString == Object.prototype.toString)
      ) {
        return o.NAME;
      }
    } catch (e) {}
    var ostring;
    try {
      if (Object.is(o, +0)) {
        ostring = "+0";
      } else if (Object.is(o, -0)) {
        ostring = "-0";
      } else if (typeof o === "string") {
        ostring = JSON.stringify(o);
      } else if (Array.isArray(o)) {
        ostring = "[" + o.map(val => repr(val)).join(", ") + "]";
      } else {
        ostring = String(o);
      }
    } catch (e) {
      return `[${Object.prototype.toString.call(o)}]`;
    }
    if (typeof o == "function") {
      ostring = ostring.replace(/\) \{[^]*/, ") { ... }");
    }
    return ostring;
  };

  this.executeSoon = function test_executeSoon(func) {
    Services.tm.dispatchToMainThread({
      run() {
        func();
      },
    });
  };

  this.waitForExplicitFinish = function test_waitForExplicitFinish() {
    self.__done = false;
  };

  this.waitForFocus = function test_waitForFocus(
    callback,
    targetWindow,
    expectBlankPage
  ) {
    self.SimpleTest.waitForFocus(callback, targetWindow, expectBlankPage);
  };

  this.waitForClipboard = function test_waitForClipboard(
    expected,
    setup,
    success,
    failure,
    flavor
  ) {
    self.SimpleTest.waitForClipboard(expected, setup, success, failure, flavor);
  };

  this.registerCleanupFunction = function test_registerCleanupFunction(
    aFunction
  ) {
    self.__cleanupFunctions.push(aFunction);
  };

  this.requestLongerTimeout = function test_requestLongerTimeout(aFactor) {
    self.__timeoutFactor = aFactor;
  };

  this.expectUncaughtException = function test_expectUncaughtException(
    aExpecting
  ) {
    self.SimpleTest.expectUncaughtException(aExpecting);
  };

  this.ignoreAllUncaughtExceptions = function test_ignoreAllUncaughtExceptions(
    aIgnoring
  ) {
    self.SimpleTest.ignoreAllUncaughtExceptions(aIgnoring);
  };

  this.expectAssertions = function test_expectAssertions(aMin, aMax) {
    let min = aMin;
    let max = aMax;
    if (typeof max == "undefined") {
      max = min;
    }
    if (
      typeof min != "number" ||
      typeof max != "number" ||
      min < 0 ||
      max < min
    ) {
      throw new Error("bad parameter to expectAssertions");
    }
    self.__expectedMinAsserts = min;
    self.__expectedMaxAsserts = max;
  };

  this.setExpectedFailuresForSelfTest =
    function test_setExpectedFailuresForSelfTest(expectedAllowedFailureCount) {
      aTest.allowFailure = true;
      aTest.expectedAllowedFailureCount = expectedAllowedFailureCount;
    };

  this.finish = function test_finish() {
    self.__done = true;
    if (self.__waitTimer) {
      self.executeSoon(function () {
        if (self.__done && self.__waitTimer) {
          clearTimeout(self.__waitTimer);
          self.__waitTimer = null;
          self.__tester.nextTest();
        }
      });
    }
  };

  this.requestCompleteLog = function test_requestCompleteLog() {
    self.__tester.structuredLogger.deactivateBuffering();
    self.registerCleanupFunction(function () {
      self.__tester.structuredLogger.activateBuffering();
    });
  };

  return this;
}

function decorateTaskFn(fn) {
  fn = fn.bind(this);
  fn.skip = (val = true) => (fn.__skipMe = val);
  fn.only = () => (this.__runOnlyThisTask = fn);
  return fn;
}

testScope.prototype = {
  __done: true,
  __tasks: null,
  __setups: [],
  __runOnlyThisTask: null,
  __waitTimer: null,
  __cleanupFunctions: [],
  __timeoutFactor: 1,
  __expectedMinAsserts: 0,
  __expectedMaxAsserts: 0,

  EventUtils: {},
  AccessibilityUtils: {},
  SimpleTest: {},
  ContentTask: null,
  BrowserTestUtils: null,
  TestUtils: null,
  ExtensionTestUtils: null,
  Assert: null,

  /**
   * Add a function which returns a promise (usually an async function)
   * as a test task.
   *
   * The task ends when the promise returned by the function resolves or
   * rejects. If the test function throws, or the promise it returns
   * rejects, the test is reported as a failure. Execution continues
   * with the next test function.
   *
   * Example usage:
   *
   * add_task(async function test() {
   *   let result = await Promise.resolve(true);
   *
   *   ok(result);
   *
   *   let secondary = await someFunctionThatReturnsAPromise(result);
   *   is(secondary, "expected value");
   * });
   *
   * add_task(async function test_early_return() {
   *   let result = await somethingThatReturnsAPromise();
   *
   *   if (!result) {
   *     // Test is ended immediately, with success.
   *     return;
   *   }
   *
   *   is(result, "foo");
   * });
   */
  add_task(aFunction) {
    if (!this.__tasks) {
      this.waitForExplicitFinish();
      this.__tasks = [];
    }
    let bound = decorateTaskFn.call(this, aFunction);
    this.__tasks.push(bound);
    return bound;
  },

  add_setup(aFunction) {
    if (!this.__setups.length) {
      this.waitForExplicitFinish();
    }
    let bound = aFunction.bind(this);
    this.__setups.push(bound);
    return bound;
  },

  destroy: function test_destroy() {
    for (let prop in this) {
      delete this[prop];
    }
  },
};
