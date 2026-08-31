"use strict";

/**
 * Sets up initial prefs and opens about:preferences page.
 *
 * @returns {Promise<void>}
 */
async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.shell.checkDefaultBrowser", false],
      ["browser.settings-redesign.enabled", true],
    ],
  });
  await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:preferences");
}

/**
 * Closes out the about:preferences tab and clears out
 * any prefs that could have potentially been manipulated.
 *
 * @returns {void}
 */
function teardown() {
  Services.prefs.unlockPref("browser.shell.checkDefaultBrowser");
  gBrowser.removeCurrentTab();
}

/**
 * Sets up the 'Make default' mock service to mimic
 * whether the user has set the browser as default already or not.
 *
 * @param {{isDefault: boolean}} options
 */
async function setupInitialBrowserDefaultSetting(options) {
  const win = gBrowser.selectedBrowser.contentWindow;
  win.oldShellService = win.getShellService();
  const { isDefault } = options;

  const mockShellService = {
    _isDefault: isDefault,
    isDefaultBrowser() {
      return this._isDefault;
    },
    async setDefaultBrowser() {
      this._isDefault = true;
    },
  };
  win.getShellService = function () {
    return mockShellService;
  };
}

add_task(
  /**
   * Tests when clicking 'Make default' button, setting browser
   * to default, and the side effects of the 'Always check' checkbox.
   */
  async function clicking_make_default_checks_alwaysCheck_checkbox() {
    await setup();
    await setupInitialBrowserDefaultSetting({ isDefault: false });

    let checkDefaultBrowserState = isDefault => {
      let isDefaultPane = content.document.getElementById("isDefaultPane");
      let isNotDefaultPane =
        content.document.getElementById("isNotDefaultPane");

      Assert.equal(
        BrowserTestUtils.isHidden(isDefaultPane.control),
        !isDefault,
        "The 'browser is default' pane should be hidden when browser is not default"
      );
      Assert.equal(
        BrowserTestUtils.isHidden(isNotDefaultPane.control),
        isDefault,
        "The 'make default' pane should be hidden when browser is default"
      );
    };

    checkDefaultBrowserState(false);

    const alwaysCheck = content.document.getElementById("alwaysCheckDefault");

    Assert.ok(!alwaysCheck.checked, "Always Check is unchecked by default");

    Assert.ok(
      !Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "alwaysCheck pref should be false by default in test runs"
    );

    const setDefaultButton =
      content.document.getElementById("setDefaultButton");
    /**
     * Click 'Make default' button to trigger shell service that sets the browser to default.
     */
    setDefaultButton.click();
    /**
     * Deem complete when 'Always Check' checkbox is checked.
     */
    await TestUtils.waitForCondition(
      () => alwaysCheck.checked,
      "'Always Check' checkbox should get checked after clicking the 'Set Default' button"
    );

    Assert.ok(
      alwaysCheck.checked,
      "Clicking 'Make Default' checks the 'Always Check' checkbox"
    );
    Assert.ok(
      Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "Checking the checkbox should set the pref to true"
    );
    Assert.ok(
      alwaysCheck.disabled,
      "'Always Check' checkbox is locked with default browser and alwaysCheck=true"
    );
    checkDefaultBrowserState(true);
    Assert.ok(
      Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "checkDefaultBrowser pref is now enabled"
    );
    teardown();
  }
);

add_task(
  /**
   * Tests when clicking 'Make default' button in Sync pane, setting browser
   * to default, and the side effects of the 'Always check' checkbox.
   */
  async function clicking_make_default_sync_checks_alwaysCheck_checkbox() {
    await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:preferences#sync"
    );
    await setupInitialBrowserDefaultSetting({ isDefault: false });

    let defaultBrowserSync = content.document.querySelector(
      `[groupid="defaultBrowserSync"]`
    );

    await TestUtils.waitForCondition(
      () => defaultBrowserSync.querySelector("#isNotDefaultPane"),
      "Wait for defaultBrowserSync group to be initialized"
    );

    let isNotDefaultPaneSync =
      defaultBrowserSync.querySelector("#isNotDefaultPane");

    Assert.ok(
      !BrowserTestUtils.isHidden(isNotDefaultPaneSync.control),
      "The 'make default' pane should be visible when browser is not default"
    );

    const setDefaultButton =
      defaultBrowserSync.querySelector("#setDefaultButton");
    /**
     * Click 'Make default' button to trigger shell service that sets the browser to default.
     */
    setDefaultButton.click();
    /**
     * Wait for the pref to be set and the UI to update.
     */
    await TestUtils.waitForCondition(
      () => Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "'Always Check' checkbox should get checked after clicking the 'Set Default' button"
    );

    /**
     * Wait for the UI to update and hide the 'make default' pane.
     */
    await TestUtils.waitForCondition(() => {
      const updatedIsNotDefaultPaneSync =
        defaultBrowserSync.querySelector("#isNotDefaultPane");
      return (
        updatedIsNotDefaultPaneSync &&
        BrowserTestUtils.isHidden(isNotDefaultPaneSync.control)
      );
    }, "The 'make default' pane should be hidden after setting browser as default");

    Assert.ok(
      BrowserTestUtils.isHidden(isNotDefaultPaneSync.control),
      "The 'make default' pane should be hidden when browser is default"
    );
    Assert.ok(
      Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "checkDefaultBrowser pref is now enabled"
    );

    teardown();
  }
);

add_task(
  /**
   * Tests when clicking 'Make default' button, setting browser
   * to default, and the side effects of the 'Always check' checkbox
   * when browser.shell.checkDefaultBrowser pref is locked
   */
  async function clicking_make_default_checks_alwaysCheck_checkbox_when_locked() {
    await setup();

    Services.prefs.lockPref("browser.shell.checkDefaultBrowser");

    const isDefault = false;
    await setupInitialBrowserDefaultSetting({ isDefault });

    let isDefaultPane = content.document.getElementById("isDefaultPane");
    let isNotDefaultPane = content.document.getElementById("isNotDefaultPane");

    is(isDefaultPane.localName, "moz-promo", "Pane is a moz-promo");

    Assert.ok(
      BrowserTestUtils.isHidden(isDefaultPane.control),
      "The 'browser is default' pane should be hidden when not default"
    );

    Assert.ok(
      !BrowserTestUtils.isHidden(isNotDefaultPane.control),
      "The 'is not default' pane should be visible when not default"
    );

    let alwaysCheck = content.document.getElementById("alwaysCheckDefault");

    Assert.ok(alwaysCheck.disabled, "Always Check is disabled when locked");

    Assert.ok(
      alwaysCheck.checked,
      "Always Check is checked because defaultPref is true and pref is locked"
    );
    Assert.ok(
      Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "alwaysCheck pref should ship with 'true' by default"
    );
    const setDefaultButton =
      content.document.getElementById("setDefaultButton");
    /**
     * Click 'Make default' button to trigger shell service that sets the browser to default.
     */
    setDefaultButton.click();

    const { TelemetryTestUtils } = ChromeUtils.importESModule(
      "resource://testing-common/TelemetryTestUtils.sys.mjs"
    );
    let snapshot = TelemetryTestUtils.getProcessScalars("parent", true, true);
    TelemetryTestUtils.assertKeyedScalar(
      snapshot,
      "browser.ui.interaction.preferences_paneGeneral",
      "setDefaultButton",
      2 // button clicked
    );

    Assert.ok(
      !BrowserTestUtils.isHidden(isNotDefaultPane.control),
      "Browser default pane still shows after click because pref is locked"
    );

    Assert.ok(
      BrowserTestUtils.isHidden(isDefaultPane.control),
      "Browser is not default pane is NOT showing"
    );

    Assert.ok(
      alwaysCheck.checked,
      "'Always Check' is still checked because it's locked"
    );
    Assert.ok(
      alwaysCheck.disabled,
      "'Always Check is disabled because it's locked"
    );
    Assert.ok(
      Services.prefs.getBoolPref("browser.shell.checkDefaultBrowser"),
      "The pref is locked and so doesn't get changed"
    );
    teardown();
  }
);

add_task(
  /**
   * Testcase with Firefox initially set as the default browser
   */
  async function make_default_after_browser_set_as_default() {
    await setup();

    await setupInitialBrowserDefaultSetting({ isDefault: true });

    const alwaysCheck = content.document.getElementById("alwaysCheckDefault");

    is(alwaysCheck.localName, "moz-checkbox", "Checkbox is a moz-checkbox.");

    Assert.ok(
      !BrowserTestUtils.isHidden(alwaysCheck.control),
      "Control element is visible by default"
    );

    Assert.ok(!alwaysCheck.disabled, "'Always Check' is NOT disabled");

    Assert.ok(!alwaysCheck.checked, "Checkbox is NOT checked initially");

    is(
      content.document.l10n.getAttributes(alwaysCheck).id,
      "always-check-default",
      `Checkbox has the correct data-l10n-id attribute`
    );
    teardown();
  }
);
