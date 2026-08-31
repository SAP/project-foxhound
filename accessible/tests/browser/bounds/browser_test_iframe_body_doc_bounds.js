/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * This test runs in iframe environments ONLY.
 * When the iframe is resized, the embedded document's accessible bounds follow.
 * Here the body has no accessible of its own. Verify the bounds change maps to the
 * document accessible only. This is situation (1) in the NotifyOfPossibleBoundsChange
 * comment.
 */
addAccessibleTask(
  `<div style="width: 600px; height: 400px">hello world</div>`,
  async function bodyIsDocAcc(browser, iframeDocAcc) {
    const docWidth = () => {
      let width = {};
      iframeDocAcc.getBounds({}, {}, width, {});
      return width.value;
    };
    await untilCacheIs(docWidth, 0, "Embedded document width is 0");
    // Resize the iframe element itself (not content within it)
    await SpecialPowers.spawn(browser, [DEFAULT_IFRAME_ID], iframeId => {
      content.document.getElementById(iframeId).style.width = "300px";
    });
    await untilCacheIs(docWidth, 300, "Embedded document width is 300");
  },
  {
    chrome: false,
    topLevel: false,
    iframe: true,
    remoteIframe: true,
    iframeAttrs: { style: "width: 0;" },
  }
);

/**
 * This test runs in iframe environments ONLY. This test is the
 * same as above, but `body { overflow: hidden }` gives the body its own
 * accessible. Verify the document accessible's bounds update when the
 * iframe is resized. This is situation (2) in the NotifyOfPossibleBoundsChange
 * comment.
 */
addAccessibleTask(
  `<style>body { overflow: hidden; }</style>
   <div style="width: 600px; height: 400px">hello world</div>`,
  async function bodyIsOwnAcc(browser, iframeDocAcc) {
    const bodyAcc = iframeDocAcc.firstChild;
    is(
      bodyAcc.id,
      DEFAULT_IFRAME_DOC_BODY_ID,
      "Embedded body has its own accessible"
    );

    const docWidth = () => {
      let width = {};
      iframeDocAcc.getBounds({}, {}, width, {});
      return width.value;
    };
    await untilCacheIs(docWidth, 0, "Embedded document width is 0");
    // Resize the iframe element itself (not content within it)
    await SpecialPowers.spawn(browser, [DEFAULT_IFRAME_ID], iframeId => {
      content.document.getElementById(iframeId).style.width = "300px";
    });
    await untilCacheIs(docWidth, 300, "Embedded document width is 300");
  },
  {
    chrome: false,
    topLevel: false,
    iframe: true,
    remoteIframe: true,
    iframeAttrs: { style: "width: 0;" },
  }
);
