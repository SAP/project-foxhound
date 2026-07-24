/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { ExtensionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionXPCShellUtils.sys.mjs"
);

ChromeUtils.defineESModuleGetters(this, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
});

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "139",
  "139"
);
ExtensionTestUtils.init(this);

const BUILTIN_ADDON_ID = "data-leak-blocker@mozilla.com";
const RS_COLLECTION = "addons-data-leak-blocker-domains";
const GLEAN_REGISTERED_PING = "dataLeakBlocker";
const GLEAN_REGISTERED_CATEGORY = "dataLeakBlocker";
const GLEAN_REGISTERED_METRIC = "reportV1";

const IS_GLEAN_DATA_LEAK_BLOCKER_BUILTIN = GLEAN_REGISTERED_CATEGORY in Glean;

const server = AddonTestUtils.createHttpServer({
  hosts: ["expected.example.org", "unexpected.example.org"],
});
server.registerPathHandler("/test", (req, res) => {
  info(`Test HTTP server for domain "${req.host}" got ${req.method} request\n`);
  res.setStatusLine(req.httpVersion, 200, "OK");
  // Needed by the MV3 extension (due to the MV3 content script being inherited
  // from the webpage instead of being overridden by a fetch instance that belongs
  // to the extension ExpandedPrincipal as for MV2 content scripts).
  res.setHeader("Access-Control-Allow-Origin", "http://unexpected.example.org");
  res.write("OK");
});

add_setup(async () => {
  do_get_profile();

  // Disable loading artifacts build jogfile for this test
  // (workaround Bug 1983674).
  Services.prefs.setBoolPref("telemetry.fog.artifact_build", false);

  Services.fog.initializeFOG();

  // Enable scope application and override the built_in_addons.json
  // resource to ensure the add-on built-in into the Firefox Desktop
  // omni jar is going to be loaded.
  Services.prefs.setIntPref(
    "extensions.enabledScopes",
    AddonManager.SCOPE_PROFILE | AddonManager.SCOPE_APPLICATION
  );

  // Enable more verbose logging for the logs emitted by this extension.
  Services.prefs.setBoolPref(`extensions.${BUILTIN_ADDON_ID}.testing`, true);

  // Reduce timeout on the add-on's DeferredTask that submits the custom
  // ping.
  Services.prefs.setIntPref(
    `extensions.${BUILTIN_ADDON_ID}.gleanSubmitTaskTimeout`,
    500
  );

  const builtinsConfig = await fetch(
    "chrome://browser/content/built_in_addons.json"
  ).then(res => res.json());

  await AddonTestUtils.overrideBuiltIns({
    system: [],
    builtins: builtinsConfig.builtins.filter(
      entry => entry.addon_id === BUILTIN_ADDON_ID
    ),
  });
  await AddonTestUtils.promiseStartupManager({
    lateStartup: false,
  });

  // Sanity check.
  const builtinAddon = await AddonManager.getAddonByID(BUILTIN_ADDON_ID);
  ok(builtinAddon, "Got AddonWrapper instance for the builtin add-on");
  ok(builtinAddon.isActive, "Expect builtin add-on to be active");

  if (!IS_GLEAN_DATA_LEAK_BLOCKER_BUILTIN) {
    Assert.ok(
      !(GLEAN_REGISTERED_PING in GleanPings),
      "Expect runtime registered ping to be registered"
    );
    Assert.ok(
      !(
        GLEAN_REGISTERED_CATEGORY in Glean &&
        GLEAN_REGISTERED_METRIC in Glean[GLEAN_REGISTERED_CATEGORY]
      ),
      "Expect runtime registered metric to be registered"
    );
  }

  await AddonTestUtils.notifyLateStartup();

  Assert.ok(
    GLEAN_REGISTERED_PING in GleanPings,
    "Expect runtime registered ping to be registered"
  );
  Assert.ok(
    GLEAN_REGISTERED_CATEGORY in Glean &&
      GLEAN_REGISTERED_METRIC in Glean[GLEAN_REGISTERED_CATEGORY],
    "Expect runtime registered metric to be registered"
  );
});

async function test_extension_fetch({
  addon_id,
  manifest_version = 2,
  expectedGleanEvents,
}) {
  const extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      manifest_version,
      browser_specific_settings: {
        gecko: { id: addon_id },
      },
      content_scripts: [
        {
          matches: ["*://*.example.org/*"],
          js: ["content_script.js"],
        },
      ],
      ...(manifest_version >= 3
        ? {
            host_permissions: ["<all_urls>"],
            // Prevent http request to be auto-upgraded to https
            content_security_policy: {
              extension_pages: "script-src 'self';",
            },
          }
        : { permissions: ["<all_urls>"] }),
    },
    background() {
      const { browser } = this;
      browser.test.onMessage.addListener(async (msg, ...args) => {
        if (msg === "extpage-call-fetch") {
          const [{ url, fetchOptions }] = args;
          let fetchError;
          await fetch(url, fetchOptions).catch(err => (fetchError = err));
          browser.test.sendMessage(`${msg}:done`, String(fetchError));
        }
      });
    },
    files: {
      "content_script.js": function () {
        const { browser } = this;
        browser.test.onMessage.addListener(async (msg, ...args) => {
          if (msg === "contentscript-call-fetch") {
            const [{ url, fetchOptions }] = args;
            let fetchError;
            await fetch(url, fetchOptions).catch(err => (fetchError = err));
            browser.test.sendMessage(`${msg}:done`, String(fetchError));
          }
        });
        browser.test.sendMessage("contentscript:ready");
      },
    },
  });

  await extension.startup();

  const page = await ExtensionTestUtils.loadContentPage(
    "http://unexpected.example.org/test"
  );
  const pingSubmitDeferred = Promise.withResolvers();
  const allGleanEvents = [];
  const pingSubmitCallback = () => {
    info("dataAbuseDetection Glean ping submit callback called");
    const gleanEvents = Glean[GLEAN_REGISTERED_CATEGORY][
      GLEAN_REGISTERED_METRIC
    ].testGetValue()?.map(event => event.extra);
    allGleanEvents.push(...(gleanEvents ?? []));
    if (allGleanEvents.length < expectedGleanEvents.length) {
      info(
        `Wait for next Glean ping submit for the missing events (${JSON.stringify(
          {
            expected: expectedGleanEvents.length,
            actual: allGleanEvents.length,
          }
        )})`
      );
      GleanPings[GLEAN_REGISTERED_PING].testBeforeNextSubmit(
        pingSubmitCallback
      );
      return;
    }
    pingSubmitDeferred.resolve();
  };
  GleanPings[GLEAN_REGISTERED_PING].testBeforeNextSubmit(pingSubmitCallback);

  const rsClient = RemoteSettings(RS_COLLECTION);
  const rsData = [
    {
      id: "monitored-domains-set1",
      domains: ["expected.example.org"],
    },
  ];
  await rsClient.db.importChanges({}, Date.now(), rsData, {
    clear: true,
  });
  await rsClient.emit("sync", { data: {} });

  extension.sendMessage("extpage-call-fetch", {
    url: "http://unexpected.example.org/test#extpage",
  });
  Assert.equal(
    await extension.awaitMessage("extpage-call-fetch:done"),
    "undefined",
    "Expect non monitored domains to not be blocked"
  );
  extension.sendMessage("extpage-call-fetch", {
    url: "http://expected.example.org/test#extpage",
  });
  Assert.equal(
    await extension.awaitMessage("extpage-call-fetch:done"),
    "TypeError: NetworkError when attempting to fetch resource.",
    "Expect monitored domains to be blocked"
  );

  // Expect mv2 content script request to be attributed to the
  // addon (and blocked), while mv3 content script are expected
  // to not be attributed to addons (and not blocked).
  const expectContentScriptRequestBlocked = manifest_version < 3;

  await extension.awaitMessage("contentscript:ready");

  extension.sendMessage("contentscript-call-fetch", {
    url: "http://unexpected.example.org/test#extcs",
    fetchOptions: { method: "POST" },
  });
  Assert.equal(
    await extension.awaitMessage("contentscript-call-fetch:done"),
    "undefined",
    "Expect non monitored domains to not be blocked"
  );
  extension.sendMessage("contentscript-call-fetch", {
    url: "http://expected.example.org/test#extcs",
    fetchOptions: { method: "POST" },
  });
  Assert.equal(
    await extension.awaitMessage("contentscript-call-fetch:done"),
    expectContentScriptRequestBlocked
      ? "TypeError: NetworkError when attempting to fetch resource."
      : "undefined",
    expectContentScriptRequestBlocked
      ? "Expect monitored domains to be blocked on mv2 fetch request"
      : "Expect monitored domains to not be blocked on mv3 fetch request or exempted add-ons"
  );

  await extension.unload();
  await page.close();

  info("Wait for the Glean ping to be submitted");

  await pingSubmitDeferred.promise;

  Assert.deepEqual(
    allGleanEvents,
    expectedGleanEvents,
    "Got the expected telemetry events"
  );
}

add_task(async function test_mv2_extension() {
  const addon_id = "ext-mv2@test";
  await test_extension_fetch({
    addon_id,
    manifest_version: 2,
    expectedGleanEvents: [
      {
        addon_id,
        method: "GET",
        blocked: "true",
        content_policy_type: `${Ci.nsIContentPolicy.TYPE_FETCH}`,
        is_addon_triggering: "true",
        is_addon_loading: "false",
        is_content_script: "false",
      },
      {
        addon_id,
        blocked: "true",
        method: "POST",
        content_policy_type: `${Ci.nsIContentPolicy.TYPE_FETCH}`,
        is_addon_triggering: "true",
        is_addon_loading: "false",
        is_content_script: "true",
      },
    ],
  });
});

add_task(async function test_mv3_extension() {
  const addon_id = "ext-mv3@test";
  await test_extension_fetch({
    addon_id,
    manifest_version: 3,
    expectedGleanEvents: [
      {
        method: "GET",
        blocked: "true",
        content_policy_type: `${Ci.nsIContentPolicy.TYPE_FETCH}`,
        is_addon_triggering: "true",
        is_addon_loading: "false",
        is_content_script: "false",
        addon_id,
      },
    ],
  });
});
