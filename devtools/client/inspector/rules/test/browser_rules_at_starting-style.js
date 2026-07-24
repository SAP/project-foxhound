/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the rule-view properly handles @starting-style rules.

const TEST_URI = `
  <style>
    @property --my-registered-color {
      syntax: "<color>";
      inherits: true;
      initial-value: blue;
    }

    @property --my-unset-registered-color {
      syntax: "<color>";
      inherits: true;
      initial-value: lavender;
    }

    h1, [data-test="top-level"] {
      color: tomato;
      transition: all 1s;

      @starting-style {
        color: gold;
      }
    }

    @starting-style {
      body, [data-test="in-starting-style"] {
        color: navy;
      }

      @layer {
        body, [data-test="in-starting-style-layer"] {
          color: hotpink;
        }
      }

      h1, [data-test="in-starting-style"] {
        background-color: salmon;
      }

      main, [data-test="in-starting-style"] {
        --my-color: black !important;
        --my-overridden-color: black;
        --my-registered-color: black !important;
        --check-my-color: var(--my-color);
        --check-my-overridden-color: var(--my-overridden-color);
        --check-my-registered-color: var(--my-registered-color);
        --check-my-unset-registered-color: var(--my-unset-registered-color);
        background-color: dodgerblue;
        padding-top: 1px;
        margin-top: 1px !important;
        outline-color: dodgerblue;
      }

      @layer {
        main, [data-test="in-starting-style-layer"] {
          background-color: forestgreen;
          padding-top: 4px;
          margin-top: 4px;
          outline-color: forestgreen !important;
        }
      }

      @layer {
        main, [data-test="in-starting-style-layer-2"] {
          background-color: cyan;
          padding-top: 5px;
          margin-top: 5px;
          outline-color: cyan !important;
        }
      }
    }

    main, [data-test="top-level"] {
      --my-color: white;
      --my-overridden-color: white !important;
      --my-registered-color: white;
      --empty-start: 1px;
      --check-my-overridden-color: var(--my-overridden-color);
      --check-my-registered-color: var(--my-registered-color);
      --check-empty-start: var(--empty-start);
      color: var(--my-color);
      background-color: firebrick;
      padding-top: 2px !important;
      margin-top: 2px;
      transition: all 1s 1000s;
      outline-color: firebrick;
      outline-width: 5px;
      outline-style: solid;
      outline-offset: 10px;

      @starting-style {
        --empty-start: ;
        background-color: goldenrod;
        padding-top: 3px;
        margin-top: 3px;
        outline-color: goldenrod;
      }
    }
  </style>
  <h1>Hello @starting-style!</h1>
  <main>Testing override</main>`;

add_task(async function () {
  await pushPref("layout.css.starting-style-at-rules.enabled", true);
  await addTab(
    "https://example.com/document-builder.sjs?html=" +
      encodeURIComponent(TEST_URI)
  );
  const { inspector, view } = await openRuleView();

  await selectNode("body", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `body, ~~[data-test="in-starting-style"]~~`,
      ancestorRulesData: ["@starting-style {"],
      declarations: [{ name: "color", value: "navy" }],
    },
    {
      selector: `body, ~~[data-test="in-starting-style-layer"]~~`,
      ancestorRulesData: ["@starting-style {", "  @layer {"],
      declarations: [{ name: "color", value: "hotpink", overridden: true }],
    },
    { header: "@property" },
  ]);

  await selectNode("h1", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `h1, ~~[data-test="in-starting-style"]~~`,
      ancestorRulesData: ["@starting-style {"],
      declarations: [{ name: "background-color", value: "salmon" }],
    },
    {
      selector: ``,
      ancestorRulesData: [
        `h1, [data-test="top-level"] {`,
        "  @starting-style {",
      ],
      declarations: [{ name: "color", value: "gold" }],
    },
    {
      selector: `h1, ~~[data-test="top-level"]~~`,
      ancestorRulesData: null,
      declarations: [
        { name: "color", value: "tomato" },
        { name: "transition", value: "all 1s" },
      ],
    },
    { header: "@property" },
  ]);

  await selectNode("main", inspector);
  await checkRuleViewContent(view, [
    {
      selector: `element`,
      ancestorRulesData: null,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ``,
      ancestorRulesData: [
        `main, [data-test="top-level"] {`,
        "  @starting-style {",
      ],
      declarations: [
        { name: "--empty-start", value: "" },
        {
          name: "background-color",
          value: "goldenrod",
          // background-color value in last starting-style rule is not overridden
          overridden: false,
        },
        {
          name: "padding-top",
          value: "3px",
          // padding-top value in last starting-style rule is overridden by the !important
          // set on the top level rule
          overridden: true,
        },
        {
          name: "margin-top",
          value: "3px",
          // margin-top value in last starting-style rule is overridden by the !important set
          // on another starting-style rule
          overridden: true,
        },
        {
          name: "outline-color",
          value: "goldenrod",
          // outline-color value in last starting-style rule is overridden by the !important
          // set on another starting-style rule
          overridden: true,
        },
      ],
    },
    {
      selector: `main, ~~[data-test="top-level"]~~`,
      ancestorRulesData: null,
      declarations: [
        { name: "--my-color", value: "white" },
        { name: "--my-overridden-color", value: "white !important" },
        { name: "--my-registered-color", value: "white" },
        { name: "--empty-start", value: "1px" },
        {
          name: "--check-my-overridden-color",
          value: "var(--my-overridden-color)",
        },
        {
          name: "--check-my-registered-color",
          value: "var(--my-registered-color)",
        },
        { name: "--check-empty-start", value: "var(--empty-start)" },
        { name: "color", value: "var(--my-color)" },
        {
          name: "background-color",
          value: "firebrick",
          // background-color value in top level rule is not overridden, even if the
          // property is also set in a starting style rule
          overridden: false,
        },
        {
          name: "padding-top",
          value: "2px !important",
          // padding-top value in top level rule is not overridden
          overridden: false,
        },
        {
          name: "margin-top",
          value: "2px",
          // margin-top value in top level rule is not overridden
          overridden: false,
        },
        { name: "transition", value: "all 1s 1000s" },
        {
          name: "outline-color",
          value: "firebrick",
          // outline-color value in top level rule is not overridden
          overridden: false,
        },
        { name: "outline-width", value: "5px" },
        { name: "outline-style", value: "solid" },
        { name: "outline-offset", value: "10px" },
      ],
    },
    {
      selector: `main, ~~[data-test="in-starting-style"]~~`,
      ancestorRulesData: ["@starting-style {"],
      declarations: [
        { name: "--my-color", value: "black !important" },
        { name: "--my-overridden-color", value: "black", overridden: true },
        { name: "--my-registered-color", value: "black !important" },
        { name: "--check-my-color", value: "var(--my-color)" },
        {
          name: "--check-my-overridden-color",
          value: "var(--my-overridden-color)",
          overridden: true,
        },
        {
          name: "--check-my-registered-color",
          value: "var(--my-registered-color)",
          overridden: true,
        },
        {
          name: "--check-my-unset-registered-color",
          value: "var(--my-unset-registered-color)",
        },
        {
          name: "background-color",
          value: "dodgerblue",
          // background-color value in top-level starting style rule is overridden
          overridden: true,
        },
        {
          name: "padding-top",
          value: "1px",
          // padding-top value in top-level starting style rule is overridden
          overridden: true,
        },
        {
          name: "margin-top",
          value: "1px !important",
          // margin-top value in top-level starting style rule is not overridden,
          // since it's declared with !important
          overridden: false,
        },
        {
          name: "outline-color",
          value: "dodgerblue",
          // outline-color value in top-level starting style rule is overridden
          overridden: true,
        },
      ],
    },
    {
      selector: `main, ~~[data-test="in-starting-style-layer-2"]~~`,
      ancestorRulesData: [`@starting-style {`, "  @layer {"],
      declarations: [
        {
          name: "background-color",
          value: "cyan",
          // background-color value in second layer in starting style rule is overridden
          overridden: true,
        },
        {
          name: "padding-top",
          value: "5px",
          // padding-top value in second layer in starting style rule is overridden
          overridden: true,
        },
        {
          name: "margin-top",
          value: "5px",
          // margin-top value in second layer in starting style rule is overridden
          overridden: true,
        },
        {
          name: "outline-color",
          value: "cyan !important",
          // outline-color value in second layer in starting style rule is overridden even
          // if it was declared with !important
          overridden: true,
        },
      ],
    },
    {
      selector: `main, ~~[data-test="in-starting-style-layer"]~~`,
      ancestorRulesData: [`@starting-style {`, "  @layer {"],
      declarations: [
        {
          name: "background-color",
          value: "forestgreen",
          // background-color value in first layer in starting style rule is overridden
          overridden: true,
        },
        {
          name: "padding-top",
          value: "4px",
          // padding-top value in first layer in starting style rule is overridden
          overridden: true,
        },
        {
          name: "margin-top",
          value: "4px",
          // margin-top value in first layer in starting style rule is overridden
          overridden: true,
        },
        {
          name: "outline-color",
          value: "forestgreen !important",
          // outline-color value in first layer in starting style rule is not overridden
          // as it's declared with !important
          overridden: false,
        },
      ],
    },
    { header: "@property" },
  ]);

  info(
    "Check that CSS variables set in starting-style are not impacting the var() tooltip"
  );
  ok(
    !isPropertyOverridden(view, 2, { "--my-color": "white" }),
    "--my-color value in top level rule is not overridden"
  );

  info(
    "Check var() in regular rule for a variable set in both regular and starting-style rule"
  );
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="top-level"]`,
    "color",
    {
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="white" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:white">' +
          '</span>' +
          '<span class="ruleview-color">white</span>' +
        '</span>',
      // Computed value isn't displayed when it's the same as we put in the header
      computed: null,
      // The starting-style value is displayed in the tooltip
      startingStyle:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="black" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:black">' +
          '</span>' +
          '<span class="ruleview-color">black</span>' +
        '</span>',
    }
  );

  info(
    "Check var() in starting-style rule for a variable set in both regular and starting-style rule"
  );
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="in-starting-style"]`,
    "--check-my-color",
    {
      // The displayed value is the one set in the starting-style rule
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="black" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:black">' +
          '</span>' +
          '<span class="ruleview-color">black</span>' +
        '</span>',
      // Computed value isn't displayed in starting-style rule
      computed: null,
      // The starting-style section is not displayed when hovering starting-style rule
      startingStyle: null,
    }
  );

  info(
    "Check var() in both regular and starting-style rule for a variable overridden in regular rule"
  );
  ok(
    isPropertyOverridden(view, 3, { "--my-overridden-color": "black" }),
    "--my-overridden-color in top-level starting style rule is overridden"
  );
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="top-level"]`,
    "--check-my-overridden-color",
    {
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="white" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:white">' +
          '</span>' +
          '<span class="ruleview-color">white</span>' +
        '</span>',
      // Computed value isn't displayed when it's the same as we put in the header
      computed: null,
      // The starting-style rule is overridden, so we don't show a starting-style section in the tooltip
      startingStyle: null,
    }
  );
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="in-starting-style"]`,
    "--check-my-overridden-color",
    {
      // the value is the one from the regular rule, not the one from the starting-style rule
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="white" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:white">' +
          '</span>' +
          '<span class="ruleview-color">white</span>' +
        '</span>',
      // Computed value isn't displayed in starting-style rule
      computed: null,
      startingStyle: null,
    }
  );

  info(
    "Check var() for a registered property in both regular and starting-style rule"
  );
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="top-level"]`,
    "--check-my-registered-color",
    {
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="white" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:white">' +
          '</span>' +
          '<span class="ruleview-color">white</span>' +
        '</span>',
      computed:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="rgb(255, 255, 255)" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:rgb(255, 255, 255)">' +
          '</span>' +
          '<span class="ruleview-color">rgb(255, 255, 255)</span>' +
        '</span>',
      // The starting-style value is displayed in the tooltip
      startingStyle:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="black" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:black">' +
          '</span>' +
          '<span class="ruleview-color">black</span>' +
        '</span>',
      // registered property data is displayed
      registeredProperty: {
        syntax: `"&lt;color&gt;"`,
        inherits: "true",
        "initial-value":
          // prettier-ignore
          `<span xmlns="http://www.w3.org/1999/xhtml" data-color="blue" class="color-swatch-container">` +
            `<span ` +
              `class="inspector-swatch inspector-colorswatch" ` +
              `style="background-color:blue">` +
            `</span>` +
            `<span class="ruleview-color">blue</span>` +
          `</span>`,
      },
    }
  );

  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="in-starting-style"]`,
    "--check-my-registered-color",
    {
      // The displayed value is the one set in the starting-style rule
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="black" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:black">' +
          '</span>' +
          '<span class="ruleview-color">black</span>' +
        '</span>',
      // Computed value isn't displayed in starting-style rule
      computed: null,
      // The starting-style section is not displayed when hovering starting-style rule
      startingStyle: null,
      // registered property data is displayed
      registeredProperty: {
        syntax: `"&lt;color&gt;"`,
        inherits: "true",
        "initial-value":
          // prettier-ignore
          `<span xmlns="http://www.w3.org/1999/xhtml" data-color="blue" class="color-swatch-container">` +
            `<span ` +
              `class="inspector-swatch inspector-colorswatch" ` +
              `style="background-color:blue">` +
            `</span>` +
            `<span class="ruleview-color">blue</span>` +
          `</span>`,
      },
    }
  );

  info("Check var() for a unset registered property in starting-style rule");
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="in-starting-style"]`,
    "--check-my-unset-registered-color",
    {
      // The displayed value is the registered property initial value
      header:
        // prettier-ignore
        '<span xmlns="http://www.w3.org/1999/xhtml" data-color="lavender" class="color-swatch-container">' +
          '<span class="inspector-swatch inspector-colorswatch" style="background-color:lavender">' +
          '</span>' +
          '<span class="ruleview-color">lavender</span>' +
        '</span>',
      // The starting-style section is not displayed when hovering starting-style rule
      startingStyle: null,
      // registered property data is displayed
      registeredProperty: {
        syntax: `"&lt;color&gt;"`,
        inherits: "true",
        "initial-value":
          // prettier-ignore
          '<span xmlns="http://www.w3.org/1999/xhtml" data-color="lavender" class="color-swatch-container">' +
            '<span class="inspector-swatch inspector-colorswatch" style="background-color:lavender">' +
            '</span>' +
            '<span class="ruleview-color">lavender</span>' +
          '</span>',
      },
    }
  );

  info("Check var() for a empty variable in regular rule");
  await assertVariableTooltipForProperty(
    view,
    `main, [data-test="top-level"]`,
    "--check-empty-start",
    {
      header: "1px",
      // The starting-style value is displayed in the tooltip
      startingStyle: "&lt;empty&gt;",
      startingStyleClasses: ["empty-css-variable"],
    }
  );
});

function isPropertyOverridden(view, ruleIndex, property) {
  return getTextProperty(
    view,
    ruleIndex,
    property
  ).editor.element.classList.contains("ruleview-overridden");
}
