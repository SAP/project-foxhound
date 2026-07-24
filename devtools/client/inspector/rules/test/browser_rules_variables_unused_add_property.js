/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testUnusedVariablesAndAddingDeclarations() {
  const declarations = [
    // Generate a good amount of variables that won't be referenced anywhere so
    // we to trigger the "hide unused" mechanism
    ...Array.from({ length: 15 }, (_, i) => ({
      name: `--unused-${i}`,
      value: i.toString(),
    })),
  ];

  const URI = `
  <style>
    h1 {
      width: auto;
      ${declarations.map(({ name, value }) => `${name}: ${value};`).join("\n")}
    }
  </style>
  <h1>Unused variable / Add declarations</h1>
`;

  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(URI));
  const { inspector, view } = await openRuleView();
  await selectNode("h1", inspector);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 15 unused custom CSS properties",
    "Show unused variables has expected text"
  );

  info(
    "Check that when adding a new unused CSS property it will never be hidden"
  );
  await addProperty(view, 1, "--added-unused", "new-1");
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        { name: "width", value: "auto" },
        { name: "--added-unused", value: "new-1", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 15 unused custom CSS properties",
    "Show unused variables has expected text after adding a new unused property"
  );

  info(
    "Select the body element and then h1 again to make sure the variable is still visible"
  );
  await selectNode("body", inspector);
  await selectNode("h1", inspector);
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        { name: "width", value: "auto" },
        { name: "--added-unused", value: "new-1", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 15 unused custom CSS properties",
    "Show unused variables still has expected text after adding a new unused property and navigating to different nodes"
  );

  info("Check that unused properties with the same name are made visible");
  await addProperty(view, 1, "--unused-5", "new-2");
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        { name: "width", value: "auto" },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 14 unused custom CSS properties",
    "Show unused variables text was updated as previously hidden declaration is now visible"
  );

  info("Check that adding a property reveals the now used variables");
  await addProperty(view, 1, "color", "var(--unused-1, var(--unused-9))");
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        { name: "width", value: "auto" },
        { name: "--unused-1", value: "1" },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 12 unused custom CSS properties",
    "Show unused variables text was updated as previously hidden declarations are now visible"
  );

  info("Check that editing a property reveals the now used variables");
  const widthProp = getTextProperty(view, 1, { width: "auto" });
  await setProperty(view, widthProp, "var(--unused-2, var(--unused-11))");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "width",
          value: "var(--unused-2, var(--unused-11))",
          dirty: true,
        },
        { name: "--unused-1", value: "1" },
        { name: "--unused-2", value: "2" },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--unused-11", value: "11" },
        {
          name: "--added-unused",
          value: "new-1",
          dirty: true,
        },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 10 unused custom CSS properties",
    "Show unused variables text was updated as previously hidden declarations are now visible"
  );

  info(
    "Check that adding empty variable does show unused variable with the same name"
  );
  await addProperty(view, 1, "--unused-6", "");
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "width",
          value: "var(--unused-2, var(--unused-11))",
          dirty: true,
        },
        { name: "--unused-1", value: "1" },
        { name: "--unused-2", value: "2" },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-6",
          value: "6",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--unused-11", value: "11" },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
        { name: "--unused-6", value: "", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 9 unused custom CSS properties",
    "Show unused variables text was updated as previously hidden declarations are now visible"
  );

  info(
    "Check that adding multiple declarations at once properly detects all the new used variables"
  );
  const ruleEditor = getRuleViewRuleEditor(view, 1);
  const onRuleViewChanged = view.once("ruleview-changed");
  await createNewRuleViewProperty(
    ruleEditor,
    "--unused-8: new-8; --unused-12: new-12;"
  );
  await onRuleViewChanged;

  // createNewRuleViewProperty focuses the new property input, so blur here
  const onBlur = once(view.styleDocument.activeElement, "blur");
  view.styleDocument.activeElement.blur();
  await onBlur;

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "width",
          value: "var(--unused-2, var(--unused-11))",
          dirty: true,
        },
        { name: "--unused-1", value: "1" },
        { name: "--unused-2", value: "2" },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-6",
          value: "6",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-8",
          value: "8",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--unused-11", value: "11" },
        {
          name: "--unused-12",
          value: "12",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
        { name: "--unused-6", value: "", dirty: true },
        { name: "--unused-8", value: "new-8", dirty: true },
        { name: "--unused-12", value: "new-12", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 7 unused custom CSS properties",
    "Show unused variables text was updated as previously hidden declarations are now visible"
  );

  info(
    "Check that adding declarations in the style rule won't show all the variables"
  );
  await addProperty(view, 0, "--unused-4", "new-4");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [{ name: "--unused-4", value: "new-4", dirty: true }],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "width",
          value: "var(--unused-2, var(--unused-11))",
          dirty: true,
        },
        { name: "--unused-1", value: "1" },
        { name: "--unused-2", value: "2" },
        {
          name: "--unused-4",
          value: "4",
          overridden: true,
        },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-6",
          value: "6",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-8",
          value: "8",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--unused-11", value: "11" },
        {
          name: "--unused-12",
          value: "12",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
        { name: "--unused-6", value: "", dirty: true },
        { name: "--unused-8", value: "new-8", dirty: true },
        { name: "--unused-12", value: "new-12", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 6 unused custom CSS properties",
    "Show unused variables text was updated as previously hidden declarations are now visible"
  );

  info("Check that removing declaration (e.g. width) does not hide variables");
  await removeProperty(
    view,
    getTextProperty(view, 1, { width: "var(--unused-2, var(--unused-11))" })
  );

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [{ name: "--unused-4", value: "new-4", dirty: true }],
    },
    {
      selector: "h1",
      declarations: [
        { name: "--unused-1", value: "1" },
        { name: "--unused-2", value: "2" },
        { name: "--unused-4", value: "4", overridden: true },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-6",
          value: "6",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-8",
          value: "8",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--unused-11", value: "11" },
        {
          name: "--unused-12",
          value: "12",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
        { name: "--unused-6", value: "", dirty: true },
        { name: "--unused-8", value: "new-8", dirty: true },
        { name: "--unused-12", value: "new-12", dirty: true },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 6 unused custom CSS properties",
    "Show unused variables text wasn't updated after removing a property using variables"
  );

  // and then that adding a new property at the end using one of the variable will show
  // it at the right position (update declarationIndex)
  info(
    "Check that adding declaration using variables insert them at the right place, even after a declaration was removed"
  );
  await addProperty(
    view,
    1,
    "height",
    "calc(var(--unused-3) + var(--unused-10) * 1px)"
  );

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [{ name: "--unused-4", value: "new-4", dirty: true }],
    },
    {
      selector: "h1",
      declarations: [
        { name: "--unused-1", value: "1" },
        { name: "--unused-2", value: "2" },
        { name: "--unused-3", value: "3" },
        { name: "--unused-4", value: "4", overridden: true },
        {
          name: "--unused-5",
          value: "5",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-6",
          value: "6",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        {
          name: "--unused-8",
          value: "8",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--unused-9", value: "9" },
        { name: "--unused-10", value: "10" },
        { name: "--unused-11", value: "11" },
        {
          name: "--unused-12",
          value: "12",
          overridden: true,
          // Shouldn't really (see Bug 1993440)
          dirty: true,
        },
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
        { name: "--unused-6", value: "", dirty: true },
        { name: "--unused-8", value: "new-8", dirty: true },
        { name: "--unused-12", value: "new-12", dirty: true },
        {
          name: "height",
          value: "calc(var(--unused-3) + var(--unused-10) * 1px)",
          dirty: true,
        },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 4 unused custom CSS properties",
    "Show unused variables text was updated"
  );

  info("Check that clicking the show unused variable button works as expected");
  getUnusedVariableButton(view, 1).click();

  is(
    getUnusedVariableButton(view, 1),
    null,
    "Show unused variable button is not visible anymore"
  );

  const overriddenDeclarations = [
    "--unused-4",
    "--unused-5",
    "--unused-6",
    "--unused-8",
    "--unused-12",
  ];
  // Those shouldn't be tagged as dirty but are (see Bug 1993440)
  const dirtyDeclarations = [
    "--unused-5",
    "--unused-6",
    "--unused-8",
    "--unused-12",
  ];
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [{ name: "--unused-4", value: "new-4", dirty: true }],
    },
    {
      selector: "h1",
      declarations: [
        ...declarations.map(decl => ({
          ...decl,
          overridden: overriddenDeclarations.includes(decl.name),
          dirty: dirtyDeclarations.includes(decl.name),
        })),
        { name: "--added-unused", value: "new-1", dirty: true },
        { name: "--unused-5", value: "new-2", dirty: true },
        {
          name: "color",
          value: "var(--unused-1, var(--unused-9))",
          dirty: true,
        },
        { name: "--unused-6", value: "", dirty: true },
        { name: "--unused-8", value: "new-8", dirty: true },
        { name: "--unused-12", value: "new-12", dirty: true },
        {
          name: "height",
          value: "calc(var(--unused-3) + var(--unused-10) * 1px)",
          dirty: true,
        },
      ],
    },
  ]);
});
