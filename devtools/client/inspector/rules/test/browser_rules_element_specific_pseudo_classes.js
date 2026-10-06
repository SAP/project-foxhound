/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view element-specific pseudo-class locks work properly.

const TEST_CASES = [
  {
    pseudo: ":open",
    matchingElements: ["dialog", "details", "input[type='date']", "select"],
    nonMatchingElements: ["span"],
  },
  {
    pseudo: ":visited",
    matchingElements: ["a", "area"],
    nonMatchingElements: ["span"],
  },
];

const TEST_URI = `<style>
    dialog:open,
    details:open,
    input[type='date']:open,
    select:open {
      color: blue;
    }
    a:visited,
    area:visited {
      color: red;
    }
  </style>

  <dialog>dialog element</dialog>
  <details>details element</details>
  <input type="date" />
  <select>
    <option selected>select element</option>
  </select>

  <a href="https://example.com">link element</a>
  <map name="m">
     <area
       shape="circle"
       coords="75,75,75"
       href="https://example.com"
       alt="Click to go Left"
     />
  </map>

  <span>span element</span>`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  info("Check that the element-specific pseudo-class section exists");
  const elementSpecificPanel = inspector.panelDoc.getElementById(
    "pseudo-classes-element-specific-heading"
  );
  ok(elementSpecificPanel, "The element-specific pseudo-class section exists");
  is(
    elementSpecificPanel.textContent.includes(
      "Element-specific pseudo-classes"
    ),
    true,
    "The section has the correct title"
  );

  for (const { pseudo, matchingElements, nonMatchingElements } of TEST_CASES) {
    // Test matching elements where pseudo-class should be available
    for (const element of matchingElements) {
      info(`Select a ${element} element and check ${pseudo} is available`);
      await selectNode(element, inspector);
      await waitForElementSpecificPseudoClassPanel(view);
      let pseudoCheckbox = getElementSpecificPseudoClassCheckbox(view, pseudo);
      ok(pseudoCheckbox, `${pseudo} checkbox exists`);
      ok(
        !pseudoCheckbox.disabled,
        `${pseudo} checkbox is enabled for ${element}`
      );
      ok(
        !pseudoCheckbox.checked,
        `${pseudo} checkbox is not checked for ${element}`
      );
      await assertDisplayedRulesCount(view, 1);

      info(
        `Toggle ${pseudo} pseudo-class on ${element} and verify it's applied`
      );
      await toggleElementSpecificPseudoClass(inspector, view, pseudo);
      pseudoCheckbox = getElementSpecificPseudoClassCheckbox(view, pseudo);
      ok(
        pseudoCheckbox.checked,
        `${pseudo} checkbox is checked after toggle for ${element}`
      );
      await assertDisplayedRulesCount(view, 2);

      info(
        `Remove ${pseudo} pseudo-class from ${element} and verify it's removed`
      );
      await toggleElementSpecificPseudoClass(inspector, view, pseudo);
      pseudoCheckbox = getElementSpecificPseudoClassCheckbox(view, pseudo);
      ok(
        !pseudoCheckbox.checked,
        `${pseudo} checkbox is not checked after removing from ${element}`
      );
      await assertDisplayedRulesCount(view, 1);
    }

    // Test non-matching elements where pseudo-class should be disabled
    for (const element of nonMatchingElements) {
      info(`Select a ${element} element and check ${pseudo} is disabled`);
      await selectNode(element, inspector);
      await waitForElementSpecificPseudoClassPanel(view);
      const pseudoCheckbox = getElementSpecificPseudoClassCheckbox(
        view,
        pseudo
      );
      ok(
        pseudoCheckbox.disabled,
        `${pseudo} checkbox is disabled for ${element}`
      );
      ok(
        !pseudoCheckbox.checked,
        `${pseudo} checkbox is unchecked for ${element}`
      );
    }
  }
});

async function toggleElementSpecificPseudoClass(inspector, view, pseudoClass) {
  info(
    `Toggle the element-specific pseudo-class ${pseudoClass}, wait for it to be applied`
  );
  const onRefresh = inspector.once("rule-view-refreshed");
  const checkbox = getElementSpecificPseudoClassCheckbox(view, pseudoClass);
  if (checkbox) {
    checkbox.click();
  }
  await onRefresh;
}

function getElementSpecificPseudoClassCheckbox(view, pseudo) {
  return view.styleDocument.querySelector(
    `input[type="checkbox"][value="${pseudo}"]`
  );
}

function waitForElementSpecificPseudoClassPanel(view) {
  return waitFor(
    () => !!view.pseudoClassesElementSpecificPanel.children.length
  );
}
