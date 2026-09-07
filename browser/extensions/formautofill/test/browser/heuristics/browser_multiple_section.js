/* global add_heuristic_tests */

"use strict";

add_heuristic_tests(
  [
    {
      fixturePath: "multiple_section.html",
      expectedResult: [
        {
          default: {
            reason: "autocomplete",
            addressType: "shipping",
          },
          fields: [
            { fieldName: "name", addressType: "" },
            { fieldName: "organization", addressType: "" },
            { fieldName: "street-address" },
            { fieldName: "address-level2" },
            { fieldName: "address-level1" },
            { fieldName: "postal-code" },
            { fieldName: "country" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
            addressType: "billing",
          },
          fields: [
            { fieldName: "street-address" },
            { fieldName: "address-level2" },
            { fieldName: "address-level1" },
            { fieldName: "postal-code" },
            { fieldName: "country" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
            section: "section-my",
          },
          fields: [
            { fieldName: "street-address" },
            { fieldName: "address-level2" },
            { fieldName: "address-level1" },
            { fieldName: "postal-code" },
            { fieldName: "country" },
            { fieldName: "tel", section: "", contactType: "work" },
            { fieldName: "email", section: "", contactType: "work" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
          },
          fields: [
            // Even the `contactType` of these two fields are different with the
            // above two, we still consider they are identical until supporting
            // multiple phone number and email in one profile.
            { fieldName: "tel", contactType: "home" },
            { fieldName: "email", contactType: "home" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
          },
          fields: [
            { fieldName: "name" },
            { fieldName: "organization" },
            { fieldName: "street-address" },
            { fieldName: "address-level2" },
            { fieldName: "address-level1" },
            { fieldName: "postal-code" },
            { fieldName: "country" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
          },
          fields: [
            { fieldName: "street-address" },
            { fieldName: "address-level2" },
            { fieldName: "address-level1" },
            { fieldName: "postal-code" },
            { fieldName: "country" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
          },
          fields: [
            { fieldName: "street-address" },
            { fieldName: "address-level2" },
            { fieldName: "address-level1" },
            { fieldName: "postal-code" },
            { fieldName: "country" },
            { fieldName: "tel", contactType: "work" },
            { fieldName: "email", contactType: "work" },
          ],
        },
        {
          default: {
            reason: "autocomplete",
            contactType: "home",
          },
          fields: [{ fieldName: "tel" }, { fieldName: "email" }],
        },
      ],
    },
    {
      fixtureData: `<form>
                      <input id="firstName">
                      <input id="lastName">
                      <select id="country">
                        <option>Canada
                      </select>
                      <input id="addressLine1">
                      <input id="addressLine2">
                      <input id="city">
                      <input id="postalCode">
                      <input id="region">
                      <select id="country-code" autocomplete="country">
                        <option value="1">Canada +1</option>
                        <option value="2">Belgium +32</option>
                        <option value="3">France +33</option>
                      </select>
                      <input id="phone-number">
                      <input id="email">
                  </form>`,
      expectedResult: [
        {
          default: {
            reason: "regex-heuristic",
          },
          fields: [
            { fieldName: "given-name" },
            { fieldName: "family-name" },
            { fieldName: "country" },
            { fieldName: "address-line1" },
            { fieldName: "address-line2", reason: "update-heuristic" },
            { fieldName: "address-level2" },
            { fieldName: "postal-code" },
            { fieldName: "address-level1" },
            { fieldName: "country", reason: "autocomplete" },
            { fieldName: "tel" },
            { fieldName: "email" },
          ],
        },
      ],
    },
  ],
  "fixtures/"
);
