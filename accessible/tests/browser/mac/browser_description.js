/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test aria-describedby
 */
addAccessibleTask(
  `<div id="hint">This is a hint</div><button id="btn" aria-describedby="hint">Hello</button>`,
  async (browser, accDoc) => {
    let btn = getNativeInterface(accDoc, "btn");
    let customContent = btn.getAttributeValue("AXCustomContent");
    is(customContent[0].description, "This is a hint");
    ok(!btn.getAttributeValue("AXHelp"), "No AXHelp expected");
  },
  { chrome: true, topLevel: true }
);

/**
 * Test aria-description
 */
addAccessibleTask(
  `<button id="btn" aria-description="This is a hint too">Hello</button>`,
  async (browser, accDoc) => {
    let btn = getNativeInterface(accDoc, "btn");
    let customContent = btn.getAttributeValue("AXCustomContent");
    is(customContent[0].description, "This is a hint too");
    ok(!btn.getAttributeValue("AXHelp"), "No AXHelp expected");
  },
  { chrome: true, topLevel: true }
);

/**
 * Test link title
 */
addAccessibleTask(
  `<a href="#" id="lnk" title="This is a link title">Hello</button>`,
  async (browser, accDoc) => {
    let lnk = getNativeInterface(accDoc, "lnk");
    is(lnk.getAttributeValue("AXHelp"), "This is a link title");
    ok(!lnk.getAttributeValue("AXCustomContent"), "No custom content expected");
  },
  { chrome: true, topLevel: true }
);

/**
 * Test AXHelp on fieldset and radio group
 */
addAccessibleTask(
  `
<fieldset id="fieldset" aria-describedby="testHint">
  <button>Button</button>
</fieldset>

<div id="radiogroup" role="radiogroup" aria-describedby="testHint">
  <input type="radio" id="radio1" name="group" value="1">
  <label for="radio1">Radio 1</label>
  <input type="radio" id="radio2" name="group" value="2">
  <label for="radio2">Radio 2</label>
</div>

<div id="testHint">
  This is a hinto
</div>
`,
  async (browser, accDoc) => {
    let getHelp = id =>
      getNativeInterface(accDoc, id).getAttributeValue("AXHelp");
    let getCustomDescription = id =>
      getNativeInterface(accDoc, id).getAttributeValue("AXCustomContent")[0]
        .description;

    is(getHelp("fieldset"), "This is a hinto", "AXHelp for fieldset");
    is(
      getCustomDescription("fieldset"),
      "This is a hinto",
      "Custom description for fieldset"
    );

    is(getHelp("radiogroup"), "This is a hinto", "AXHelp for radiogroup");
    is(
      getCustomDescription("radiogroup"),
      "This is a hinto",
      "Custom description for radiogroup"
    );
  }
);
