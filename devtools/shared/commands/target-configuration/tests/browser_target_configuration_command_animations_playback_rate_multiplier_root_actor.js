/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Regression test for Bug 2040092.
//
// When a root target actor (e.g. the Browser Toolbox) has an iframe selected as
// the currently targeted document via the iframe picker, its browsing context
// is no longer the top one. animationsPlayBackRateMultiplier is a synced field
// that can only be set on the top browsing context, so setting it on the
// targeted subframe used to crash with:
//   "CanSet failed for field(s): AnimationsPlayBackRateMultiplier"

const INITIAL_MULTIPLIER = 1;
const UPDATED_MULTIPLIER = 0.5;

add_task(async function () {
  info("Open the bookmarks sidebar to get an in-process chrome subframe");
  await SidebarController.show("viewBookmarksSidebar");
  registerCleanupFunction(() => SidebarController.hide());

  const commands = await CommandsFactory.forMainProcess();
  const { targetCommand, targetConfigurationCommand } = commands;
  await targetCommand.startListening();

  const targetFront = targetCommand.targetFront;
  ok(targetFront.isParentProcess, "The top level target is the parent process");

  info("Find an in-process subframe of the current window to target");
  let subframe;
  await waitFor(async () => {
    const { frames } = await targetFront.listFrames();
    subframe = frames.find(frame => {
      if (frame.isTopLevel) {
        return false;
      }
      const frameWindow = Services.wm.getOuterWindowWithId(frame.id);
      return (
        frameWindow && frameWindow !== window && frameWindow.top === window
      );
    });
    return !!subframe;
  }, "Wait until a subframe of the current window is listed");

  info("Switch the targeted document to the subframe");
  const onFrameSwitched = waitForFrameSwitch(targetFront, subframe.id);
  await targetFront.switchToFrame({ windowId: String(subframe.id) });
  await onFrameSwitched;

  info(
    "Set animationsPlayBackRateMultiplier while a subframe is the targeted document"
  );
  // Before Bug 2040092 was fixed, this crashed the process.
  await targetConfigurationCommand.updateConfiguration({
    animationsPlayBackRateMultiplier: UPDATED_MULTIPLIER,
  });

  await waitFor(
    () =>
      window.browsingContext.top.animationsPlayBackRateMultiplier ==
      UPDATED_MULTIPLIER,
    "Wait for the multiplier to be applied to the top browsing context"
  );
  ok(true, "The multiplier was applied to the top browsing context");

  info("Destroy the commands, which restores the multiplier");
  // The restore path (_restoreTargetConfiguration) was a second crash site.
  await commands.destroy();

  await waitFor(
    () =>
      window.browsingContext.top.animationsPlayBackRateMultiplier ==
      INITIAL_MULTIPLIER,
    "Wait for the multiplier to be restored on the top browsing context"
  );
  ok(true, "The multiplier was restored on the top browsing context");
});

function waitForFrameSwitch(targetFront, windowId) {
  return new Promise(resolve => {
    const onFrameUpdate = packet => {
      if (packet.selected == windowId) {
        targetFront.off("frame-update", onFrameUpdate);
        resolve();
      }
    };
    targetFront.on("frame-update", onFrameUpdate);
  });
}
