/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the rule-view properly handles custom states pseudo classes

const TEST_URI = `data:text/html,<meta charset=utf8>${encodeURIComponent(`
  <style>
    fx-test {
      color: lime;
    }

    fx-test:state(custom-state) {
      color: gold;
    }

    fx-test:state(another-custom-state) {
      color: tomato;
    }
  </style>
  <body>
  </body>
  <script>
    customElements.define("fx-test", class extends HTMLElement {});

    const noStateEl = document.createElement("fx-test");
    noStateEl.id = "no-state";
    noStateEl.textContent = noStateEl.id;

    const singleStateEl = document.createElement("fx-test");
    singleStateEl.id = "single-state";
    singleStateEl.textContent = singleStateEl.id;
    const singleStateElInternals = singleStateEl.attachInternals();
    singleStateElInternals.states.add("custom-state");

    const multipleStateEl = document.createElement("fx-test");
    multipleStateEl.id = "multiple-state";
    multipleStateEl.textContent = multipleStateEl.id;
    const multipleStateElInternals = multipleStateEl.attachInternals();
    multipleStateElInternals.states.add("custom-state");
    multipleStateElInternals.states.add("another-custom-state");

    document.body.append(noStateEl, singleStateEl, multipleStateEl);
  </script>
`)}
`;

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  await selectNode("fx-test#no-state", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `fx-test`,
      declarations: [{ name: "color", value: "lime" }],
    },
  ]);

  await selectNode("fx-test#single-state", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `fx-test:state(custom-state)`,
      declarations: [{ name: "color", value: "gold" }],
    },
    {
      selector: `fx-test`,
      declarations: [{ name: "color", value: "lime", overridden: true }],
    },
  ]);

  await selectNode("fx-test#multiple-state", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `fx-test:state(another-custom-state)`,
      declarations: [{ name: "color", value: "tomato" }],
    },
    {
      selector: `fx-test:state(custom-state)`,
      declarations: [{ name: "color", value: "gold", overridden: true }],
    },
    {
      selector: `fx-test`,
      declarations: [{ name: "color", value: "lime", overridden: true }],
    },
  ]);

  info("Check that the selector highlighter works for :state()");
  let data = await clickSelectorIcon(view, "fx-test:state(custom-state)");

  ok(data.highlighter, "The selector highlighter instance was created");
  ok(data.isShown, "The selector highlighter was shown");

  info("Click on the same icon to disable highlighter");
  data = await clickSelectorIcon(view, "fx-test:state(custom-state)");
  ok(!data.isShown, "The highlighter is not visible anymore");
});
