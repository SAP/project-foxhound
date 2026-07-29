/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the rule-view content is correct when the page defines nested at-rules (@media, @layer, @supports, …)
const TEST_URI = `
  <body>
  <style type="text/css">
    body {
      container: mycontainer / inline-size;
    }

    @layer mylayer {
      @supports (container-name: mycontainer) {
        @container mycontainer (min-width: 1px) {
          @media screen {
            @container mycontainer (min-width: 2rem) {
              @scope (:scope) to (:scope > h1) {
                h1, [test-hint="nested"] {
                  background: gold;
                }
              }
            }
          }
        }
      }
    }
  </style>
  <h1>Hello nested at-rules!</h1>
  </body>
`;

add_task(async function () {
  await pushPref("layout.css.at-scope.enabled", true);
  await addTab(
    "https://example.com/document-builder.sjs?html=" +
      encodeURIComponent(TEST_URI)
  );
  const { inspector, view } = await openRuleView();

  await selectNode("h1", inspector);

  checkRuleViewContent(view, [
    { selector: "element", selectorEditable: false, ancestorRulesData: null },
    {
      selector: `h1, ~~[test-hint="nested"]~~`,
      ancestorRulesData: [
        `@layer mylayer {`,
        `  @supports (container-name: mycontainer) {`,
        `    @container mycontainer (min-width: 1px) {`,
        `      @media screen {`,
        `        @container mycontainer (min-width: 2rem) {`,
        `          @scope (:scope) to (:scope > h1) {`,
      ],
    },
  ]);
});
