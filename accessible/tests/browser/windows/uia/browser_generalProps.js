/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test the Name property.
 */
addUiaTask(
  `
<button id="button">before</button>
<div id="div">div</div>
  `,
  async function testName(browser) {
    await definePyVar("doc", `getDocUia()`);
    await assignPyVarToUiaWithId("button");
    is(
      await runPython(`button.CurrentName`),
      "before",
      "button has correct name"
    );
    await assignPyVarToUiaWithId("div");
    is(await runPython(`div.CurrentName`), "", "div has no name");

    info("Setting aria-label on button");
    await setUpWaitForUiaPropEvent("Name", "button");
    await invokeSetAttribute(browser, "button", "aria-label", "after");
    await waitForUiaEvent();
    ok(true, "Got Name prop change event on button");
    is(
      await runPython(`button.CurrentName`),
      "after",
      "button has correct name"
    );
  }
);

/**
 * Test the FullDescription property.
 */
addUiaTask(
  `
<button id="button" aria-description="before">button</button>
<div id="div">div</div>
  `,
  async function testFullDescription(browser) {
    await definePyVar("doc", `getDocUia()`);
    await assignPyVarToUiaWithId("button");
    is(
      await runPython(`button.CurrentFullDescription`),
      "before",
      "button has correct FullDescription"
    );
    await assignPyVarToUiaWithId("div");
    is(
      await runPython(`div.CurrentFullDescription`),
      "",
      "div has no FullDescription"
    );

    info("Setting aria-description on button");
    await setUpWaitForUiaPropEvent("FullDescription", "button");
    await invokeSetAttribute(browser, "button", "aria-description", "after");
    await waitForUiaEvent();
    ok(true, "Got FullDescription prop change event on button");
    is(
      await runPython(`button.CurrentFullDescription`),
      "after",
      "button has correct FullDescription"
    );
  },
  // The IA2 -> UIA proxy doesn't support FullDescription.
  { uiaEnabled: true, uiaDisabled: false }
);

/**
 * Test the IsEnabled property.
 */
addUiaTask(
  `
<button id="button">button</button>
<p id="p">p</p>
  `,
  async function testIsEnabled(browser) {
    await definePyVar("doc", `getDocUia()`);
    await assignPyVarToUiaWithId("button");
    ok(await runPython(`button.CurrentIsEnabled`), "button has IsEnabled true");
    // The IA2 -> UIA proxy doesn't fire IsEnabled prop change events.
    if (gIsUiaEnabled) {
      info("Setting disabled on button");
      await setUpWaitForUiaPropEvent("IsEnabled", "button");
      await invokeSetAttribute(browser, "button", "disabled", true);
      await waitForUiaEvent();
      ok(true, "Got IsEnabled prop change event on button");
      ok(
        !(await runPython(`button.CurrentIsEnabled`)),
        "button has IsEnabled false"
      );
    }

    await assignPyVarToUiaWithId("p");
    ok(await runPython(`p.CurrentIsEnabled`), "p has IsEnabled true");
  }
);
