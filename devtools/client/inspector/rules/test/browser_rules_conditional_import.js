/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the rule-view content displays @import conditions.

const TEST_URI = `
  <style type="text/css">
    @import url(${URL_ROOT_COM_SSL}doc_conditional_import.css) screen and (width > 10px);
    @import url(${URL_ROOT_COM_SSL}doc_imported_named_layer.css) layer(importedLayer) (height > 42px);
    @import url(${URL_ROOT_COM_SSL}doc_conditional_import.css) supports(display: flex);
    @import url(${URL_ROOT_COM_SSL}doc_conditional_import.css) supports(display: flex) screen and (width > 10px);
    @import url(${URL_ROOT_COM_SSL}doc_imported_named_layer.css) layer(importedLayerTwo) supports(display: flex) screen and (width > 10px);
    @import url(${URL_ROOT_COM_SSL}doc_imported_no_layer.css);
  </style>
  <h1>Hello @import!</h1>
`;

add_task(async function () {
  await addTab(
    "https://example.com/document-builder.sjs?html=" +
      encodeURIComponent(TEST_URI)
  );
  const { inspector, view } = await openRuleView();
  await selectNode("h1", inspector);

  checkRuleViewContent(view, [
    { selector: "element", selectorEditable: false, ancestorRulesData: null },
    {
      // Checking that we don't show @import for rules from imported stylesheet with no conditions
      selector: `h1, ~~[test-hint="imported-no-layer--no-rule-layer"]~~`,
      ancestorRulesData: null,
    },
    {
      selector: `h1, ~~[test-hint="imported-conditional"]~~`,
      ancestorRulesData: [
        "@import supports(display: flex) screen and (width > 10px) {",
      ],
    },
    {
      selector: `h1, ~~[test-hint="imported-conditional"]~~`,
      ancestorRulesData: ["@import supports(display: flex) {"],
    },
    {
      selector: `h1, ~~[test-hint="imported-conditional"]~~`,
      ancestorRulesData: ["@import screen and (width > 10px) {"],
    },
    {
      selector: `h1, ~~[test-hint="imported-named-layer--no-rule-layer"]~~`,
      ancestorRulesData: [
        "@import supports(display: flex) screen and (width > 10px) {",
        "  @layer importedLayerTwo {",
        "    @media screen {",
      ],
    },
    {
      selector: `h1, ~~[test-hint="imported-named-layer--named-layer"]~~`,
      ancestorRulesData: [
        "@import supports(display: flex) screen and (width > 10px) {",
        "  @layer importedLayerTwo {",
        "    @media screen {",
        "      @layer in-imported-stylesheet {",
      ],
    },
    {
      selector: `h1, ~~[test-hint="imported-nested-named-layer--named-layer"]~~`,
      ancestorRulesData: [
        "@import supports(display: flex) screen and (width > 10px) {",
        "  @layer importedLayerTwo {",
        "    @layer importedNestedLayer {",
        "      @layer in-imported-nested-stylesheet {",
      ],
    },
    {
      selector: `h1, ~~[test-hint="imported-named-layer--no-rule-layer"]~~`,
      ancestorRulesData: [
        "@import (height > 42px) {",
        "  @layer importedLayer {",
        "    @media screen {",
      ],
    },
    {
      selector: `h1, ~~[test-hint="imported-named-layer--named-layer"]~~`,
      ancestorRulesData: [
        "@import (height > 42px) {",
        "  @layer importedLayer {",
        "    @media screen {",
        "      @layer in-imported-stylesheet {",
      ],
    },
    {
      selector: `h1, ~~[test-hint="imported-nested-named-layer--named-layer"]~~`,
      ancestorRulesData: [
        "@import (height > 42px) {",
        "  @layer importedLayer {",
        "    @layer importedNestedLayer {",
        "      @layer in-imported-nested-stylesheet {",
      ],
    },
  ]);
});
