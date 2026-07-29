/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Verify STATE_READONLY is exposed identically via HTML `readonly` and aria-readonly
 * for inputs with and without aria roles.
 */
addAccessibleTask(
  `
  <label>Combobox readonly:
    <input id="combobox_readonly" role="combobox" readonly value="URL">
  </label>
  <label>Text input readonly:
    <input id="text_readonly" readonly value="URL">
  </label>
  <label>Combobox aria-readonly:
    <input id="combobox_aria_readonly" role="combobox" aria-readonly="true" value="URL">
  </label>
  <label>Combobox readonly + aria-readonly=false:
    <input id="combobox_readonly_aria_false" role="combobox" readonly aria-readonly="false" value="URL">
  </label>
  <label>Text input readonly + aria-readonly=false:
    <input id="text_readonly_aria_false" readonly aria-readonly="false" value="URL">
  </label>`,
  async function testReadonlyStates(browser, accDoc) {
    const comboboxReadonly = findAccessibleChildByID(
      accDoc,
      "combobox_readonly"
    );
    const textReadonly = findAccessibleChildByID(accDoc, "text_readonly");
    const comboboxAriaReadonly = findAccessibleChildByID(
      accDoc,
      "combobox_aria_readonly"
    );
    const comboboxReadonlyAriaFalse = findAccessibleChildByID(
      accDoc,
      "combobox_readonly_aria_false"
    );
    const textReadonlyAriaFalse = findAccessibleChildByID(
      accDoc,
      "text_readonly_aria_false"
    );

    // Verify readonly on a plain input
    testStates(textReadonly, STATE_READONLY);

    // Verify readonly on an input with role=combobox
    testStates(comboboxReadonly, STATE_READONLY);

    // Verify aria-readonly on an input with role=combobox
    testStates(comboboxAriaReadonly, STATE_READONLY);

    // Per HTML-AAM, when both readonly and aria-readonly are present, only the
    // readonly attribute value is exposed. aria-readonly="false" should not
    // remove STATE_READONLY.
    testStates(comboboxReadonlyAriaFalse, STATE_READONLY);
    testStates(textReadonlyAriaFalse, STATE_READONLY);
  }
);
