/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the rule-view properly handles @scope rules.

const TEST_URI = `
  <link href="${URL_ROOT_COM_SSL}doc_at_scope.css" rel="stylesheet">
  <h1>Hello @scope!</h1>
  <main>
    <style>
      @scope {
        :scope, [data-test="scoped-inline-style"] {
          border: 1px solid aqua;
        }

        div, [data-test="scoped-inline-style"] {
          background: tomato;
        }

        /* test nested @scope */
        @scope (:scope section) {
          :scope, [data-test="nested-scoped-inline-style"] {
            background: gold;
            color: tomato;
            color: green;
          }
        }
      }
    </style>
    <div id=a>
      inline-style scope target
      <section id="a-child">inline-style nested scope target</section>
    </div>
  </main>
  <aside>
    <div id=b>
      <span>Dough</span>
      <div id=c class="limit">
        <span>Donut hole</span>
      </div>
    </div>
  </aside>
`;

add_task(async function () {
  await pushPref("layout.css.at-scope.enabled", true);
  await addTab(
    "https://example.com/document-builder.sjs?html=" +
      encodeURIComponent(TEST_URI)
  );
  const { inspector, view } = await openRuleView();
  await selectNode("main", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `:scope, ~~[data-test="scoped-inline-style"]~~`,
      ancestorRulesData: ["@scope {"],
      declarations: [{ name: "border", value: "1px solid aqua" }],
    },
  ]);

  await selectNode("main #a", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `div, ~~[data-test="scoped-inline-style"]~~`,
      ancestorRulesData: ["@scope {"],
      declarations: [{ name: "background", value: "tomato" }],
    },
  ]);

  await selectNode("main #a #a-child", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `:scope, ~~[data-test="nested-scoped-inline-style"]~~`,
      ancestorRulesData: ["@scope {", "  @scope (:scope section) {"],
      declarations: [
        { name: "background", value: "gold" },
        { name: "color", value: "tomato", overridden: true },
        { name: "color", value: "green" },
      ],
    },
  ]);

  await selectNode("aside #b", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `div, ~~[data-test="start-and-end-inherit"]~~`,
      ancestorRulesData: ["@scope (aside) to (.limit) {"],
      declarations: [{ name: "color", value: "salmon" }],
    },
    {
      selector: `div, ~~[data-test="start-and-end"]~~`,
      ancestorRulesData: ["@scope (aside) to (.limit) {"],
      declarations: [{ name: "outline", value: "2px solid gold" }],
    },
    {
      selector: `div, ~~[data-test="start-no-end"]~~`,
      ancestorRulesData: ["@scope (aside) {"],
      declarations: [{ name: "box-shadow", value: "60px -16px teal" }],
    },
  ]);

  await selectNode("aside #b > span", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `& span`,
      ancestorRulesData: [
        "@scope (aside) to (.limit) {",
        `  div, [data-test="start-and-end"] {`,
      ],
      declarations: [{ name: "color", value: "cornflowerblue" }],
    },
    {
      header: "Inherited from div#b",
    },
    {
      selector: `div, ~~[data-test="start-and-end-inherit"]~~`,
      ancestorRulesData: ["@scope (aside) to (.limit) {"],
      inherited: true,
      declarations: [{ name: "color", value: "salmon", overridden: true }],
    },
  ]);

  await selectNode("aside #c", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `div, ~~[data-test="start-no-end"]~~`,
      ancestorRulesData: ["@scope (aside) {"],
      declarations: [{ name: "box-shadow", value: "60px -16px teal" }],
    },
    {
      header: "Inherited from div#b",
    },
    {
      selector: `div, ~~[data-test="start-and-end-inherit"]~~`,
      ancestorRulesData: ["@scope (aside) to (.limit) {"],
      inherited: true,
      declarations: [{ name: "color", value: "salmon" }],
    },
  ]);

  await selectNode("aside #c > span", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      header: "Inherited from div#b",
    },
    {
      selector: `div, ~~[data-test="start-and-end-inherit"]~~`,
      ancestorRulesData: ["@scope (aside) to (.limit) {"],
      inherited: true,
      declarations: [{ name: "color", value: "salmon" }],
    },
  ]);
});
