/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  createFactory,
  createElement,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const {
  Provider,
} = require("resource://devtools/client/shared/vendor/react-redux.js");

const FluentReact = require("resource://devtools/client/shared/vendor/fluent-react.js");
const LocalizationProvider = createFactory(FluentReact.LocalizationProvider);

const compatibilityReducer = require("resource://devtools/client/inspector/compatibility/reducers/compatibility.js");
const {
  appendNode,
  clearDestroyedNodes,
  initUserSettings,
  removeNode,
  updateNodes,
  updateSelectedNode,
  updateTopLevelTarget,
  updateNode,
} = require("resource://devtools/client/inspector/compatibility/actions/compatibility.js");

const CompatibilityApp = createFactory(
  require("resource://devtools/client/inspector/compatibility/components/CompatibilityApp.js")
);

class CompatibilityView {
  constructor(inspector) {
    this.inspector = inspector;

    this.inspector.store.injectReducer("compatibility", compatibilityReducer);

    this.#init();
  }

  #isChangeAddedWhileHidden;
  #previousChangedSelector;
  #updateNodesTimeoutId;

  destroy() {
    try {
      this.resourceCommand.unwatchResources(
        [this.resourceCommand.TYPES.CSS_CHANGE],
        {
          onAvailable: this.#onResourceAvailable,
        }
      );
    } catch (e) {
      // If unwatchResources is called before finishing process of watchResources,
      // unwatchResources throws an error during stopping listener.
    }

    this.inspector.off("new-root", this.#onTopLevelTargetChanged);
    this.inspector.off("markupmutation", this.#onMarkupMutation);
    this.inspector.selection.off("new-node-front", this.#onSelectedNodeChanged);
    this.inspector.sidebar.off(
      "compatibilityview-selected",
      this.#onPanelSelected
    );
    this.inspector = null;
  }

  get resourceCommand() {
    return this.inspector.commands.resourceCommand;
  }

  async #init() {
    const { setSelectedNode } = this.inspector.getCommonComponentProps();
    const compatibilityApp = new CompatibilityApp({
      setSelectedNode,
    });

    this.provider = createElement(
      Provider,
      {
        id: "compatibilityview",
        store: this.inspector.store,
      },
      LocalizationProvider(
        {
          bundles: this.inspector.fluentL10n.getBundles(),
          parseMarkup: this.#parseMarkup,
        },
        compatibilityApp
      )
    );

    await this.inspector.store.dispatch(initUserSettings());
    // awaiting for `initUserSettings` makes us miss the initial "compatibilityview-selected"
    // event, so we need to manually call #onPanelSelected to fetch compatibility issues
    // for the selected node (and the whole page).
    this.#onPanelSelected();

    this.inspector.on("new-root", this.#onTopLevelTargetChanged);
    this.inspector.on("markupmutation", this.#onMarkupMutation);
    this.inspector.selection.on("new-node-front", this.#onSelectedNodeChanged);
    this.inspector.sidebar.on(
      "compatibilityview-selected",
      this.#onPanelSelected
    );

    await this.resourceCommand.watchResources(
      [this.resourceCommand.TYPES.CSS_CHANGE],
      {
        onAvailable: this.#onResourceAvailable,
        // CSS changes made before opening Compatibility View are already applied to
        // corresponding DOM at this point, so existing resources can be ignored here.
        ignoreExistingResources: true,
      }
    );

    this.inspector.emitForTests("compatibilityview-initialized");
  }

  #isAvailable() {
    return (
      this.inspector &&
      this.inspector.sidebar &&
      this.inspector.sidebar.getCurrentTabID() === "compatibilityview" &&
      this.inspector.selection &&
      this.inspector.selection.isConnected()
    );
  }

  #parseMarkup = () => {
    // Using a BrowserLoader for the inspector is currently blocked on performance regressions,
    // see Bug 1471853.
    throw new Error(
      "The inspector cannot use tags in ftl strings because it does not run in a BrowserLoader"
    );
  };

  #onChangeAdded = ({ selector }) => {
    if (!this.#isAvailable()) {
      // In order to update this panel if a change is added while hiding this panel.
      this.#isChangeAddedWhileHidden = true;
      return;
    }

    this.#isChangeAddedWhileHidden = false;

    // We need to debounce updating nodes since we might get CSS_CHANGE resources for
    // every typed character until fixing bug 1503036.
    if (this.#previousChangedSelector === selector) {
      clearTimeout(this.#updateNodesTimeoutId);
    }
    this.#previousChangedSelector = selector;

    this.#updateNodesTimeoutId = setTimeout(() => {
      // TODO: In case of keyframes changes, the selector given from changes actor is
      // keyframe-selector such as "from" and "100%", not selector for node. Thus,
      // we need to address this case.
      this.inspector.store.dispatch(updateNodes(selector));
    }, 500);
  };

  #onMarkupMutation = mutations => {
    // Since the mutations are throttled (in WalkerActor#getMutations), we might get the
    // same nodeFront multiple times.
    // Put them in a Set so we don't call updateNode more than once for a given front.
    const targetsWithAttributeMutation = new Set();
    const childListMutation = [];

    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "style" ||
          mutation.attributeName === "class")
      ) {
        targetsWithAttributeMutation.add(mutation.target);
      }
      if (mutation.type === "childList") {
        childListMutation.push(mutation);
      }
    }

    if (
      targetsWithAttributeMutation.size === 0 &&
      childListMutation.length === 0
    ) {
      return;
    }

    if (!this.#isAvailable()) {
      // In order to update this panel if a change is added while hiding this panel.
      this.#isChangeAddedWhileHidden = true;
      return;
    }

    this.#isChangeAddedWhileHidden = false;

    // Resource Watcher doesn't respond to programmatic inline CSS
    // change. This check can be removed once the following bug is resolved
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1506160
    for (const target of targetsWithAttributeMutation) {
      this.inspector.store.dispatch(updateNode(target));
    }

    // Destroyed nodes can be cleaned up
    // once at the end if necessary
    let cleanupDestroyedNodes = false;
    for (const { removed, target } of childListMutation) {
      if (!removed.length) {
        this.inspector.store.dispatch(appendNode(target));
        continue;
      }

      const retainedNodes = removed.filter(node => node && !node.isDestroyed());
      cleanupDestroyedNodes =
        cleanupDestroyedNodes || retainedNodes.length !== removed.length;

      for (const retainedNode of retainedNodes) {
        this.inspector.store.dispatch(removeNode(retainedNode));
      }
    }

    if (cleanupDestroyedNodes) {
      this.inspector.store.dispatch(clearDestroyedNodes());
    }
  };

  #onPanelSelected = () => {
    const { selectedNode, topLevelTarget } =
      this.inspector.store.getState().compatibility;

    // Update if the selected node is changed or new change is added while the panel was hidden.
    if (
      this.inspector.selection.nodeFront !== selectedNode ||
      this.#isChangeAddedWhileHidden
    ) {
      this.#onSelectedNodeChanged();
    }

    // Update if the top target has changed or new change is added while the panel was hidden.
    if (
      this.inspector.toolbox.target !== topLevelTarget ||
      this.#isChangeAddedWhileHidden
    ) {
      this.#onTopLevelTargetChanged();
    }

    this.#isChangeAddedWhileHidden = false;
  };

  #onSelectedNodeChanged = () => {
    if (!this.#isAvailable()) {
      return;
    }

    this.inspector.store.dispatch(
      updateSelectedNode(this.inspector.selection.nodeFront)
    );
  };

  #onResourceAvailable = resources => {
    for (const resource of resources) {
      // Style changes applied inline directly to
      // the element and its changes are monitored by
      // #onMarkupMutation via markupmutation events.
      // Hence those changes can be ignored here
      if (resource.source?.type !== "element") {
        this.#onChangeAdded(resource);
      }
    }
  };

  #onTopLevelTargetChanged = () => {
    if (!this.#isAvailable()) {
      return;
    }

    this.inspector.store.dispatch(
      updateTopLevelTarget(this.inspector.toolbox.target)
    );
  };
}

module.exports = CompatibilityView;
