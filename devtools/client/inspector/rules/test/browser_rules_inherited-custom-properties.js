/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that custom properties are only displayed when they are unregistered,
// or when their property definition indicate that they should inherit.

const TEST_URI = `
  <style>
    @property --inherit {
      syntax: "<color>";
      inherits: true;
      initial-value: gold;
    }

    @property --no-inherit {
      syntax: "<color>";
      inherits: false;
      initial-value: tomato;
    }

    main, [test="no-inherit"] {
      --no-inherit: blue;
    }

    main, [test="inherit"] {
      --inherit: red;
    }

    main, [test="unregistered"] {
      --myvar: brown;
    }

    h1 {
      background-color: var(--no-inherit);
      color: var(--inherit);
      outline-color: var(--myvar);
    }
  </style>
  <main>
    <h1>Hello world</h1>
  </main>
`;

add_task(async function () {
  await pushPref("layout.css.properties-and-values.enabled", true);
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("h1", inspector);

  // The `main, [test="no-inherit"]` only has 1 definition that should be hidden,
  // which means that the whole rule should be hidden
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `h1`,
      declarations: [
        { name: "background-color", value: "var(--no-inherit)" },
        { name: "color", value: "var(--inherit)" },
        { name: "outline-color", value: "var(--myvar)" },
      ],
    },
    { header: "Inherited from main" },
    {
      selector: `main, ~~[test="unregistered"]~~`,
      inherited: true,
      declarations: [{ name: "--myvar", value: "brown" }],
    },
    {
      selector: `main, ~~[test="inherit"]~~`,
      inherited: true,
      declarations: [{ name: "--inherit", value: "red" }],
    },
    { header: "@property" },
  ]);
});
