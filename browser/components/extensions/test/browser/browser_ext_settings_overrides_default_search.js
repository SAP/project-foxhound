/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  SearchTestUtils: "resource://testing-common/SearchTestUtils.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
});

XPCOMUtils.defineLazyModuleGetters(this, {
  AddonManager: "resource://gre/modules/AddonManager.jsm",
  AddonTestUtils: "resource://testing-common/AddonTestUtils.jsm",
});

const EXTENSION1_ID = "extension1@mozilla.com";
const EXTENSION2_ID = "extension2@mozilla.com";
const DEFAULT_SEARCH_STORE_TYPE = "default_search";
const DEFAULT_SEARCH_SETTING_NAME = "defaultSearch";

AddonTestUtils.initMochitest(this);
SearchTestUtils.init(this);

const DEFAULT_ENGINE = {
  id: "basic",
  name: "basic",
  loadPath: "[addon]basic@search.mozilla.org",
  submissionUrl:
    "https://mochi.test:8888/browser/browser/components/search/test/browser/?search=&foo=1",
};
const ALTERNATE_ENGINE = {
  id: "simple",
  name: "Simple Engine",
  loadPath: "[addon]simple@search.mozilla.org",
  submissionUrl: "https://example.com/?sourceId=Mozilla-search&search=",
};
const ALTERNATE2_ENGINE = {
  id: "simple",
  name: "another",
  loadPath: "",
  submissionUrl: "",
};

async function restoreDefaultEngine() {
  let engine = Services.search.getEngineByName(DEFAULT_ENGINE.name);
  await Services.search.setDefault(
    engine,
    Ci.nsISearchService.CHANGE_REASON_UNKNOWN
  );
}

function clearTelemetry() {
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();
}

async function checkTelemetry(source, prevEngine, newEngine) {
  TelemetryTestUtils.assertEvents(
    [
      {
        object: "change_default",
        value: source,
        extra: {
          prev_id: prevEngine.id,
          new_id: newEngine.id,
          new_name: newEngine.name,
          new_load_path: newEngine.loadPath,
          // Telemetry has a limit of 80 characters.
          new_sub_url: newEngine.submissionUrl.slice(0, 80),
        },
      },
    ],
    { category: "search", method: "engine" }
  );

  let snapshot = await Glean.searchEngineDefault.changed.testGetValue();
  delete snapshot[0].timestamp;
  Assert.deepEqual(
    snapshot[0],
    {
      category: "search.engine.default",
      name: "changed",
      extra: {
        change_source: source,
        previous_engine_id: prevEngine.id,
        new_engine_id: newEngine.id,
        new_display_name: newEngine.name,
        new_load_path: newEngine.loadPath,
        new_submission_url: newEngine.submissionUrl,
      },
    },
    "Should have received the correct event details"
  );
}

add_setup(async function() {
  let searchExtensions = getChromeDir(getResolvedURI(gTestPath));
  searchExtensions.append("search-engines");

  await SearchTestUtils.useMochitestEngines(searchExtensions);

  SearchTestUtils.useMockIdleService();
  let response = await fetch(`resource://search-extensions/engines.json`);
  let json = await response.json();
  await SearchTestUtils.updateRemoteSettingsConfig(json.data);

  registerCleanupFunction(async () => {
    let settingsWritten = SearchTestUtils.promiseSearchNotification(
      "write-settings-to-disk-complete"
    );
    await SearchTestUtils.updateRemoteSettingsConfig();
    await settingsWritten;
  });
});

/* This tests setting a default engine. */
add_task(async function test_extension_setting_default_engine() {
  clearTelemetry();

  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  await checkTelemetry("addon-install", DEFAULT_ENGINE, ALTERNATE_ENGINE);

  clearTelemetry();

  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );

  await checkTelemetry("addon-uninstall", ALTERNATE_ENGINE, DEFAULT_ENGINE);
});

/* This tests what happens when the engine you're setting it to is hidden. */
add_task(async function test_extension_setting_default_engine_hidden() {
  let engine = Services.search.getEngineByName(ALTERNATE_ENGINE.name);
  engine.hidden = true;

  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    "Default engine should have remained as the default"
  );
  is(
    ExtensionSettingsStore.getSetting("default_search", "defaultSearch"),
    null,
    "The extension should not have been recorded as having set the default search"
  );

  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );
  engine.hidden = false;
});

// Test the popup displayed when trying to add a non-built-in default
// search engine.
add_task(async function test_extension_setting_default_engine_external() {
  const NAME = "Example Engine";

  // Load an extension that tries to set the default engine,
  // and wait for the ensuing prompt.
  async function startExtension(win = window) {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_specific_settings: {
          gecko: {
            id: EXTENSION1_ID,
          },
        },
        chrome_settings_overrides: {
          search_provider: {
            name: NAME,
            search_url: "https://example.com/?q={searchTerms}",
            is_default: true,
          },
        },
      },
      useAddonManager: "temporary",
    });

    let [panel] = await Promise.all([
      promisePopupNotificationShown("addon-webext-defaultsearch", win),
      extension.startup(),
    ]);

    isnot(
      panel,
      null,
      "Doorhanger was displayed for non-built-in default engine"
    );

    return { panel, extension };
  }

  // First time around, don't accept the default engine.
  let { panel, extension } = await startExtension();
  panel.secondaryButton.click();

  await TestUtils.topicObserved("webextension-defaultsearch-prompt-response");

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    "Default engine was not changed after rejecting prompt"
  );

  await extension.unload();

  clearTelemetry();

  // Do it again, this time accept the prompt.
  ({ panel, extension } = await startExtension());

  panel.button.click();
  await TestUtils.topicObserved("webextension-defaultsearch-prompt-response");

  is(
    (await Services.search.getDefault()).name,
    NAME,
    "Default engine was changed after accepting prompt"
  );

  await checkTelemetry("addon-install", DEFAULT_ENGINE, {
    id: "other-Example Engine",
    name: "Example Engine",
    loadPath: "[addon]extension1@mozilla.com",
    submissionUrl: "https://example.com/?q=",
  });
  clearTelemetry();

  // Do this twice to make sure we're definitely handling disable/enable
  // correctly.  Disabling and enabling the addon here like this also
  // replicates the behavior when an addon is added then removed in the
  // blocklist.
  let disabledPromise = awaitEvent("shutdown", EXTENSION1_ID);
  let addon = await AddonManager.getAddonByID(EXTENSION1_ID);
  await addon.disable();
  await disabledPromise;

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name} after disabling`
  );

  await checkTelemetry(
    "addon-uninstall",
    {
      id: "other-Example Engine",
      name: "Example Engine",
      loadPath: "[addon]extension1@mozilla.com",
      submissionUrl: "https://example.com/?q=",
    },
    DEFAULT_ENGINE
  );
  clearTelemetry();

  let opened = promisePopupNotificationShown(
    "addon-webext-defaultsearch",
    window
  );
  await addon.enable();
  panel = await opened;
  panel.button.click();
  await TestUtils.topicObserved("webextension-defaultsearch-prompt-response");

  is(
    (await Services.search.getDefault()).name,
    NAME,
    `Default engine is ${NAME} after enabling`
  );

  await checkTelemetry("addon-install", DEFAULT_ENGINE, {
    id: "other-Example Engine",
    name: "Example Engine",
    loadPath: "[addon]extension1@mozilla.com",
    submissionUrl: "https://example.com/?q=",
  });

  await extension.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    "Default engine is reverted after uninstalling extension."
  );

  // One more time, this time close the window where the prompt
  // appears instead of explicitly accepting or denying it.
  let win = await BrowserTestUtils.openNewBrowserWindow();
  await BrowserTestUtils.openNewForegroundTab(win.gBrowser, "about:blank");

  ({ extension } = await startExtension(win));

  await BrowserTestUtils.closeWindow(win);

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    "Default engine is unchanged when prompt is dismissed"
  );

  await extension.unload();
});

/* This tests that uninstalling add-ons maintains the proper
 * search default. */
add_task(async function test_extension_setting_multiple_default_engine() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  let ext2 = ExtensionTestUtils.loadExtension({
    manifest: {
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE2_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  await ext2.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext2);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  await ext2.unload();

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );
});

/* This tests that uninstalling add-ons in reverse order maintains the proper
 * search default. */
add_task(
  async function test_extension_setting_multiple_default_engine_reversed() {
    let ext1 = ExtensionTestUtils.loadExtension({
      manifest: {
        chrome_settings_overrides: {
          search_provider: {
            name: ALTERNATE_ENGINE.name,
            search_url: "https://example.com/?q={searchTerms}",
            is_default: true,
          },
        },
      },
      useAddonManager: "temporary",
    });

    let ext2 = ExtensionTestUtils.loadExtension({
      manifest: {
        chrome_settings_overrides: {
          search_provider: {
            name: ALTERNATE2_ENGINE.name,
            search_url: "https://example.com/?q={searchTerms}",
            is_default: true,
          },
        },
      },
      useAddonManager: "temporary",
    });

    await ext1.startup();
    await AddonTestUtils.waitForSearchProviderStartup(ext1);

    is(
      (await Services.search.getDefault()).name,
      ALTERNATE_ENGINE.name,
      `Default engine is ${ALTERNATE_ENGINE.name}`
    );

    await ext2.startup();
    await AddonTestUtils.waitForSearchProviderStartup(ext2);

    is(
      (await Services.search.getDefault()).name,
      ALTERNATE2_ENGINE.name,
      `Default engine is ${ALTERNATE2_ENGINE.name}`
    );

    await ext1.unload();

    is(
      (await Services.search.getDefault()).name,
      ALTERNATE2_ENGINE.name,
      `Default engine is ${ALTERNATE2_ENGINE.name}`
    );

    await ext2.unload();

    is(
      (await Services.search.getDefault()).name,
      DEFAULT_ENGINE.name,
      `Default engine is ${DEFAULT_ENGINE.name}`
    );
  }
);

/* This tests that when the user changes the search engine and the add-on
 * is unistalled, search stays with the user's choice. */
add_task(async function test_user_changing_default_engine() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  let engine = Services.search.getEngineByName(ALTERNATE2_ENGINE.name);
  await Services.search.setDefault(
    engine,
    Ci.nsISearchService.CHANGE_REASON_UNKNOWN
  );
  // This simulates the preferences UI when the setting is changed.
  ExtensionSettingsStore.select(
    ExtensionSettingsStore.SETTING_USER_SET,
    DEFAULT_SEARCH_STORE_TYPE,
    DEFAULT_SEARCH_SETTING_NAME
  );

  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );
  restoreDefaultEngine();
});

/* This tests that when the user changes the search engine while it is
 * disabled, user choice is maintained when the add-on is reenabled. */
add_task(async function test_user_change_with_disabling() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION1_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  let engine = Services.search.getEngineByName(ALTERNATE2_ENGINE.name);
  await Services.search.setDefault(
    engine,
    Ci.nsISearchService.CHANGE_REASON_UNKNOWN
  );
  // This simulates the preferences UI when the setting is changed.
  ExtensionSettingsStore.select(
    ExtensionSettingsStore.SETTING_USER_SET,
    DEFAULT_SEARCH_STORE_TYPE,
    DEFAULT_SEARCH_SETTING_NAME
  );

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  let disabledPromise = awaitEvent("shutdown", EXTENSION1_ID);
  let addon = await AddonManager.getAddonByID(EXTENSION1_ID);
  await addon.disable();
  await disabledPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  let processedPromise = awaitEvent("searchEngineProcessed", EXTENSION1_ID);
  await addon.enable();
  await processedPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );
  await ext1.unload();
  await restoreDefaultEngine();
});

/* This tests that when two add-ons are installed that change default
 * search and the first one is disabled, before the second one is installed,
 * when the first one is reenabled, the second add-on keeps the search. */
add_task(async function test_two_addons_with_first_disabled_before_second() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION1_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  let ext2 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION2_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE2_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  let disabledPromise = awaitEvent("shutdown", EXTENSION1_ID);
  let addon1 = await AddonManager.getAddonByID(EXTENSION1_ID);
  await addon1.disable();
  await disabledPromise;

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );

  await ext2.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext2);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  let enabledPromise = awaitEvent("ready", EXTENSION1_ID);
  await addon1.enable();
  await enabledPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );
  await ext2.unload();
  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );
});

/* This tests that when two add-ons are installed that change default
 * search and the first one is disabled, the second one maintains
 * the search. */
add_task(async function test_two_addons_with_first_disabled() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION1_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  let ext2 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION2_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE2_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  await ext2.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext2);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  let disabledPromise = awaitEvent("shutdown", EXTENSION1_ID);
  let addon1 = await AddonManager.getAddonByID(EXTENSION1_ID);
  await addon1.disable();
  await disabledPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  let enabledPromise = awaitEvent("ready", EXTENSION1_ID);
  await addon1.enable();
  await enabledPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );
  await ext2.unload();
  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );
});

/* This tests that when two add-ons are installed that change default
 * search and the second one is disabled, the first one properly
 * gets the search. */
add_task(async function test_two_addons_with_second_disabled() {
  let ext1 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION1_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  let ext2 = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: EXTENSION2_ID,
        },
      },
      chrome_settings_overrides: {
        search_provider: {
          name: ALTERNATE2_ENGINE.name,
          search_url: "https://example.com/?q={searchTerms}",
          is_default: true,
        },
      },
    },
    useAddonManager: "temporary",
  });

  await ext1.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext1);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  await ext2.startup();
  await AddonTestUtils.waitForSearchProviderStartup(ext2);

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );

  let disabledPromise = awaitEvent("shutdown", EXTENSION2_ID);
  let addon2 = await AddonManager.getAddonByID(EXTENSION2_ID);
  await addon2.disable();
  await disabledPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );

  let defaultPromise = SearchTestUtils.promiseSearchNotification(
    "engine-default",
    "browser-search-engine-modified"
  );
  // No prompt, because this is switching to an app-provided engine.
  await addon2.enable();
  await defaultPromise;

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE2_ENGINE.name,
    `Default engine is ${ALTERNATE2_ENGINE.name}`
  );
  await ext2.unload();

  is(
    (await Services.search.getDefault()).name,
    ALTERNATE_ENGINE.name,
    `Default engine is ${ALTERNATE_ENGINE.name}`
  );
  await ext1.unload();

  is(
    (await Services.search.getDefault()).name,
    DEFAULT_ENGINE.name,
    `Default engine is ${DEFAULT_ENGINE.name}`
  );
});
