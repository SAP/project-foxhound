/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const MOCK_PASSWORD = "mckP@ss3x2 fake_password";

/**
 * Creates a default backupServiceState object with common properties.
 * This is used in tests to avoid repetition of the defaultParent structure.
 *
 * @param {object} overrides - Properties to override or add to the default state
 * @returns {object} The complete backupServiceState object
 */
function createBackupServiceState(overrides = {}) {
  const testDefaultName = "test-default-path";
  return {
    defaultParent: {
      path: PathUtils.join(PathUtils.tempDir, testDefaultName),
      fileName: testDefaultName,
    },
    archiveEnabledStatus: true,
    restoreEnabledStatus: true,
    ...overrides,
  };
}

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
