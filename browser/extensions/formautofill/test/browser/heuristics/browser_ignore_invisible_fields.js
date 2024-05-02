/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

/* global add_heuristic_tests */

"use strict";

add_heuristic_tests([
  {
    description:
      "All fields are visible (interactivityCheckMode is set to visibility).",
    prefs: [
      [
        "extensions.formautofill.heuristics.interactivityCheckMode",
        "visibility",
      ],
    ],
    fixtureData: `
        <html>
        <body>
          <form>
            <input type="text" id="name" autocomplete="name" />
            <input type="text" id="tel" autocomplete="tel" />
            <input type="text" id="email" autocomplete="email" />
            <input type="text" id="country" autocomplete="country"/>
            <input type="text" id="postal-code" autocomplete="postal-code" />
            <input type="text" id="address-line1" autocomplete="address-line1" />
            <div>
              <input type="text" id="address-line2" autocomplete="address-line2" />
            </div>
          </form>
          </form>
        </body>
        </html>
      `,
    expectedResult: [
      {
        default: {
          reason: "autocomplete",
        },
        fields: [
          { fieldName: "name" },
          { fieldName: "tel" },
          { fieldName: "email" },
          { fieldName: "country" },
          { fieldName: "postal-code" },
          { fieldName: "address-line1" },
          { fieldName: "address-line2" },
        ],
      },
    ],
  },
  {
    description:
      "Some fields are invisible due to css styling (interactivityCheckMode is set to visibility).",
    prefs: [
      [
        "extensions.formautofill.heuristics.interactivityCheckMode",
        "visibility",
      ],
    ],
    fixtureData: `
        <html>
        <body>
          <form>
            <input type="text" id="name" autocomplete="name" />
            <input type="text" id="tel" autocomplete="tel" />
            <input type="text" id="email" autocomplete="email" />
            <input type="text" id="country" autocomplete="country" />
            <input type="text" id="postal-code" autocomplete="postal-code" hidden />
            <input type="text" id="address-line1" autocomplete="address-line1" style="display:none" />
            <div style="visibility: hidden">
              <input type="text" id="address-line2" autocomplete="address-line2" />
            </div>
          </form>
        </body>
        </html>
      `,
    expectedResult: [
      {
        default: {
          reason: "autocomplete",
        },
        fields: [
          { fieldName: "name" },
          { fieldName: "tel" },
          { fieldName: "email" },
          { fieldName: "country" },
        ],
      },
    ],
  },
  {
    // hidden, style="display:none" are always considered (when mode visibility)
    description:
      "Number of form elements exceeds the threshold (interactivityCheckMode is set to visibility).",
    prefs: [
      ["extensions.formautofill.heuristics.visibilityCheckThreshold", 1],
      [
        "extensions.formautofill.heuristics.interactivityCheckMode",
        "visibility",
      ],
    ],
    fixtureData: `
        <html>
        <body>
          <form>
            <input type="text" id="name" autocomplete="name" />
            <input type="text" id="tel" autocomplete="tel" />
            <input type="text" id="email" autocomplete="email" />
            <input type="text" id="country" autocomplete="country" disabled />
            <input type="text" id="postal-code" autocomplete="postal-code" hidden />
            <input type="text" id="address-line1" autocomplete="address-line1" style="display:none" />
            <div style="visibility: hidden">
              <input type="text" id="address-line2" autocomplete="address-line2" />
            </div>
          </form>
        </body>
        </html>
      `,
    expectedResult: [
      {
        default: {
          reason: "autocomplete",
        },
        fields: [
          { fieldName: "name" },
          { fieldName: "tel" },
          { fieldName: "email" },
          { fieldName: "country" },
          { fieldName: "address-line2" },
        ],
      },
    ],
  },
]);
