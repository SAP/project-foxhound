/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that registed custom properties (@property/Css.registerProperty) are displayed
// in a dedicated section and that they are properly reflected in the `var()` popup.

const CSS_NO_INHERIT_INITIAL_VALUE = "tomato";
const CSS_INHERIT_INITIAL_VALUE = "gold";
const CSS_NOT_DEFINED_INITIAL_VALUE = "purple";
const JS_NO_INHERIT_INITIAL_VALUE = "42px";

const CSS_NO_INHERIT_MAIN_VALUE = "#0000FF";
const CSS_INHERIT_MAIN_VALUE = "#FF0000";
const JS_NO_INHERIT_MAIN_VALUE = "100%";
const JS_INHERIT_MAIN_VALUE = "50vw";

const TEST_URI = `https://example.org/document-builder.sjs?html=${encodeURIComponent(`
 <script>
    CSS.registerProperty({
      name: "--js-no-inherit",
      syntax: "<length>",
      inherits: false,
      initialValue: "${JS_NO_INHERIT_INITIAL_VALUE}",
    });
    CSS.registerProperty({
      name: "--js-inherit",
      syntax: "*",
      inherits: true,
    });
  </script>
  <style>
    @property --css-no-inherit {
      syntax: "<color>";
      inherits: false;
      initial-value: ${CSS_NO_INHERIT_INITIAL_VALUE};
    }

    @property --css-inherit {
      syntax: "<color>";
      inherits: true;
      initial-value: ${CSS_INHERIT_INITIAL_VALUE};
    }

    @property --css-not-defined {
      syntax: "<color>";
      inherits: true;
      initial-value: ${CSS_NOT_DEFINED_INITIAL_VALUE};
    }

    main {
      --js-no-inherit: ${JS_NO_INHERIT_MAIN_VALUE};
      --js-inherit: ${JS_INHERIT_MAIN_VALUE};
      --css-no-inherit: ${CSS_NO_INHERIT_MAIN_VALUE};
      --css-inherit: ${CSS_INHERIT_MAIN_VALUE};
    }

    h1 {
      background-color: var(--css-no-inherit);
      color: var(--css-inherit);
      border-color: var(--css-not-defined);
      height: var(--js-no-inherit);
      width: var(--js-inherit);
      outline: 10px solid var(--constructed, green);
      text-decoration-color: var(--js-not-defined, blue);
      caret-color: var(--css-dynamic-registered, turquoise);
    }

    aside {
     /* registered property has <color> syntax, this declaration is invalid at computed-value time */
      --css-inherit: dashed;
      /* valid, complex value */
      --js-no-inherit: calc(100px * cos(45deg));
      /* based on another property */
      --css-dynamic-registered: var(--css-no-inherit);
    }
  </style>
  <main>
    <h1>Hello world</h1>
    <aside>fries</aside>
    <iframe src="https://example.com/document-builder.sjs?html=iframe"></iframe>
  </main>
`)}`;

add_task(async function () {
  await pushPref("layout.css.properties-and-values.enabled", true);
  const tab = await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();
  const doc = view.styleDocument;
  await selectNode("h1", inspector);

  info("Check the content of the @property section");
  is(
    doc.querySelector(".ruleview-expandable-header").textContent,
    "@property",
    "The @property section header is displayed"
  );
  const registeredPropertiesContainer = doc.getElementById(
    "registered-properties-container"
  );
  ok(!!registeredPropertiesContainer, "The @property container is displayed");

  const expectedProperties = [
    {
      header: `--css-inherit {`,
      propertyDefinition: [
        `  syntax: "<color>";`,
        `  inherits: true;`,
        `  initial-value: ${CSS_INHERIT_INITIAL_VALUE};`,
      ],
    },
    {
      header: `--css-no-inherit {`,
      propertyDefinition: [
        `  syntax: "<color>";`,
        `  inherits: false;`,
        `  initial-value: ${CSS_NO_INHERIT_INITIAL_VALUE};`,
      ],
    },
    {
      header: `--css-not-defined {`,
      propertyDefinition: [
        `  syntax: "<color>";`,
        `  inherits: true;`,
        `  initial-value: ${CSS_NOT_DEFINED_INITIAL_VALUE};`,
      ],
    },
    {
      header: `--js-inherit {`,
      propertyDefinition: [
        `  name: "--js-inherit",`,
        `  syntax: "*",`,
        `  inherits: true,`,
      ],
    },
    {
      header: `--js-no-inherit {`,
      propertyDefinition: [
        `  name: "--js-no-inherit",`,
        `  syntax: "<length>",`,
        `  inherits: false,`,
        `  initialValue: "${JS_NO_INHERIT_INITIAL_VALUE}",`,
      ],
    },
  ];

  checkRegisteredProperties(view, expectedProperties);

  info("Check that var() tooltips handle registered properties");
  await assertVariableTooltipForProperty(view, "h1", "background-color", {
    // The variable value is the initial value since the variable does not inherit
    header: `--css-no-inherit = ${CSS_NO_INHERIT_INITIAL_VALUE}`,
    registeredProperty: [
      `syntax:"<color>"`,
      `inherits:false`,
      `initial-value:${CSS_NO_INHERIT_INITIAL_VALUE}`,
    ],
  });
  await assertVariableTooltipForProperty(view, "h1", "color", {
    // The variable value is the value set in the main selector, since the variable does inherit
    header: `--css-inherit = ${CSS_INHERIT_MAIN_VALUE}`,
    registeredProperty: [
      `syntax:"<color>"`,
      `inherits:true`,
      `initial-value:${CSS_INHERIT_INITIAL_VALUE}`,
    ],
  });
  await assertVariableTooltipForProperty(
    view,
    "h1",
    "border-color",
    // The variable value is the initial value since the variable is not set
    {
      header: `--css-not-defined = ${CSS_NOT_DEFINED_INITIAL_VALUE}`,
      registeredProperty: [
        `syntax:"<color>"`,
        `inherits:true`,
        `initial-value:${CSS_NOT_DEFINED_INITIAL_VALUE}`,
      ],
    }
  );
  await assertVariableTooltipForProperty(
    view,
    "h1",
    "height",
    // The variable value is the initial value since the variable does not inherit
    {
      header: `--js-no-inherit = ${JS_NO_INHERIT_INITIAL_VALUE}`,
      registeredProperty: [
        `syntax:"<length>"`,
        `inherits:false`,
        `initial-value:${JS_NO_INHERIT_INITIAL_VALUE}`,
      ],
    }
  );
  await assertVariableTooltipForProperty(
    view,
    "h1",
    "width",
    // The variable value is the value set in the main selector, since the variable does inherit
    {
      header: `--js-inherit = ${JS_INHERIT_MAIN_VALUE}`,
      registeredProperty: [`syntax:"*"`, `inherits:true`],
    }
  );

  info(
    "Check that registered properties from new regular stylesheets are displayed"
  );
  let onRuleViewRefreshed = view.once("ruleview-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const s = content.wrappedJSObject.document.createElement("style");
    s.id = "added";
    s.textContent = `
      @property --css-dynamic-registered {
        syntax: "<color>";
        inherits: false;
        initial-value: orchid;
      }
    `;

    content.wrappedJSObject.document.head.append(s);
  });
  info("Wait for the new registered property to be displayed");
  await onRuleViewRefreshed;

  checkRegisteredProperties(
    view,
    [
      ...expectedProperties,
      {
        header: `--css-dynamic-registered {`,
        propertyDefinition: [
          `  syntax: "<color>";`,
          `  inherits: false;`,
          `  initial-value: orchid;`,
        ],
      },
    ].sort((a, b) => (a.header < b.header ? -1 : 1))
  );

  // The var() tooltip should show the initial value of the new property
  await assertVariableTooltipForProperty(view, "h1", "caret-color", {
    header: `--css-dynamic-registered = orchid`,
    registeredProperty: [
      `syntax:"<color>"`,
      `inherits:false`,
      `initial-value:orchid`,
    ],
  });

  info("Check that updating property does update rules view");
  onRuleViewRefreshed = view.once("ruleview-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.wrappedJSObject.document.querySelector(
      "style#added"
    ).textContent = `
      @property --css-dynamic-registered {
        syntax: "<color>";
        inherits: true;
        initial-value: purple;
      }
    `;
  });
  info("Wait for the rules view to be updated");
  await onRuleViewRefreshed;

  checkRegisteredProperties(
    view,
    [
      ...expectedProperties,
      {
        header: `--css-dynamic-registered {`,
        propertyDefinition: [
          `  syntax: "<color>";`,
          `  inherits: true;`,
          `  initial-value: purple;`,
        ],
      },
    ].sort((a, b) => (a.header < b.header ? -1 : 1))
  );

  // The var() tooltip should show the new initial value of the updated property
  await assertVariableTooltipForProperty(view, "h1", "caret-color", {
    header: `--css-dynamic-registered = purple`,
    registeredProperty: [
      `syntax:"<color>"`,
      `inherits:true`,
      `initial-value:purple`,
    ],
  });

  info("Check that removing property does update rules view");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.wrappedJSObject.document.querySelector("style#added").remove();
  });
  info("Wait for registered property to be removed");
  await waitFor(
    () =>
      view.styleDocument.querySelector(
        `[data-name="--css-dynamic-registered"]`
      ) == null
  );
  ok(true, `--css-dynamic-registered was removed`);
  checkRegisteredProperties(view, expectedProperties);

  // The var() tooltip should indicate that the property isn't set anymore
  await assertVariableTooltipForProperty(view, "h1", "caret-color", {
    header: `--css-dynamic-registered is not set`,
  });

  info(
    "Check that registered properties from new constructed stylesheets are displayed"
  );
  is(
    getRuleViewProperty(view, "h1", "outline").valueSpan.querySelector(
      ".ruleview-unmatched"
    ).textContent,
    "--constructed",
    "The --constructed variable is set as unmatched since it's not defined nor registered"
  );

  onRuleViewRefreshed = view.once("ruleview-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    const s = new content.wrappedJSObject.CSSStyleSheet();
    s.replaceSync(`
      @property --constructed {
        syntax: "<color>";
        inherits: true;
        initial-value: aqua;
      }
    `);
    content.wrappedJSObject.document.adoptedStyleSheets.push(s);
  });
  await onRuleViewRefreshed;

  info("Wait for the new registered property to be displayed");
  checkRegisteredProperties(
    view,
    [
      ...expectedProperties,
      {
        header: `--constructed {`,
        propertyDefinition: [
          `  syntax: "<color>";`,
          `  inherits: true;`,
          `  initial-value: aqua;`,
        ],
      },
    ].sort((a, b) => (a.header < b.header ? -1 : 1))
  );

  // The `var()` tooltip should show the initial-value of the new property
  await assertVariableTooltipForProperty(view, "h1", "outline", {
    header: `--constructed = aqua`,
    registeredProperty: [
      `syntax:"<color>"`,
      `inherits:true`,
      `initial-value:aqua`,
    ],
  });

  info(
    "Check that selecting a node in another document with no registered property hides the container"
  );
  await selectNodeInFrames(["iframe", "body"], inspector);
  is(
    getRegisteredPropertiesContainer(view),
    null,
    "registered properties container isn't displayed"
  );

  info(
    "Check that registering a property will cause the @property container to be displayed"
  );
  const iframeBrowsingContext = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => content.document.querySelector("iframe").browsingContext
  );

  await SpecialPowers.spawn(iframeBrowsingContext, [], () => {
    content.CSS.registerProperty({
      name: "--js-iframe",
      syntax: "<color>",
      inherits: true,
      initialValue: "turquoise",
    });
    content.CSS.registerProperty({
      name: "--js-inherit",
      syntax: "*",
      inherits: true,
    });
  });

  await waitFor(() => getRegisteredPropertiesContainer(view));
  ok(true, "@property container is diplayed when registering a property");

  // Wait for the 2 properties to be added.
  await waitFor(() => getRegisteredPropertiesElements(view).length == 2);
  checkRegisteredProperties(view, [
    {
      header: `--js-iframe {`,
      propertyDefinition: [
        `  name: "--js-iframe",`,
        `  syntax: "<color>",`,
        `  inherits: true,`,
        `  initialValue: turquoise,`,
      ],
    },
    {
      header: `--js-inherit {`,
      propertyDefinition: [
        `  name: "--js-inherit",`,
        `  syntax: "*",`,
        `  inherits: true,`,
      ],
    },
  ]);

  info("Select a node from the top-level document");
  await selectNode("main", inspector);

  checkRegisteredProperties(
    view,
    [
      ...expectedProperties,
      {
        header: `--constructed {`,
        propertyDefinition: [
          `  syntax: "<color>";`,
          `  inherits: true;`,
          `  initial-value: aqua;`,
        ],
      },
    ].sort((a, b) => (a.header < b.header ? -1 : 1))
  );

  await selectNode("aside", inspector);

  info(
    "Check that the invalid at computed-value time icon is displayed when needed"
  );
  checkInvalidAtComputedValueTime(view, {
    ruleIndex: 1,
    declaration: { "--css-inherit": "dashed" },
    invalid: true,
    syntax: `<color>`,
  });

  info(
    "Check that the invalid at computed-value time icon is not displayed for valid properties"
  );
  checkInvalidAtComputedValueTime(view, {
    ruleIndex: 1,
    declaration: { "--js-no-inherit": "calc(100px * cos(45deg))" },
    invalid: false,
  });

  info(
    "Declaration of variable based on other variable are not marked as invalid"
  );
  checkInvalidAtComputedValueTime(view, {
    ruleIndex: 1,
    declaration: { "--css-dynamic-registered": "var(--css-no-inherit)" },
    invalid: false,
  });
});

function checkInvalidAtComputedValueTime(
  view,
  { ruleIndex, declaration, invalid, syntax }
) {
  const prop = getTextProperty(view, ruleIndex, declaration);
  const warningIcon = prop.editor.element.querySelector(
    ".ruleview-invalid-at-computed-value-time-warning:not([hidden])"
  );
  if (invalid) {
    ok(
      !!warningIcon,
      `invalid at computed-value time icon is displayed for ${JSON.stringify(
        declaration
      )}`
    );
    is(
      warningIcon?.title,
      `Property value does not match expected "${syntax}" syntax`,
      `invalid at computed-value time icon has expected title for ${JSON.stringify(
        declaration
      )}`
    );
  } else {
    ok(
      !warningIcon,
      `invalid at computed-value time icon is not displayed for ${JSON.stringify(
        declaration
      )}`
    );
  }
}

function getRegisteredPropertiesContainer(view) {
  return view.styleDocument.querySelector("#registered-properties-container");
}

function getRegisteredPropertiesElements(view) {
  const container = getRegisteredPropertiesContainer(view);
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      "#registered-properties-container .ruleview-rule"
    )
  );
}

function checkRegisteredProperties(view, expectedProperties) {
  const registeredPropertiesEl = getRegisteredPropertiesElements(view);

  is(
    registeredPropertiesEl.length,
    expectedProperties.length,
    "There are the expected number of registered properties"
  );
  for (let i = 0; i < expectedProperties.length; i++) {
    info(`Checking registered property #${i}`);
    const { header, propertyDefinition } = expectedProperties[i];
    const registeredPropertyEl = registeredPropertiesEl[i];

    is(
      registeredPropertyEl.querySelector("header").textContent,
      header,
      `Registered property #${i} has the expected header text`
    );
    const propertyDefinitionEl = Array.from(
      registeredPropertyEl.querySelectorAll("div[role=listitem]")
    );
    is(
      propertyDefinitionEl.length,
      propertyDefinition.length,
      `Registered property #${i} have the expected number of items in its definition`
    );
    for (let j = 0; j < expectedProperties.length; j++) {
      is(
        propertyDefinitionEl[j]?.textContent,
        propertyDefinition[j],
        `Registered property #${i} have the expected definition at index #${j}`
      );
    }
  }
}
