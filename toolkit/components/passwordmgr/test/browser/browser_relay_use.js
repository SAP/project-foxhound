Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/passwordmgr/test/browser/browser_relay_utils.js",
  this
);

const TEST_URL_PATH = `https://example.org${DIRECTORY_PATH}form_basic_signup.html`;

add_task(
  async function test_site_on_denyList_does_not_show_Relay_to_signed_in_browser() {
    const sandbox = stubFxAccountsToSimulateSignedIn();
    // Set up denylist for "example.org"
    const rsSandbox = await stubRemoteSettingsDenyList([
      { domain: "example.org" },
    ]);
    for (const scenario of ["available", "offered", "enabled", "disabled"]) {
      await setupRelayScenario(scenario);
      await BrowserTestUtils.withNewTab(
        {
          gBrowser,
          url: TEST_URL_PATH,
        },
        async function (browser) {
          const popup = document.getElementById("PopupAutoComplete");
          await openACPopup(popup, browser, "#form-basic-username");

          const relayItem = getRelayItemFromACPopup(popup);
          Assert.ok(
            !relayItem,
            "Relay item SHOULD NOT be present in the autocomplete popup when the site is on the deny-list, even if the user is signed into the browser."
          );
        }
      );
    }
    sandbox.restore();
    rsSandbox.restore();
  }
);

add_task(async function test_domain_allow_denylist_across_scenarios() {
  const scenarios = [
    {
      desc: "On denylist, not on allowlist",
      denylist: ["example.org"],
      allowlist: [],
      url: "https://example.org",
      expectRelayByScenario: {
        available: false,
        offered: false,
        enabled: false,
        disabled: false,
      },
    },
    {
      desc: "On allowlist, not on denylist",
      denylist: [],
      allowlist: ["example.org"],
      url: "https://example.org",
      expectRelayByScenario: {
        available: true,
        offered: true,
        enabled: true,
        disabled: false,
      },
    },
    {
      desc: "Not on allowlist or denylist",
      denylist: [],
      allowlist: [],
      url: "https://test1.example.com",
      expectRelayByScenario: {
        available: false,
        offered: false,
        enabled: true,
        disabled: false,
      },
    },
    {
      desc: "Subdomain on denylist, parent on allowlist",
      denylist: ["test2.example.com"],
      allowlist: ["example.com"],
      url: "https://test2.example.com",
      expectRelayByScenario: {
        available: false,
        offered: false,
        enabled: false,
        disabled: false,
      },
    },
    {
      desc: "Country TLD on denylist, .com on allowlist",
      denylist: ["example.com.ar"],
      allowlist: ["example.com"],
      url: "https://accounts.example.com.ar",
      expectRelayByScenario: {
        available: false,
        offered: false,
        enabled: false,
        disabled: false,
      },
    },
    {
      desc: ".com on denylist, .com.ar on allowlist",
      denylist: ["example.com"],
      allowlist: ["example.com.ar"],
      url: "https://accounts.example.com.ar",
      expectRelayByScenario: {
        available: true,
        offered: true,
        enabled: true,
        disabled: false,
      },
    },
  ];

  for (const scenario of scenarios) {
    info(`Test: ${scenario.desc}`);
    const sandbox = stubFxAccountsToSimulateSignedIn();

    const rsSandboxDeny = await stubRemoteSettingsDenyList(
      scenario.denylist.map(domain => ({ domain }))
    );
    const rsSandboxAllow = await stubRemoteSettingsAllowList(
      scenario.allowlist.map(domain => ({ domain }))
    );

    for (const relayScenario of [
      "available",
      "offered",
      "enabled",
      "disabled",
    ]) {
      await setupRelayScenario(relayScenario);
      await BrowserTestUtils.withNewTab(
        {
          gBrowser,
          url: `${scenario.url}${DIRECTORY_PATH}form_basic_signup.html`,
        },
        async function (browser) {
          const popup = document.getElementById("PopupAutoComplete");
          await openACPopup(popup, browser, "#form-basic-username");
          const relayItem = getRelayItemFromACPopup(popup);
          const expected = scenario.expectRelayByScenario[relayScenario];
          Assert.equal(
            !!relayItem,
            expected,
            `Relay item should${expected ? "" : " NOT"} be present (${scenario.desc}, relayScenario=${relayScenario})`
          );
        }
      );
    }
    sandbox.restore();
    rsSandboxDeny && rsSandboxDeny.restore();
    rsSandboxAllow && rsSandboxAllow.restore();
  }
});
