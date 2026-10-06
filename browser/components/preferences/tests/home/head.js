/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

async function openHomePreferences() {
  await openPreferencesViaOpenPreferencesAPI("home", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  await BrowserTestUtils.waitForCondition(
    () => doc.querySelector('setting-group[groupid="home"]'),
    "Wait for the Firefox Home setting group to render"
  );

  // Wait for the setting-group web component to finish rendering
  let homeGroup = doc.querySelector('setting-group[groupid="home"]');
  if (homeGroup.updateComplete) {
    await homeGroup.updateComplete;
  }

  return {
    win: gBrowser.contentWindow,
    doc,
    tab: gBrowser.selectedTab,
  };
}

/**
 * Opens the custom homepage subpage directly and waits for it to fully render.
 *
 * @returns {Promise<object>} Object containing win, doc, and tab references.
 */

async function openCustomHomepageSubpage() {
  await openPreferencesViaOpenPreferencesAPI("customHomepage", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;

  await BrowserTestUtils.waitForCondition(
    () => doc.querySelector("#setting-control-customHomepageAddUrlInput"),
    "Wait for custom homepage subpage to fully render"
  );

  return { win: gBrowser.contentWindow, doc, tab: gBrowser.selectedTab };
}

/**
 * Waits for a boolean preference to change to the expected value.
 *
 * @param {string} prefName - The preference name.
 * @param {boolean} expectedValue - The expected boolean value.
 * @returns {Promise} Promise that resolves when the pref reaches the expected value.
 */

async function waitForCheckboxState(checkbox, expectedValue) {
  return TestUtils.waitForCondition(
    () => checkbox.checked === expectedValue,
    `Waiting for checkbox checked to be ${expectedValue}`
  );
}

/**
 * Opens a preferences pane, passes the document to the test function,
 * and ensures the tab is cleaned up afterwards
 *
 * @param {string} pane - The preferences pane to open
 * @param {Function} testFn - Async function receiving the pane's document
 */

async function waitForToggleState(toggle, expectedValue) {
  return TestUtils.waitForCondition(
    () => toggle.pressed === expectedValue,
    `Waiting for toggle pressed to be ${expectedValue}`
  );
}

/**
 * Waits for a checkbox element's checked state to change to the expected value.
 *
 * @param {Element} checkbox - The checkbox element.
 * @param {boolean} expectedValue - The expected checked state.
 * @returns {Promise} Promise that resolves when the checkbox reaches the expected state.
 */

/**
 * Clicks a moz-box-link in a Firefox Home setting; asserts the resulting
 * openTrustedLinkIn call and that no extra tab opened.
 *
 * @param {object} params
 * @param {string} params.settingId - e.g. "manageTopics".
 * @param {string} params.expectedUrl - URL the handler should open.
 * @param {string} params.expectedWhere - "tab" or "window".
 */
async function assertHomeSettingLinkOpens({
  settingId,
  expectedUrl,
  expectedWhere,
}) {
  let { win, tab } = await openHomePreferences();

  let calls = [];
  let originalOpenTrustedLinkIn = win.openTrustedLinkIn;
  win.openTrustedLinkIn = (url, where) => {
    calls.push({ url, where });
  };
  let tabsBefore = gBrowser.tabs.length;

  try {
    let control = await settingControlRenders(settingId, win);
    ok(BrowserTestUtils.isVisible(control), `${settingId} control is visible`);

    let link = control.querySelector("moz-box-link");
    ok(link, `${settingId} renders a moz-box-link`);

    synthesizeClick(link);

    is(calls.length, 1, "openTrustedLinkIn called exactly once");
    is(calls[0].url, expectedUrl, `Opens ${expectedUrl}`);
    is(calls[0].where, expectedWhere, `Opens in ${expectedWhere}`);
    is(
      gBrowser.tabs.length,
      tabsBefore,
      "Default new-tab navigation was suppressed (no extra tab opened)"
    );
  } finally {
    win.openTrustedLinkIn = originalOpenTrustedLinkIn;
    BrowserTestUtils.removeTab(tab);
  }
}
