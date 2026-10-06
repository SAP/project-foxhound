/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for Bug 1247243

add_task(async function () {
  info("Setting up inspector and animation actors.");
  const { animations, walker } = await initAnimationsFrontForUrl(
    MAIN_DOMAIN + "animation-data.html"
  );

  info("Testing animated node actor");
  const animatedNodeActor = await walker.querySelector(
    walker.rootNode,
    ".animated"
  );
  await animations.getAnimationPlayersForNode(animatedNodeActor);

  await assertNumberOfAnimationActors(
    1,
    "AnimationActor have 1 AnimationActors"
  );

  info("Testing AnimationActors release");
  const stillNodeActor = await walker.querySelector(walker.rootNode, ".still");
  await animations.getAnimationPlayersForNode(stillNodeActor);
  await assertNumberOfAnimationActors(
    0,
    "AnimationActor does not have any AnimationActors anymore"
  );

  info("Testing multi animated node actor");
  const multiNodeActor = await walker.querySelector(walker.rootNode, ".multi");
  await animations.getAnimationPlayersForNode(multiNodeActor);
  await assertNumberOfAnimationActors(
    2,
    "AnimationActor has now 2 AnimationActors"
  );

  info("Testing single animated node actor");
  await animations.getAnimationPlayersForNode(animatedNodeActor);
  await assertNumberOfAnimationActors(
    1,
    "AnimationActor has only one AnimationActors"
  );

  info("Testing AnimationActors release again");
  await animations.getAnimationPlayersForNode(stillNodeActor);
  await assertNumberOfAnimationActors(
    0,
    "AnimationActor does not have any AnimationActors anymore"
  );

  async function assertNumberOfAnimationActors(expected, message) {
    const actors = await SpecialPowers.spawn(
      gBrowser.selectedBrowser,
      [[animations.actorID]],
      function (actorID) {
        const { require } = ChromeUtils.importESModule(
          "resource://devtools/shared/loader/Loader.sys.mjs"
        );
        const {
          DevToolsServer,
        } = require("resource://devtools/server/devtools-server.js");
        // Convert actorID to current compartment string otherwise
        // searchAllConnectionsForActor is confused and won't find the actor.
        actorID = String(actorID);
        const animationActors =
          DevToolsServer.searchAllConnectionsForActor(actorID);
        if (!animationActors) {
          return 0;
        }
        return animationActors.actors.length;
      }
    );
    is(actors, expected, message);
  }
});
