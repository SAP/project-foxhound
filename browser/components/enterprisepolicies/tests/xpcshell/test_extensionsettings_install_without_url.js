/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.appInfo = getAppInfo();
ExtensionTestUtils.init(this);

const server = AddonTestUtils.createHttpServer({ hosts: ["example.com"] });
const BASE_URL = "http://example.com/data";

function makeAMOResponse(id, xpiURL) {
  return {
    page_size: 25,
    page_count: 1,
    count: xpiURL ? 1 : 0,
    next: null,
    previous: null,
    results: xpiURL
      ? [
          {
            guid: id,
            type: "extension",
            name: "Test Addon",
            current_version: {
              version: "1.0",
              files: [{ platform: "all", url: xpiURL }],
            },
          },
        ]
      : [],
  };
}

// force_installed and normal_installed without install_url are installed via
// AddonRepository; allowed and blocked are not auto-installed.
add_task(
  {
    pref_set: [
      ["extensions.install.requireSecureOrigin", false],
      ["extensions.getAddons.get.url", `${BASE_URL}/amo.json?guid=%IDS%`],
    ],
  },
  async function test_install_from_repository() {
    await AddonTestUtils.promiseStartupManager();

    const forceId = "force-installed-no-url@test";
    const normalId = "normal-installed-no-url@test";
    const allowedId = "allowed-no-url@test";
    const blockedId = "blocked-no-url@test";

    const xpiURLMap = {
      [forceId]: `${BASE_URL}/force.xpi`,
      [normalId]: `${BASE_URL}/normal.xpi`,
    };

    for (const [id, path] of [
      [forceId, "/data/force.xpi"],
      [normalId, "/data/normal.xpi"],
    ]) {
      server.registerFile(
        path,
        AddonTestUtils.createTempWebExtensionFile({
          manifest: {
            version: "1.0",
            browser_specific_settings: { gecko: { id } },
          },
        })
      );
    }

    server.registerPathHandler("/data/amo.json", (request, response) => {
      const guid = decodeURIComponent(
        request.queryString.replace(/^guid=/, "")
      );
      response.setHeader("Content-Type", "application/json");
      response.write(
        JSON.stringify(makeAMOResponse(guid, xpiURLMap[guid] ?? null))
      );
    });

    let forceExtension = ExtensionTestUtils.expectExtension(forceId);
    let normalExtension = ExtensionTestUtils.expectExtension(normalId);

    await Promise.all([
      forceExtension.awaitStartup(),
      normalExtension.awaitStartup(),
      setupPolicyEngineWithJson({
        policies: {
          ExtensionSettings: {
            [forceId]: { installation_mode: "force_installed" },
            [normalId]: { installation_mode: "normal_installed" },
            [allowedId]: { installation_mode: "allowed" },
            [blockedId]: { installation_mode: "blocked" },
          },
        },
      }),
    ]);

    const forceAddon = await AddonManager.getAddonByID(forceId);
    notEqual(
      forceAddon,
      null,
      "force_installed addon should be installed via AMO"
    );
    equal(forceAddon.version, "1.0", "force_installed addon version");

    const normalAddon = await AddonManager.getAddonByID(normalId);
    notEqual(
      normalAddon,
      null,
      "normal_installed addon should be installed via AMO"
    );
    equal(normalAddon.version, "1.0", "normal_installed addon version");

    equal(
      await AddonManager.getAddonByID(allowedId),
      null,
      "allowed addon should not be auto-installed"
    );
    equal(
      await AddonManager.getAddonByID(blockedId),
      null,
      "blocked addon should not be auto-installed"
    );

    await forceAddon.uninstall();
    await normalAddon.uninstall();
    await AddonTestUtils.promiseShutdownManager();
  }
);

// When the extension is not on AMO, log an error and do not install.
add_task(
  {
    pref_set: [
      ["extensions.getAddons.get.url", `${BASE_URL}/amo-empty.json?guid=%IDS%`],
    ],
  },
  async function test_not_on_amo_does_not_install() {
    await AddonTestUtils.promiseStartupManager();

    const id = "not-on-amo@test";
    server.registerPathHandler("/data/amo-empty.json", (request, response) => {
      response.setHeader("Content-Type", "application/json");
      response.write(JSON.stringify(makeAMOResponse(id, null)));
    });

    const errorLogged = TestUtils.consoleMessageObserved(msg =>
      msg.wrappedJSObject.arguments[0]?.includes(
        `No XPI URL found on AMO for ${id}`
      )
    );

    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          [id]: {
            installation_mode: "force_installed",
          },
        },
      },
    });
    await errorLogged;

    equal(
      await AddonManager.getAddonByID(id),
      null,
      "Addon should not be installed when not found on AMO"
    );

    await AddonTestUtils.promiseShutdownManager();
  }
);
