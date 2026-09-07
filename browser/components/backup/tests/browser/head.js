/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { BackupService } = ChromeUtils.importESModule(
  "resource:///modules/backup/BackupService.sys.mjs"
);

const { MockFilePicker } = SpecialPowers;

/** @type {{sinon: import("@types/sinon").SinonApi}} */
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

const MOCK_PASSWORD = "mckP@ss3x2 fake_password";

/**
 * Dispatches a custom event "ValidPasswordsDetected" or "InvalidPasswordsDetected" from
 * the password-validation-inputs element within a parent element.
 * Pass "ValidPasswordsDetected" to simulate when a user meets password requirements
 * before submitting any changes. Otherwise, pass "InvalidPasswordsDetected" to simulate when a
 * user no longer satisfies password requirements.
 *
 * @param {HTMLElement} parentEl
 *  The parent element that listens for the custom event and contains the inputs element dispatching it.
 * @param {HTMLElement} passwordInputsEl
 *  The inputs element embedded within the parent element that dispatches the custom event.
 * @param {string} event
 *  The event to dispatch.
 * @returns {Promise<undefined>}
 */
function createMockValidityPassEventPromise(parentEl, passwordInputsEl, event) {
  let promise = new Promise(resolve => {
    parentEl.addEventListener(event, resolve, {
      once: true,
    });
  });
  let detail = {};

  if (event === "ValidPasswordsDetected") {
    detail.password = MOCK_PASSWORD;
  }

  passwordInputsEl.dispatchEvent(
    new CustomEvent(event, {
      bubbles: true,
      composed: true,
      detail,
    })
  );
  return promise;
}

/**
 * Tries to get the BackupService, and if it is not inited, inits it
 *
 * @returns {BackupService}
 */
function getAndMaybeInitBackupService() {
  try {
    return BackupService.get();
  } catch {
    return BackupService.init();
  }
}

/**
 * Dispatches an input event for a password input field.
 *
 * @param {HTMLElement} inputEl
 *  the input element that will dispatch the input event
 * @param {string} mockPassword
 *  the password entered for the input element
 * @returns {Promise<undefined>}
 */
function createMockPassInputEventPromise(inputEl, mockPassword) {
  let promise = new Promise(resolve => {
    inputEl.addEventListener("input", () => resolve(), {
      once: true,
    });
  });
  inputEl.focus();
  inputEl.value = mockPassword;
  inputEl.dispatchEvent(new Event("input"));
  return promise;
}

/**
 * Waits for the backup-settings element to be rendered in the DOM and returns it.
 *
 * @param {Browser} browser
 *  the browser instance containing the about:preferences page
 * @returns {Promise<Element>}
 *  resolves to the backup-settings element once it's rendered
 */
async function waitForBackupSettings(browser) {
  let settingsGroup = browser.contentDocument.querySelector(
    "setting-group[groupid='backup']"
  );

  await BrowserTestUtils.waitForMutationCondition(
    settingsGroup,
    { childList: true, subtree: true },
    () => browser.contentDocument.querySelector("backup-settings")
  );

  let settings = browser.contentDocument.querySelector("backup-settings");
  await settings.updateComplete;

  // Wait for BackupService state to propagate to the component, which
  // happens asynchronously after the element is connected to the DOM.
  await BrowserTestUtils.waitForMutationCondition(
    settings.shadowRoot,
    { childList: true, subtree: true },
    () => settings.backupServiceState.archiveEnabledStatus
  );

  return settings;
}
