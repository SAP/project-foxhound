/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* global add_heuristic_tests */

/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PROFILE = {
  "cc-name": "John Doe",
  "cc-number": "4111111111111111",
  // "cc-type" should be remove from proile after fixing Bug 1834768.
  "cc-type": "visa",
  "cc-exp-month": "04",
  "cc-exp-year": new Date().getFullYear(),
};

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.formautofill.creditCards.supported", "on"],
      ["extensions.formautofill.creditCards.enabled", true],
    ],
  });
});

add_autofill_heuristic_tests([
  {
    description: `Test form in a same-origin nested iframe`,
    fixtureData: `
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_ALL_FIELDS}\"></iframe>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
        ],
      },
    ],
  },
  {
    description: `Test form in cross-origin iframe nested inside same-origin iframe`,
    fixtureData: `
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_ALL_FIELDS}\"></iframe>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
        ],
      },
    ],
  },
  {
    description: `Test form in cross-origin iframe nested inside cross-origin iframe`,
    fixtureData: `
      <iframe src=\"${CROSS_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_ALL_FIELDS}\"></iframe>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
        ],
      },
    ],
  },
  {
    description: `Test fields are in its own same-origin nested iframe`,
    fixtureData: `
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_NUMBER}\"></iframe>
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_NAME}\"></iframe>
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_EXP}\"></iframe>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
        ],
      },
    ],
  },
  {
    description: `Test fields are in its own cross-origin nested iframe`,
    fixtureData: `
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_CC_NUMBER}\"></iframe>
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_CC_NAME}\"></iframe>
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_CC_EXP}\"></iframe>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
        ],
      },
    ],
  },
  {
    description: `Test field in the nested iframe should be autofilled as long as it is same-origin with the triggered frame`,
    fixtureData: `
      <p><label>Card Number: <input id="cc-number" autocomplete="cc-number"></label></p>
      <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_NAME}\"></iframe>
      <iframe src=\"${CROSS_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_EXP}\"></iframe>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
        ],
      },
    ],
  },
  {
    description: `Test field in the nested iframe should NOT be autofilled if it is not same-origin with the triggered frame`,
    fixtureData: `
      <form>
        <p><label>Card Number: <input id="cc-number" autocomplete="cc-number"></label></p>
        <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_CC_NAME}\"></iframe>
        <iframe src=\"${CROSS_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_CC_EXP}\"></iframe>
      </form>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: "" },
          { fieldName: "cc-exp", autofill: "" },
        ],
      },
    ],
  },
  {
    description: `Test triggering autofill in the nested iframe should autofill fields that are in the same-origin frames`,
    fixtureData: `
      <form>
        <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_NUMBER}\"></iframe>

        <p><label>Card Name: <input id="cc-name" autocomplete="cc-name"></label></p>
        <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_EXP}\"></iframe>
        <iframe src=\"${CROSS_ORIGIN_NESTED_IFRAME}?iframe=${SAME_ORIGIN_CC_TYPE}\"></iframe>
      </form>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: TEST_PROFILE["cc-name"] },
          {
            fieldName: "cc-exp",
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
          },
          { fieldName: "cc-type", autofill: "visa" },
        ],
      },
    ],
  },
  {
    description: `Test triggering autofill in the nested iframe should NOT autofill fields that are in the same-origin frames`,
    fixtureData: `
      <form>
        <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_CC_NUMBER}\"></iframe>

        <iframe src=\"${CROSS_ORIGIN_2_CC_NAME}\"></iframe>
        <iframe src=\"${SAME_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_2_CC_EXP}\"></iframe>
        <iframe src=\"${CROSS_ORIGIN_NESTED_IFRAME}?iframe=${CROSS_ORIGIN_2_CC_TYPE}\"></iframe>
      </form>
    `,
    profile: TEST_PROFILE,
    autofillTrigger: "#cc-number",
    expectedResult: [
      {
        fields: [
          { fieldName: "cc-number", autofill: TEST_PROFILE["cc-number"] },
          { fieldName: "cc-name", autofill: "" },
          { fieldName: "cc-exp", autofill: "" },
          { fieldName: "cc-type", autofill: "" },
        ],
      },
    ],
  },
]);
