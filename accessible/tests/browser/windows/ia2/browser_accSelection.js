/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

addAccessibleTask(
  `
<select multiple id="select">
  <option id="option1">1</option>
  <option id="option2">2</option>
</select>
  `,
  async function testBasic(browser) {
    async function setSelected(id, selected) {
      let changed = waitForEvent(EVENT_STATE_CHANGE, id);
      await invokeContentTask(browser, [id, selected], (cId, cSelected) => {
        content.document.getElementById(cId).selected = cSelected;
      });
      await changed;
    }

    await runPython(`
      doc = getDocIa2()
      global select
      select = findIa2ByDomId(doc, "select")
    `);
    ok(
      !(await runPython(`select.accSelection`)),
      "accSelection returned nothing"
    );

    info("Selecting option1");
    await setSelected("option1", true);
    let attrs = await runPython(`toIa2(select.accSelection).attributes`);
    ok(attrs.includes("id:option1;"), "accSelection returned option1");

    info("Selecting option2");
    await setSelected("option2", true);
    attrs = await runPython(`
      from comtypes.automation import IEnumVARIANT
      enumerator = select.accSelection.QueryInterface(IEnumVARIANT)
      # Deliberately pass 3 instead of 2 to ensure Next handles this gracefully.
      selection = enumerator.Next(3)
      return [toIa2(acc).attributes for acc in selection]
    `);
    is(attrs.length, 2, "accSelection returned 2 items");
    ok(attrs[0].includes("id:option1;"), "First item is option1");
    ok(attrs[1].includes("id:option2;"), "Second item is option2");
  },
  { chrome: true, topLevel: true }
);
