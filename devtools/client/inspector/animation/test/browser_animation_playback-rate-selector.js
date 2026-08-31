/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the PlaybackRateSelector component

add_task(async function () {
  await addTab(URL_ROOT + "doc_custom_playback_rate.html");
  const { animationInspector, inspector, panel } =
    await openAnimationInspector();

  info("Checking PlaybackRateSelector existence");
  let selectEl = panel.querySelector(".playback-rate-selector");
  ok(selectEl, "PlaybackRateSelector element exists");

  info("Checking PlaybackRateSelector options");
  const expectedPlaybackRates = [0.01, 0.1, 0.25, 0.5, 1, 2, 5, 10];
  await assertPlaybackRateMultiplierOptions(selectEl, expectedPlaybackRates);
  // When not set, the browsing context flag is 1
  await assertPlaybackRateMultiplier(1);

  info("Check setting a playback rate multiplier different than 1");
  await changePlaybackRateMultiplierSelector(animationInspector, panel, 0.5);
  await assertPlaybackRateMultiplier(0.5);

  info("Check that plaback rate stays set after reloading");
  await reloadSelectedTab();
  await assertPlaybackRateMultiplier(0.5);

  info("Checking playback rate multiplier after setting it back to 1");
  await changePlaybackRateMultiplierSelector(animationInspector, panel, 1);
  await assertPlaybackRateMultiplier(1);

  info("Checking PlaybackRateSelector options again");
  await assertPlaybackRateMultiplierOptions(selectEl, expectedPlaybackRates);

  info("Checking setting playback rate before starting animations");
  await selectNode("aside", inspector);
  await waitUntil(() => panel.querySelectorAll(".animation-item").length === 0);
  selectEl = panel.querySelector(".playback-rate-selector");
  ok(!!selectEl, "playback rate selector is still displayed");
  await changePlaybackRateMultiplierSelector(animationInspector, panel, 0.01);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const document = content.document;
    content.testAnimation = document
      .querySelector("aside")
      .animate([{ opacity: 0 }], 10000);
  });
  await waitUntil(() => panel.querySelectorAll(".animation-item").length === 1);
  await assertPlaybackRateMultiplier(0.01);

  info("Checking setting playback rate on non-element node");
  const { nodes } = await inspector.walker.children(inspector.walker.rootNode);

  const doctypeNode = nodes[0];
  // Sanity check
  const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");
  is(
    doctypeNode.nodeType,
    nodeConstants.DOCUMENT_TYPE_NODE,
    "We do have the doctype node"
  );
  await selectNode(doctypeNode, inspector);
  await waitUntil(() => panel.querySelectorAll(".animation-item").length === 0);

  selectEl = panel.querySelector(".playback-rate-selector");
  ok(!!selectEl, "playback rate selector is still displayed");
  await changePlaybackRateMultiplierSelector(animationInspector, panel, 0.25);
  await assertPlaybackRateMultiplier(0.25);
});

async function assertPlaybackRateMultiplier(rate) {
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [rate], r => {
    is(
      content.browsingContext.animationsPlayBackRateMultiplier,
      r,
      "Expected browsingContext.animationsPlayBackRateMultiplier"
    );
  });
}

async function assertPlaybackRateMultiplierOptions(
  selectEl,
  expectedPlaybackRates
) {
  await waitUntil(() => {
    if (selectEl.options.length !== expectedPlaybackRates.length) {
      return false;
    }

    for (let i = 0; i < selectEl.options.length; i++) {
      const optionEl = selectEl.options[i];
      const expectedPlaybackRate = expectedPlaybackRates[i];
      if (Number(optionEl.value) !== expectedPlaybackRate) {
        return false;
      }
    }

    return true;
  });
  ok(true, "Content of playback rate options are correct");
}
