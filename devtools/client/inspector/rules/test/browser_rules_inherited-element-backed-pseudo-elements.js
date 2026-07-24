/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that inherited element-backed pseudo element rules are properly displayed in
// the Rules view and that declarations are properly overridden.

const TEST_URI = `
  <style>
    details {
      --x: blue;
      color: gold;

      summary { color: violet; }

      &::details-content {
        --x: tomato;
        color: dodgerblue;
        background-color: rgb(200 0 0 / 0.1);
      }
    }

    /* use :where() to have a lower specificity than the details rule above */
    :where(body > details)::details-content {
      color: forestgreen;
    }

    p {
      outline-color: var(--x);

      &::after {
        content: " meow";
        color: green;
      }
    }

    details#in-summary {
      color: cyan;

      & summary {
        color: hotpink;
      }

      &::details-content {
        --x: rebeccapurple;
        color: brown;
      }
    }

    details#vip::details-content {
      color: blue !important;
    }

    details#vip::details-content {
      color: red;
    }
  </style>
  <details open>
    <summary>
      Top-level summary
      <details id=in-summary open>
        <summary>nested summary</summary>
        details in summary
        <p>child of details in summary</p>
      </details>
    </summary>
    top-level details
    <summary id=non-functional-summary>not a real summary</summary>
    <p>in top-level details</p>
    /* don't use an id so the "inherited from" section would have the same text as the
       section for the parent details. This will assert that we do get separate inhertied
       section for those different "levels" */
    <details class=in-details open>
      <summary>nested details summary</summary>
      nested details
      <p>child of nested details</p>
    </details>
  </details>
  <details id=vip open>
    <summary>s</summary>
    <article>hello</hello>
  </details>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  info(
    "Check that there's no inherited ::details-content header when top-level <summary> is selected"
  );
  await selectNode("summary", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `& summary`,
      ancestorRulesData: ["details {"],
      declarations: [{ name: "color", value: "violet" }],
    },
    {
      header: "Inherited from details",
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        { name: "--x", value: "blue" },
        { name: "color", value: "gold", overridden: true },
      ],
    },
  ]);

  info(
    "Check that there are expected inherited headers when children of top-level <details> is selected"
  );
  await selectNode("body > details > p", inspector);
  await checkRuleViewContent(view, [
    {
      header: "Pseudo-elements",
    },
    {
      selector: `&::after`,
      ancestorRulesData: [`p {`],
      declarations: [
        { name: "content", value: `" meow"` },
        { name: "color", value: "green" },
      ],
    },
    {
      header: "This Element",
    },
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `p`,
      declarations: [{ name: "outline-color", value: "var(--x)" }],
    },
    {
      header: "Inherited from details::details-content",
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: [`details {`],
      inherited: true,
      declarations: [
        { name: "--x", value: "tomato" },
        { name: "color", value: "dodgerblue" },
      ],
    },
    {
      selector: `:where(body > details)::details-content`,
      inherited: true,
      declarations: [
        {
          name: "color",
          value: "forestgreen",
          // overridden because lower specificity than ::details-content
          overridden: true,
        },
      ],
    },
    {
      header: "Inherited from details",
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        {
          name: "--x",
          value: "blue",
          overridden: true,
        },
        {
          name: "color",
          value: "gold",
          // overridden by color: dodgerblue on ::details-content
          overridden: true,
        },
      ],
    },
  ]);

  checkCSSVariableOutput(
    view,
    "p",
    "outline-color",
    "inspector-variable",
    "tomato"
  );

  info("Check rules and declarations for details in summary");
  await selectNode("details#in-summary", inspector);
  await checkRuleViewContent(view, [
    {
      header: "Pseudo-elements",
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: ["details#in-summary {"],
      declarations: [
        { name: "--x", value: "rebeccapurple" },
        { name: "color", value: "brown" },
      ],
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: ["details {"],
      declarations: [
        { name: "--x", value: "tomato", overridden: true },
        { name: "color", value: "dodgerblue", overridden: true },
        { name: "background-color", value: "rgb(200 0 0 / 0.1)" },
      ],
    },
    {
      header: "This Element",
    },
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `details#in-summary`,
      declarations: [{ name: "color", value: "cyan" }],
    },
    {
      selector: `details`,
      declarations: [
        { name: "--x", value: "blue" },
        { name: "color", value: "gold", overridden: true },
      ],
    },
    {
      header: "Inherited from summary",
    },
    {
      selector: `& summary`,
      ancestorRulesData: ["details {"],
      inherited: true,
      declarations: [{ name: "color", value: "violet", overridden: true }],
    },
  ]);

  info("Check rules and declarations for nested summary");
  await selectNode("details#in-summary summary", inspector);

  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `& summary`,
      ancestorRulesData: ["details#in-summary {"],
      declarations: [{ name: "color", value: "hotpink" }],
    },
    {
      selector: `& summary`,
      ancestorRulesData: ["details {"],
      declarations: [{ name: "color", value: "violet", overridden: true }],
    },
    {
      header: "Inherited from details#in-summary",
    },
    {
      selector: `details#in-summary`,
      inherited: true,
      declarations: [{ name: "color", value: "cyan", overridden: true }],
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        { name: "--x", value: "blue" },
        { name: "color", value: "gold", overridden: true },
      ],
    },
  ]);

  info("Check rules and declarations for nested <details> child");
  await selectNode("details#in-summary p", inspector);
  await checkRuleViewContent(view, [
    {
      header: "Pseudo-elements",
    },
    {
      selector: `&::after`,
      ancestorRulesData: [`p {`],
      declarations: [
        { name: "content", value: `" meow"` },
        { name: "color", value: "green" },
      ],
    },
    {
      header: "This Element",
    },
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `p`,
      declarations: [{ name: "outline-color", value: "var(--x)" }],
    },
    {
      header: "Inherited from details#in-summary::details-content",
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: [`details#in-summary {`],
      inherited: true,
      declarations: [
        { name: "--x", value: "rebeccapurple" },
        {
          name: "color",
          value: "brown",
        },
      ],
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: [`details {`],
      inherited: true,
      declarations: [
        { name: "--x", value: "tomato", overridden: true },
        {
          name: "color",
          value: "dodgerblue",
          overridden: true,
        },
      ],
    },
    {
      header: "Inherited from details#in-summary",
    },
    {
      selector: `details#in-summary`,
      inherited: true,
      declarations: [{ name: "color", value: "cyan", overridden: true }],
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        { name: "--x", value: "blue", overridden: true },
        { name: "color", value: "gold", overridden: true },
      ],
    },
    {
      header: "Inherited from summary",
    },
    {
      selector: `& summary`,
      ancestorRulesData: [`details {`],
      inherited: true,
      declarations: [
        {
          name: "color",
          value: "violet",
          overridden: true,
        },
      ],
    },
  ]);

  checkCSSVariableOutput(
    view,
    "p",
    "outline-color",
    "inspector-variable",
    "rebeccapurple"
  );

  info("Check rules and declarations for second summary inside details");
  // when a <details> element has multiple <summary> children, only the first one is
  // actually interactive. The other ones are placed inside the ::details-content
  await selectNode("summary#non-functional-summary", inspector);
  await checkRuleViewContent(view, [
    { selector: `element`, selectorEditable: false, declarations: [] },
    {
      selector: `& summary`,
      ancestorRulesData: [`details {`],
      declarations: [{ name: "color", value: "violet" }],
    },
    {
      header: "Inherited from details::details-content",
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: [`details {`],
      inherited: true,
      declarations: [
        { name: "--x", value: "tomato" },
        { name: "color", value: "dodgerblue", overridden: true },
      ],
    },
    {
      selector: `:where(body > details)::details-content`,
      inherited: true,
      declarations: [
        {
          name: "color",
          value: "forestgreen",
          overridden: true,
        },
      ],
    },
    {
      header: "Inherited from details",
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        {
          name: "--x",
          value: "blue",
          overridden: true,
        },
        {
          name: "color",
          value: "gold",
          overridden: true,
        },
      ],
    },
  ]);

  info("Check rules and declarations for details in details");
  await selectNode("details.in-details", inspector);
  await checkRuleViewContent(view, [
    {
      header: "Pseudo-elements",
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: ["details {"],
      declarations: [
        { name: "--x", value: "tomato" },
        { name: "color", value: "dodgerblue" },
        { name: "background-color", value: "rgb(200 0 0 / 0.1)" },
      ],
    },
    {
      header: "This Element",
    },
    {
      selector: `element`,
      selectorEditable: false,
      ancestorRulesData: null,
      declarations: [],
    },
    {
      selector: `details`,
      declarations: [
        { name: "--x", value: "blue" },
        { name: "color", value: "gold" },
      ],
    },
    {
      header: "Inherited from details::details-content",
    },
    {
      selector: `:where(body > details)::details-content`,
      inherited: true,
      declarations: [{ name: "color", value: "forestgreen", overridden: true }],
    },
  ]);

  info("Check rules and declarations for children of details in details");
  await selectNode("details.in-details p", inspector);
  await checkRuleViewContent(view, [
    {
      header: "Pseudo-elements",
    },
    {
      selector: `&::after`,
      ancestorRulesData: [`p {`],
      declarations: [
        { name: "content", value: `" meow"` },
        { name: "color", value: "green" },
      ],
    },
    {
      header: "This Element",
    },
    {
      selector: `element`,
      selectorEditable: false,
      ancestorRulesData: null,
      declarations: [],
    },
    {
      selector: `p`,
      declarations: [{ name: "outline-color", value: "var(--x)" }],
    },
    {
      // this is for the body > details > details::details-content pseudo
      header: "Inherited from details::details-content",
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: [`details {`],
      inherited: true,
      declarations: [
        { name: "--x", value: "tomato" },
        {
          name: "color",
          value: "dodgerblue",
        },
      ],
    },
    {
      // this is for the body > details::details-content pseudo
      header: "Inherited from details::details-content",
    },
    {
      selector: `:where(body > details)::details-content`,
      inherited: true,
      declarations: [{ name: "color", value: "forestgreen", overridden: true }],
    },
    {
      header: "Inherited from details",
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        {
          name: "--x",
          value: "blue",
          overridden: true,
        },
        {
          name: "color",
          value: "gold",
          overridden: true,
        },
      ],
    },
  ]);

  info(
    "Check that properties in inherited element-backed pseudo element rules are properly picked when using !important"
  );
  await selectNode("#vip article", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      selectorEditable: false,
      ancestorRulesData: null,
      declarations: [],
    },
    {
      header: "Inherited from details#vip::details-content",
    },
    {
      selector: `details#vip::details-content`,
      inherited: true,
      declarations: [{ name: "color", value: "red", overridden: true }],
    },
    {
      selector: `details#vip::details-content`,
      inherited: true,
      declarations: [{ name: "color", value: "blue !important" }],
    },
    {
      selector: `&::details-content`,
      ancestorRulesData: [`details {`],
      inherited: true,
      declarations: [
        { name: "--x", value: "tomato" },
        { name: "color", value: "dodgerblue", overridden: true },
      ],
    },
    {
      selector: `:where(body > details)::details-content`,
      inherited: true,
      declarations: [{ name: "color", value: "forestgreen", overridden: true }],
    },
    {
      header: "Inherited from details#vip",
    },
    {
      selector: `details`,
      inherited: true,
      declarations: [
        {
          name: "--x",
          value: "blue",
          overridden: true,
        },
        {
          name: "color",
          value: "gold",
          overridden: true,
        },
      ],
    },
  ]);
});
