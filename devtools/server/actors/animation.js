/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Set of actors that expose the Web Animations API to devtools protocol
 * clients.
 *
 * The |Animations| actor is the main entry point. It is used to discover
 * animation players on given nodes.
 * There should only be one instance per devtools server.
 *
 * The |AnimationPlayer| actor provides attributes and methods to inspect an
 * animation as well as pause/resume/seek it.
 *
 * The Web Animation spec implementation is ongoing in Gecko, and so this set
 * of actors should evolve when the implementation progresses.
 *
 * References:
 * - WebAnimation spec:
 *   http://drafts.csswg.org/web-animations/
 * - WebAnimation WebIDL files:
 *   /dom/webidl/Animation*.webidl
 */

const { Actor } = require("resource://devtools/shared/protocol.js");
const {
  animationPlayerSpec,
  animationsSpec,
} = require("resource://devtools/shared/specs/animation.js");

const {
  ANIMATION_TYPE_FOR_LONGHANDS,
} = require("resource://devtools/server/actors/animation-type-longhand.js");

loader.lazyRequireGetter(
  this,
  "getNodeDisplayName",
  "resource://devtools/server/actors/inspector/utils.js",
  true
);

// Types of animations.
const ANIMATION_TYPES = {
  CSS_ANIMATION: "cssanimation",
  CSS_TRANSITION: "csstransition",
  SCRIPT_ANIMATION: "scriptanimation",
  UNKNOWN: "unknown",
};
exports.ANIMATION_TYPES = ANIMATION_TYPES;

function getAnimationTypeForLonghand(property) {
  // If this is a custom property, return "custom" for now as it's not straightforward
  // to retrieve the proper animation type.
  // TODO: We could compute the animation type from the registered property syntax (Bug 1875435)
  if (property.startsWith("--")) {
    return "custom";
  }

  for (const [type, props] of ANIMATION_TYPE_FOR_LONGHANDS) {
    if (props.has(property)) {
      return type;
    }
  }
  throw new Error("Unknown longhand property name");
}
exports.getAnimationTypeForLonghand = getAnimationTypeForLonghand;

/**
 * The AnimationPlayerActor provides information about a given animation: its
 * startTime, currentTime, current state, etc.
 *
 * Since the state of a player changes as the animation progresses it is often
 * useful to call getCurrentState at regular intervals to get the current state.
 *
 * This actor also allows playing, pausing and seeking the animation.
 */
class AnimationPlayerActor extends Actor {
  /**
   * @param {AnimationsActor} The main AnimationsActor instance
   * @param {AnimationPlayer} The player object returned by getAnimationPlayers
   * @param {number} Time which animation created
   */
  constructor(animationsActor, player, createdTime) {
    super(animationsActor.conn, animationPlayerSpec);

    this.onAnimationMutation = this.onAnimationMutation.bind(this);

    this.animationsActor = animationsActor;
    this.walker = animationsActor.walker;
    this.player = player;
    // getting the node might need to traverse the DOM, let's only do this once, when
    // the Actor gets created
    this.node = this.getNode();

    // Listen to animation mutations on the node to alert the front when the
    // current animation changes.
    this.observer = new this.window.MutationObserver(this.onAnimationMutation);
    if (this.isPseudoElement) {
      // If the node is a pseudo-element, then we listen on its binding element (which is
      // this.player.effect.target here), with `subtree:true` (there's no risk of getting
      // too many notifications in onAnimationTargetMutation since we filter out events
      // that aren't for the current animation).
      this.observer.observe(this.player.effect.target, {
        animations: true,
        subtree: true,
      });
    } else {
      this.observer.observe(this.node, { animations: true });
    }

    this.createdTime = createdTime;
    this.currentTimeAtCreated = player.currentTime;
  }

  destroy() {
    // Only try to disconnect the observer if it's not already dead (i.e. if the
    // container view hasn't navigated since).
    if (this.observer && !Cu.isDeadWrapper(this.observer)) {
      this.observer.disconnect();
    }
    this.player = this.observer = this.walker = this.animationsActor = null;

    super.destroy();
  }

  get isPseudoElement() {
    return !!this.player.effect.pseudoElement;
  }

  getNode() {
    if (!this.isPseudoElement) {
      return this.player.effect.target;
    }

    const originatingElem = this.player.effect.target;
    const treeWalker = this.walker.getDocumentWalker(originatingElem);

    // When the animated node is a pseudo-element, we need to walk the children
    // of the target node and look for it.
    for (
      let next = treeWalker.firstChild();
      next;
      // Use `nextNode` (and not `nextSibling`) as we might need to traverse the whole
      // children tree to find nested elements (e.g. `::view-transition-group(root)`).
      next = treeWalker.nextNode()
    ) {
      if (!next.implementedPseudoElement) {
        continue;
      }

      if (this.player.effect.pseudoElement === getNodeDisplayName(next)) {
        return next;
      }
    }

    console.warn(
      `Pseudo element ${this.player.effect.pseudoElement} is not found`
    );

    return null;
  }

  get document() {
    return this.player.effect.target.ownerDocument;
  }

  get window() {
    return this.document.defaultView;
  }

  /**
   * Release the actor, when it isn't needed anymore.
   * Protocol.js uses this release method to call the destroy method.
   */
  release() {}

  form() {
    const data = this.getCurrentState();
    data.actor = this.actorID;

    // If we know the WalkerActor, and if the animated node is known by it, then
    // return its corresponding NodeActor ID too.
    if (this.walker && this.walker.hasNode(this.node)) {
      data.animationTargetNodeActorID = this.walker.getNode(this.node).actorID;
    }

    return data;
  }

  isCssAnimation(player = this.player) {
    return this.window.CSSAnimation.isInstance(player);
  }

  isCssTransition(player = this.player) {
    return this.window.CSSTransition.isInstance(player);
  }

  isScriptAnimation(player = this.player) {
    return (
      this.window.Animation.isInstance(player) &&
      !(
        this.window.CSSAnimation.isInstance(player) ||
        this.window.CSSTransition.isInstance(player)
      )
    );
  }

  getType() {
    if (this.isCssAnimation()) {
      return ANIMATION_TYPES.CSS_ANIMATION;
    } else if (this.isCssTransition()) {
      return ANIMATION_TYPES.CSS_TRANSITION;
    } else if (this.isScriptAnimation()) {
      return ANIMATION_TYPES.SCRIPT_ANIMATION;
    }

    return ANIMATION_TYPES.UNKNOWN;
  }

  /**
   * Get the name of this animation. This can be either the animation.id
   * property if it was set, or the keyframe rule name or the transition
   * property.
   *
   * @return {string}
   */
  getName() {
    if (this.player.id) {
      return this.player.id;
    } else if (this.isCssAnimation()) {
      return this.player.animationName;
    } else if (this.isCssTransition()) {
      return this.player.transitionProperty;
    }

    return "";
  }

  /**
   * Get the animation duration from this player, in milliseconds.
   *
   * @return {number}
   */
  getDuration() {
    return this.player.effect.getComputedTiming().duration;
  }

  /**
   * Get the animation delay from this player, in milliseconds.
   *
   * @return {number}
   */
  getDelay() {
    return this.player.effect.getComputedTiming().delay;
  }

  /**
   * Get the animation endDelay from this player, in milliseconds.
   *
   * @return {number}
   */
  getEndDelay() {
    return this.player.effect.getComputedTiming().endDelay;
  }

  /**
   * Get the animation iteration count for this player. That is, how many times
   * is the animation scheduled to run.
   *
   * @return {number} The number of iterations, or null if the animation repeats
   * infinitely.
   */
  getIterationCount() {
    const iterations = this.player.effect.getComputedTiming().iterations;
    return iterations === Infinity ? null : iterations;
  }

  /**
   * Get the animation iterationStart from this player, in ratio.
   * That is offset of starting position of the animation.
   *
   * @return {number}
   */
  getIterationStart() {
    return this.player.effect.getComputedTiming().iterationStart;
  }

  /**
   * Get the animation easing from this player.
   *
   * @return {string}
   */
  getEasing() {
    return this.player.effect.getComputedTiming().easing;
  }

  /**
   * Get the animation fill mode from this player.
   *
   * @return {string}
   */
  getFill() {
    return this.player.effect.getComputedTiming().fill;
  }

  /**
   * Get the animation direction from this player.
   *
   * @return {string}
   */
  getDirection() {
    return this.player.effect.getComputedTiming().direction;
  }

  /**
   * Get animation-timing-function from animated element if CSS Animations.
   *
   * @return {string}
   */
  getAnimationTimingFunction() {
    if (!this.isCssAnimation()) {
      return null;
    }

    const { target, pseudoElement } = this.player.effect;
    return this.window.getComputedStyle(target, pseudoElement)
      .animationTimingFunction;
  }

  getPropertiesCompositorStatus() {
    const properties = this.player.effect.getProperties();
    return properties.map(prop => {
      return {
        property: prop.property,
        runningOnCompositor: prop.runningOnCompositor,
        warning: prop.warning,
      };
    });
  }

  /**
   * Return the current start of the Animation.
   *
   * @return {object}
   */
  getState() {
    const compositorStatus = this.getPropertiesCompositorStatus();
    // Note that if you add a new property to the state object, make sure you
    // add the corresponding property in the AnimationPlayerFront' initialState
    // getter.
    return {
      // Don't include the type if the animation was removed (e.g. it isn't handled by the
      // AnimationsActor anymore). The client filters out animations without type as a
      // result of its calls to AnimationPlayerFront#refreshState.
      type: this.animationRemoved ? null : this.getType(),
      // startTime is null whenever the animation is paused or waiting to start.
      startTime: this.player.startTime,
      currentTime: this.player.currentTime,
      playState: this.player.playState,
      playbackRate: this.player.playbackRate,
      name: this.getName(),
      duration: this.getDuration(),
      delay: this.getDelay(),
      endDelay: this.getEndDelay(),
      iterationCount: this.getIterationCount(),
      iterationStart: this.getIterationStart(),
      fill: this.getFill(),
      easing: this.getEasing(),
      direction: this.getDirection(),
      animationTimingFunction: this.getAnimationTimingFunction(),
      // animation is hitting the fast path or not. Returns false whenever the
      // animation is paused as it is taken off the compositor then.
      isRunningOnCompositor: compositorStatus.some(
        propState => propState.runningOnCompositor
      ),
      propertyState: compositorStatus,
      // The document timeline's currentTime is being sent along too. This is
      // not strictly related to the node's animationPlayer, but is useful to
      // know the current time of the animation with respect to the document's.
      documentCurrentTime: this.document.timeline.currentTime,
      // The time which this animation created.
      createdTime: this.createdTime,
      // The time which an animation's current time when this animation has created.
      currentTimeAtCreated: this.currentTimeAtCreated,
      properties: this.getProperties(),
    };
  }

  /**
   * Get the current state of the AnimationPlayer (currentTime, playState, ...).
   * Note that the initial state is returned as the form of this actor when it
   * is initialized.
   * This protocol method only returns a trimed down version of this state in
   * case some properties haven't changed since last time (since the front can
   * reconstruct those). If you want the full state, use the getState method.
   *
   * @return {object}
   */
  getCurrentState() {
    const newState = this.getState();

    // If we've saved a state before, compare and only send what has changed.
    // It's expected of the front to also save old states to re-construct the
    // full state when an incomplete one is received.
    // This is to minimize protocol traffic.
    let sentState = {};
    if (this.currentState) {
      for (const key in newState) {
        if (
          typeof this.currentState[key] === "undefined" ||
          this.currentState[key] !== newState[key]
        ) {
          sentState[key] = newState[key];
        }
      }
    } else {
      sentState = newState;
    }
    this.currentState = newState;

    return sentState;
  }

  /**
   * Executed when the current animation changes, used to emit the new state
   * the the front.
   */
  onAnimationMutation(mutations) {
    const isCurrentAnimation = animation => animation === this.player;
    const hasCurrentAnimation = animations =>
      animations.some(isCurrentAnimation);
    let hasChanged = false;

    for (const { removedAnimations, changedAnimations } of mutations) {
      if (hasCurrentAnimation(removedAnimations)) {
        // Reset the local copy of the state on removal, since the animation can
        // be kept on the client and re-added, its state needs to be sent in
        // full.
        this.currentState = null;
      }

      if (hasCurrentAnimation(changedAnimations)) {
        // Only consider the state has having changed if any of effect timing properties,
        // animationTimingFunction or playbackRate has changed.
        const newState = this.getState();
        const oldState = this.currentState;
        hasChanged =
          newState.delay !== oldState.delay ||
          newState.iterationCount !== oldState.iterationCount ||
          newState.iterationStart !== oldState.iterationStart ||
          newState.duration !== oldState.duration ||
          newState.endDelay !== oldState.endDelay ||
          newState.direction !== oldState.direction ||
          newState.easing !== oldState.easing ||
          newState.fill !== oldState.fill ||
          newState.animationTimingFunction !==
            oldState.animationTimingFunction ||
          newState.playbackRate !== oldState.playbackRate;
        break;
      }
    }

    if (hasChanged) {
      this.emit("changed", this.getCurrentState());
    }
  }

  onAnimationRemoved() {
    this.animationRemoved = true;
  }

  /**
   * Get data about the animated properties of this animation player.
   *
   * @return {Array} Returns a list of animated properties.
   * Each property contains a list of values, their offsets and distances.
   */
  getProperties() {
    const properties = this.player.effect.getProperties().map(property => {
      return { name: property.property, values: property.values };
    });

    // If the node isn't connected, the call to DOMWindowUtils.getUnanimatedComputedStyle
    // below would throw. So early return from here, we'll miss the distance but that
    // seems fine.
    if (!this.node?.isConnected) {
      return properties;
    }

    const DOMWindowUtils = this.window.windowUtils;

    // Fill missing keyframe with computed value.
    for (const property of properties) {
      let underlyingValue = null;
      // Check only 0% and 100% keyframes.
      [0, property.values.length - 1].forEach(index => {
        const values = property.values[index];
        if (values.value !== undefined) {
          return;
        }
        if (!underlyingValue) {
          const { target, pseudoElement } = this.player.effect;
          const value = DOMWindowUtils.getUnanimatedComputedStyle(
            target,
            pseudoElement,
            property.name,
            DOMWindowUtils.FLUSH_NONE
          );
          const animationType = getAnimationTypeForLonghand(property.name);
          underlyingValue =
            animationType === "float" ? parseFloat(value, 10) : value;
        }
        values.value = underlyingValue;
      });
    }

    // Calculate the distance.
    for (const property of properties) {
      const propertyName = property.name;
      const maxObject = { distance: -1 };
      for (let i = 0; i < property.values.length - 1; i++) {
        const value1 = property.values[i].value;
        for (let j = i + 1; j < property.values.length; j++) {
          const value2 = property.values[j].value;
          const distance = this.getDistance(
            this.node,
            propertyName,
            value1,
            value2,
            DOMWindowUtils
          );
          if (maxObject.distance >= distance) {
            continue;
          }
          maxObject.distance = distance;
          maxObject.value1 = value1;
          maxObject.value2 = value2;
        }
      }
      if (maxObject.distance === 0) {
        // Distance is zero means that no values change or can't calculate the distance.
        // In this case, we use the keyframe offset as the distance.
        property.values.reduce((previous, current) => {
          // If the current value is same as previous value, use previous distance.
          current.distance =
            current.value === previous.value
              ? previous.distance
              : current.offset;
          return current;
        }, property.values[0]);
        continue;
      }
      const baseValue =
        maxObject.value1 < maxObject.value2
          ? maxObject.value1
          : maxObject.value2;
      for (const values of property.values) {
        const value = values.value;
        const distance = this.getDistance(
          this.node,
          propertyName,
          baseValue,
          value,
          DOMWindowUtils
        );
        values.distance = distance / maxObject.distance;
      }
    }
    return properties;
  }

  /**
   * Get the animation types for a given list of CSS property names.
   *
   * @param {Array} propertyNames - CSS property names (e.g. background-color)
   * @return {object} Returns animation types (e.g. {"background-color": "rgb(0, 0, 0)"}.
   */
  getAnimationTypes(propertyNames) {
    const animationTypes = {};
    for (const propertyName of propertyNames) {
      animationTypes[propertyName] = getAnimationTypeForLonghand(propertyName);
    }
    return animationTypes;
  }

  /**
   * Returns the distance of between value1, value2.
   *
   * @param {object} target - dom element
   * @param {string} propertyName - e.g. transform
   * @param {string} value1 - e.g. translate(0px)
   * @param {string} value2 - e.g. translate(10px)
   * @param {object} DOMWindowUtils
   * @param {float} distance
   */
  getDistance(target, propertyName, value1, value2, DOMWindowUtils) {
    if (value1 === value2) {
      return 0;
    }
    try {
      const distance = DOMWindowUtils.computeAnimationDistance(
        target,
        propertyName,
        value1,
        value2
      );
      return distance;
    } catch (e) {
      // We can't compute the distance such the 'discrete' animation,
      // 'auto' keyword and so on.
      return 0;
    }
  }
}

exports.AnimationPlayerActor = AnimationPlayerActor;

/**
 * The Animations actor lists animation players for a given node.
 */
exports.AnimationsActor = class AnimationsActor extends Actor {
  constructor(conn, targetActor) {
    super(conn, animationsSpec);
    this.targetActor = targetActor;

    this.onWillNavigate = this.onWillNavigate.bind(this);
    this.onNavigate = this.onNavigate.bind(this);
    this.onAnimationMutation = this.onAnimationMutation.bind(this);

    this.allAnimationsPaused = false;
    this.targetActor.on("will-navigate", this.onWillNavigate);
    this.targetActor.on("navigate", this.onNavigate);
  }

  destroy() {
    super.destroy();
    this.targetActor.off("will-navigate", this.onWillNavigate);
    this.targetActor.off("navigate", this.onNavigate);

    this.stopAnimationPlayerUpdates();
    this.targetActor = this.observer = this.actors = this.walker = null;
  }

  /**
   * Clients can optionally call this with a reference to their WalkerActor.
   * If they do, then AnimationPlayerActor's forms are going to also include
   * NodeActor IDs when the corresponding NodeActors do exist.
   * This, in turns, is helpful for clients to avoid having to go back once more
   * to the server to get a NodeActor for a particular animation.
   *
   * @param {WalkerActor} walker
   */
  setWalkerActor(walker) {
    this.walker = walker;
  }

  /**
   * Retrieve the list of AnimationPlayerActor actors for currently running
   * animations on a node and its descendants.
   * Note that calling this method a second time will destroy all previously
   * retrieved AnimationPlayerActors. Indeed, the lifecycle of these actors
   * is managed here on the server and tied to getAnimationPlayersForNode
   * being called.
   *
   * @param {NodeActor} nodeActor The NodeActor as defined in
   * /devtools/server/actors/inspector
   */
  getAnimationPlayersForNode(nodeActor) {
    let { rawNode } = nodeActor;

    // If the selected node is a ::view-transition child, we want to show all the view-transition
    // animations so the user can't play only "parts" of the transition.
    const viewTransitionNode = this.#closestViewTransitionNode(rawNode);
    if (viewTransitionNode) {
      rawNode = viewTransitionNode;
    }

    const animations = rawNode.getAnimations({ subtree: true });

    // Destroy previously stored actors
    if (this.actors) {
      for (const actor of this.actors) {
        actor.destroy();
      }
    }

    this.actors = [];

    for (const animation of animations) {
      const createdTime = this.getCreatedTime(animation);
      const actor = new AnimationPlayerActor(this, animation, createdTime);
      this.actors.push(actor);
    }

    // When a front requests the list of players for a node, start listening
    // for animation mutations on this node to send updates to the front, until
    // either getAnimationPlayersForNode is called again or
    // stopAnimationPlayerUpdates is called.
    this.stopAnimationPlayerUpdates();
    // ownerGlobal doesn't exist in content privileged windows.
    // eslint-disable-next-line mozilla/use-ownerGlobal
    const win = rawNode.ownerDocument.defaultView;
    this.observer = new win.MutationObserver(this.onAnimationMutation);
    this.observer.observe(rawNode, {
      animations: true,
      subtree: true,
    });

    return this.actors;
  }

  /**
   * Returns the passed node closest ::view-transition node if it exists, null otherwise
   *
   * @param {Element} rawNode
   * @returns {Element|null}
   */
  #closestViewTransitionNode(rawNode) {
    const { implementedPseudoElement } = rawNode;
    if (
      !implementedPseudoElement ||
      !implementedPseudoElement?.startsWith("::view-transition")
    ) {
      return null;
    }
    // Look up for the root ::view-transition node
    while (
      rawNode &&
      rawNode.implementedPseudoElement &&
      rawNode.implementedPseudoElement !== "::view-transition"
    ) {
      rawNode = rawNode.parentElement;
    }

    return rawNode;
  }

  onAnimationMutation(mutations) {
    const eventData = [];
    const readyPromises = [];

    for (const { addedAnimations, removedAnimations } of mutations) {
      for (const player of removedAnimations) {
        // Note that animations are reported as removed either when they are
        // actually removed from the node (e.g. css class removed) or when they
        // are finished and don't have forwards animation-fill-mode.
        // In the latter case, we don't send an event, because the corresponding
        // animation can still be seeked/resumed, so we want the client to keep
        // its reference to the AnimationPlayerActor.
        if (player.playState !== "idle") {
          continue;
        }

        const index = this.actors.findIndex(a => a.player === player);
        if (index !== -1) {
          eventData.push({
            type: "removed",
            player: this.actors[index],
          });
          this.actors[index].onAnimationRemoved();
          this.actors.splice(index, 1);
        }
      }

      for (const player of addedAnimations) {
        // If the added player already exists, it means we previously filtered
        // it out when it was reported as removed. So filter it out here too.
        if (this.actors.find(a => a.player === player)) {
          continue;
        }

        // If the added player has the same name and target node as a player we
        // already have, it means it's a transition that's re-starting. So send
        // a "removed" event for the one we already have.
        const index = this.actors.findIndex(a => {
          const isSameType = a.player.constructor === player.constructor;
          const isSameName =
            (a.isCssAnimation() &&
              a.player.animationName === player.animationName) ||
            (a.isCssTransition() &&
              a.player.transitionProperty === player.transitionProperty);
          const isSameNode =
            a.player.effect.target === player.effect.target &&
            a.player.effect.pseudoElement === player.effect.pseudoElement;

          return isSameType && isSameNode && isSameName;
        });
        if (index !== -1) {
          eventData.push({
            type: "removed",
            player: this.actors[index],
          });
          this.actors[index].onAnimationRemoved();
          this.actors.splice(index, 1);
        }

        const createdTime = this.getCreatedTime(player);
        const actor = new AnimationPlayerActor(this, player, createdTime);
        this.actors.push(actor);
        eventData.push({
          type: "added",
          player: actor,
        });
        readyPromises.push(player.ready);
      }
    }

    if (eventData.length) {
      // Let's wait for all added animations to be ready before telling the
      // front-end.
      Promise.all(readyPromises).then(() => {
        this.emit("mutations", eventData);
      });
    }
  }

  /**
   * After the client has called getAnimationPlayersForNode for a given DOM
   * node, the actor starts sending animation mutations for this node. If the
   * client doesn't want this to happen anymore, it should call this method.
   */
  stopAnimationPlayerUpdates() {
    if (this.observer && !Cu.isDeadWrapper(this.observer)) {
      this.observer.disconnect();
    }
  }

  onWillNavigate({ isTopLevel }) {
    if (isTopLevel) {
      this.stopAnimationPlayerUpdates();
    }
  }

  onNavigate({ isTopLevel }) {
    if (isTopLevel) {
      this.allAnimationsPaused = false;
    }
  }

  /**
   * Pause given animations.
   *
   * @param {Array} actors A list of AnimationPlayerActor.
   */
  pauseSome(actors) {
    const handledActors = [];
    for (const actor of actors) {
      // The client could call this with actors that we no longer handle, as it might
      // not have received the mutations event yet for removed animations.
      // In such case, ignore the actor, as pausing the animation again might trigger a
      // new mutation, which would cause problems here and on the client.
      if (!this.actors.includes(actor)) {
        continue;
      }
      this.pauseSync(actor.player);
      handledActors.push(actor);
    }

    return this.waitForNextFrame(handledActors);
  }

  /**
   * Play given animations.
   *
   * @param {Array} actors A list of AnimationPlayerActor.
   */
  playSome(actors) {
    const handledActors = [];
    for (const actor of actors) {
      // The client could call this with actors that we no longer handle, as it might
      // not have received the mutations event yet for removed animations.
      // In such case, ignore the actor, as playing the animation again might trigger a
      // new mutation, which would cause problems here and on the client.
      if (!this.actors.includes(actor)) {
        continue;
      }
      this.playSync(actor.player);
      handledActors.push(actor);
    }

    return this.waitForNextFrame(handledActors);
  }

  /**
   * Set the current time of several animations at the same time.
   *
   * @param {Array} actors A list of AnimationPlayerActor.
   * @param {number} time The new currentTime.
   * @param {boolean} shouldPause Should the players be paused too.
   */
  setCurrentTimes(actors, time, shouldPause) {
    const handledActors = [];
    for (const actor of actors) {
      // The client could call this with actors that we no longer handle, as it might
      // not have received the mutations event yet for removed animations.
      // In such case, ignore the actor, as setting the time might trigger a
      // new mutation, which would cause problems here and on the client.
      if (!this.actors.includes(actor)) {
        continue;
      }
      const player = actor.player;

      if (shouldPause) {
        player.startTime = null;
      }

      const currentTime =
        player.playbackRate > 0
          ? time - actor.createdTime
          : actor.createdTime - time;
      player.currentTime = currentTime * Math.abs(player.playbackRate);
      handledActors.push(actor);
    }

    return this.waitForNextFrame(handledActors);
  }

  /**
   * Set the playback rate of several animations at the same time.
   *
   * @param {Array} actors A list of AnimationPlayerActor.
   * @param {number} rate The new rate.
   */
  setPlaybackRates(actors, rate) {
    const readyPromises = [];
    for (const actor of actors) {
      // The client could call this with actors that we no longer handle, as it might
      // not have received the mutations event yet for removed animations.
      // In such case, ignore the actor, as setting the playback rate might trigger a
      // new mutation, which would cause problems here and on the client.
      if (!this.actors.includes(actor)) {
        continue;
      }
      actor.player.updatePlaybackRate(rate);
      readyPromises.push(actor.player.ready);
    }
    return Promise.all(readyPromises);
  }

  /**
   * Pause given player synchronously.
   *
   * @param {object} player
   */
  pauseSync(player) {
    player.startTime = null;
  }

  /**
   * Play given player synchronously.
   *
   * @param {object} player
   */
  playSync(player) {
    if (!player.playbackRate) {
      // We can not play with playbackRate zero.
      return;
    }

    // Play animation in a synchronous fashion by setting the start time directly.
    const currentTime = player.currentTime || 0;
    player.startTime =
      player.timeline.currentTime - currentTime / player.playbackRate;
  }

  /**
   * Return created fime of given animaiton.
   *
   * @param {object} animation
   */
  getCreatedTime(animation) {
    return (
      animation.startTime ||
      animation.timeline.currentTime -
        animation.currentTime / animation.playbackRate
    );
  }

  /**
   * Wait for next animation frame.
   *
   * @param {Array} actors
   * @return {Promise} which waits for next frame
   */
  waitForNextFrame(actors) {
    const promises = actors.map(actor => {
      const doc = actor.document;
      const win = actor.window;
      const timeAtCurrent = doc.timeline.currentTime;

      return new Promise(resolve => {
        win.requestAnimationFrame(() => {
          if (timeAtCurrent === doc.timeline.currentTime) {
            win.requestAnimationFrame(resolve);
          } else {
            resolve();
          }
        });
      });
    });

    return Promise.all(promises);
  }
};
