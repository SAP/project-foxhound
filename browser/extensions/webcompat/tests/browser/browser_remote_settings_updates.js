"use strict";

const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);

add_setup(async function () {
  // We don't send events or call official addon APIs while running
  // these tests, so there a good chance that test-verify mode may
  // end up seeing the addon as "idle". This pref should avoid that.
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.background.idle.timeout", 300_000]],
  });
});

function getUpdatePayload(version, extra) {
  const intervention1Id = `intervention1${extra}`;
  const intervention2Id = `intervention2${extra}`;
  const intervention3Id = `intervention3${extra}`;
  const intervention4Id = `intervention4${extra}`;
  const intervention5Id = `intervention5${extra}`;
  const shim1Id = `shim1${extra}`;
  const shim2Id = `shim2${extra}`;
  const shim3Id = `shim3${extra}`;
  const shim4Id = `shim4${extra}`;
  return {
    id: 1, // RemoteSettings record id",
    last_modified: 1368273600000,
    version,
    interventions: {
      [intervention1Id]: {
        label: intervention1Id,
        bugs: {
          [intervention1Id]: {
            issue: "broken-audio",
            matches: ["https://example.com/*"],
          },
        },
        interventions: [
          {
            platforms: ["all"],
            ua_string: ["Chrome"],
          },
        ],
      },
      [intervention2Id]: {
        label: intervention2Id,
        bugs: {
          [intervention2Id]: {
            issue: "broken-audio",
            matches: ["https://example.com/*"],
          },
        },
        interventions: [
          {
            platforms: ["all"],
            content_scripts: {
              js: ["no-such-file.js"],
            },
          },
        ],
      },
      [intervention3Id]: {
        label: intervention3Id,
        bugs: {
          [intervention3Id]: {
            issue: "broken-audio",
            matches: ["https://example.com/*"],
          },
        },
        interventions: [
          {
            platforms: ["all"],
            missing_custom_func: [{}],
          },
        ],
      },
      [intervention4Id]: {
        label: intervention4Id,
        bugs: {
          [intervention4Id]: {
            issue: "broken-audio",
            matches: ["https://example.com/*"],
          },
        },
        interventions: [
          {
            platforms: ["all"],
            skip_if: ["missing_skip_checker"],
          },
        ],
      },
      [intervention5Id]: {
        label: intervention5Id,
        bugs: {
          [intervention5Id]: {
            issue: "broken-audio",
            matches: ["https://example.com/*"],
          },
        },
        interventions: [
          {
            platforms: ["all"],
            ua_string: ["missing_UA_override"],
          },
        ],
      },
    },
    shims: [
      {
        id: shim1Id,
        platform: "all",
        name: shim1Id,
        bug: shim1Id,
        file: "empty-script.js",
        matches: ["*://example.com/*js*"],
        onlyIfBlockedByETP: true,
      },
      {
        id: shim2Id,
        platform: "all",
        name: shim2Id,
        bug: shim2Id,
        file: "no-such-shim.js",
        matches: ["*://example.com/*js*"],
        onlyIfBlockedByETP: true,
      },
      {
        id: shim3Id,
        name: shim3Id,
        bug: shim3Id,
        contentScripts: [
          {
            js: "no-such-shim2.js",
            matches: ["*://example.com/*"],
          },
        ],
        onlyIfDFPIActive: true,
      },
      {
        id: shim4Id,
        name: shim4Id,
        bug: shim4Id,
        logos: ["no-such-shim3.svg"],
        matches: ["*://example.com/*"],
        onlyIfDFPIActive: true,
        isSmartblockEmbedShim: true,
        onlyIfBlockedByETP: true,
        unblocksOnOptIn: ["*://example.net/*"],
      },
    ],
  };
}

add_task(async function test_that_updates_work() {
  await WebCompatExtension.started();

  const client = RemoteSettings("webcompat-interventions");
  let update = getUpdatePayload("9999.9999.9999.9998", "update1");
  await client.emit("sync", { data: { current: [update] } });

  await WebCompatExtension.promiseUpdateReceived(update.version);
  let interventions = await WebCompatExtension.availableInterventions();
  is(interventions.length, 5, "Correct number of interventions");
  is(interventions[0].id, "intervention1update1", "Correct intervention");
  is(interventions[0].active, true, "Intervention should be active");
  for (let i = 1; i < 5; ++i) {
    is(
      interventions[i].id,
      `intervention${i + 1}update1`,
      "Correct intervention"
    );
    is(
      interventions[i].active,
      false,
      `Intervention ${i} should not be active`
    );
  }
  let shims = await WebCompatExtension.availableShims();
  is(Object.entries(shims).length, 4, "Correct number of shims");
  is(shims[0].id, "shim1update1", "Correct shim");
  is(shims[0].enabled, true, "Shim should be enabled");
  for (let i = 1; i < 4; ++i) {
    is(shims[i].id, `shim${i + 1}update1`, "Correct shim");
    is(shims[i].enabled, false, `Shim ${i} should not be enabled`);
  }

  update = getUpdatePayload("9999.9999.9999.9999", "update2");
  await client.emit("sync", { data: { current: [update] } });

  await WebCompatExtension.promiseUpdateReceived(update.version);
  interventions = await WebCompatExtension.availableInterventions();
  is(interventions.length, 5, "Correct number of interventions");
  is(interventions[0].id, "intervention1update2", "Correct intervention");
  is(interventions[0].active, true, "Intervention should be active");
  for (let i = 1; i < 5; ++i) {
    is(
      interventions[i].id,
      `intervention${i + 1}update2`,
      "Correct intervention"
    );
    is(
      interventions[i].active,
      false,
      `Intervention ${i} should not be active`
    );
  }
  shims = await WebCompatExtension.availableShims();
  is(Object.entries(shims).length, 4, "Correct number of shims");
  is(shims[0].id, "shim1update2", "Correct shim");
  is(shims[0].enabled, true, "Shim should be enabled");
  for (let i = 1; i < 4; ++i) {
    is(shims[i].id, `shim${i + 1}update2`, "Correct shim");
    is(shims[i].enabled, false, `Shim ${i} should not be enabled`);
  }

  // check that we won't downgrade to older version numbers
  update = getUpdatePayload("9998.9999.9999.9999", "update3");
  await client.emit("sync", { data: { current: [update] } });

  await WebCompatExtension.promiseUpdateReceived(update.version);
  is(interventions.length, 5, "Correct number of interventions");
  is(interventions[0].id, "intervention1update2", "Correct intervention");
  is(interventions[0].active, true, "Intervention should be active");
  is(Object.entries(shims).length, 4, "Correct number of shims");
  is(shims[0].id, "shim1update2", "Correct shim");
  is(shims[0].enabled, true, "Shim should be enabled");

  await WebCompatExtension.resetInterventionsAndShimsToDefaults();
});
