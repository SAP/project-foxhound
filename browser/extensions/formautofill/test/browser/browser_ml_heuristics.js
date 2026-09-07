/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/* global add_heuristic_tests */

const { FormAutofillML } = ChromeUtils.importESModule(
  "resource://gre/modules/shared/FormAutofillML.sys.mjs"
);

let detectedFields = [
  // first test
  "given-name",
  "family-name",
  "street-address",
  "address-level2",
  "address-level1",
  "postal-code",
  "country",
  // second test
  "postal-code",
  "cc-exp-month",
  "cc-exp-year",
  "cc-csc",
];

//eslint-disable-next-line no-unused-vars
function detectFields(fieldDetails) {
  for (let fd of fieldDetails) {
    if (fd.fieldName || !fd.mlData) {
      continue;
    }

    fd.fieldName = detectedFields.shift();
    fd.reason = "ml";
  }
}

add_setup(async function () {
  let detectFieldsStub = sinon.stub(FormAutofillML.prototype, "detectFields");
  detectFieldsStub.callsFake(async (window, fieldDetails) => {
    return await detectFields(window, fieldDetails);
  });

  registerCleanupFunction(() => {
    detectFieldsStub.restore();
  });

  await SpecialPowers.pushPrefEnv({
    set: [["extensions.formautofill.useml", true]],
  });
});

add_heuristic_tests([
  {
    fixtureData: `
      <p><label>givenname: <input type="text" id="given-name" name="given-name"/></label></p>
      <p><label>familyname: <input type="text" id="family-name" name="family-name"/></label></p>
      <p><label>organization: <input type="text" id="organization" name="organization" autocomplete="organization" /></label></p>
      <p><label>streetAddress: <input type="search" id="street-address" name="street-address"/></label></p>
      <p><label>addressLevel2: <input type="text" id="address-level2" name="address-level2" /></label></p>
      <p><label>addressLevel1: <input type="text" id="address-level1" name="address-level1" autocomplete="off"/></label></p>
      <p><label>postalCode: <input type="text" id="postal-code" name="postal-code" autocomplete="unknown"/></label></p>
      <p><label>country: <input type="text" id="country" name="country"/></label></p>
      <p><label>tel: <input type="text" id="tel" name="tel" autocomplete="tel" /></label></p>
      <p><label>email: <input type="email" id="email" name="email"/></label></p>`,
    expectedResult: [
      {
        default: {
          reason: "ml",
        },
        fields: [
          { fieldName: "given-name" },
          { fieldName: "family-name" },
          { fieldName: "organization", reason: "autocomplete" },
          { fieldName: "street-address" },
          { fieldName: "address-level2" },
          { fieldName: "address-level1" },
          { fieldName: "postal-code" },
          { fieldName: "country" },
          { fieldName: "tel", reason: "autocomplete" },
          { fieldName: "email", reason: "regex-heuristic" },
        ],
      },
    ],
  },
  {
    fixtureData: `
      <p><label>Name: <input id="cc-name"></label></p>
      <p><label>Card Number: <input id="cc-number"></label></p>
      <p><label>Expiration month: <input id="cc-exp-month"></label></p>
      <p><label>Expiration year: <input id="cc-exp-year"></label></p>
      <p><label>CSC: <input id="cc-csc"></label></p>
      <p><label>Postal Code: <input id="postal-code" name="postal-code"/></label></p>`,
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-name", reason: "fathom" },
          { fieldName: "cc-number", reason: "fathom" },
          { fieldName: "cc-exp-month", reason: "ml" },
          { fieldName: "cc-exp-year", reason: "ml" },
          { fieldName: "cc-csc", reason: "ml" },
        ],
      },
      {
        invalid: true,
        fields: [{ fieldName: "postal-code", reason: "ml" }],
      },
    ],
  },
]);
