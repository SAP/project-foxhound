/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

addAccessibleTask(
  `
<div id="inertContainer">
  <p>before</p>
  <div id="inert" inert>inert <button></button></div>
  <p>after</p>
</div>
  `,
  async function testInert(browser, docAcc) {
    const inertContainer = findAccessibleChildByID(docAcc, "inertContainer");
    const inertTree = {
      SECTION: [
        // inertContainer
        { PARAGRAPH: [{ TEXT_LEAF: [] }] }, // before
        { PARAGRAPH: [{ TEXT_LEAF: [] }] }, // after
      ],
    };
    testAccessibleTree(inertContainer, inertTree);

    info("Unsetting inert");
    let reordered = waitForEvent(EVENT_REORDER, "inertContainer");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("inert").inert = false;
    });
    await reordered;
    testAccessibleTree(inertContainer, {
      SECTION: [
        // inertContainer
        { PARAGRAPH: [{ TEXT_LEAF: [] }] }, // before
        {
          SECTION: [
            // inert
            { TEXT_LEAF: [] },
            { PUSHBUTTON: [] },
          ],
        },
        { PARAGRAPH: [{ TEXT_LEAF: [] }] }, // after
      ],
    });

    info("Setting inert");
    reordered = waitForEvent(EVENT_REORDER, "inertContainer");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("inert").inert = true;
    });
    await reordered;
    testAccessibleTree(inertContainer, inertTree);
  },
  { chrome: true, topLevel: true }
);

addAccessibleTask(
  `
<div id="dialogContainer">
  dialogContainer
  <dialog id="dialog"><button></button></dialog>
</div>
  `,
  async function testDialog(browser, docAcc) {
    const noDialogTree = {
      SECTION: [
        // dialogContainer
        { TEXT_LEAF: [] },
      ],
    };
    testAccessibleTree(
      findAccessibleChildByID(docAcc, "dialogContainer"),
      noDialogTree
    );

    info("Showing modal dialog");
    let reordered = waitForEvent(EVENT_REORDER, docAcc);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("dialog").showModal();
    });
    await reordered;
    // The dialog makes everything else in the document inert.
    testAccessibleTree(docAcc, {
      DOCUMENT: [{ DIALOG: [{ PUSHBUTTON: [] }] }],
    });

    info("Closing dialog");
    reordered = waitForEvent(EVENT_REORDER, docAcc);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("dialog").close();
    });
    await reordered;
    testAccessibleTree(
      findAccessibleChildByID(docAcc, "dialogContainer"),
      noDialogTree
    );
  },
  { chrome: true, topLevel: true }
);

addAccessibleTask(
  `
<div id="fullscreenContainer">
  <div>
    <button id="requestFullscreen"
        onclick="document.getElementById('fullscreen').requestFullscreen();">
    </button>
  </div>
  <div id="fullscreen"><button></button></div>
</div>
  `,
  async function testFullscreen(browser, docAcc) {
    const fullscreenTree = {
      SECTION: [
        // fullscreen
        { PUSHBUTTON: [] },
      ],
    };
    const notFullscreenTree = {
      SECTION: [
        // fullscreenContainer
        {
          SECTION: [
            { PUSHBUTTON: [] }, // requestFullscreen
          ],
        },
        fullscreenTree,
      ],
    };
    testAccessibleTree(
      findAccessibleChildByID(docAcc, "fullscreenContainer"),
      notFullscreenTree
    );

    info("Requesting fullscreen");
    // Fullscreen must be requested by a user input event.
    let reordered = waitForEvent(EVENT_REORDER, docAcc);
    await BrowserTestUtils.synthesizeMouseAtCenter(
      "#requestFullscreen",
      {},
      browser
    );
    await reordered;
    testAccessibleTree(docAcc, { DOCUMENT: [fullscreenTree] });

    info("Exiting fullscreen");
    reordered = waitForEvent(EVENT_REORDER, docAcc);
    await invokeContentTask(browser, [], () => {
      content.document.exitFullscreen();
    });
    await reordered;
    testAccessibleTree(
      findAccessibleChildByID(docAcc, "fullscreenContainer"),
      notFullscreenTree
    );
  }
);

/**
 * Test that display: contents children are correctly omitted from an inert
 * subtree.
 */
addAccessibleTask(
  `
<div id="inert" style="overflow: hidden;">
  <a href="/" style="display: contents;">test</a>
</div>
  `,
  async function testDisplayContentsInInert(browser, docAcc) {
    testAccessibleTree(docAcc, {
      DOCUMENT: [{ SECTION: [{ LINK: [{ TEXT_LEAF: [] }] }] }],
    });
    info("Making inert");
    let reordered = waitForEvent(EVENT_REORDER, docAcc);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("inert").inert = true;
    });
    await reordered;
    testAccessibleTree(docAcc, { DOCUMENT: [] });
  },
  { chrome: true, topLevel: true }
);
