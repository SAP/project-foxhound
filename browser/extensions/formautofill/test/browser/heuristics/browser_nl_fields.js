/* global add_heuristic_tests */

"use strict";

add_heuristic_tests(
  [
    {
      fixtureData: `
        <html>
        <body>
          <form>
            <input id="straat"/>
            <input id="voornaam"/>
            <input id="voorletters"/>
            <input id="achternaam"/>
            <input id="telefoon"/>
            <input id="stad"/>
          </form>
        </body>
        </html>`,
      expectedResult: [
        {
          default: {
            reason: "regex-heuristic",
          },
          fields: [
            { fieldName: "street-address" },
            { fieldName: "given-name" },
            { fieldName: "additional-name" },
            { fieldName: "family-name" },
            { fieldName: "tel" },
            { fieldName: "address-level2" },
          ],
        },
      ],
    },
  ],
  "fixtures/"
);
