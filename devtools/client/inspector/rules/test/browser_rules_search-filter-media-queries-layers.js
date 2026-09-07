/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view search filter works properly for @media / @layer rules.
// The document uses selectors so we can identify rule more easily
const TEST_URI = `
  <!DOCTYPE html>
    <style type='text/css'>
      h1, simple {
        color: tomato;
      }
      @layer {
        h1, anonymous {
          color: tomato;
        }
      }
      @layer myLayer {
        h1, named {
          color: tomato;
        }
      }
      @media screen {
        h1, skreen {
          color: tomato;
        }
      }
      @layer {
        @layer myLayer {
          @media (min-width: 1px) {
            @media (min-height: 1px) {
              h1, nested {
                color: tomato;
              }
            }
          }
        }
      }
    </style>
    <h1>Hello Mochi</h1>`;

// The element rule is always displayed
const ELEMENT_RULE = { selector: "element", selectorEditable: false };
const NESTED_ANCESTORS = [
  "@layer {",
  "  @layer myLayer {",
  "    @media (min-width: 1px) {",
  "      @media (min-height: 1px) {",
];

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("h1", inspector);

  info(`Check initial state and rules order`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~skreen~~",
      ancestorRulesData: ["@media screen {"],
      highlighted: [],
    },
    { selector: "h1, ~~simple~~", highlighted: [] },
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: [],
    },
    {
      selector: "h1, ~~named~~",
      ancestorRulesData: ["@layer myLayer {"],
      highlighted: [],
    },
    {
      selector: "h1, ~~anonymous~~",
      ancestorRulesData: ["@layer {"],
      highlighted: [],
    },
  ]);

  info(`Check filtering on "layer"`);
  await setSearchFilter(view, `layer`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@layer", "@layer myLayer"],
    },
    {
      selector: "h1, ~~named~~",
      ancestorRulesData: ["@layer myLayer {"],
      highlighted: ["@layer myLayer"],
    },
    {
      selector: "h1, ~~anonymous~~",
      ancestorRulesData: ["@layer {"],
      highlighted: ["@layer"],
    },
  ]);

  info(`Check filtering on "@layer"`);
  await setNewSearchFilter(view, `@layer`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@layer", "@layer myLayer"],
    },
    {
      selector: "h1, ~~named~~",
      ancestorRulesData: ["@layer myLayer {"],
      highlighted: ["@layer myLayer"],
    },
    {
      selector: "h1, ~~anonymous~~",
      ancestorRulesData: ["@layer {"],
      highlighted: ["@layer"],
    },
  ]);

  info("Check filtering on exact `@layer`");
  await setNewSearchFilter(view, "`@layer`");
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@layer"],
    },
    {
      selector: "h1, ~~anonymous~~",
      ancestorRulesData: ["@layer {"],
      highlighted: ["@layer"],
    },
  ]);

  info(`Check filtering on layer name "myLayer"`);
  await setNewSearchFilter(view, `myLayer`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@layer myLayer"],
    },
    {
      selector: "h1, ~~named~~",
      ancestorRulesData: ["@layer myLayer {"],
      highlighted: ["@layer myLayer"],
    },
  ]);

  info(`Check filtering on "@layer myLayer"`);
  await setNewSearchFilter(view, `@layer myLayer`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@layer myLayer"],
    },
    {
      selector: "h1, ~~named~~",
      ancestorRulesData: ["@layer myLayer {"],
      highlighted: ["@layer myLayer"],
    },
  ]);

  info(`Check filtering on "media"`);
  await setNewSearchFilter(view, `media`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~skreen~~",
      ancestorRulesData: ["@media screen {"],
      highlighted: ["@media screen"],
    },
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@media (min-width: 1px)", "@media (min-height: 1px)"],
    },
  ]);

  info(`Check filtering on "@media"`);
  await setNewSearchFilter(view, `@media`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~skreen~~",
      ancestorRulesData: ["@media screen {"],
      highlighted: ["@media screen"],
    },
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@media (min-width: 1px)", "@media (min-height: 1px)"],
    },
  ]);

  info(`Check filtering on media query content "1px"`);
  await setNewSearchFilter(view, `1px`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@media (min-width: 1px)", "@media (min-height: 1px)"],
    },
  ]);

  info(`Check filtering on media query content "height"`);
  await setNewSearchFilter(view, `height`);
  await checkRuleViewContent(view, [
    ELEMENT_RULE,
    {
      selector: "h1, ~~nested~~",
      ancestorRulesData: NESTED_ANCESTORS,
      highlighted: ["@media (min-height: 1px)"],
    },
  ]);

  info("Check filtering on exact `@media`");
  await setNewSearchFilter(view, "`@media`");
  await checkRuleViewContent(view, [ELEMENT_RULE]);
});

async function setNewSearchFilter(view, newSearchText) {
  const win = view.styleWindow;
  const searchClearButton = view.searchClearButton;

  const onRuleViewCleared = view.inspector.once("ruleview-filtered");
  EventUtils.synthesizeMouseAtCenter(searchClearButton, {}, win);
  await onRuleViewCleared;

  await setSearchFilter(view, newSearchText);
}
