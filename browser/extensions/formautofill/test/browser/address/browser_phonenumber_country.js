/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_autofill_heuristic_tests([
  {
    description:
      "Address form with country code field where the id doesn't match",
    fixtureData: `
          <form>
            <input id="firstname">
            <input id="lastname">
            <select id="copt">
              <option value="-">Unknown
              <option value="1">Canada
              <option value="2">France
              <option value="3">Germany
              <option value="4">Greece
              <option value="5">United States
              <option value="6">Venezuela
            </select>
            <input id="tel">
          </form>`,
    profile: TEST_ADDRESS_1,
    expectedResult: [
      {
        default: {
          reason: "regex-heuristic",
        },
        fields: [
          { fieldName: "given-name", autofill: TEST_ADDRESS_1["given-name"] },
          { fieldName: "family-name", autofill: TEST_ADDRESS_1["family-name"] },
          { fieldName: "country", autofill: "5" },
          { fieldName: "tel", autofill: TEST_ADDRESS_1.tel.substring(2) },
        ],
      },
    ],
  },
  {
    description:
      "Address form with country code field where the country does not exist",
    fixtureData: `
          <form>
            <input id="firstname">
            <input id="lastname">
            <select id="copt">
              <option value="-">Unknown
              <option value="1">Canada
              <option value="2">France
              <option value="3">Germany
              <option value="4">Greece
              <option value="5">Venezuela
            </select>
            <input id="tel">
          </form>`,
    profile: TEST_ADDRESS_1,
    expectedResult: [
      {
        default: {
          reason: "regex-heuristic",
        },
        fields: [
          { fieldName: "given-name", autofill: TEST_ADDRESS_1["given-name"] },
          { fieldName: "family-name", autofill: TEST_ADDRESS_1["family-name"] },
          { fieldName: "country", autofill: "" },
          { fieldName: "tel", autofill: TEST_ADDRESS_1.tel.substring(2) },
        ],
      },
    ],
  },
]);
