/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that attributes style (presentational hints) "rules" are displayed

const TEST_URI = `
  <style>
    .right {
      text-align: right;
    }
  </style>
  <canvas width=100 height=150 style="outline: 1px solid"></canvas>
  <h1 align="center">
    In <span>a galaxy </span><span class="right">far far</span> <p align="left">away</p>
  </h1>
  <h2 align="left" style="text-align: center">foo</h2>
  <table></table>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  // Check that the element style and element attribute style are displayed
  await selectNode("canvas", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [{ name: "outline", value: "1px solid" }],
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      declarations: [{ name: "aspect-ratio", value: "auto 100 / 150" }],
    },
  ]);

  // Check that the element attribute style are displayed
  await selectNode("h1", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      declarations: [{ name: "text-align", value: "-moz-center" }],
    },
  ]);

  // Check that the inherited element attribute style are displayed
  await selectNode("h1 > span", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      header: "Inherited from h1",
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      inherited: true,
      declarations: [{ name: "text-align", value: "-moz-center" }],
    },
  ]);

  // Check that the .right rule is displayed, as well as inherited element attribute style
  // with overridden text-align declaration
  await selectNode("h1 > span.right", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: ".right",
      declarations: [{ name: "text-align", value: "right" }],
    },
    {
      header: "Inherited from h1",
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      inherited: true,
      declarations: [
        { name: "text-align", value: "-moz-center", overridden: true },
      ],
    },
  ]);

  // Check that element attribute style is displayed, as well as inherited element attribute
  // style with overridden text-align declaration
  await selectNode("h1 > p[align]", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      declarations: [{ name: "text-align", value: "-moz-left" }],
    },
    {
      header: "Inherited from h1",
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      inherited: true,
      declarations: [
        { name: "text-align", value: "-moz-center", overridden: true },
      ],
    },
  ]);

  // Check that element style is displayed, as well as element attribute style with overridden
  // text-align declaration
  await selectNode("h2", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [{ name: "text-align", value: "center" }],
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      declarations: [
        { name: "text-align", value: "-moz-left", overridden: true },
      ],
    },
  ]);

  await selectNode("table", inspector);
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "element attributes style",
      selectorEditable: false,
      declarations: [{ name: "color", value: "-moz-inherit-from-body-quirk" }],
    },
  ]);
});
