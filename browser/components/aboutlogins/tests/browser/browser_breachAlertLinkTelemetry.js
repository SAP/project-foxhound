/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

EXPECTED_BREACH = {
  AddedDate: "2018-12-20T23:56:26Z",
  BreachDate: "2018-12-16",
  Domain: "breached.example.com",
  Name: "TestBreach",
  PwnCount: 1643100,
  DataClasses: ["Email addresses", "Usernames", "Passwords", "IP addresses"],
  _status: "synced",
  id: "047940fe-d2fd-4314-b636-b4a952ee0043",
  last_modified: "1541615610052",
  schema: "1541615609018",
};

add_setup(async function () {
  TEST_LOGIN3 = await addLogin(TEST_LOGIN3);
  await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: "about:logins",
  });
  registerCleanupFunction(() => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    Services.logins.removeAllUserFacingLogins();
  });
});

add_task(async function test_breach_alert_link_click_telemetry() {
  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  let browser = gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    let loginList = Cu.waiveXrays(content.document.querySelector("login-list"));
    await ContentTaskUtils.waitForCondition(
      () => loginList._loginGuidsSortedOrder.length == 1,
      "waiting for login to appear in list"
    );

    let breachedLoginListItem = loginList._list.querySelector(
      "login-list-item[data-guid].breached"
    );
    await ContentTaskUtils.waitForCondition(
      () => breachedLoginListItem,
      "waiting for breached login list item"
    );
    breachedLoginListItem.click();
  });

  let promiseNewTab = BrowserTestUtils.waitForNewTab(
    gBrowser,
    TEST_LOGIN3.origin + "/"
  );

  await SpecialPowers.spawn(
    browser,
    [EXPECTED_BREACH.Name],
    async breachName => {
      let loginItem = content.document.querySelector("login-item");
      let breachAlert =
        loginItem.shadowRoot.querySelector("login-breach-alert");

      await ContentTaskUtils.waitForCondition(
        () => !breachAlert.hidden,
        "waiting for breach alert to be visible"
      );

      let breachLink = breachAlert.shadowRoot.querySelector(
        'a[data-l10n-id="about-logins-breach-alert-link"]'
      );
      Assert.ok(breachLink, "breach alert link should exist");

      let telemetryEventReceived = false;
      content.document.addEventListener(
        "AboutLoginsRecordTelemetryEvent",
        event => {
          if (event.detail.name === "breachAlertLinkClicked") {
            telemetryEventReceived = true;
            Assert.equal(
              event.detail.extra.breach_name,
              breachName,
              "breach_name should match"
            );
          }
        },
        { once: true }
      );

      breachLink.click();

      await ContentTaskUtils.waitForCondition(
        () => telemetryEventReceived,
        "waiting for telemetry event to be dispatched"
      );

      Assert.ok(
        telemetryEventReceived,
        "breach alert link click telemetry event should be dispatched"
      );
    }
  );

  await Services.fog.testFlushAllChildren();

  let events = Glean.pwmgr.breachAlertLinkClicked.testGetValue();
  Assert.equal(events[0].name, "breach_alert_link_clicked");
  Assert.equal(events[0].extra.breach_name, EXPECTED_BREACH.Name);

  let newTab = await promiseNewTab;
  Assert.ok(newTab, "New tab opened to " + TEST_LOGIN3.origin);
  BrowserTestUtils.removeTab(newTab);
});
