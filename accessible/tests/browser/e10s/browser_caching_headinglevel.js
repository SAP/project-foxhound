/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from ../../mochitest/attributes.js */
loadScripts({ name: "attributes.js", dir: MOCHITESTS_DIR });

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.headingoffset.enabled", true]],
  });
});

// Test basic heading levels (h1-h6)
addAccessibleTask(
  `<h1 id="h1">heading 1</h1>
   <h2 id="h2">heading 2</h2>
   <h3 id="h3">heading 3</h3>
   <h4 id="h4">heading 4</h4>
   <h5 id="h5">heading 5</h5>
   <h6 id="h6">heading 6</h6>`,
  async function testBasicHeadingLevels(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1"), 0, 0, 1);
    testGroupAttrs(getAcc("h2"), 0, 0, 2);
    testGroupAttrs(getAcc("h3"), 0, 0, 3);
    testGroupAttrs(getAcc("h4"), 0, 0, 4);
    testGroupAttrs(getAcc("h5"), 0, 0, 5);
    testGroupAttrs(getAcc("h6"), 0, 0, 6);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test headingoffset attribute on container
addAccessibleTask(
  `<div headingoffset="1">
     <h1 id="h1">heading 1 (now level 2)</h1>
     <h2 id="h2">heading 2 (now level 3)</h2>
     <h3 id="h3">heading 3 (now level 4)</h3>
   </div>`,
  async function testHeadingoffsetOnContainer(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1"), 0, 0, 2);
    testGroupAttrs(getAcc("h2"), 0, 0, 3);
    testGroupAttrs(getAcc("h3"), 0, 0, 4);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test nested headingoffset attributes
addAccessibleTask(
  `<div headingoffset="1">
     <h1 id="h1-outer">heading 1 (level 2)</h1>
     <div headingoffset="2">
       <h1 id="h1-inner">heading 1 (level 4)</h1>
       <h2 id="h2-inner">heading 2 (level 5)</h2>
     </div>
   </div>`,
  async function testNestedHeadingoffset(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-outer"), 0, 0, 2);
    testGroupAttrs(getAcc("h1-inner"), 0, 0, 4);
    testGroupAttrs(getAcc("h2-inner"), 0, 0, 5);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test headingreset attribute
addAccessibleTask(
  `<div headingoffset="2">
     <h1 id="h1-offset">heading 1 (level 3)</h1>
     <div headingreset>
       <h1 id="h1-reset">heading 1 (level 1, reset)</h1>
       <h2 id="h2-reset">heading 2 (level 2, reset)</h2>
     </div>
   </div>`,
  async function testHeadingreset(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-offset"), 0, 0, 3);
    testGroupAttrs(getAcc("h1-reset"), 0, 0, 1);
    testGroupAttrs(getAcc("h2-reset"), 0, 0, 2);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test headingreset directly on heading element
addAccessibleTask(
  `<div headingoffset="3">
     <h1 id="h1-offset">heading 1 (level 4)</h1>
     <h1 id="h1-self-reset" headingreset>heading 1 (level 1, self reset)</h1>
   </div>`,
  async function testHeadingresetDirectOnHeading(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-offset"), 0, 0, 4);
    testGroupAttrs(getAcc("h1-self-reset"), 0, 0, 1);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test headingoffset directly on heading element
addAccessibleTask(
  `<h1 id="h1-self" headingoffset="2">heading 1 (level 3)</h1>
   <h2 id="h2-self" headingoffset="3">heading 2 (level 5)</h2>`,
  async function testHeadingoffsetDirectOnHeading(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-self"), 0, 0, 3);
    testGroupAttrs(getAcc("h2-self"), 0, 0, 5);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test heading level clamping to 9
addAccessibleTask(
  `<div headingoffset="8">
     <h1 id="h1-clamp">heading 1 (level 9)</h1>
     <h2 id="h2-clamp">heading 2 (level 9, clamped)</h2>
     <h6 id="h6-clamp">heading 6 (level 9, clamped)</h6>
   </div>`,
  async function testHeadingoffsetClamping(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-clamp"), 0, 0, 9);
    testGroupAttrs(getAcc("h2-clamp"), 0, 0, 9);
    testGroupAttrs(getAcc("h6-clamp"), 0, 0, 9);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test negative headingoffset clamped to 0
addAccessibleTask(
  `<div headingoffset="-3">
     <h1 id="h1-neg">heading 1 (level 1)</h1>
     <h3 id="h3-neg">heading 3 (level 3)</h3>
   </div>`,
  async function testHeadingoffsetNegative(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-neg"), 0, 0, 1);
    testGroupAttrs(getAcc("h3-neg"), 0, 0, 3);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test headingoffset with headingreset on the same element
addAccessibleTask(
  `<div headingoffset="3">
     <h1 id="h1-both" headingoffset="2" headingreset>heading (level 3)</h1>
     <h2 id="h2-both" headingoffset="2" headingreset>heading (level 4)</h2>
   </div>`,
  async function testHeadingoffsetWithReset(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1-both"), 0, 0, 3);
    testGroupAttrs(getAcc("h2-both"), 0, 0, 4);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

// Test headingoffset with mutations
addAccessibleTask(
  `<div id="root" headingoffset="3">
     <h1 id="h1">heading (level 4)</h1>
     <h2 id="h2">heading (level 5)</h2>
   </div>`,
  async function testHeadingoffsetMutations(browser, docAcc) {
    let getAcc = id => findAccessibleChildByID(docAcc, id);

    testGroupAttrs(getAcc("h1"), 0, 0, 4);
    testGroupAttrs(getAcc("h2"), 0, 0, 5);

    info("Mutate headingoffset");

    await invokeSetAttribute(browser, "root", "headingoffset", "5");

    await untilCacheIs(
      () => {
        const level = {};
        getAcc("h1").groupPosition(level, {}, {});
        return level.value;
      },
      6,
      "level changed to 6"
    );

    await untilCacheIs(
      () => {
        const level = {};
        getAcc("h2").groupPosition(level, {}, {});
        return level.value;
      },
      7,
      "level changed to 7"
    );
  },
  {
    chrome: true,
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);
