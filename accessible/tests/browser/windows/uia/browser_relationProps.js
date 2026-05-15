/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function testUiaRelationArray(id, prop, targets) {
  return isUiaElementArray(
    `findUiaByDomId(doc, "${id}").Current${prop}`,
    targets,
    `${id} has correct ${prop} targets`
  );
}

function testCustomUiaRelationArray(id, prop, targets) {
  return isUiaElementArray(
    `
      findUiaByDomId(doc, "${id}")
      .GetCurrentPropertyValue(uia${prop}PropertyId)
      .QueryInterface(IUIAutomationElementArray)
    `,
    targets,
    `${id} has correct ${prop} targets`
  );
}

/**
 * Test the ControllerFor property.
 */
addUiaTask(
  `
<input id="controls" aria-controls="t1 t2">
<input id="error" aria-errormessage="t3 t4" aria-invalid="true">
<input id="controlsError" aria-controls="t1 t2" aria-errormessage="t3 t4" aria-invalid="true">
<div id="t1">t1</div>
<div id="t2">t2</div>
<div id="t3">t3</div>
<div id="t4">t4</div>
<button id="none">none</button>
  `,
  async function testControllerFor() {
    await definePyVar("doc", `getDocUia()`);
    await testUiaRelationArray("controls", "ControllerFor", ["t1", "t2"]);
    // The IA2 -> UIA proxy doesn't support IA2_RELATION_ERROR.
    if (gIsUiaEnabled) {
      await testUiaRelationArray("error", "ControllerFor", ["t3", "t4"]);
      await testUiaRelationArray("controlsError", "ControllerFor", [
        "t1",
        "t2",
        "t3",
        "t4",
      ]);
    }
    await testUiaRelationArray("none", "ControllerFor", []);
  }
);

/**
 * Test the DescribedBy property.
 */
addUiaTask(
  `
<input id="describedby" aria-describedby="t1 t2">
<input id="details" aria-details="t3 t4">
<input id="describedbyDetails" aria-describedby="t1 t2" aria-details="t3 t4" aria-invalid="true">
<div id="t1">t1</div>
<div id="t2">t2</div>
<div id="t3">t3</div>
<div id="t4">t4</div>
<button id="none">none</button>
  `,
  async function testDescribedBy() {
    await definePyVar("doc", `getDocUia()`);
    await testUiaRelationArray("describedby", "DescribedBy", ["t1", "t2"]);
    // The IA2 -> UIA proxy doesn't support IA2_RELATION_DETAILS.
    if (gIsUiaEnabled) {
      await testUiaRelationArray("details", "DescribedBy", ["t3", "t4"]);
      await testUiaRelationArray("describedbyDetails", "DescribedBy", [
        "t1",
        "t2",
        "t3",
        "t4",
      ]);
    }
    await testUiaRelationArray("none", "DescribedBy", []);
  }
);

/**
 * Test the FlowsFrom and FlowsTo properties.
 */
addUiaTask(
  `
<div id="t1" aria-flowto="t2">t1</div>
<div id="t2">t2</div>
<button id="none">none</button>
  `,
  async function testFlows() {
    await definePyVar("doc", `getDocUia()`);
    await testUiaRelationArray("t1", "FlowsTo", ["t2"]);
    await testUiaRelationArray("t2", "FlowsFrom", ["t1"]);
    await testUiaRelationArray("none", "FlowsFrom", []);
    await testUiaRelationArray("none", "FlowsTo", []);
  }
);

/**
 * Test the LabeledBy property.
 */
addUiaTask(
  `
<label id="label">label</label>
<input id="input" aria-labelledby="label">
<label id="wrappingLabel">
  <input id="wrappedInput" value="wrappedInput">
  <p id="wrappingLabelP">wrappingLabel</p>
</label>
<button id="button" aria-labelledby="label">content</button>
<button id="noLabel">noLabel</button>
  `,
  async function testLabeledBy() {
    await definePyVar("doc", `getDocUia()`);
    // input's LabeledBy should be label's text leaf.
    let result = await runPython(`
      input = findUiaByDomId(doc, "input")
      label = findUiaByDomId(doc, "label")
      labelLeaf = uiaClient.RawViewWalker.GetFirstChildElement(label)
      return uiaClient.CompareElements(input.CurrentLabeledBy, labelLeaf)
    `);
    ok(result, "input has correct LabeledBy");
    // wrappedInput's LabeledBy should be wrappingLabelP's text leaf.
    result = await runPython(`
      wrappedInput = findUiaByDomId(doc, "wrappedInput")
      wrappingLabelP = findUiaByDomId(doc, "wrappingLabelP")
      wrappingLabelLeaf = uiaClient.RawViewWalker.GetFirstChildElement(wrappingLabelP)
      return uiaClient.CompareElements(wrappedInput.CurrentLabeledBy, wrappingLabelLeaf)
    `);
    ok(result, "wrappedInput has correct LabeledBy");
    // button has aria-labelledby, but UIA prohibits LabeledBy on buttons.
    ok(
      !(await runPython(
        `bool(findUiaByDomId(doc, "button").CurrentLabeledBy)`
      )),
      "button has no LabeledBy"
    );
    ok(
      !(await runPython(
        `bool(findUiaByDomId(doc, "noLabel").CurrentLabeledBy)`
      )),
      "noLabel has no LabeledBy"
    );
  },
  // The IA2 -> UIA proxy doesn't expose LabeledBy properly.
  { uiaEnabled: true, uiaDisabled: false }
);

/**
 * Test the AccessibleActions property.
 */
addUiaTask(
  `
<dialog aria-actions="btn" id="dlg" onclick="" open>
  Dialog with its own click listener
  <form method="dialog">
    <button id="btn">Close</button>
  </form>
</dialog>
  `,
  async function testActions() {
    await definePyVar("doc", `getDocUia()`);
    await testCustomUiaRelationArray("dlg", "AccessibleActions", ["btn"]);
    await testCustomUiaRelationArray("btn", "AccessibleActions", []);
  },
  // The IA2 -> UIA proxy doesn't support AccessibleActions.
  { uiaEnabled: true, uiaDisabled: false }
);

/**
 * Test exposure of AriaProperties.hasactions.
 */
addUiaTask(
  `
<button id="button">button</button>
<div role="tablist">
  <div id="tab1" role="tab" tabindex="0" aria-actions="tab1Button">
    tab1
    <button id="tab1Button">tab1Button</button>
  </div>
  <div id="tab2" role="tab" aria-actions="tab2Button">
    tab2
    <button id="tab2Button" hidden>tab2Button</button>
  </div>
</div>
  `,
  async function testHasActions() {
    await definePyVar("doc", `getDocUia()`);
    is(
      await runPython(`findUiaByDomId(doc, "button").CurrentAriaProperties`),
      "",
      "button missing hasactions"
    );
    // tab1 has a visible action.
    is(
      await runPython(`findUiaByDomId(doc, "tab1").CurrentAriaProperties`),
      "hasactions=true",
      "tab1 hasactions=true"
    );
    // tab2 has an action, but it's hidden.
    is(
      await runPython(`findUiaByDomId(doc, "tab2").CurrentAriaProperties`),
      "hasactions=true",
      "tab2 hasactions=true"
    );
  },
  // The IA2 -> UIA proxy doesn't support hasactions.
  { uiaEnabled: true, uiaDisabled: false }
);
