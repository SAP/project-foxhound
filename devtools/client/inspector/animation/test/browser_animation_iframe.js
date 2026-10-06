/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the animation inspector does display animations from iframes
const TEST_URI = `https://example.org/document-builder.sjs?html=
  <style>
    h1, h2 {
      color: gold;
      animation: top-level-animation 10s infinite;
    }

    @keyframes top-level-animation {
      100% {
        color: tomato;
      }
    }
  </style>
  <main>
    <h1>Hello</h1>
    <h2>top-level world</h2>
    <iframe src="${URL_ROOT_SSL + "doc_special_colors.html"}"></iframe>
  </main>
`;

add_task(async function () {
  await pushPref("devtools.inspector.three-pane-enabled", false);

  await addTab(TEST_URI);

  const { inspector, panel } = await openAnimationInspector();

  await selectNode("body", inspector);
  await checkAnimationTargetNameElements(
    panel,
    ["h1", "h2"],
    "Got expected animation targets when top level <body> is selected"
  );

  // wait until we can retrieve the node front in the iframe (it might not be loaded at first)
  const iframeBodyNode = await waitFor(async () => {
    const res = await getNodeFrontInFrames(["iframe", "body"], inspector);
    return res;
  });
  await selectNode(iframeBodyNode, inspector);
  await checkAnimationTargetNameElements(
    panel,
    ["div"],
    "Got expected animation targets when iframe <body> is selected"
  );

  await selectNode("h2", inspector);
  await checkAnimationTargetNameElements(
    panel,
    ["h2"],
    "Got expected animation targets when top level <h2> is selected"
  );

  await selectNodeInFrames(["iframe", "div"], inspector);
  await checkAnimationTargetNameElements(
    panel,
    ["div"],
    "Got expected animation targets when iframe <div> is selected"
  );
});

async function checkAnimationTargetNameElements(
  panel,
  expectedTargets,
  assertionMessage
) {
  // wrap in a try/catch so even if `waitFor` throws, we'll hit Assert.deepEqual that
  // will better feedback for the developers if the test fails.
  try {
    await waitFor(() => {
      const els = getAnimationTargetElements(panel);
      return (
        els.length === expectedTargets.length &&
        els.every((el, i) => el.textContent === expectedTargets[i])
      );
    });
  } catch (e) {}

  Assert.deepEqual(
    getAnimationTargetElements(panel).map(el => el.textContent),
    expectedTargets,
    assertionMessage
  );
}

function getAnimationTargetElements(panel) {
  return [
    ...panel.querySelectorAll(".animation-list .animation-item .tag-name"),
  ];
}
