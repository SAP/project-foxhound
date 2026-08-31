/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test aria-brailleLabel
 */

addAccessibleTask(
  `<button id="button" aria-braillelabel="***"><img alt="3 out of 5 stars" src="three_stars.png"></button>
	<p id="p">This here is text without braille label</p>`,
  async (browser, accDoc) => {
    let button = getNativeInterface(accDoc, "button");
    is(
      button.getAttributeValue("AXBrailleLabel"),
      "***",
      `Test: Correct braille label`
    );
    let p = getNativeInterface(accDoc, "p");
    ok(
      !p.attributeNames.includes("AXBrailleLabel"),
      "The AXBrailleLabel selector should be blocked for nodes without aria-braillelabel specified"
    );
  }
);

/**
 * Test aria-brailleRoleDescription
 */
addAccessibleTask(
  `<article id="test" aria-roledescription="slide" aria-brailleroledescription="sld" aria-labelledby="slide1heading">
		<h1 id="slide1heading">Welcome to my talk</h1>
	</article>
	<p id="p">This here is text without braille role description</p>`,
  async (browser, accDoc) => {
    let elem = getNativeInterface(accDoc, "test");
    is(
      elem.getAttributeValue("AXBrailleRoleDescription"),
      "sld",
      `Test: Correct braille role description`
    );
    let p = getNativeInterface(accDoc, "p");
    ok(
      !p.attributeNames.includes("AXBrailleRoleDescription"),
      "The AXBrailleRoleDescription selector should be blocked for nodes without aria-brailleroledescription specified"
    );
  }
);
