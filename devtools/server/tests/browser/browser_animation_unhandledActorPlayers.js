/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Check that calling AnimationsActor method taking AnimationActor arrays (pauseSome,
// playSome, setCurrentTimes) with instances that are not handled by
// the AnimationsActor anymore doesn't throw nor trigger unexpected animations (see Bug 2001590).

add_task(async function () {
  const { target, walker, animations } = await initAnimationsFrontForUrl(
    `data:text/html,<meta charset=utf8>${encodeURIComponent(`
    <style>
      #target {
        animation: my-anim 1s infinite alternate;

        &.still {
          animation: none;
        }
      }
      @keyframes my-anim {
        to {
          background-color: tomato;
        }
      }
    </style>
    <div id=target>Hello</div>`)}`
  );

  info("Retrieve an animated node");
  const node = await walker.querySelector(walker.rootNode, "#target");

  const getAnimationFrontsForTargetNode = () =>
    animations.getAnimationPlayersForNode(node);

  info("Retrieve the animation fronts for the node");
  const animationFronts = await getAnimationFrontsForTargetNode();
  is(animationFronts.length, 1, "Got one animation front");
  const animationFront = animationFronts[0];

  info("Stop the animation on the node");
  await node.modifyAttributes([
    {
      attributeName: "class",
      newValue: "still",
    },
  ]);

  // Wait until we're not getting the animation anymore
  await waitFor(async () => {
    return (await getAnimationFrontsForTargetNode()).length === 0;
  });

  info("Call methodes with outdated animation front");
  const onPause = animations.pauseSome([animationFront]);
  const onPlay = animations.playSome([animationFront]);
  const onCurrentTimeSet = animations.setCurrentTimes(
    [animationFront],
    1,
    true
  );

  await onPause;
  ok(true, "pauseSome succeeded");

  await onPlay;
  ok(true, "playSome succedded");

  await onCurrentTimeSet;
  ok(true, "setCurrentTimes succedded");

  // wait for a bit so we would get notified about new animations
  await wait(500);
  is(
    (await getAnimationFrontsForTargetNode()).length,
    0,
    "No animation fronts were created after calling those methods"
  );

  await target.destroy();
  gBrowser.removeCurrentTab();
});
