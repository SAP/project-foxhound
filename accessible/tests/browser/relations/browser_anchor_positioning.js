/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

async function testDetailsRelations(anchor, target) {
  await testCachedRelation(anchor, RELATION_DETAILS, target);
  await testCachedRelation(target, RELATION_DETAILS_FOR, anchor);
}

async function testNoDetailsRelations(anchor, target) {
  await testCachedRelation(anchor, RELATION_DETAILS, []);
  await testCachedRelation(target, RELATION_DETAILS_FOR, []);
}

async function invokeContentTaskAndTick(browser, args, task) {
  await invokeContentTask(browser, args, task);

  await invokeContentTask(browser, [], () => {
    content.windowUtils.advanceTimeAndRefresh(100);
    content.windowUtils.restoreNormalRefresh();
  });
}

async function invokeSetAttributeAndTick(browser, id, attr, attrValue) {
  await invokeSetAttribute(browser, id, attr, attrValue);
  await invokeContentTask(browser, [], () => {
    content.windowUtils.advanceTimeAndRefresh(100);
    content.windowUtils.restoreNormalRefresh();
  });
}

/**
 * Test details relations for CSS explicit and implicit Anchor Positioning
 */
addAccessibleTask(
  `
  <style>
  #btn1 {
    anchor-name: --btn1;
  }

  #target1 {
    position: absolute;
    position-anchor: --btn1;
    left: anchor(right);
    bottom: anchor(top);
  }

  #btn2 {
    anchor-name: --btn2;
  }

  #target2 {
    position: absolute;
    left: anchor(--btn2 right);
  }

  #btn3 {
    anchor-name: --btn3;
  }
  </style>

  <div id="target1">World</div>
  <button id="btn1">Hello</button>

  <div id="target2">World</div>
  <button id="btn2">Hello</button>

  <button id="btn3">No Target</button>
  `,
  async function testSimplePositionAnchors(browser, docAcc) {
    info("Implicit anchor");
    const btn1 = findAccessibleChildByID(docAcc, "btn1");
    const target1 = findAccessibleChildByID(docAcc, "target1");
    await testDetailsRelations(btn1, target1);

    is(
      btn1.attributes.getStringProperty("details-from"),
      "css-anchor",
      "Correct details-from attribute"
    );
    info("Make anchor invalid");
    await invokeContentTaskAndTick(browser, [], () => {
      Object.assign(content.document.getElementById("btn1").style, {
        "anchor-name": "--invalid",
      });
    });

    await testNoDetailsRelations(btn1, target1);

    info("Make anchor valid again");
    await invokeContentTaskAndTick(browser, [], () => {
      Object.assign(content.document.getElementById("btn1").style, {
        "anchor-name": "--btn1",
      });
    });

    await testDetailsRelations(btn1, target1);

    info("Assign target to different anchor");
    await invokeContentTaskAndTick(browser, [], () => {
      Object.assign(content.document.getElementById("target1").style, {
        "position-anchor": "--btn3",
      });
    });

    const btn3 = findAccessibleChildByID(docAcc, "btn3");
    await testDetailsRelations(btn3, target1);
    await testCachedRelation(btn1, RELATION_DETAILS, []);

    info("Assign target to invalid anchor");
    await invokeContentTaskAndTick(browser, [], () => {
      Object.assign(content.document.getElementById("target1").style, {
        "position-anchor": "--invalid",
      });
    });

    await testNoDetailsRelations(btn3, target1);

    info("Explicit anchor");
    const btn2 = findAccessibleChildByID(docAcc, "btn2");
    const target2 = findAccessibleChildByID(docAcc, "target2");
    await testDetailsRelations(btn2, target2);

    await invokeContentTaskAndTick(browser, [], () => {
      Object.assign(content.document.getElementById("target2").style, {
        left: "0px",
      });
    });

    await testNoDetailsRelations(btn2, target2);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test no details relations for sibling target
 */
addAccessibleTask(
  `
  <style>
  #sibling-btn {
    anchor-name: --sibling-btn;
  }

  #sibling-target {
    position: absolute;
    position-anchor: --sibling-btn;
    left: anchor(right);
    bottom: anchor(top);
  }
  </style>

  <button id="sibling-btn">Hello</button>
  <button id="intermediate-button" hidden>Cruel</button>
  <div id="sibling-target">World</div>
  `,
  async function testSiblingPositionAnchor(browser, docAcc) {
    info("Target is sibling after anchor, no relation");
    const siblingBtn = findAccessibleChildByID(docAcc, "sibling-btn");
    const siblingTarget = findAccessibleChildByID(docAcc, "sibling-target");
    await testNoDetailsRelations(siblingBtn, siblingTarget);

    await invokeSetAttributeAndTick(browser, "intermediate-button", "hidden");

    await testDetailsRelations(siblingBtn, siblingTarget);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test no details relations parent anchor with child target
 */
addAccessibleTask(
  `
  <style>
  #parent-btn {
    anchor-name: --parent-btn;
  }

  #child-target {
    position: absolute;
    position-anchor: --parent-btn;
    left: anchor(right);
    bottom: anchor(top);
  }

  #owner-btn {
    anchor-name: --owner-btn;
  }

  #owned-target {
    position: absolute;
    position-anchor: --owner-btn;
    left: anchor(right);
    bottom: anchor(top);
  }
  </style>

  <button id="parent-btn">Hello <div role="group"><div id="child-target">World</div></div></button>

  <div id="owned-target">World</div>
  <button id="owner-btn" aria-owns="owned-target">Hello</button>
  `,
  async function testSiblingPositionAnchor(browser, docAcc) {
    info("Target is child of anchor, no relation");
    const parentBtn = findAccessibleChildByID(docAcc, "parent-btn");
    const childTarget = findAccessibleChildByID(docAcc, "child-target");
    await testNoDetailsRelations(parentBtn, childTarget);

    if (!browser.isRemoteBrowser) {
      // Bug 1989629: This doesn't work in e10s yet.

      info("Target is owned by anchor, no relation");
      const ownerBtn = findAccessibleChildByID(docAcc, "owner-btn");
      const ownedTarget = findAccessibleChildByID(docAcc, "owned-target");
      await testNoDetailsRelations(ownerBtn, ownedTarget);

      info("Remove aria owns, relation should be restored");
      await invokeSetAttributeAndTick(browser, "owner-btn", "aria-owns");
      await testDetailsRelations(ownerBtn, ownedTarget);
    }
  },
  { chrome: true, topLevel: true }
);

/**
 * Test no details relations for CSS anchor with multiple targets or targets with multiple anchors
 */
addAccessibleTask(
  `
  <style>
  #multiTarget-btn {
    anchor-name: --multiTarget-btn;
  }

  #multiTarget-target1 {
    position: absolute;
    position-anchor: --multiTarget-btn;
    right: anchor(left);
    bottom: anchor(top);
  }

  #multiTarget-target2 {
    position: absolute;
    position-anchor: --multiTarget-btn;
    left: anchor(right);
    bottom: anchor(top);
  }

  #multiTarget-target2.unanchored {
    position-anchor: --invalid;
  }

  #multiAnchor-btn1 {
    anchor-name: --multiAnchor-btn1;
  }

  #multiAnchor-btn2 {
    anchor-name: --multiAnchor-btn2;
  }

  #multiAnchor-target {
    position: absolute;
    left: anchor(--multiAnchor-btn1 right);
    bottom: anchor(--multiAnchor-btn2 top);
    right: anchor(--multiAnchor-btn2 left);
  }

  #multiAnchor-target.unanchored {
    left: 0px;
  }
  </style>

  <div id="multiTarget-target1">Cruel</div>
  <div id="multiTarget-target2">World</div>
  <button id="multiTarget-btn">Hello</button>

  <div id="multiAnchor-target">Hello</div>
  <button id="multiAnchor-btn1">Cruel</button>
  <button id="multiAnchor-btn2">World</button>
  `,
  async function testMultiplePositionAnchors(browser, docAcc) {
    info("Multiple targets for one anchor");
    const multiTargetBtn = findAccessibleChildByID(docAcc, "multiTarget-btn");
    const multiTargetTarget1 = findAccessibleChildByID(
      docAcc,
      "multiTarget-target1"
    );
    const multiTargetTarget2 = findAccessibleChildByID(
      docAcc,
      "multiTarget-target2"
    );
    await testNoDetailsRelations(multiTargetBtn, multiTargetTarget1);
    await testNoDetailsRelations(multiTargetBtn, multiTargetTarget2);

    info("Remove one target from anchor via styling");
    await invokeSetAttributeAndTick(
      browser,
      "multiTarget-target2",
      "class",
      "unanchored"
    );

    await testDetailsRelations(multiTargetBtn, multiTargetTarget1);

    info("Restore target styling");
    await invokeSetAttributeAndTick(browser, "multiTarget-target2", "class");

    await testNoDetailsRelations(multiTargetBtn, multiTargetTarget2);

    info("Remove one target node completely");
    await invokeSetAttributeAndTick(
      browser,
      "multiTarget-target2",
      "hidden",
      "true"
    );

    await testDetailsRelations(multiTargetBtn, multiTargetTarget1);

    info("Add back target node");
    await invokeSetAttributeAndTick(browser, "multiTarget-target2", "hidden");

    await testNoDetailsRelations(multiTargetBtn, multiTargetTarget1);

    info("Multiple anchors for one target");
    const multiAnchorBtn1 = findAccessibleChildByID(docAcc, "multiAnchor-btn1");
    const multiAnchorBtn2 = findAccessibleChildByID(docAcc, "multiAnchor-btn2");
    const multiAnchorTarget = findAccessibleChildByID(
      docAcc,
      "multiAnchor-target"
    );
    await testNoDetailsRelations(multiAnchorBtn1, multiAnchorTarget);
    await testNoDetailsRelations(multiAnchorBtn2, multiAnchorTarget);

    info("Remove one anchor via styling");
    await invokeSetAttributeAndTick(
      browser,
      "multiAnchor-target",
      "class",
      "unanchored"
    );
    await testDetailsRelations(multiAnchorBtn2, multiAnchorTarget);

    info("Add back one anchor via styling");
    await invokeSetAttributeAndTick(browser, "multiAnchor-target", "class");
    await testNoDetailsRelations(multiAnchorBtn2, multiAnchorTarget);

    info("Remove one anchor node");
    await invokeSetAttributeAndTick(
      browser,
      "multiAnchor-btn1",
      "hidden",
      "true"
    );
    await testDetailsRelations(multiAnchorBtn2, multiAnchorTarget);

    info("Add back anchor node");
    await invokeSetAttributeAndTick(browser, "multiAnchor-btn1", "hidden");
    await testNoDetailsRelations(multiAnchorBtn2, multiAnchorTarget);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test no details relations for tooltip target
 */
addAccessibleTask(
  `
  <style>
  #btn {
    anchor-name: --btn;
  }

  #tooltip-target {
    position: absolute;
    position-anchor: --btn;
    left: anchor(right);
    bottom: anchor(top);
  }
  </style>

  <div id="tooltip-target" role="tooltip">World</div>
  <button id="btn">Hello</button>
  `,
  async function testTooltipPositionAnchor(browser, docAcc) {
    info("Target is tooltip, no relation");
    const btn = findAccessibleChildByID(docAcc, "btn");
    const tooltipTarget = findAccessibleChildByID(docAcc, "tooltip-target");
    await testNoDetailsRelations(btn, tooltipTarget);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test no details relations for when explicit relations are set.
 */
addAccessibleTask(
  `
  <style>
  .target {
    position: absolute;
    left: anchor(right);
    bottom: anchor(top);
  }

  #btn-describedby {
    anchor-name: --btn-describedby;
  }

  #target-describedby {
    position-anchor: --btn-describedby;
  }

  #btn-labelledby {
    anchor-name: --btn-labelledby;
  }

  #target-labelledby {
    position-anchor: --btn-labelledby;
  }

  #btn-anchorsetdetails {
    anchor-name: --btn-anchorsetdetails;
  }

  #target-anchorsetdetails {
    position-anchor: --btn-anchorsetdetails;
  }

  #btn-targetsetdetails {
    anchor-name: --btn-targetsetdetails;
  }

  #target-targetsetdetails {
    position-anchor: --btn-targetsetdetails;
  }

  </style>

  <div id="target-describedby" class="target">World</div>
  <button id="btn-describedby" aria-describedby="target-describedby">Hello</button>

  <div id="target-labelledby" class="target">World</div>
  <button id="btn-labelledby" aria-labelledby="target-labelledby">Hello</button>

  <div id="target-anchorsetdetails" class="target">World</div>
  <button id="btn-anchorsetdetails" aria-details="">Hello</button>

  <div id="target-targetsetdetails" aria-details="" class="target">World</div>
  <button id="btn-targetsetdetails">Hello</button>
  `,
  async function testOtherRelationsWithAnchor(browser, docAcc) {
    info("Test no details relations when explicit relations are set");
    const btnDescribedby = findAccessibleChildByID(docAcc, "btn-describedby");
    const targetDescribedby = findAccessibleChildByID(
      docAcc,
      "target-describedby"
    );
    const btnLabelledby = findAccessibleChildByID(docAcc, "btn-labelledby");
    const targetLabelledby = findAccessibleChildByID(
      docAcc,
      "target-labelledby"
    );
    const btnAnchorsetdetails = findAccessibleChildByID(
      docAcc,
      "btn-anchorsetdetails"
    );
    const targetAnchorsetdetails = findAccessibleChildByID(
      docAcc,
      "target-anchorsetdetails"
    );
    const btnTargetsetdetails = findAccessibleChildByID(
      docAcc,
      "btn-targetsetdetails"
    );
    const targetTargetsetdetails = findAccessibleChildByID(
      docAcc,
      "target-targetsetdetails"
    );

    await testNoDetailsRelations(btnDescribedby, targetDescribedby);
    await invokeSetAttributeAndTick(
      browser,
      "btn-describedby",
      "aria-describedby"
    );
    await testDetailsRelations(btnDescribedby, targetDescribedby);

    await testNoDetailsRelations(btnLabelledby, targetLabelledby);
    await invokeSetAttributeAndTick(
      browser,
      "btn-labelledby",
      "aria-labelledby"
    );
    await testDetailsRelations(btnLabelledby, targetLabelledby);

    await testNoDetailsRelations(btnAnchorsetdetails, targetAnchorsetdetails);
    await invokeSetAttributeAndTick(
      browser,
      "btn-anchorsetdetails",
      "aria-details"
    );
    await testDetailsRelations(btnAnchorsetdetails, targetAnchorsetdetails);

    await testNoDetailsRelations(btnTargetsetdetails, targetTargetsetdetails);
    await invokeSetAttributeAndTick(
      browser,
      "target-targetsetdetails",
      "aria-details"
    );
    await testDetailsRelations(btnTargetsetdetails, targetTargetsetdetails);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test no details when anchor is used for sizing target only
 */
addAccessibleTask(
  `
  <style>
  #anchor1 {
    anchor-name: --anchor1;
    width: 200px;
  }

  #anchor2 {
    anchor-name: --anchor2;
    height: 150px;
  }

  #target {
    position: absolute;
    width: anchor-size(--anchor1 width);
  }

  #target.positioned {
    left: anchor(--anchor1 right);
  }

  #target.anchor-height {
    height: anchor-size(--anchor2 height);
  }
  </style>

  <div id="target">World</div>
  <button id="anchor1">Hello</button>
  <button id="anchor2">Cruel</button>
  `,
  async function testTooltipPositionAnchor(browser, docAcc) {
    info("Target is tooltip, no relation");
    const anchor1 = findAccessibleChildByID(docAcc, "anchor1");
    const target = findAccessibleChildByID(docAcc, "target");
    await testNoDetailsRelations(anchor1, target);

    info("Use anchor for positioning as well");
    await invokeSetAttributeAndTick(browser, "target", "class", "positioned");
    await testDetailsRelations(anchor1, target);

    info("Use second anchor for sizing");
    await invokeSetAttributeAndTick(
      browser,
      "target",
      "class",
      "positioned anchor-height"
    );
    await testNoDetailsRelations(anchor1, target);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test multi columns colspan
 */
addAccessibleTask(
  `
<style>
  .columns {
    column-count: 2;
    column-fill: auto;
  }

  .colspan {
    column-span: all;
  }

  .spacer {
    height: 10px;
  }

  #anchor {
    anchor-name: --a1;
    margin-left: 10px;
    width: 40px;
  }

  #target {
    position: absolute;
    left: anchor(--a1 left);
    top: anchor(--a1 top);
    width: 150px;
    height: 60px;
  }
</style>

<div class="columns">
  <div id="target" role="group"></div>
  <div id="anchor" role="group">
    <div class="spacer"></div>
    <div class="colspan" style="height: 20px"></div>
  </div>
</div>`,
  async function testTooltipPositionAnchor(browser, docAcc) {
    const anchor = findAccessibleChildByID(docAcc, "anchor");
    const target = findAccessibleChildByID(docAcc, "target");
    await testDetailsRelations(anchor, target);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test details relations when content does not have accessibles.
 */
addAccessibleTask(
  `
  <style>
  #btn1 {
    anchor-name: --btn1;
  }

  #target1 {
    position: absolute;
    position-anchor: --btn1;
    left: anchor(right);
    bottom: anchor(top);
  }

  #btn2 {
    anchor-name: --btn2;
  }

  #target2 {
    position: absolute;
    position-anchor: --btn2;
    left: anchor(right);
    bottom: anchor(top);
  }
  </style>

  <div id="target1">World</div>
  <button id="btn1" aria-hidden="true">Hello</button>

  <div id="target2" aria-hidden="true">World</div>
  <button id="btn2">Hello</button>
  `,
  async function testARIAHiddenAnchorsAndPosition(browser, docAcc) {
    info("ARIA hidden anchor");
    const target1 = findAccessibleChildByID(docAcc, "target1");
    await testCachedRelation(target1, RELATION_DETAILS_FOR, []);

    info("ARIA hidden target");
    const btn2 = findAccessibleChildByID(docAcc, "btn2");
    await testCachedRelation(btn2, RELATION_DETAILS, []);
  },
  { chrome: true, topLevel: true }
);

addAccessibleTask(
  `
<style>
.anchor {
  width: 50px;
  height: 50px;
  background: pink;
}

.positioned {
  width: 50px;
  height: 50px;
  background: purple;
  position: absolute;
  position-anchor: --a;
  left: anchor(right);
  bottom: anchor(bottom);
  position-try-fallbacks: --fb;
}

@position-try --fb {
  position-anchor: --b;
}

.abs-cb {
  width: 200px;
  height: 200px;
  border: 1px solid;
  position: relative;
}

.scroller {
  overflow: scroll;
  width: 100%;
  height: 100%;
  border: 1px solid;
  box-sizing: border-box;
}

.filler {
  height: 125px;
  width: 1px;
}

.dn {
  display: none;
}
</style>
<div class="abs-cb">
  <div class="scroller">
    <div class="filler"></div>
    <div class="anchor" id="anchor1" style="anchor-name: --a;" role="group"></div>
    <div class="filler"></div>
    <div class="anchor" id="anchor2" style="anchor-name: --b; background: aqua;" role="group"></div>
    <div class="filler"></div>
  </div>
  <div id="target" class="positioned" role="group"></div>
</div>`,
  async function testScrollWithFallback(browser, docAcc) {
    const anchor1 = findAccessibleChildByID(docAcc, "anchor1");
    const anchor2 = findAccessibleChildByID(docAcc, "anchor2");
    const target = findAccessibleChildByID(docAcc, "target");

    info("Correct details relation before scroll");
    await testDetailsRelations(anchor1, target);

    await invokeContentTaskAndTick(browser, [], () => {
      let scroller = content.document.querySelector(".scroller");
      scroller.scrollTo(0, scroller.scrollTopMax);
    });

    info("Correct details relation after scroll");
    await testDetailsRelations(anchor2, target);
  },
  { chrome: true, topLevel: true }
);
