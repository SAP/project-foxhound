/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that we correctly display appropriate media query information in the rule view.

const TEST_URI = URL_ROOT + "doc_media_queries.html?constructed";

add_task(async function () {
  await pushPref("layout.css.custom-media.enabled", true);

  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();
  await selectNode("div", inspector);

  const elementStyle = view.elementStyle;

  const inline = STYLE_INSPECTOR_L10N.getStr("rule.sourceInline");
  const constructed = STYLE_INSPECTOR_L10N.getStr("rule.sourceConstructed");

  is(elementStyle.rules[0].title, inline, "check rule 0 title");
  is(
    elementStyle.rules[1].title,
    constructed + ":1",
    "check constructed sheet rule title"
  );
  is(elementStyle.rules[3].title, inline + ":11", "check rule 3 title");
  is(elementStyle.rules[4].title, inline + ":4", "check rule 4 title");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "div",
      declarations: [{ name: "z-index", value: "0", inactiveCSS: true }],
    },
    {
      ancestorRulesData: [`@media (--visible) {`],
      selector: "div",
      declarations: [{ name: "border", value: "5px solid hotpink" }],
    },
    {
      ancestorRulesData: [`@media screen and (min-width: 1px) {`],
      selector: "div",
      declarations: [
        { name: "width", value: "200px" },
        { name: "background-color", value: "yellow" },
      ],
    },
    {
      selector: "div",
      declarations: [
        { name: "width", value: "1000px", overridden: true },
        { name: "height", value: "100px" },
        { name: "background-color", value: "#f00", overridden: true },
      ],
    },
  ]);
});
