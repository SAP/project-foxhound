/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

async function clickCheckboxAndWaitForPrefChange(
  doc,
  checkboxId,
  prefName,
  expectedValue
) {
  let checkbox = doc.getElementById(checkboxId);
  let prefChange = waitForAndAssertPrefState(prefName, expectedValue);

  checkbox.click();

  await prefChange;
  is(
    checkbox.checked,
    expectedValue,
    `The checkbox #${checkboxId} should be in the expected state after being clicked.`
  );
  return checkbox;
}

/**
 * Clicks a checkbox that triggers a confirmation dialog and handles the dialog response.
 *
 * @param {Document} doc - The document containing the checkbox.
 * @param {string} checkboxId - The ID of the checkbox to click.
 * @param {string} prefName - The name of the preference that should change.
 * @param {boolean} expectedValue - The expected value after handling the dialog.
 * @param {number} buttonNumClick - The button to click in the dialog (0 = cancel, 1 = OK).
 * @returns {Promise<HTMLInputElement>}
 */

async function clickCheckboxWithConfirmDialog(
  doc,
  checkboxId,
  prefName,
  expectedValue,
  buttonNumClick
) {
  let checkbox = doc.getElementById(checkboxId);

  let promptPromise = PromptTestUtils.handleNextPrompt(
    gBrowser.selectedBrowser,
    { modalType: Services.prompt.MODAL_TYPE_CONTENT },
    { buttonNumClick }
  );

  let prefChangePromise = null;
  if (buttonNumClick === 1) {
    // Only wait for the final preference change to the expected value
    // The baseline checkbox handler sets the checkbox state directly and
    // the preference binding handles the actual preference change
    prefChangePromise = waitForAndAssertPrefState(prefName, expectedValue);
  }

  checkbox.click();

  await promptPromise;

  if (prefChangePromise) {
    await prefChangePromise;
  }

  is(
    checkbox.checked,
    expectedValue,
    `The checkbox #${checkboxId} should be in the expected state after dialog interaction.`
  );

  return checkbox;
}

// Some things are set dangerously in the test environment.
// We can suppress these errors!
const RESET_PROBLEMATIC_TEST_STATUSES = [
  [
    "browser.preferences.config_warning.warningAllowFingerprinters.dismissed",
    true,
  ],
  [
    "browser.preferences.config_warning.warningThirdPartyCookies.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningPasswordManager.dismissed", true],
  ["browser.preferences.config_warning.warningPopupBlocker.dismissed", true],
  [
    "browser.preferences.config_warning.warningExtensionInstall.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningSafeBrowsing.dismissed", true],
  ["browser.preferences.config_warning.warningDoH.dismissed", true],
  ["browser.preferences.config_warning.warningECH.dismissed", true],
  ["browser.preferences.config_warning.warningCT.dismissed", true],
  ["browser.preferences.config_warning.warningCRLite.dismissed", true],
  [
    "browser.preferences.config_warning.warningCertificatePinning.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningTLSMin.dismissed", true],
  ["browser.preferences.config_warning.warningTLSMax.dismissed", true],
  [
    "browser.preferences.config_warning.warningProxyAutodetection.dismissed",
    true,
  ],
  [
    "browser.preferences.config_warning.warningContentResourceURI.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningWorkerMIME.dismissed", true],
  ["browser.preferences.config_warning.warningTopLevelDataURI.dismissed", true],
  [
    "browser.preferences.config_warning.warningActiveMixedContent.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningInnerHTMLltgt.dismissed", true],
  ["browser.preferences.config_warning.warningFileURIOrigin.dismissed", true],
  [
    "browser.preferences.config_warning.warningPrivelegedConstraint.dismissed",
    true,
  ],
  ["browser.preferences.config_warning.warningProcessSandbox.dismissed", true],
];

/**
 * Select the given history mode via dropdown in the privacy pane.
 *
 * @param {Window} win - The preferences window which contains the
 * dropdown.
 * @param {string} value - The history mode to select.
 */
