/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

const BUILTIN_ADDON_ID = "data-leak-blocker@mozilla.com";
const RS_COLLECTION = "addons-data-leak-blocker-domains";
const GLEAN_REGISTERED_PING = "dataLeakBlocker";
const GLEAN_REGISTERED_CATEGORY = "dataLeakBlocker";
const GLEAN_REGISTERED_METRIC = "reportV1";

const server = AddonTestUtils.createHttpServer({
  hosts: ["expected.example.org", "unexpected.example.org"],
});
server.registerPathHandler("/", (req, res) => {
  info(`Test HTTP server for domain "${req.host}" got ${req.method} request\n`);
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.write("OK");
});

add_setup(async () => {
  // Sanity checks.
  const builtinAddon = await AddonManager.getAddonByID(BUILTIN_ADDON_ID);
  ok(builtinAddon, "Got AddonWrapper instance for the builtin add-on");
  ok(builtinAddon.isActive, "Expect builtin add-on to be active");

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

add_task(async function test_extension_tab_create() {
  Services.fog.testResetFOG();

  const id = "ext-create-tab@mochitest";
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: {
        gecko: { id },
      },
    },
    background() {
      const { browser } = this;
      browser.test.onMessage.addListener(async (msg, ...args) => {
        if (msg === "create-tab") {
          await browser.tabs.create({
            url: args[0],
            active: true,
          });
        } else {
          browser.test.fail(`Got unexpected test message ${msg}`);
        }
        browser.test.sendMessage(`${msg}:done`);
      });
    },
  });

  const pingSubmitDeferred = Promise.withResolvers();
  const pingSubmitCallback = () => {
    const gleanEvents = Glean[GLEAN_REGISTERED_CATEGORY][
      GLEAN_REGISTERED_METRIC
    ].testGetValue()?.map(event => event.extra);
    if (gleanEvents?.length) {
      pingSubmitDeferred.resolve(gleanEvents);
      return;
    }
    info(
      "Wait for next Glean ping submit for the missing events (glean event metric was empty)"
    );
    GleanPings[GLEAN_REGISTERED_PING].testBeforeNextSubmit(pingSubmitCallback);
  };
  GleanPings[GLEAN_REGISTERED_PING].testBeforeNextSubmit(pingSubmitCallback);

  await extension.startup();
  // expected.example.org domain is added to the one monitored through
  // the testing pref from the browser.toml configs.
  extension.sendMessage("create-tab", "https://expected.example.org");
  await extension.awaitMessage("create-tab:done");

  info("Wait for custom Glean ping submit");
  const gleanEvents = await pingSubmitDeferred.promise;
  Assert.deepEqual(
    gleanEvents,
    [
      {
        addon_id: id,
        method: "GET",
        blocked: "true",
        is_addon_triggering: "true",
        is_addon_loading: "false",
        is_content_script: "false",
        content_policy_type: `${Ci.nsIContentPolicy.TYPE_DOCUMENT}`,
      },
    ],
    "Got the expected Glean events"
  );

  await extension.unload();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
