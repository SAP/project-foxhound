/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for pseudo element.

const TEST_DATA = [
  {
    expectedTargetLabel: "::before",
    expectedAnimationNameLabel: "body",
    expectedKeyframsGraphPathSegments: [
      { x: 0, y: 0 },
      { x: 1000, y: 100 },
    ],
  },
  {
    expectedTargetLabel: "::before",
    expectedAnimationNameLabel: "div-before",
    expectedKeyframsGraphPathSegments: [
      { x: 0, y: 100 },
      { x: 1000, y: 0 },
    ],
  },
  {
    expectedTargetLabel: "::after",
    expectedAnimationNameLabel: "div-after",
  },
  {
    expectedTargetLabel: "::backdrop",
    expectedAnimationNameLabel: "dialog-backdrop",
  },
  {
    expectedTargetLabel: "::marker",
    expectedAnimationNameLabel: "div-marker",
  },
  {
    expectedTargetLabel: "::view-transition-group(root)",
    expectedAnimationNameLabel: "-ua-view-transition-group-anim-root",
  },
  {
    expectedTargetLabel: "::view-transition-group(my-vt)",
    expectedAnimationNameLabel: "my-vt-animation",
  },
  {
    expectedTargetLabel: "::view-transition-old(root)",
    expectedAnimationNameLabel: "-ua-mix-blend-mode-plus-lighter",
  },
  {
    expectedTargetLabel: "::view-transition-old(root)",
    expectedAnimationNameLabel: "-ua-view-transition-fade-out",
  },
  {
    expectedTargetLabel: "::view-transition-new(root)",
    expectedAnimationNameLabel: "-ua-mix-blend-mode-plus-lighter",
  },
  {
    expectedTargetLabel: "::view-transition-new(root)",
    expectedAnimationNameLabel: "-ua-view-transition-fade-in",
  },
  {
    expectedTargetLabel: "::view-transition-old(my-vt)",
    expectedAnimationNameLabel: "-ua-mix-blend-mode-plus-lighter",
  },
  {
    expectedTargetLabel: "::view-transition-old(my-vt)",
    expectedAnimationNameLabel: "-ua-view-transition-fade-out",
  },
  {
    expectedTargetLabel: "::view-transition-new(my-vt)",
    expectedAnimationNameLabel: "-ua-mix-blend-mode-plus-lighter",
  },
  {
    expectedTargetLabel: "::view-transition-new(my-vt)",
    expectedAnimationNameLabel: "-ua-view-transition-fade-in",
  },
];

add_task(async function () {
  await addTab(URL_ROOT + "doc_pseudo.html");

  const { animationInspector, inspector, panel } =
    await openAnimationInspector();

  // Select the html node so we can see ::view-transition animations
  await selectNode("html", inspector);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const document = content.document;
    const transition = document.startViewTransition(() => {
      document.querySelector(".div-view-transition").append("world");
    });
    await transition.ready;
    await transition.updateCallbackDone;
  });

  info("Waiting for expected animations to be displayed");
  try {
    await waitFor(
      () =>
        panel.querySelectorAll(".animation-list .animation-item").length ===
        TEST_DATA.length
    );
    ok(
      true,
      `Got expectedCount of animation item should be ${TEST_DATA.length}`
    );
  } catch (e) {
    ok(
      false,
      `Didn't get expected number of animations. Got ${panel.querySelectorAll(".animation-list .animation-item").length} expected ${TEST_DATA.length}`
    );
  }

  info("Checking content of each animation item");
  for (let i = 0; i < TEST_DATA.length; i++) {
    await checkAnimationItemAtIndex(panel, i, TEST_DATA[i]);
  }

  info(
    "Checking whether node is selected correctly " +
      "when click on the first inspector icon on Reps component"
  );
  let onDetailRendered = animationInspector.once(
    "animation-keyframes-rendered"
  );
  await clickOnTargetNode(animationInspector, panel, 0);
  await onDetailRendered;
  assertAnimationCount(panel, 1);
  assertAnimationNameLabel(panel, TEST_DATA[0].expectedAnimationNameLabel);
  assertKeyframesGraphPathSegments(
    panel,
    TEST_DATA[0].expectedKeyframsGraphPathSegments
  );

  // Select `body` only so we avoid having all the view transition items
  info("Select <body> to reset the animation list");
  await selectNode("body", inspector);

  info(
    "Checking whether node is selected correctly " +
      "when click on the second inspector icon on Reps component"
  );
  onDetailRendered = animationInspector.once("animation-keyframes-rendered");
  await clickOnTargetNode(animationInspector, panel, 1);
  await onDetailRendered;
  assertAnimationCount(panel, 1);
  assertAnimationNameLabel(panel, TEST_DATA[1].expectedAnimationNameLabel);
  assertKeyframesGraphPathSegments(
    panel,
    TEST_DATA[1].expectedKeyframsGraphPathSegments
  );

  info(
    "Check that view-transition node can be selected from the animation panel"
  );
  info("Select <html> to reset the animation list");
  await selectNode("html", inspector);
  // wait for all the animations to be displayed again
  await waitFor(
    () =>
      panel.querySelectorAll(".animation-list .animation-item").length ===
      TEST_DATA.length
  );

  onDetailRendered = animationInspector.once("animation-keyframes-rendered");
  await clickOnTargetNodeByTargetText(
    animationInspector,
    panel,
    "::view-transition-group(my-vt)"
  );

  // we get all the view transition animations, even those on elements who are not children
  // of the currently selected node
  const expectedTargets = [
    "::view-transition-group(my-vt)",
    "::view-transition-group(root)",
    "::view-transition-old(my-vt)",
    "::view-transition-old(my-vt)",
    "::view-transition-old(root)",
    "::view-transition-old(root)",
    "::view-transition-new(my-vt)",
    "::view-transition-new(my-vt)",
    "::view-transition-new(root)",
    "::view-transition-new(root)",
  ];
  await waitFor(() =>
    [
      ...panel.querySelectorAll(
        ".animation-list .animation-item .animation-target .attrName"
      ),
    ]
      .map(attrNameEl => attrNameEl.textContent)
      .every((targetElText, index) => targetElText === expectedTargets[index])
  );

  is(
    inspector.selection.nodeFront.displayName,
    "::view-transition-group(my-vt)",
    "Expected view transition pseudo element node was selected"
  );

  info("Select <html> to reset the animation list");
  await selectNode("html", inspector);
  // wait for all the animations to be displayed again
  await waitFor(
    () =>
      panel.querySelectorAll(".animation-list .animation-item").length ===
      TEST_DATA.length
  );

  info(
    "Stop the view transition and check that related animations are removed"
  );
  const TEST_DATA_WITHOUT_VIEW_TRANSITION = TEST_DATA.filter(
    ({ expectedTargetLabel }) =>
      !expectedTargetLabel.startsWith("::view-transition")
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.document.activeViewTransition.skipTransition();
  });

  await waitFor(
    () =>
      panel.querySelectorAll(".animation-list .animation-item").length ===
      TEST_DATA_WITHOUT_VIEW_TRANSITION.length
  );
  ok(
    true,
    `Got expectedCount of animation item after stopping the view transition`
  );

  info("Reload the page");
  await reloadSelectedTab();

  info("Waiting for expected animations to be displayed");
  // No need to check for view transition this time, we want to assert that we do get
  // animations for pseudo element after reloading (assert fix for Bug 2001126)
  await waitFor(
    () =>
      panel.querySelectorAll(".animation-list .animation-item").length ===
      TEST_DATA_WITHOUT_VIEW_TRANSITION.length
  );
  ok(
    true,
    `Got expectedCount of animation item should be ${TEST_DATA_WITHOUT_VIEW_TRANSITION.length} after reloading`
  );

  info("Checking content of each animation item after reload");
  for (let i = 0; i < TEST_DATA_WITHOUT_VIEW_TRANSITION.length; i++) {
    await checkAnimationItemAtIndex(
      panel,
      i,
      TEST_DATA_WITHOUT_VIEW_TRANSITION[i]
    );
  }
});

async function checkAnimationItemAtIndex(panel, index, testData) {
  info(`Checking pseudo element for animation at index #${index}`);
  const animationItemEl = await findAnimationItemByIndex(panel, index);

  if (!animationItemEl) {
    ok(false, `Didn't find an animation at index #${index}`);
    return;
  }

  info("Checking text content of animation target");
  const animationTargetEl = animationItemEl.querySelector(
    ".animation-list .animation-item .animation-target"
  );
  is(
    animationTargetEl.textContent,
    testData.expectedTargetLabel,
    `Got expected target for animation at index #${index}`
  );

  info("Checking text content of animation name");
  const animationNameEl = animationItemEl.querySelector(".animation-name");
  is(
    animationNameEl.textContent,
    testData.expectedAnimationNameLabel,
    `Got expected animation name for animation at index #${index}`
  );
}

function assertAnimationCount(panel, expectedCount) {
  info("Checking count of animation item");
  is(
    panel.querySelectorAll(".animation-list .animation-item").length,
    expectedCount,
    `Count of animation item should be ${expectedCount}`
  );
}

function assertAnimationNameLabel(panel, expectedAnimationNameLabel) {
  info("Checking the animation name label");
  is(
    panel.querySelector(".animation-list .animation-item .animation-name")
      .textContent,
    expectedAnimationNameLabel,
    `The animation name should be ${expectedAnimationNameLabel}`
  );
}

function assertKeyframesGraphPathSegments(panel, expectedPathSegments) {
  info("Checking the keyframes graph path segments");
  const pathEl = panel.querySelector(".keyframes-graph-path path");
  assertPathSegments(pathEl, true, expectedPathSegments);
}
