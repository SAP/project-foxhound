ChromeUtils.defineESModuleGetters(this, {
  AppProvidedConfigEngine:
    "moz-src:///toolkit/components/search/ConfigSearchEngine.sys.mjs",
  HttpServer: "resource://testing-common/httpd.sys.mjs",
  ObjectUtils: "resource://gre/modules/ObjectUtils.sys.mjs",
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  Preferences: "resource://gre/modules/Preferences.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  TopSites: "resource:///modules/topsites/TopSites.sys.mjs",
  UrlbarProvider: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
  ProvidersManager:
    "moz-src:///browser/components/urlbar/UrlbarProvidersManager.sys.mjs",
  UrlbarResult: "chrome://browser/content/urlbar/UrlbarResult.mjs",
  UrlbarShared: "chrome://browser/content/urlbar/UrlbarShared.mjs",
  UrlbarTokenizer:
    "moz-src:///browser/components/urlbar/UrlbarTokenizer.sys.mjs",
  UrlbarUtils: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "TEST_BASE_URL", () =>
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  )
);

XPCOMUtils.defineLazyServiceGetter(
  this,
  "clipboardHelper",
  "@mozilla.org/widget/clipboardhelper;1",
  Ci.nsIClipboardHelper
);

ChromeUtils.defineLazyGetter(this, "PlacesFrecencyRecalculator", () => {
  return Cc["@mozilla.org/places/frecency-recalculator;1"].getService(
    Ci.nsIObserver
  ).wrappedJSObject;
});

ChromeUtils.defineLazyGetter(this, "UrlbarTestUtils", () => {
  const { UrlbarTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/UrlbarTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

ChromeUtils.defineLazyGetter(this, "SearchbarTestUtils", () => {
  const { SearchbarTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/UrlbarTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

ChromeUtils.defineLazyGetter(this, "SearchTestUtils", () => {
  const { SearchTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/SearchTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

/**
 * Initializes an HTTP Server, and runs a task with it.
 *
 * @param {object} details {scheme, host, port}
 * @param {Function} taskFn The task to run, gets the server as argument.
 */
async function withHttpServer(
  details = { scheme: "http", host: "localhost", port: -1 },
  taskFn
) {
  let server = new HttpServer();
  let url = `${details.scheme}://${details.host}:${details.port}`;
  try {
    info(`starting HTTP Server for ${url}`);
    try {
      server.start(details.port);
      details.port = server.identity.primaryPort;
      server.identity.setPrimary(details.scheme, details.host, details.port);
    } catch (ex) {
      throw new Error("We can't launch our http server successfully. " + ex);
    }
    Assert.ok(
      server.identity.has(details.scheme, details.host, details.port),
      `${url} is listening.`
    );
    try {
      await taskFn(server);
    } catch (ex) {
      throw new Error("Exception in the task function " + ex);
    }
  } finally {
    server.identity.remove(details.scheme, details.host, details.port);
    try {
      await new Promise(resolve => server.stop(resolve));
    } catch (ex) {}
    server = null;
  }
}

/**
 * Updates the Top Sites feed.
 *
 * @param {Function} condition
 *   A callback that returns true after Top Sites are successfully updated.
 * @param {boolean} searchShortcuts
 *   True if Top Sites search shortcuts should be enabled.
 */
async function updateTopSites(condition, searchShortcuts = false) {
  // Toggle the pref to clear the feed cache and force an update.
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.newtabpage.activity-stream.discoverystream.endpointSpocsClear",
        "",
      ],
      ["browser.newtabpage.activity-stream.feeds.system.topsites", false],
      ["browser.newtabpage.activity-stream.feeds.system.topsites", true],
      [
        "browser.newtabpage.activity-stream.improvesearch.topSiteSearchShortcuts",
        searchShortcuts,
      ],
    ],
  });

  if (Services.prefs.getBoolPref("browser.topsites.component.enabled")) {
    // The previous way of updating Top Sites was to toggle the preference which
    // removes the instance of the Top Sites Feed and re-creates it.
    TopSites.uninit();
    await TopSites.init();
  }

  // Wait for the feed to be updated.
  await TestUtils.waitForCondition(async () => {
    let sites;
    if (Services.prefs.getBoolPref("browser.topsites.component.enabled")) {
      sites = await TopSites.getSites();
    } else {
      sites = AboutNewTab.getTopSites();
    }
    return condition(sites);
  }, "Waiting for top sites to be updated");

  if (!Services.prefs.getBoolPref("browser.topsites.component.enabled")) {
    let feed = AboutNewTab.activityStream?.store?.feeds.get(
      "feeds.system.topsites"
    );
    await feed?._latestRefreshPromise;
  }
}

async function installPersistTestEngines(globalDefault = "Example") {
  const CONFIG_V2 = [
    {
      recordType: "engine",
      identifier: "Example",
      base: {
        name: "Example",
        urls: {
          search: {
            base: "https://www.example.com/",
            searchTermParamName: "q",
          },
        },
      },
    },
    {
      recordType: "engine",
      identifier: "MochiSearch",
      base: {
        name: "MochiSearch",
        urls: {
          search: {
            base: "http://mochi.test:8888/",
            searchTermParamName: "q",
          },
        },
      },
    },
    {
      recordType: "defaultEngines",
      globalDefault,
      specificDefaults: [],
    },
  ];
  let persistSandbox = sinon.createSandbox();
  // Mostly to prevent warnings about missing icon urls for these engines.
  persistSandbox
    .stub(AppProvidedConfigEngine.prototype, "getIconURL")
    .returns(
      Promise.resolve(
        "data:image/x-icon;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="
      )
    );
  info("Install Search Engines related to Persisted Search Tests");
  info(globalDefault);
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG_V2);
  return () => {
    persistSandbox.restore();
  };
}

async function resetApplicationProvidedEngines() {
  let settingsWritten = SearchTestUtils.promiseSearchNotification(
    "write-settings-to-disk-complete"
  );
  await SearchTestUtils.updateRemoteSettingsConfig();
  await settingsWritten;
}

/**
 * Wait for 10 idle dispatches. This function should not be used in new tests.
 * Bug 2032010 will investigate removing it.
 */
async function flakyWaitForManyIdles() {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => Services.tm.idleDispatchToMainThread(resolve));
  }
}

async function startCustomizing(win = window) {
  if (!win.document.documentElement.hasAttribute("customizing")) {
    let eventPromise = BrowserTestUtils.waitForEvent(
      win.gNavToolbox,
      "customizationready"
    );
    win.gCustomizeMode.enter();
    await eventPromise;
  }
}

async function endCustomizing(win = window) {
  if (win.document.documentElement.hasAttribute("customizing")) {
    let eventPromise = BrowserTestUtils.waitForEvent(
      win.gNavToolbox,
      "aftercustomization"
    );
    win.gCustomizeMode.exit();
    await eventPromise;
  }
}

/**
 * This function does the following:
 *
 * 1. Starts a search with `searchString` but doesn't wait for it to complete.
 * 2. Compares the input value to `valueBefore`. If anything is autofilled at
 *    this point, it will be due to the placeholder.
 * 3. Waits for the search to complete.
 * 4. Compares the input value to `valueAfter`. If anything is autofilled at
 *    this point, it will be due to the autofill result fetched by the search.
 * 5. Compares the placeholder to `placeholderAfter`.
 *
 * @param {object} options
 *   The options object.
 * @param {string} options.searchString
 *   The search string.
 * @param {string} options.valueBefore
 *   The expected input value before the search completes.
 * @param {string} options.valueAfter
 *   The expected input value after the search completes.
 * @param {string} options.placeholderAfter
 *   The expected placeholder value after the search completes.
 * @returns {Promise}
 */
async function search({
  searchString,
  valueBefore,
  valueAfter,
  placeholderAfter,
}) {
  info(
    "Searching: " +
      JSON.stringify({
        searchString,
        valueBefore,
        valueAfter,
        placeholderAfter,
      })
  );

  await SimpleTest.promiseFocus(window);
  gURLBar.inputField.focus();

  // Set the input value and move the caret to the end to simulate the user
  // typing. It's important the caret is at the end because otherwise autofill
  // won't happen.
  gURLBar._setValue(searchString);
  gURLBar.inputField.setSelectionRange(
    searchString.length,
    searchString.length
  );

  // Placeholder autofill is done on input, so fire an input event. We can't use
  // `promiseAutocompleteResultPopup()` or other helpers that wait for the
  // search to complete because we are specifically checking placeholder
  // autofill before the search completes.
  UrlbarTestUtils.fireInputEvent(window);

  // Check the input value and selection immediately, before waiting on the
  // search to complete.
  Assert.equal(
    gURLBar.value,
    valueBefore,
    "gURLBar.value before the search completes"
  );
  Assert.equal(
    gURLBar.selectionStart,
    searchString.length,
    "gURLBar.selectionStart before the search completes"
  );
  Assert.equal(
    gURLBar.selectionEnd,
    valueBefore.length,
    "gURLBar.selectionEnd before the search completes"
  );

  // Wait for the search to complete.
  info("Waiting for the search to complete");
  await UrlbarTestUtils.promiseSearchComplete(window);

  // Check the final value after the results arrived.
  Assert.equal(
    gURLBar.value,
    valueAfter,
    "gURLBar.value after the search completes"
  );
  Assert.equal(
    gURLBar.selectionStart,
    searchString.length,
    "gURLBar.selectionStart after the search completes"
  );
  Assert.equal(
    gURLBar.selectionEnd,
    valueAfter.length,
    "gURLBar.selectionEnd after the search completes"
  );

  // Check the placeholder.
  if (placeholderAfter) {
    Assert.ok(
      gURLBar._autofillPlaceholder,
      "gURLBar._autofillPlaceholder exists after the search completes"
    );
    Assert.strictEqual(
      gURLBar._autofillPlaceholder.value,
      placeholderAfter,
      "gURLBar._autofillPlaceholder.value after the search completes"
    );
  } else {
    Assert.strictEqual(
      gURLBar._autofillPlaceholder,
      null,
      "gURLBar._autofillPlaceholder does not exist after the search completes"
    );
  }

  // Check the first result.
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    !!details.autofill,
    !!placeholderAfter,
    "First result is an autofill result iff a placeholder is expected"
  );
}

/**
 * Waits for a load starting in any browser or a timeout, whichever comes first.
 *
 * @param {window} win
 *   The top-level browser window to listen in.
 * @param {number} timeoutMs
 *   The timeout in ms.
 * @returns {Promise} resolved to the loading uri in case of load, rejected in
 *   case of timeout.
 */
function waitForLoadStartOrTimeout(win = window, timeoutMs = 1000) {
  let listener;
  let timeout;
  return Promise.race([
    new Promise(resolve => {
      listener = {
        onStateChange(browser, webprogress, request, flags) {
          if (flags & Ci.nsIWebProgressListener.STATE_START) {
            resolve(request.QueryInterface(Ci.nsIChannel).URI);
          }
        },
      };
      win.gBrowser.addTabsProgressListener(listener);
    }),
    new Promise((resolve, reject) => {
      timeout = win.setTimeout(() => reject("timed out"), timeoutMs);
    }),
  ]).finally(() => {
    win.gBrowser.removeTabsProgressListener(listener);
    win.clearTimeout(timeout);
  });
}
