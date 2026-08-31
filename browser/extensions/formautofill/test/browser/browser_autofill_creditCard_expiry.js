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

add_autofill_heuristic_tests([
  {
    description:
      "Credit card form when the expiry field has the year cropped to the first two digits - form MM/YY",
    fixtureData: `
          <form>
            <input id="cc-number" autocomplete="cc-number">
            <input id="cc-exp" autocomplete="cc-exp"
                   oninput="if(this.value) this.value = '04/' + new Date().getFullYear().toString().substring(0,2)">
            <input id="name" placeholder="given-name">
          </form>`,
    profile: TEST_PROFILE,
    expectedResult: [
      {
        fields: [
          {
            fieldName: "cc-number",
            reason: "autocomplete",
            autofill: TEST_PROFILE["cc-number"],
          },
          {
            fieldName: "cc-exp",
            reason: "autocomplete",
            preview: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"]}`,
            autofill: `${TEST_PROFILE["cc-exp-month"]}/${TEST_PROFILE["cc-exp-year"].toString().substring(2)}`,
          },
          {
            fieldName: "cc-name",
            reason: "update-heuristic",
            autofill: TEST_PROFILE["cc-name"],
          },
        ],
      },
    ],
  },
  {
    description:
      "Credit card form when the expiry field has the year cropped to the first two digits - form YY-MM",
    fixtureData: `
          <form>
            <input id="cc-number" autocomplete="cc-number">
            <input id="cc-exp" autocomplete="cc-exp" placeholder="yyyy-mm"
                   oninput="if(this.value) this.value = new Date().getFullYear().toString().substring(0,2) + '-04'">
            <input id="name" placeholder="given-name">
          </form>`,
    profile: TEST_PROFILE,
    expectedResult: [
      {
        fields: [
          {
            fieldName: "cc-number",
            reason: "autocomplete",
            autofill: TEST_PROFILE["cc-number"],
          },
          {
            fieldName: "cc-exp",
            reason: "autocomplete",
            preview: `${TEST_PROFILE["cc-exp-year"]}-${TEST_PROFILE["cc-exp-month"]}`,
            autofill: `${TEST_PROFILE["cc-exp-year"].toString().substring(2)}-${TEST_PROFILE["cc-exp-month"]}`,
          },
          {
            fieldName: "cc-name",
            reason: "update-heuristic",
            autofill: TEST_PROFILE["cc-name"],
          },
        ],
      },
    ],
  },
]);
