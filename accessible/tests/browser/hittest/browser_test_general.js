/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

async function runTests(browser, accDoc) {
  await waitForImageMap(browser, accDoc);
  const dpr = await getContentDPR(browser);

  await testChildAtPoint(
    dpr,
    3,
    3,
    findAccessibleChildByID(accDoc, "list"),
    findAccessibleChildByID(accDoc, "listitem"),
    findAccessibleChildByID(accDoc, "inner").firstChild
  );
  todo(
    false,
    "Bug 746974 - children must match on all platforms. On Windows, " +
      "ChildAtPoint with eDeepestChild is incorrectly ignoring MustPrune " +
      "for the graphic."
  );

  const txt = findAccessibleChildByID(accDoc, "txt");
  await testChildAtPoint(dpr, 1, 1, txt, txt, txt);

  info(
    "::MustPrune case, point is outside of textbox accessible but is in document."
  );
  await testChildAtPoint(dpr, -1, -1, txt, null, null);

  info("::MustPrune case, point is outside of root accessible.");
  await testChildAtPoint(dpr, -10000, -10000, txt, null, null);

  info("Not specific case, point is inside of btn accessible.");
  const btn = findAccessibleChildByID(accDoc, "btn");
  await testChildAtPoint(dpr, 1, 1, btn, btn, btn);

  info("Not specific case, point is outside of btn accessible.");
  await testChildAtPoint(dpr, -1, -1, btn, null, null);

  info(
    "Out of flow accessible testing, do not return out of flow accessible " +
      "because it's not a child of the accessible even though visually it is."
  );
  await invokeContentTask(browser, [], () => {
    const { CommonUtils } = ChromeUtils.importESModule(
      "chrome://mochitests/content/browser/accessible/tests/browser/Common.sys.mjs"
    );
    const doc = content.document;
    const rectArea = CommonUtils.getNode("area", doc).getBoundingClientRect();
    const outOfFlow = CommonUtils.getNode("outofflow", doc);
    outOfFlow.style.left = rectArea.left + "px";
    outOfFlow.style.top = rectArea.top + "px";
  });

  const area = findAccessibleChildByID(accDoc, "area");
  await testChildAtPoint(dpr, 1, 1, area, area, area);

  info("Test image maps. Their children are not in the layout tree.");
  const imgmap = findAccessibleChildByID(accDoc, "imgmap");
  const theLetterA = imgmap.firstChild;
  await hitTest(browser, imgmap, theLetterA, theLetterA);
  await hitTest(
    browser,
    findAccessibleChildByID(accDoc, "container"),
    imgmap,
    theLetterA
  );

  info("hit testing for element contained by zero-width element");
  const container2Input = findAccessibleChildByID(accDoc, "container2_input");
  await hitTest(
    browser,
    findAccessibleChildByID(accDoc, "container2"),
    container2Input,
    container2Input
  );

  info("hittesting table, row, cells -- rows are not in the layout tree");
  const table = findAccessibleChildByID(accDoc, "table");
  const row = findAccessibleChildByID(accDoc, "row");
  const cell1 = findAccessibleChildByID(accDoc, "cell1");

  await hitTest(browser, table, row, cell1);

  info("Testing that an inaccessible child doesn't break hit testing");
  const containerWithInaccessibleChild = findAccessibleChildByID(
    accDoc,
    "containerWithInaccessibleChild"
  );
  const containerWithInaccessibleChildP2 = findAccessibleChildByID(
    accDoc,
    "containerWithInaccessibleChild_p2"
  );
  await hitTest(
    browser,
    containerWithInaccessibleChild,
    containerWithInaccessibleChildP2,
    containerWithInaccessibleChildP2.firstChild
  );
}

addAccessibleTask(
  `
  <div role="list" id="list">
    <div role="listitem" id="listitem"><span title="foo" id="inner">inner</span>item</div>
  </div>

  <span role="button">button1</span><span role="button" id="btn">button2</span>

  <span role="textbox">textbox1</span><span role="textbox" id="txt">textbox2</span>

  <div id="outofflow" style="width: 10px; height: 10px; position: absolute; left: 0px; top: 0px; background-color: yellow;">
  </div>
  <div id="area" style="width: 100px; height: 100px; background-color: blue;"></div>

  <map name="atoz_map">
    <area id="thelettera" href="http://www.bbc.co.uk/radio4/atoz/index.shtml#a"
          coords="0,0,15,15" alt="thelettera" shape="rect"/>
  </map>

  <div id="container">
    <img id="imgmap" width="447" height="15" usemap="#atoz_map" src="http://example.com/a11y/accessible/tests/mochitest/letters.gif"/>
  </div>

  <div id="container2" style="width: 0px">
    <input id="container2_input">
  </div>

  <table id="table" border>
    <tr id="row">
      <td id="cell1">hello</td>
      <td id="cell2">world</td>
    </tr>
  </table>

  <div id="containerWithInaccessibleChild">
    <p>hi</p>
    <p aria-hidden="true">hi</p>
    <p id="containerWithInaccessibleChild_p2">bye</p>
  </div>
  `,
  runTests,
  {
    iframe: true,
    remoteIframe: true,
    // Ensure that all hittest elements are in view.
    iframeAttrs: { style: "width: 600px; height: 600px; padding: 10px;" },
  }
);

addAccessibleTask(
  `
  <div id="container">
    <h1 id="a">A</h1><h1 id="b">B</h1>
  </div>
  `,
  async function(browser, accDoc) {
    const a = findAccessibleChildByID(accDoc, "a");
    const b = findAccessibleChildByID(accDoc, "b");
    const dpr = await getContentDPR(browser);
    // eslint-disable-next-line no-unused-vars
    const [x, y, w, h] = Layout.getBounds(a, dpr);
    // The point passed below will be made relative to `b`, but
    // we'd like to test a point within `a`. Pass `a`s negative
    // width for an x offset. Pass zero as a y offset,
    // assuming the headings are on the same line.
    await testChildAtPoint(dpr, -w, 0, b, null, null);
  },
  {
    iframe: true,
    remoteIframe: true,
    // Ensure that all hittest elements are in view.
    iframeAttrs: { style: "width: 600px; height: 600px; padding: 10px;" },
  }
);

addAccessibleTask(
  `
  <style>
    div {
      width: 50px;
      height: 50px;
      position: relative;
    }

    div > div {
      width: 30px;
      height: 30px;
      position: absolute;
      opacity: 0.9;
    }
  </style>
  <div id="a" style="background-color: orange;">
    <div id="aa" style="background-color: purple;"></div>
  </div>
  <div id="b" style="background-color: yellowgreen;">
    <div id="bb" style="top: -30px; background-color: turquoise"></div>
  </div>`,
  async function(browser, accDoc) {
    const a = findAccessibleChildByID(accDoc, "a");
    const aa = findAccessibleChildByID(accDoc, "aa");
    const dpr = await getContentDPR(browser);
    const [, , w, h] = Layout.getBounds(a, dpr);
    // test upper left of `a`
    await testChildAtPoint(dpr, 1, 1, a, aa, aa);
    // test upper right of `a`
    await testChildAtPoint(dpr, w - 1, 1, a, a, a);
    // test just outside upper left of `a`
    await testChildAtPoint(dpr, 1, -1, a, null, null);
    // test halfway down/left of `a`
    await testChildAtPoint(dpr, 1, Math.round(h / 2), a, a, a);
  },
  {
    chrome: true,
    topLevel: true,
    iframe: false,
    remoteIframe: false,
    // Ensure that all hittest elements are in view.
    iframeAttrs: { style: "width: 600px; height: 600px; padding: 10px;" },
  }
);
