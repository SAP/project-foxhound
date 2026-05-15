/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { AMTelemetry, EnvironmentAddonBuilder } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

// The webserver hosting the addons.
var gHttpServer = null;
// The URL of the webserver root.
var gHttpRoot = null;
// The URL of the data directory, on the webserver.
var gDataRoot = null;

const PLATFORM_VERSION = "1.9.2";
const APP_VERSION = "1";
const APP_ID = "xpcshell@tests.mozilla.org";
const APP_NAME = "XPCShell";

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
createAppInfo(APP_ID, APP_NAME, APP_VERSION, PLATFORM_VERSION);

// As we're not running in application, we need to setup the built-in
// add-ons to resemble a setup similar to a Firefox Desktop instance.
//
// Enable SCOPE_APPLICATION for builtin testing.  Default in tests is only SCOPE_PROFILE.
let scopes = AddonManager.SCOPE_PROFILE | AddonManager.SCOPE_APPLICATION;
Services.prefs.setIntPref("extensions.enabledScopes", scopes);

// Disable XPIProvider auto-installed default theme logic
// for the unit tests using this helper.
Services.prefs.setBoolPref("extensions.skipInstallDefaultThemeForTests", true);

function truncateToDays(aMsec) {
  return Math.floor(aMsec / MILLISECONDS_PER_DAY);
}

async function promiseStartupManagerWithOverrideBuiltIn() {
  const addon_id = "tel-system-xpi@tests.mozilla.org";
  const addon_version = "1.0";
  const addon_res_url_path = "telemetry-test-builtin-addon";
  await setupBuiltinExtension(
    {
      manifest: {
        name: "XPI Telemetry System Add-on Test",
        description: "A system addon which is shipped with Firefox.",
        version: addon_version,
        browser_specific_settings: {
          gecko: { id: addon_id },
        },
      },
    },
    addon_res_url_path
  );
  let builtins = [
    {
      addon_id,
      addon_version,
      res_url: `resource://${addon_res_url_path}/`,
    },
  ];
  await AddonTestUtils.overrideBuiltIns({ builtins });

  await AddonTestUtils.promiseStartupManager();
  return { builtins };
}

function finishAddonManagerStartup() {
  Services.obs.notifyObservers(null, "test-load-xpi-database");
}

function MockAddonWrapper(aAddon) {
  this.addon = aAddon;
}
MockAddonWrapper.prototype = {
  get id() {
    return this.addon.id;
  },

  get type() {
    return this.addon.type;
  },

  get appDisabled() {
    return false;
  },

  get isCompatible() {
    return true;
  },

  get isPlatformCompatible() {
    return true;
  },

  get scope() {
    return AddonManager.SCOPE_PROFILE;
  },

  get foreignInstall() {
    return false;
  },

  get providesUpdatesSecurely() {
    return true;
  },

  get blocklistState() {
    return 0; // Not blocked.
  },

  get pendingOperations() {
    return AddonManager.PENDING_NONE;
  },

  get permissions() {
    return AddonManager.PERM_CAN_UNINSTALL | AddonManager.PERM_CAN_DISABLE;
  },

  get isActive() {
    return true;
  },

  get name() {
    return this.addon.name;
  },

  get version() {
    return this.addon.version;
  },

  get creator() {
    return new AddonManagerPrivate.AddonAuthor(this.addon.author);
  },

  get userDisabled() {
    return this.appDisabled;
  },
};

function createMockAddonProvider(aName) {
  let mockProvider = {
    _addons: [],

    get name() {
      return aName;
    },

    addAddon(aAddon) {
      this._addons.push(aAddon);
      AddonManagerPrivate.callAddonListeners(
        "onInstalled",
        new MockAddonWrapper(aAddon)
      );
    },

    async getAddonsByTypes(aTypes) {
      return this._addons
        .filter(a => !aTypes || aTypes.includes(a.type))
        .map(a => new MockAddonWrapper(a));
    },

    shutdown() {
      return Promise.resolve();
    },
  };

  return mockProvider;
}

async function installXPIFromURL(url) {
  let install = await AddonManager.getInstallForURL(url);
  return install.install();
}

// This method runs the same kind of assertions as TestEnvironmentUtils.checkAddonsSection.
function checkEnvironmentAddonBuilderData(
  data,
  { partialAddonsRecords, expectBrokenAddons } = {}
) {
  const EXPECTED_FIELDS = ["activeAddons", "theme", "activeGMPlugins"];

  Assert.ok(
    "addons" in data,
    "There must be an addons section in EnvironmentAddonBuilder instance."
  );
  for (let f of EXPECTED_FIELDS) {
    Assert.ok(f in data.addons, f + " must be available.");
  }

  // Check the active addons, if available.
  if (!expectBrokenAddons) {
    let activeAddons = data.addons.activeAddons;
    for (let addon in activeAddons) {
      checkActiveAddon(addon, activeAddons[addon], partialAddonsRecords);
    }
  }

  // Check "theme" structure.
  //
  // NOTE: theme is expected to be set to an empty object while the theme is
  // not installed or enabled yet by the time the telemetry environment is
  // capturing the active addons and themes early during the first at startup,
  // see Bug 1994389.
  if (data.addons.theme?.id) {
    checkTheme(data.addons.theme);
  }

  // Check active GMPlugins
  let activeGMPlugins = data.addons.activeGMPlugins;
  for (let gmPlugin in activeGMPlugins) {
    checkActiveGMPlugin(activeGMPlugins[gmPlugin]);
  }

  function checkActiveAddon(id, addonData, partialRecord) {
    let signedState = "number";
    // system add-ons have an undefined signState
    if (addonData.isSystem) {
      signedState = "undefined";
    }

    const EXPECTED_ADDON_FIELDS_TYPES = {
      version: "string",
      scope: "number",
      type: "string",
      updateDay: "number",
      isSystem: "boolean",
      isWebExtension: "boolean",
      multiprocessCompatible: "boolean",
    };

    const FULL_ADDON_FIELD_TYPES = {
      blocklisted: "boolean",
      name: "string",
      userDisabled: "boolean",
      appDisabled: "boolean",
      foreignInstall: "boolean",
      hasBinaryComponents: "boolean",
      installDay: "number",
      signedState,
    };

    let fields = EXPECTED_ADDON_FIELDS_TYPES;
    if (!partialRecord) {
      fields = Object.assign({}, fields, FULL_ADDON_FIELD_TYPES);
    }

    for (let [name, type] of Object.entries(fields)) {
      Assert.ok(name in addonData, name + " must be available.");
      Assert.equal(
        typeof addonData[name],
        type,
        name + " must have the correct type."
      );
    }

    // Retrieve the Glean `addons.activeAddons` from the test API
    let gleanData = Glean.addons.activeAddons.testGetValue();
    // gleanData has all of the addons in it so we need to find the right one
    let gleanObject = gleanData.find(entry => entry.id == id);
    // Check the Glean properties of `addons.activeAddons`
    for (let [field] of Object.entries(fields)) {
      // Glean cannot use "type" as a field name so it is named "addonType"
      // We account for that difference here in order to test the data
      let gleanField = field;
      if (field == "type") {
        gleanField = "addonType";
      }

      Assert.equal(
        addonData[field],
        gleanObject[gleanField],
        field + " must match what is recorded in Glean."
      );
    }

    if (!partialRecord) {
      // We check "description" separately, as it can be null.
      Assert.ok(checkNullOrString(addonData.description));
    }
  }

  function checkTheme(themeData) {
    const EXPECTED_THEME_FIELDS_TYPES = {
      id: "string",
      blocklisted: "boolean",
      name: "string",
      userDisabled: "boolean",
      appDisabled: "boolean",
      version: "string",
      scope: "number",
      foreignInstall: "boolean",
      installDay: "number",
      updateDay: "number",
    };

    for (let f in EXPECTED_THEME_FIELDS_TYPES) {
      Assert.ok(f in themeData, f + " must be available.");
      Assert.equal(
        typeof themeData[f],
        EXPECTED_THEME_FIELDS_TYPES[f],
        f + " must have the correct type."
      );
    }

    // Retrieve the Glean `addons.theme` from the test API
    let gleanData = Glean.addons.theme.testGetValue();

    // Check the Glean properties of `addons.theme`
    for (let field in EXPECTED_THEME_FIELDS_TYPES) {
      Assert.equal(
        themeData[field],
        gleanData[field],
        field + " must match what is recorded in Glean."
      );
    }

    // We check "description" separately, as it can be null.
    Assert.ok(checkNullOrString(themeData.description));
  }

  function checkActiveGMPlugin(gmpData) {
    // GMP plugin version defaults to null until GMPDownloader runs to update it.
    if (gmpData.version) {
      Assert.equal(typeof gmpData.version, "string");
    }
    Assert.equal(typeof gmpData.userDisabled, "boolean");
    Assert.equal(typeof gmpData.applyBackgroundUpdates, "number");

    // Retrieve the Glean `addons.activeGMPlugins` from the test API
    let gleanData = Glean.addons.activeGMPlugins.testGetValue()[0];
    Assert.equal(gmpData.version, gleanData.version);
    Assert.equal(gmpData.userDisabled, gleanData.userDisabled);
    Assert.equal(
      gmpData.applyBackgroundUpdates,
      gleanData.applyBackgroundUpdates
    );
  }

  function checkString(aValue) {
    return typeof aValue == "string" && aValue != "";
  }

  function checkNullOrString(aValue) {
    if (aValue) {
      return checkString(aValue);
    } else if (aValue === null) {
      return true;
    }

    return false;
  }
}

add_setup(async function setup() {
  // We need to ensure FOG is initialized, otherwise we will panic trying to get test values.
  Services.fog.initializeFOG();
  do_get_profile();

  await promiseStartupManagerWithOverrideBuiltIn();

  // The test runs in a fresh profile so starting the AddonManager causes
  // the addons database to be created (as does setting new theme).
  // For test_addonsStartup below, we want to test a "warm" startup where
  // there is already a database on disk.  Simulate that here by just
  // restarting the AddonManager.
  await AddonTestUtils.promiseShutdownManager();
  await AddonTestUtils.overrideBuiltIns({ builtins: [] });
  AddonTestUtils.addonStartup.remove(true);
  await promiseStartupManagerWithOverrideBuiltIn();

  // Make sure the AddonManager isn't stuck waiting
  // for the addon DB to be fully loaded when the test
  // tasks that follows may be executed on their own (and
  // the other tasks skipped).
  finishAddonManagerStartup();
  await AMTelemetry.telemetryAddonBuilder._pendingTask;

  // Setup a webserver to serve Addons, etc.
  gHttpServer = new HttpServer();
  gHttpServer.start(-1);
  let port = gHttpServer.identity.primaryPort;
  gHttpRoot = "http://localhost:" + port + "/";
  gDataRoot = gHttpRoot + "data/";
  gHttpServer.registerDirectory("/data/", do_get_cwd());
  registerCleanupFunction(() => gHttpServer.stop(() => {}));
});

add_task(async function test_addons_initialData_and_fullData() {
  await AddonTestUtils.promiseShutdownManager();
  await promiseStartupManagerWithOverrideBuiltIn();

  // During startup we have partial addon records.
  // First make sure we haven't yet read the addons DB, then test that
  // we have some partial addons data.
  Assert.equal(
    AddonManagerPrivate.isDBLoaded(),
    false,
    "addons database is not loaded"
  );

  // Create a new instance to verify the initialData expected
  // to be collected early on startup vs. full data expected to
  // be collected later on once the XPIProvider addons db has been
  // fully loaded.
  const telemetryAddonBuilder = new EnvironmentAddonBuilder();
  const pendingTaskPromise = telemetryAddonBuilder.init();

  Assert.equal(
    telemetryAddonBuilder._addonsAreFull,
    false,
    "Expect full addons details to not have been collected yet"
  );

  await TestUtils.waitForCondition(
    () => "addons" in telemetryAddonBuilder._currentData,
    "Wait for initial addons data to be collected"
  );

  checkEnvironmentAddonBuilderData(telemetryAddonBuilder._currentData, {
    expectBrokenAddons: false,
    partialAddonsRecords: true,
  });

  finishAddonManagerStartup();

  await pendingTaskPromise;

  Assert.equal(
    telemetryAddonBuilder._addonsAreFull,
    true,
    "Expect full addons details to have been collected after addon DB is loaded"
  );

  checkEnvironmentAddonBuilderData(telemetryAddonBuilder._currentData, {
    expectBrokenAddons: false,
    partialAddonsRecords: false,
  });

  // Sanity check.
  Assert.equal(
    AddonManagerPrivate.isDBLoaded(),
    true,
    "addons database is loaded"
  );

  Assert.equal(
    telemetryAddonBuilder._shutdownCompleted,
    false,
    "Expect telemetryAddonBuilder instance to not have been shutdown yet"
  );

  await AddonTestUtils.promiseShutdownManager();

  Assert.equal(
    telemetryAddonBuilder._shutdownCompleted,
    true,
    "Expect telemetryAddonBuilder shutdown to be completed"
  );

  await promiseStartupManagerWithOverrideBuiltIn();
});

add_task(async function test_addonsWatch_InterestingChange() {
  const ADDON_ID = "tel-restartless-webext@tests.mozilla.org";

  // Sanity checks.
  ok(AMTelemetry.telemetryAddonBuilder, "Got EnvironmentAddonBuilder instance");
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === ADDON_ID),
    false,
    "Expect the test extension to NOT be found in the activeAddons data yet"
  );

  // We only expect a single notification for each install, uninstall, enable, disable.
  const EXPECTED_NOTIFICATIONS = 4;
  let receivedNotifications = 0;

  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      receivedNotifications++;
      Services.obs.notifyObservers(
        null,
        "test-environmentAddonBuilder-checkpoint"
      );
    });

  let registerCheckpointPromise = () =>
    TestUtils.topicObserved("test-environmentAddonBuilder-checkpoint");

  let assertCheckpoint = aExpected => {
    Assert.equal(receivedNotifications, aExpected);
  };

  info("Verify new activeAddons entry added when test extension is installed");
  let checkpointPromise = registerCheckpointPromise();
  let testExtension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      browser_specific_settings: { gecko: { id: ADDON_ID } },
    },
  });
  await testExtension.startup();
  await checkpointPromise;
  assertCheckpoint(1);
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === ADDON_ID),
    true,
    "Expect the test extension to be found in the activeAddons data"
  );

  info("Verify activeAddons entry remove when test extension is disabled");
  checkpointPromise = registerCheckpointPromise();
  let addon = await AddonManager.getAddonByID(ADDON_ID);
  await addon.disable();
  await checkpointPromise;
  assertCheckpoint(2);
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === ADDON_ID),
    false,
    "Expect the test extension to NOT be found in the activeAddons data"
  );

  info(
    "Verify activeAddons entry added back when test extension is re-enabled"
  );
  checkpointPromise = registerCheckpointPromise();
  addon = await AddonManager.getAddonByID(ADDON_ID);
  await addon.enable();
  await checkpointPromise;
  assertCheckpoint(3);
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === ADDON_ID),
    true,
    "Expect the test extension to be found in the activeAddons data"
  );

  info("Verify activeAddons entry removed when test extension is uninstalled");
  checkpointPromise = registerCheckpointPromise();
  await testExtension.unload();
  await checkpointPromise;
  assertCheckpoint(4);
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === ADDON_ID),
    false,
    "Expect the test extension to NOT be found in the activeAddons data"
  );

  Assert.equal(
    receivedNotifications,
    EXPECTED_NOTIFICATIONS,
    "We must only receive the notifications we expect."
  );

  sandbox.restore();
});

add_task(async function test_addonsWatch_NotInterestingChange() {
  // Plugins from GMPProvider are listed separately in addons.activeGMPlugins.
  // We simulate the "plugin" type in this test and verify that it is excluded.
  const PLUGIN_ID = "tel-fake-gmp-plugin@tests.mozilla.org";
  // "theme" type is already covered by addons.theme, so we aren't interested.
  const THEME_ID = "tel-theme@tests.mozilla.org";
  // "dictionary" type should be in addon.activeAddons.
  const DICT_ID = "tel-dict@tests.mozilla.org";
  // "locale" type should be in addon.activeAddons.
  const LOCALE_ID = "tel-langpack@tests.mozilla.org";

  let receivedNotification = false;
  let deferred = Promise.withResolvers();

  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      Assert.ok(
        !receivedNotification,
        "Should not receive multiple notifications"
      );
      receivedNotification = true;
      deferred.resolve();
    });

  // "plugin" type, to verify that non-XPIProvider types such as the "plugin"
  // type from GMPProvider are not included in activeAddons.
  let fakeProvider = createMockAddonProvider("Fake GMPProvider");
  AddonManagerPrivate.registerProvider(fakeProvider);

  fakeProvider.addAddon({
    id: PLUGIN_ID,
    name: "Fake plugin",
    version: "1",
    type: "plugin",
  });

  // "dictionary" type.
  fakeProvider.addAddon({
    id: DICT_ID,
    name: "Fake dictionary",
    version: "1",
    type: "dictionary",
  });

  // "theme" type.
  fakeProvider.addAddon({
    id: THEME_ID,
    name: "Fake theme",
    version: "1",
    type: "theme",
  });

  // "langpack" type.
  fakeProvider.addAddon({
    id: LOCALE_ID,
    name: "Fake langpack",
    version: "1",
    type: "locale",
  });

  await deferred.promise;
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === PLUGIN_ID),
    false,
    "GMP plugins should NOT appear in active addons."
  );
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === THEME_ID),
    false,
    "Themes should NOT appear in active addons."
  );
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === DICT_ID),
    true,
    "Dictionaries should appear in active addons."
  );
  Assert.equal(
    !!Glean.addons.activeAddons.testGetValue()?.find(it => it.id === LOCALE_ID),
    true,
    "Langpacks should appear in active addons."
  );

  AddonManagerPrivate.unregisterProvider(fakeProvider);

  sandbox.restore();
});

add_task(async function test_addons() {
  const SYSTEM_ADDON_ID = "tel-system-xpi@tests.mozilla.org";
  const EXPECTED_SYSTEM_ADDON_DATA = {
    blocklisted: false,
    description: "A system addon which is shipped with Firefox.",
    name: "XPI Telemetry System Add-on Test",
    userDisabled: false,
    appDisabled: false,
    version: "1.0",
    scope: AddonManager.SCOPE_APPLICATION,
    type: "extension",
    foreignInstall: false,
    hasBinaryComponents: false,
    installDay: 0,
    updateDay: 0,
    signedState: undefined,
    isSystem: true,
    isWebExtension: true,
    multiprocessCompatible: true,
    quarantineIgnoredByUser: false,
    // quarantineIgnoredByApp expected to be true because
    // the test addon is a system addon (see isSystem).
    quarantineIgnoredByApp: true,
  };

  const WEBEXTENSION_ADDON_ID = "tel-webextension-xpi@tests.mozilla.org";
  const WEBEXTENSION_ADDON_INSTALL_DATE = truncateToDays(Date.now());
  const EXPECTED_WEBEXTENSION_ADDON_DATA = {
    blocklisted: false,
    description: "A webextension addon.",
    name: "XPI Telemetry WebExtension Add-on Test",
    userDisabled: false,
    appDisabled: false,
    version: "1.0",
    scope: AddonManager.SCOPE_PROFILE,
    type: "extension",
    foreignInstall: false,
    hasBinaryComponents: false,
    installDay: WEBEXTENSION_ADDON_INSTALL_DATE,
    updateDay: WEBEXTENSION_ADDON_INSTALL_DATE,
    signedState: AddonManager.SIGNEDSTATE_PRIVILEGED,
    isSystem: false,
    isWebExtension: true,
    multiprocessCompatible: true,
    quarantineIgnoredByUser: false,
    // quarantineIgnoredByApp expected to be true because
    // the test addon is signed as privileged (see signedState).
    quarantineIgnoredByApp: true,
  };

  let deferred = Promise.withResolvers();
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      deferred.resolve();
    });

  // Install an add-on so we have some data.
  let webextension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "XPI Telemetry WebExtension Add-on Test",
      description: "A webextension addon.",
      version: "1.0",
      browser_specific_settings: {
        gecko: {
          id: WEBEXTENSION_ADDON_ID,
        },
      },
    },
  });

  await webextension.startup();
  await deferred.promise;
  sandbox.restore();

  let data = AMTelemetry.telemetryAddonBuilder._currentEnvironment;
  checkEnvironmentAddonBuilderData(data, {
    expectBrokenAddons: false,
    partialAddonsRecords: false,
  });

  // Check system add-on data.
  Assert.ok(
    SYSTEM_ADDON_ID in data.addons.activeAddons,
    "We must have one active system addon."
  );
  let targetSystemAddon = data.addons.activeAddons[SYSTEM_ADDON_ID];
  for (let f in EXPECTED_SYSTEM_ADDON_DATA) {
    Assert.equal(
      targetSystemAddon[f],
      EXPECTED_SYSTEM_ADDON_DATA[f],
      f + " must have the correct value."
    );
  }

  // Check webextension add-on data.
  Assert.ok(
    WEBEXTENSION_ADDON_ID in data.addons.activeAddons,
    "We must have one active webextension addon."
  );
  let targetWebExtensionAddon = data.addons.activeAddons[WEBEXTENSION_ADDON_ID];
  for (let f in EXPECTED_WEBEXTENSION_ADDON_DATA) {
    Assert.equal(
      targetWebExtensionAddon[f],
      EXPECTED_WEBEXTENSION_ADDON_DATA[f],
      f + " must have the correct value."
    );
  }

  await webextension.unload();
});

add_task(async function test_signedAddon() {
  AddonTestUtils.useRealCertChecks = true;

  const { PKCS7_WITH_SHA1, COSE_WITH_SHA256 } = Ci.nsIAppSignatureInfo;

  const ADDON_INSTALL_URL = gDataRoot + "amosigned.xpi";
  const ADDON_ID = "amosigned-xpi@tests.mozilla.org";
  const ADDON_INSTALL_DATE = truncateToDays(Date.now());
  const EXPECTED_ADDON_DATA = {
    blocklisted: false,
    description: null,
    name: "XPI Test",
    userDisabled: false,
    appDisabled: false,
    version: "2.2",
    scope: AddonManager.SCOPE_PROFILE,
    type: "extension",
    foreignInstall: false,
    hasBinaryComponents: false,
    installDay: ADDON_INSTALL_DATE,
    updateDay: ADDON_INSTALL_DATE,
    signedState: AddonManager.SIGNEDSTATE_SIGNED,
    signedTypes: JSON.stringify([COSE_WITH_SHA256, PKCS7_WITH_SHA1]),
    quarantineIgnoredByUser: false,
    // quarantineIgnoredByApp expected to be false because
    // the test addon is signed as a non-privileged (see signedState),
    // and it doesn't include any recommendations.
    quarantineIgnoredByApp: false,
  };

  let deferred = Promise.withResolvers();
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      deferred.resolve();
    });

  // Install the addon.
  let addon = await installXPIFromURL(ADDON_INSTALL_URL);

  await deferred.promise;
  sandbox.restore();

  let data = AMTelemetry.telemetryAddonBuilder._currentEnvironment;
  checkEnvironmentAddonBuilderData(data, {
    expectBrokenAddons: false,
    partialAddonsRecords: false,
  });

  // Check addon data.
  Assert.ok(
    ADDON_ID in data.addons.activeAddons,
    "Add-on should be in the environment."
  );
  let targetAddon = data.addons.activeAddons[ADDON_ID];
  for (let f in EXPECTED_ADDON_DATA) {
    Assert.equal(
      targetAddon[f],
      EXPECTED_ADDON_DATA[f],
      f + " must have the correct value."
    );
  }

  // Make sure quarantineIgnoredByUser property is updated also in the
  // telemetry environment in response to the user changing it.
  deferred = Promise.withResolvers();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      deferred.resolve();
    });

  addon.quarantineIgnoredByUser = true;
  await deferred.promise;
  sandbox.restore();

  Assert.equal(
    data.addons.activeAddons[ADDON_ID].quarantineIgnoredByUser,
    true,
    "Expect quarantineIgnoredByUser to be set to true"
  );

  AddonTestUtils.useRealCertChecks = false;
  await addon.startupPromise;
  await addon.uninstall();
});

add_task(async function test_addonsFieldsLimit() {
  const ADDON_ID = "tel-longfields-webext@tests.mozilla.org";

  // Install the addon and wait for the TelemetryEnvironment to pick it up.
  let deferred = Promise.withResolvers();
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      deferred.resolve();
    });

  ExtensionTestUtils.failOnSchemaWarnings(false);
  let testExtension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "This is a really long addon name, that will get limited to 100 characters. We're much longer, we're at about 219. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus nullam sodales. Yeah, Latin placeholder.",
      description:
        "This is a really long addon description, that will get limited to 100 characters. We're much longer, we're at about 200. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus nullam sodales.",
      version: "1.0",
      browser_specific_settings: { gecko: { id: ADDON_ID } },
    },
  });
  await testExtension.startup();
  ExtensionTestUtils.failOnSchemaWarnings(true);
  await deferred.promise;
  sandbox.restore();

  let data = AMTelemetry.telemetryAddonBuilder._currentEnvironment;
  checkEnvironmentAddonBuilderData(data, {
    expectBrokenAddons: false,
    partialAddonsRecords: false,
  });

  // Check that the addon is available and that the string fields are limited.
  Assert.ok(
    ADDON_ID in data.addons.activeAddons,
    "Add-on should be in the environment."
  );
  let targetAddon = data.addons.activeAddons[ADDON_ID];

  // TelemetryEnvironment limits the length of string fields for activeAddons to 100 chars,
  // to mitigate misbehaving addons.
  Assert.lessOrEqual(
    targetAddon.version.length,
    100,
    "The version string must have been limited"
  );
  Assert.lessOrEqual(
    targetAddon.name.length,
    100,
    "The name string must have been limited"
  );
  Assert.lessOrEqual(
    targetAddon.description.length,
    100,
    "The description string must have been limited"
  );

  await testExtension.unload();
});

add_task(async function test_collectionWithbrokenAddonData() {
  const BROKEN_ADDON_ID = "telemetry-test2.example.com@services.mozilla.org";
  const BROKEN_MANIFEST = {
    id: "telemetry-test2.example.com@services.mozilla.org",
    name: "telemetry broken addon",
    origin: "https://telemetry-test2.example.com",
    version: 1, // This is intentionally not a string.
    signedState: AddonManager.SIGNEDSTATE_SIGNED,
    type: "extension",
  };

  const ADDON_ID = "tel-restartless-webext@tests.mozilla.org";
  const ADDON_INSTALL_DATE = truncateToDays(Date.now());
  const EXPECTED_ADDON_DATA = {
    blocklisted: false,
    description: "A restartless addon which gets enabled without a reboot.",
    name: "XPI Telemetry Restartless Test",
    userDisabled: false,
    appDisabled: false,
    version: "1.0",
    scope: AddonManager.SCOPE_PROFILE,
    type: "extension",
    foreignInstall: false,
    hasBinaryComponents: false,
    installDay: ADDON_INSTALL_DATE,
    updateDay: ADDON_INSTALL_DATE,
    signedState: AddonManager.SIGNEDSTATE_MISSING,
  };

  let receivedNotifications = 0;

  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      receivedNotifications++;
      Services.obs.notifyObservers(
        null,
        "test-environmentAddonBuilder-checkpoint"
      );
    });

  let registerCheckpointPromise = () =>
    TestUtils.topicObserved("test-environmentAddonBuilder-checkpoint");

  let assertCheckpoint = aExpected => {
    Assert.equal(receivedNotifications, aExpected);
  };

  // Register the broken provider and install the broken addon.
  let checkpointPromise = registerCheckpointPromise();
  let brokenAddonProvider = createMockAddonProvider(
    "Broken Extensions Provider"
  );
  AddonManagerPrivate.registerProvider(brokenAddonProvider);
  brokenAddonProvider.addAddon(BROKEN_MANIFEST);
  await checkpointPromise;
  assertCheckpoint(1);

  // Now install an addon which returns the correct information.
  checkpointPromise = registerCheckpointPromise();
  let testExtension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: EXPECTED_ADDON_DATA.name,
      description: EXPECTED_ADDON_DATA.description,
      version: EXPECTED_ADDON_DATA.version,
      browser_specific_settings: { gecko: { id: ADDON_ID } },
    },
  });
  await testExtension.startup();
  await checkpointPromise;
  assertCheckpoint(2);

  // Check that the new environment contains the info from the broken provider,
  // despite the addon missing some details.
  let data = AMTelemetry.telemetryAddonBuilder._currentEnvironment;
  checkEnvironmentAddonBuilderData(data, {
    expectBrokenAddons: true,
    partialAddonsRecords: false,
  });

  let activeAddons = data.addons.activeAddons;
  Assert.ok(
    BROKEN_ADDON_ID in activeAddons,
    "The addon with the broken manifest must be reported."
  );
  Assert.equal(
    activeAddons[BROKEN_ADDON_ID].version,
    null,
    "null should be reported for invalid data."
  );
  Assert.ok(ADDON_ID in activeAddons, "The valid addon must be reported.");
  Assert.equal(
    activeAddons[ADDON_ID].description,
    EXPECTED_ADDON_DATA.description,
    "The description for the valid addon should be correct."
  );

  // Unregister the broken provider so we don't mess with other tests.
  AddonManagerPrivate.unregisterProvider(brokenAddonProvider);

  // Uninstall the valid addon.
  await testExtension.unload();
  sandbox.restore();
});

add_task(async function nonSystemBuiltinAddon() {
  const addon_id = "tel-nonsystem-builtin-addon@tests.mozilla.org";
  const addon_version = "1.0";
  const addon_res_url_path = "telemetry-test-nonsystem-builtin-addon";
  await setupBuiltinExtension(
    {
      manifest: {
        name: "XPI Telemetry non-System Built-in Add-on Test",
        description: "A system addon which is shipped with Firefox.",
        version: addon_version,
        browser_specific_settings: {
          gecko: { id: addon_id },
        },
      },
    },
    addon_res_url_path
  );

  let deferred = Promise.withResolvers();
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(AMTelemetry.telemetryAddonBuilder, "_onEnvironmentChange")
    .callsFake(async (changeReason, _oldEnvironment) => {
      Assert.equal(changeReason, "addons-changed");
      deferred.resolve();
    });

  let data = AMTelemetry.telemetryAddonBuilder._currentEnvironment;
  Assert.ok(
    !(addon_id in data.addons.activeAddons),
    "non-system built-in addon expected to not be found yet."
  );

  // Install a non-system add-on similarly to how built-in add-ons
  // built into Fenix through android components (e.g. like being done
  // by mobile/android/android-components/components/feature/readerview,
  // mobile/android/android-components/components/feature/webcompat etc.).
  const builtinAddon = await AddonManager.maybeInstallBuiltinAddon(
    addon_id,
    addon_version,
    `resource://${addon_res_url_path}/`
  );

  await deferred.promise;
  sandbox.restore();

  Assert.ok(
    addon_id in data.addons.activeAddons,
    "non-system built-in addon must be reported."
  );
  Assert.equal(
    data.addons.activeAddons[addon_id].version,
    addon_version,
    "Got the expected version."
  );

  Assert.equal(
    data.addons.activeAddons[addon_id].scope,
    AddonManager.SCOPE_APPLICATION,
    "Got the expected scope."
  );

  Assert.equal(
    data.addons.activeAddons[addon_id].isSystem,
    false,
    "Expect isSystem to be false."
  );

  await builtinAddon.uninstall();
});
