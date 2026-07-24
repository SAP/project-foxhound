/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view search filter and clear button works properly.

const TEST_URI = `
  <style type="text/css">
    #testid, h1 {
      background-color: #00F !important;
    }
    .testclass {
      width: 100%;
    }
  </style>
  <h1 id="testid" class="testclass">Styled Node</h1>
`;

const TEST_DATA = [
  {
    desc: "Tests that the search filter works properly for property names",
    search: "color",
  },
  {
    desc: "Tests that the search filter works properly for property values",
    search: "00F",
  },
  {
    desc: "Tests that the search filter works properly for property line input",
    search: "background-color:#00F",
  },
  {
    desc:
      "Tests that the search filter works properly for parsed property " +
      "names",
    search: "background:",
  },
  {
    desc:
      "Tests that the search filter works properly for parsed property " +
      "values",
    search: ":00F",
  },
];

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);
  await testAddTextInFilter(view);
});

async function testAddTextInFilter(view) {
  for (const data of TEST_DATA) {
    info(data.desc);
    await setSearchFilter(view, data.search);
    await checkRules(view);
    await clearSearchAndCheckRules(view);
  }
}

async function checkRules(view) {
  info(
    "Check that the expected rules are visible and expected declarations are highlighted"
  );
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "#testid, h1",
      declarations: [
        {
          name: "background-color",
          value: "#00F !important",
          highlighted: true,
        },
      ],
    },
  ]);
}

async function clearSearchAndCheckRules(view) {
  const win = view.styleWindow;
  const searchField = view.searchField;
  const searchClearButton = view.searchClearButton;

  info("Clearing the search filter");
  const onRuleviewFiltered = view.inspector.once("ruleview-filtered");
  EventUtils.synthesizeMouseAtCenter(searchClearButton, {}, win);
  await onRuleviewFiltered;

  info("Check the search filter is cleared and no rules are highlighted");
  ok(!searchField.value, "Search filter is cleared.");

  info("Check that all rules are displayed and no declaration is highlighted");
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "#testid, h1",
      declarations: [
        {
          name: "background-color",
          value: "#00F !important",
          highlighted: false,
        },
      ],
    },
    {
      selector: ".testclass",
      declarations: [
        {
          name: "width",
          value: "100%",
          highlighted: false,
        },
      ],
    },
  ]);
}
