"use strict";

add_setup(async function () {
  // We don't send events or call official addon APIs while running
  // these tests, so there a good chance that test-verify mode may
  // end up seeing the addon as "idle". This pref should avoid that.
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.background.idle.timeout", 300_000]],
  });
});

function getConfig(
  id,
  interventions,
  issue1 = { matches: ["*://example.com/*"] }
) {
  return {
    id,
    label: id,
    bugs: {
      issue1,
    },
    interventions: interventions.map(i => {
      if (!i.platforms) {
        i.platforms = ["all"];
      }
      const { css, js } = i;
      if (css || js) {
        delete i.css;
        delete i.js;
        i.content_scripts = { css, js };
      }
      return i;
    }),
  };
}

add_task(async function test_that_only_intended_interventions_are_activated() {
  const runningVersion = parseInt(
    navigator.userAgent.match("Firefox/([0-9]*)")[1]
  );

  // If we have multiple parts to an intervention, where only some of them are meant to
  // apply (like ones for different Firefox versions), we want to make sure that only the
  // intended ones are activated. Otherwise when we try to deactivate them in about:compat,
  // it will fail, and we also run the risk of enabling more than we intended to.
  const config = getConfig("test", [
    {
      min_version: runningVersion + 1,
      js: ["lib/intervention_helpers.js"],
    },
    {
      max_version: runningVersion,
      js: ["lib/ua_helpers.js"],
    },
    {
      js: ["lib/shim_messaging_helper.js"],
    },
    {
      platforms: ["invalid"],
      js: ["lib/messaging_helper.js"],
    },
  ]);

  const [{ interventions }] = await WebCompatExtension.updateInterventions([
    config,
  ]);
  Assert.deepEqual(
    interventions.map(i => i.enabled),
    [false, true, true, false],
    "The correct parts of the intervention were chosen to be enabled"
  );

  let reg = await WebCompatExtension.getRegisteredContentScriptsFor("test");
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    ["lib/ua_helpers.js", "lib/shim_messaging_helper.js"],
    "Content scripts were properly registered"
  );

  await WebCompatExtension.disableInterventions(["test"]);

  reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    [],
    "Content scripts were properly unregistered"
  );
});

add_task(async function test_min_max_versions() {
  await WebCompatExtension.overrideFirefoxVersion("130.2");
  const config2 = getConfig("test2", [
    {
      min_version: 130,
      js: ["lib/run.js"],
    },
    {
      min_version: 130.1,
      js: ["lib/about_compat_broker.js"],
    },
    {
      min_version: 130.2,
      js: ["lib/custom_functions.js"],
    },
    {
      min_version: 130.3,
      js: ["lib/intervention_helpers.js"],
    },
    {
      min_version: 131,
      js: ["lib/interventions.js"],
    },
    {
      max_version: 129,
      js: ["lib/messaging_helper.js"],
    },
    {
      max_version: 130,
      js: ["lib/requestStorageAccess_helper.js"],
    },
    {
      max_version: 130.1,
      js: ["lib/shim_messaging_helper.js"],
    },
    {
      max_version: 130.2,
      js: ["lib/shims.js"],
    },
    {
      max_version: 130.3,
      js: ["lib/smartblock_embeds_helper.js"],
    },
    {
      max_version: 131,
      js: ["lib/ua_helpers.js"],
    },
  ]);
  const [{ interventions }] = await WebCompatExtension.updateInterventions([
    config2,
  ]);
  Assert.deepEqual(
    interventions.map(i => i.enabled),
    [true, true, true, false, false, false, true, false, true, true, true],
    "The correct parts of the intervention were chosen to be enabled"
  );
  const reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    [
      "lib/run.js",
      "lib/about_compat_broker.js",
      "lib/custom_functions.js",
      "lib/requestStorageAccess_helper.js",
      "lib/shims.js",
      "lib/smartblock_embeds_helper.js",
      "lib/ua_helpers.js",
    ],
    "Correct content scripts were registered"
  );
  await WebCompatExtension.disableInterventions(["test2"]);
  await WebCompatExtension.overrideFirefoxVersion();
});

add_task(async function test_disabling_by_default() {
  // platforms=[] means disabled by default
  const config3 = getConfig("test3", [
    {
      platforms: [],
      js: ["lib/run.js"],
    },
  ]);
  // also check that other criteria not matching still disables completely
  const config4 = getConfig("test4", [
    {
      platforms: [],
      not_platforms: ["android", "desktop"],
      js: ["lib/shims.js"],
    },
  ]);
  const configs = await WebCompatExtension.updateInterventions([
    config3,
    config4,
  ]);
  Assert.deepEqual(
    configs.map(c => c.active),
    [false, false],
    "The correct interventions were activated on startup"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[false], [false]],
    "The interventions were not enabled by default"
  );
  const reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    [],
    "Content scripts were not registered"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "about:compat",
    waitForLoad: true,
  });
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.origin,
      "moz-extension://9a310967-e580-48bf-b3e8-4eafebbc122d",
      "Expected origin of about:compat"
    );
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test3] [data-l10n-id=label-enable]"
        ),
      "test3 is correctly shown"
    );
    ok(
      !content.document.querySelector("#interventions tr[data-id=test4]"),
      "test4 is correctly hidden"
    );

    // click enable, confirm it is enabled
    content.document
      .querySelector(
        "#interventions tr[data-id=test3] [data-l10n-id=label-enable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test3] [data-l10n-id=label-disable]"
        ),
      "test3 is correctly enabled on click"
    );

    // now click disable, confirm it is disabled
    content.document
      .querySelector(
        "#interventions tr[data-id=test3] [data-l10n-id=label-disable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test3] [data-l10n-id=label-enable]"
        ),
      "test3 is correctly disabled again on second click"
    );
  });
  await BrowserTestUtils.removeTab(tab);

  await WebCompatExtension.disableInterventions(["test3", "test4"]);
});

add_task(async function test_individual_interventions_prefs() {
  const config5 = getConfig("test5", [
    {
      js: ["lib/run.js"],
    },
  ]);
  // the pref for this one is set to true before app-startup
  const config6 = getConfig("test6", [
    {
      js: ["lib/shims.js"],
    },
  ]);
  // the pref for this one is set to false before app-startup
  const config7 = getConfig("test7", [
    {
      js: ["lib/custom_functions.js"],
    },
  ]);
  let configs = await WebCompatExtension.updateInterventions([
    config5,
    config6,
    config7,
  ]);
  Assert.deepEqual(
    configs.map(c => c.active),
    [true, false, true],
    "The correct interventions are activated on startup"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[true], [false], [true]],
    "The correct interventions are enabled on startup"
  );
  let reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    ["lib/run.js", "lib/custom_functions.js"],
    "The correct content scripts are registered on startup"
  );

  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_interventions.test5",
    true
  );
  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_interventions.test6",
    false
  );
  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_interventions.test7",
    true
  );
  await WebCompatExtension.interventionsSettled();
  configs = await WebCompatExtension.updateInterventions([
    config5,
    config6,
    config7,
  ]);
  Assert.deepEqual(
    configs.map(c => c.active),
    [false, true, false],
    "The correct interventions are active after pref changes"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[false], [true], [false]],
    "The correct interventions are enabled after pref changes"
  );
  reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    ["lib/shims.js"],
    "The correct content scripts are registered after pref changes"
  );

  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_interventions.test5",
    false
  );
  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_interventions.test6",
    true
  );
  Services.prefs.setBoolPref(
    "extensions.webcompat.disabled_interventions.test7",
    false
  );
  await WebCompatExtension.interventionsSettled();
  configs = await WebCompatExtension.updateInterventions([
    config5,
    config6,
    config7,
  ]);
  Assert.deepEqual(
    configs.map(c => c.active),
    [true, false, true],
    "The correct interventions were activated by pref changes"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[true], [false], [true]],
    "The correct interventions were made available by pref changes"
  );
  reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    ["lib/run.js", "lib/custom_functions.js"],
    "The correct content scripts are registered after pref changes"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "about:compat",
    waitForLoad: true,
  });
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.origin,
      "moz-extension://9a310967-e580-48bf-b3e8-4eafebbc122d",
      "Expected origin of about:compat"
    );

    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test5] [data-l10n-id=label-disable]"
        ),
      "test5 is correctly shown as disabled"
    );
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test6] [data-l10n-id=label-enable]"
        ),
      "test6 is correctly shown as enabled"
    );

    // click to disable test5 and confirm
    content.document
      .querySelector(
        "#interventions tr[data-id=test5] [data-l10n-id=label-disable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test5] [data-l10n-id=label-enable]"
        ),
      "test5 is correctly disabled"
    );

    // click to enable test6 and confirm
    content.document
      .querySelector(
        "#interventions tr[data-id=test6] [data-l10n-id=label-enable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test6] [data-l10n-id=label-disable]"
        ),
      "test6 is correctly enabled"
    );

    // click to disable test7 and confirm
    content.document
      .querySelector(
        "#interventions tr[data-id=test7] [data-l10n-id=label-disable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test5] [data-l10n-id=label-enable]"
        ),
      "test7 is correctly disabled"
    );
  });

  configs = [
    await WebCompatExtension.getInterventionById("test5"),
    await WebCompatExtension.getInterventionById("test6"),
    await WebCompatExtension.getInterventionById("test7"),
  ];
  Assert.deepEqual(
    configs.map(c => c.active),
    [false, true, false],
    "The correct interventions were activated by about:compat changes"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[true], [true], [true]],
    "The correct interventions were made available by about:compat changes"
  );
  reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    ["lib/shims.js"],
    "The correct content scripts are registered after about:compat changes"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    // click to re-enable test5 and confirm
    content.document
      .querySelector(
        "#interventions tr[data-id=test5] [data-l10n-id=label-enable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test5] [data-l10n-id=label-disable]"
        ),
      "test5 is correctly disabled"
    );

    // click to re-disable test6 and confirm
    content.document
      .querySelector(
        "#interventions tr[data-id=test6] [data-l10n-id=label-disable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test6] [data-l10n-id=label-enable]"
        ),
      "test6 is correctly disabled"
    );

    // click to re-enable test7 and confirm
    content.document
      .querySelector(
        "#interventions tr[data-id=test7] [data-l10n-id=label-enable]"
      )
      .click();
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          "#interventions tr[data-id=test7] [data-l10n-id=label-disable]"
        ),
      "test7 is correctly disabled"
    );
  });
  await BrowserTestUtils.removeTab(tab);

  configs = [
    await WebCompatExtension.getInterventionById("test5"),
    await WebCompatExtension.getInterventionById("test6"),
    await WebCompatExtension.getInterventionById("test7"),
  ];
  Assert.deepEqual(
    configs.map(c => c.active),
    [true, false, true],
    "The correct interventions were activated by about:compat changes"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[true], [true], [true]],
    "The correct interventions were made available by about:compat changes"
  );
  reg = await WebCompatExtension.getRegisteredContentScriptsFor(["test"]);
  Assert.deepEqual(
    reg.map(r => r.js).flat(),
    ["lib/run.js", "lib/custom_functions.js"],
    "The correct content scripts are registered after about:compat changes"
  );

  await WebCompatExtension.disableInterventions(["test5", "test6", "test7"]);
  Services.prefs.clearUserPref(
    "extensions.webcompat.disabled_interventions.test5"
  );
});

add_task(async function test_batched_webrequest_listeners() {
  // Test that two interventions targeting the same origin, but matching different
  // full URLs, only apply based on their full match-patterns.
  const config8 = getConfig(
    "test8",
    [
      {
        ua_string: ["change_Gecko_to_like_Gecko"],
      },
    ],
    {
      blocks: ["*://example.com/*/general/download_page.html"],
      matches: ["*://example.com/*/general/*"],
    }
  );

  const config9 = getConfig(
    "test9",
    [
      {
        ua_string: ["change_Firefox_to_FireFox"],
      },
    ],
    {
      blocks: ["*://example.com/*/static/download_page.html"],
      matches: ["*://example.com/*/static/*"],
    }
  );

  // Also test that another one which matches the full origin also matches
  // along with whichever one above also should match.
  const config10 = getConfig(
    "test10",
    [
      {
        ua_string: ["replace_colon_in_rv_with_space"],
      },
    ],
    {
      matches: ["*://example.com/*"],
    }
  );

  // Also test that the origin is strictly matched, so subdomains are not
  // accidentally matched when they should not be, or slightly different
  // domains (.net instead of .com, etc).
  const config11 = getConfig(
    "test11",
    [
      {
        ua_string: ["add_Version_segment"],
      },
    ],
    {
      blocks: [
        "*://example.net/*/about/download_page.html",
        "*://www.example.com/*/about/download_page.html",
      ],
      matches: ["*://example.net/*", "*://www.example.com/*"],
    }
  );

  await WebCompatExtension.interventionsSettled();
  const configs = await WebCompatExtension.updateInterventions([
    config8,
    config9,
    config10,
    config11,
  ]);
  Assert.deepEqual(
    configs.map(c => c.active),
    [true, true, true, true],
    "The interventions were activated"
  );
  Assert.deepEqual(
    configs.map(c => c.interventions.map(i => i.enabled)),
    [[true], [true], [true], [true]],
    "The interventions were enabled"
  );

  let tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening:
      "https://example.com/browser/browser/base/content/test/general/dummy_page.html",
    waitForLoad: true,
  });
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    const ua = content.navigator.userAgent;
    ok(ua.includes("like Gecko"), "Intended UA override was applied");
    ok(!ua.includes("FireFox"), "Unintended UA override was NOT applied");
    ok(ua.includes("rv "), "Intended UA override was applied");
    ok(!ua.includes("Version/0"), "Unintended UA override was NOT applied");

    let blocked = false;
    try {
      fetch(
        "https://example.com/browser/browser/base/content/test/general/download_page.html"
      );
    } catch (_) {
      blocked = true;
    }
    ok(blocked, "blocked as expected");
  });
  await BrowserTestUtils.removeTab(tab);

  tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening:
      "https://example.com/browser/browser/base/content/test/static/dummy_page.html",
    waitForLoad: true,
  });
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    const ua = content.navigator.userAgent;
    ok(ua.includes("FireFox"), "Intended UA override was applied");
    ok(!ua.includes("like Gecko"), "Unintended UA override was NOT applied");
    ok(ua.includes("rv "), "Intended UA override was applied");
    ok(!ua.includes("Version/0"), "Unintended UA override was NOT applied");

    let blocked = false;
    try {
      fetch(
        "https://example.com/browser/browser/base/content/test/static/download_page.html"
      );
    } catch (_) {
      blocked = true;
    }
    ok(blocked, "blocked as expected");
  });
  await BrowserTestUtils.removeTab(tab);

  tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening:
      "https://example.net/browser/browser/base/content/test/about/dummy_page.html",
    waitForLoad: true,
  });
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    const ua = content.navigator.userAgent;
    ok(!ua.includes("FireFox"), "Unintended UA override was NOT applied");
    ok(!ua.includes("like Gecko"), "Unintended UA override was NOT applied");
    ok(!ua.includes("rv "), "Unintended UA override was NOT applied");
    ok(ua.includes("Version/0"), "Intended UA override was applied");

    let blocked = true;
    try {
      fetch(
        "https://example.net/browser/browser/base/content/test/about/download_page.html"
      );
      blocked = false;
    } catch (_) {}
    ok(blocked, "NOT blocked as expected");
  });
  await BrowserTestUtils.removeTab(tab);

  tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening:
      "https://www.example.com/browser/browser/base/content/test/about/dummy_page.html",
    waitForLoad: true,
  });
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    const ua = content.navigator.userAgent;
    ok(!ua.includes("FireFox"), "Unintended UA override was NOT applied");
    ok(!ua.includes("like Gecko"), "Unintended UA override was NOT applied");
    ok(!ua.includes("rv "), "Unintended UA override was NOT applied");
    ok(ua.includes("Version/0"), "Intended UA override was applied");

    let blocked = false;
    try {
      fetch(
        "https://www.example.com/browser/browser/base/content/test/about/download_page.html"
      );
    } catch (_) {
      blocked = true;
    }
    ok(blocked, "blocked as expected");
  });
  await BrowserTestUtils.removeTab(tab);

  await WebCompatExtension.disableInterventions([
    "test8",
    "test9",
    "test10",
    "test11",
  ]);
});
