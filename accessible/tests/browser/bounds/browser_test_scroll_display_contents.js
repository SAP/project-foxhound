/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Verify bounds are correct after scrolling for children of `display:contents` styled acc
 * which is descended from the body element.
 */
addAccessibleTask(
  `<div style="display:contents;">
    <div id="given">given</div>
    <div style="height:200vh;">hello</div>
    <div id="offscreen">offscreen</div>
  </div>`,
  async function scrollBodyWithDisplayContentsContainer(browser, docAcc) {
    await testBoundsWithContent(docAcc, "given", browser);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("offscreen").scrollIntoView();
    });
    await waitForContentPaint(browser);
    await testBoundsWithContent(docAcc, "offscreen", browser);
  },
  { chrome: true, topLevel: true, remoteIframe: true }
);

/**
 * Verify bounds are correct after scrolling a scroll frame
 * which is descended from the body element. The children inside
 * the scroll frame are descended from a display:contents element
 * which has no frame.
 */
addAccessibleTask(
  `<div id="scroller" style="overflow:auto; height:300px;">
     <div id="dc" style="display:contents;">
      <div id="given">given</div>
      <div style="height:200vh;"></div>
      <div id="offscreen">offscreen</div>
    </div>
   </div>`,
  async function scrollContainerWithDisplayContentsParent(browser, docAcc) {
    await testBoundsWithContent(docAcc, "given", browser);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("offscreen").scrollIntoView();
    });
    await waitForContentPaint(browser);
    await testBoundsWithContent(docAcc, "offscreen", browser);
  },
  { chrome: true, topLevel: true, remoteIframe: true }
);
