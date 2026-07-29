/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test that IA2_TEXT_BOUNDARY_CHAR moves by cluster.
 */
addAccessibleTask(`<p id="cluster">a🤦‍♂️c`, async function testChar() {
  await runPython(`
    doc = getDocIa2()
    global cluster
    cluster = findIa2ByDomId(doc, "cluster")
    cluster = cluster.QueryInterface(IAccessibleText)
  `);
  SimpleTest.isDeeply(
    await runPython(`cluster.textAtOffset(0, IA2_TEXT_BOUNDARY_CHAR)`),
    [0, 1, "a"],
    "textAtOffset at 0 for CHAR correct"
  );
  SimpleTest.isDeeply(
    await runPython(`cluster.textAtOffset(1, IA2_TEXT_BOUNDARY_CHAR)`),
    [1, 6, "🤦‍♂️"],
    "textAtOffset at 1 for CHAR correct"
  );
  SimpleTest.isDeeply(
    await runPython(`cluster.textAtOffset(5, IA2_TEXT_BOUNDARY_CHAR)`),
    [1, 6, "🤦‍♂️"],
    "textAtOffset at 5 for CHAR correct"
  );
  SimpleTest.isDeeply(
    await runPython(`cluster.textAtOffset(6, IA2_TEXT_BOUNDARY_CHAR)`),
    [6, 7, "c"],
    "textAtOffset at 6 for CHAR correct"
  );
});

/**
 * Test that the text-model:a1 object attribute is exposed on editable text controls.
 */
addAccessibleTask(
  `
<button id="button"></button>
<input id="input">
<textarea id="textarea"></textarea>
<div id="div">p</div>
<div id="editable" contenteditable>editable</div>
  `,
  async function testTextModel() {
    await runPython(`
      global doc
      doc = getDocIa2()
    `);
    async function testTextModelFor(id, hasTextModel) {
      const attrs = await runPython(`
        acc = findIa2ByDomId(doc, "${id}")
        return acc.attributes
      `);
      if (hasTextModel) {
        ok(attrs.includes("text-model:a1;"), `${id} has text-model:a1`);
      } else {
        ok(
          !attrs.includes("text-model:a1;"),
          `${id} does not have text-model:a1`
        );
      }
    }

    await testTextModelFor("button", false);
    await testTextModelFor("input", true);
    await testTextModelFor("textarea", true);
    await testTextModelFor("div", false);
    await testTextModelFor("editable", true);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test that the text-model:a1 object attribute is exposed on the address bar.
 */
addAccessibleTask(``, async function testAddressBarTextModel() {
  // We don't want to search the entire Firefox UI for the address bar
  // IAccessible2 object. However, we can get it easily by focusing it and
  // retrieving the target of the focus event.
  info("Focusing address bar");
  await runPython(`
    global focused
    focused = WaitForWinEvent(EVENT_OBJECT_FOCUS, "urlbar-input")
  `);
  gURLBar.inputField.focus();
  await runPython(`
    global urlBar
    urlBar = focused.wait().getIa2()
  `);
  ok(true, "Address bar got focus");
  const attrs = await runPython(`urlBar.attributes`);
  ok(attrs.includes("text-model:a1;"), "Address bar includes text-model:a1");
});
