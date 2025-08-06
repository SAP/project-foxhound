/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

loader.lazyRequireGetter(
  this,
  "EventEmitter",
  "resource://devtools/shared/event-emitter.js"
);

/**
 * Client-side NodePicker module.
 * To be used by inspector front when it needs to select DOM elements.
 *
 * NodePicker is a proxy for the node picker functionality from WalkerFront instances
 * of all available InspectorFronts. It is a single point of entry for the client to:
 * - invoke actions to start and stop picking nodes on all walkers
 * - listen to node picker events from all walkers and relay them to subscribers
 *
 *
 * @param {Commands} commands
 *        The commands object with all interfaces defined from devtools/shared/commands/
 */
class NodePicker extends EventEmitter {
  constructor(commands) {
    super();
    this.commands = commands;
    this.targetCommand = commands.targetCommand;

    // Whether or not the node picker is active.
    this.isPicking = false;
    // Whether to focus the top-level frame before picking nodes.
    this.doFocus = false;
  }

  // The set of inspector fronts corresponding to the targets where picking happens.
  #currentInspectorFronts = new Set();

  /**
   * Start/stop the element picker on the debuggee target.
   *
   * @param {Boolean} doFocus
   *        Optionally focus the content area once the picker is activated.
   * @return Promise that resolves when done
   */
  togglePicker = doFocus => {
    if (this.isPicking) {
      return this.stop({ canceled: true });
    }
    return this.start(doFocus);
  };

  /**
   * Tell the walker front corresponding to the given inspector front to enter node
   * picking mode (listen for mouse movements over its nodes) and set event listeners
   * associated with node picking: hover node, pick node, preview, cancel. See WalkerSpec.
   *
   * @param {InspectorFront} inspectorFront
   * @return {Promise}
   */
  #onInspectorFrontAvailable = async inspectorFront => {
    this.#currentInspectorFronts.add(inspectorFront);
    // watchFront may notify us about inspector fronts that aren't initialized yet,
    // so ensure waiting for initialization in order to have a defined `walker` attribute.
    await inspectorFront.initialize();
    const { walker } = inspectorFront;
    walker.on("picker-node-hovered", this.#onHovered);
    walker.on("picker-node-picked", this.#onPicked);
    walker.on("picker-node-previewed", this.#onPreviewed);
    walker.on("picker-node-canceled", this.#onCanceled);
    await walker.pick(this.doFocus);

    this.emitForTests("inspector-front-ready-for-picker", walker);
  };

  /**
   * Tell the walker front corresponding to the given inspector front to exit the node
   * picking mode and remove all event listeners associated with node picking.
   *
   * @param {InspectorFront} inspectorFront
   * @param {Boolean} isDestroyCodePath
   *        Optional. If true, we assume that's when the toolbox closes
   *        and we should avoid doing any RDP request.
   * @return {Promise}
   */
  #onInspectorFrontDestroyed = async (
    inspectorFront,
    { isDestroyCodepath } = {}
  ) => {
    this.#currentInspectorFronts.delete(inspectorFront);

    const { walker } = inspectorFront;
    if (!walker) {
      return;
    }

    walker.off("picker-node-hovered", this.#onHovered);
    walker.off("picker-node-picked", this.#onPicked);
    walker.off("picker-node-previewed", this.#onPreviewed);
    walker.off("picker-node-canceled", this.#onCanceled);
    // Only do a RDP request if we stop the node picker from a user action.
    // Avoid doing one when we close the toolbox, in this scenario
    // the walker actor on the server side will automatically cancel the node picking.
    if (!isDestroyCodepath) {
      await walker.cancelPick();
    }
  };

  /**
   * While node picking, we want each target's walker fronts to listen for mouse
   * movements over their nodes and emit events. Walker fronts are obtained from
   * inspector fronts so we watch for the creation and destruction of inspector fronts
   * in order to add or remove the necessary event listeners.
   *
   * @param {TargetFront} targetFront
   * @return {Promise}
   */
  #onTargetAvailable = async ({ targetFront }) => {
    targetFront.watchFronts(
      "inspector",
      this.#onInspectorFrontAvailable,
      this.#onInspectorFrontDestroyed
    );
  };

  /**
   * Start the element picker.
   * This will instruct walker fronts of all available targets (and those of targets
   * created while node picking is active) to listen for mouse movements over their nodes
   * and trigger events when a node is hovered or picked.
   *
   * @param {Boolean} doFocus
   *        Optionally focus the content area once the picker is activated.
   */
  start = async doFocus => {
    if (this.isPicking) {
      return;
    }
    this.isPicking = true;
    this.doFocus = doFocus;

    this.emit("picker-starting");

    this.targetCommand.watchTargets({
      types: this.targetCommand.ALL_TYPES,
      onAvailable: this.#onTargetAvailable,
    });

    this.emit("picker-started");
  };

  /**
   * Stop the element picker. Note that the picker is automatically stopped when
   * an element is picked.
   *
   * @param {Boolean} isDestroyCodePath
   *        Optional. If true, we assume that's when the toolbox closes
   *        and we should avoid doing any RDP request.
   * @param {Boolean} canceled
   *        Optional. If true, emit an additional event to notify that the
   *        picker was canceled, ie stopped without selecting a node.
   */
  stop = async ({ isDestroyCodepath, canceled } = {}) => {
    if (!this.isPicking) {
      return;
    }
    this.isPicking = false;
    this.doFocus = false;

    this.targetCommand.unwatchTargets({
      types: this.targetCommand.ALL_TYPES,
      onAvailable: this.#onTargetAvailable,
    });

    const promises = [];
    for (const inspectorFront of this.#currentInspectorFronts) {
      promises.push(
        this.#onInspectorFrontDestroyed(inspectorFront, {
          isDestroyCodepath,
        })
      );
    }
    await Promise.all(promises);

    this.#currentInspectorFronts.clear();

    this.emit("picker-stopped");

    if (canceled) {
      this.emit("picker-node-canceled");
    }
  };

  destroy() {
    // Do not await for stop as the isDestroy argument will make this method synchronous
    // and we want to avoid having an async destroy
    this.stop({ isDestroyCodepath: true });
    this.targetCommand = null;
    this.commands = null;
  }

  /**
   * When a node is hovered by the mouse when the highlighter is in picker mode
   *
   * @param {Object} data
   *        Information about the node being hovered
   */
  #onHovered = async data => {
    // When debugging WebExtensions, Background page and popups are independent documents.
    // None is the parent of each others.
    // This means that if the toolbox is having the background page selected and you mouse over a popup,
    // the popup DOM Element won't be in the markup view as that's not in a children document of the background page.
    // Because of that, we have to select the hovered node's document and target in order to have it visible in the markup view.
    //
    // These top documents (background pages and popups) can actually have nested iframes,
    // for these, we will also select these nested iframes, even if they could theoritically be shown from the top document.
    if (
      this.targetCommand.descriptorFront.isWebExtensionDescriptor &&
      data.node.targetFront != this.targetCommand.selectedTargetFront
    ) {
      await this.targetCommand.selectTarget(data.node.targetFront);
    }

    this.emit("picker-node-hovered", data.node);

    // We're going to cleanup references for all the other walkers, so that if we hover
    // back the same node, we will receive a new `picker-node-hovered` event.
    for (const inspectorFront of this.#currentInspectorFronts) {
      if (inspectorFront.walker !== data.node.walkerFront) {
        inspectorFront.walker.clearPicker();
      }
    }
  };

  /**
   * When a node has been picked while the highlighter is in picker mode
   *
   * @param {Object} data
   *        Information about the picked node
   */
  #onPicked = data => {
    this.emit("picker-node-picked", data.node);
    return this.stop();
  };

  /**
   * When a node has been shift-clicked (previewed) while the highlighter is in
   * picker mode
   *
   * @param {Object} data
   *        Information about the picked node
   */
  #onPreviewed = data => {
    this.emit("picker-node-previewed", data.node);
  };

  /**
   * When the picker is canceled, stop the picker, and make sure the toolbox
   * gets the focus.
   */
  #onCanceled = () => {
    return this.stop({ canceled: true });
  };
}

module.exports = NodePicker;
