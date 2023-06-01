/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const DOCUMENT_FRAGMENT_NODE = 11;
const ELEMENT_NODE = 1;

/**
 * @typedef {Object} NodeReferenceDetails
 * @property {number} browserId
 * @property {number} browsingContextGroupId
 * @property {number} browsingContextId
 * @property {boolean} isTopBrowsingContext
 * @property {WeakRef} nodeWeakRef
 */

/**
 * The class provides a mapping between DOM nodes and a unique node references.
 * Supported types of nodes are Element and ShadowRoot.
 */
export class NodeCache {
  #nodeIdMap;
  #seenNodesMap;

  constructor() {
    // node => node id
    this.#nodeIdMap = new WeakMap();

    // Reverse map for faster lookup requests of node references. Values do
    // not only contain the resolved DOM node but also further details like
    // browsing context information.
    //
    // node id => node details
    this.#seenNodesMap = new Map();
  }

  /**
   * Get the number of nodes in the cache.
   */
  get size() {
    return this.#seenNodesMap.size;
  }

  /**
   * Get or if not yet existent create a unique reference for an Element or
   * ShadowRoot node.
   *
   * @param {Node} node
   *    The node to be added.
   *
   * @return {string}
   *     The unique node reference for the DOM node.
   */
  getOrCreateNodeReference(node) {
    if (
      !node ||
      ![DOCUMENT_FRAGMENT_NODE, ELEMENT_NODE].includes(node.nodeType) ||
      (node.nodeType === DOCUMENT_FRAGMENT_NODE &&
        node.containingShadowRoot !== node)
    ) {
      throw new TypeError(`Failed to create node reference for ${node}`);
    }

    let nodeId;
    if (this.#nodeIdMap.has(node)) {
      // For already known nodes return the cached node id.
      nodeId = this.#nodeIdMap.get(node);
    } else {
      const browsingContext = node.ownerGlobal.browsingContext;

      // For not yet cached nodes generate a unique id without curly braces.
      nodeId = Services.uuid
        .generateUUID()
        .toString()
        .slice(1, -1);

      const details = {
        browserId: browsingContext.browserId,
        browsingContextGroupId: browsingContext.group.id,
        browsingContextId: browsingContext.id,
        isTopBrowsingContext: browsingContext.parent === null,
        nodeWeakRef: Cu.getWeakReference(node),
      };

      this.#nodeIdMap.set(node, nodeId);
      this.#seenNodesMap.set(nodeId, details);
    }

    return nodeId;
  }

  /**
   * Clear known DOM nodes.
   *
   * @param {Object=} options
   * @param {boolean=} options.all
   *     Clear all references from any browsing context. Defaults to false.
   * @param {BrowsingContext=} browsingContext
   *     Clear all references living in that browsing context.
   */
  clear(options = {}) {
    const { all = false, browsingContext } = options;

    if (all) {
      this.#nodeIdMap = new WeakMap();
      this.#seenNodesMap.clear();
      return;
    }

    if (browsingContext) {
      for (const [nodeId, identifier] of this.#seenNodesMap.entries()) {
        const { browsingContextId, nodeWeakRef } = identifier;
        const node = nodeWeakRef.get();

        if (browsingContextId === browsingContext.id) {
          this.#nodeIdMap.delete(node);
          this.#seenNodesMap.delete(nodeId);
        }
      }

      return;
    }

    throw new Error(`Requires "browsingContext" or "all" to be set.`);
  }

  /**
   * Get a DOM node by its unique reference.
   *
   * @param {BrowsingContext} browsingContext
   *     The browsing context the node should be part of.
   * @param {string} nodeId
   *     The unique node reference of the DOM node.
   *
   * @return {Node|null}
   *     The DOM node that the unique identifier was generated for or
   *     `null` if the node does not exist anymore.
   */
  getNode(browsingContext, nodeId) {
    const nodeDetails = this.getReferenceDetails(nodeId);

    // Check that the node reference is known, and is accociated with a
    // browsing context that shares the same browsing context group.
    if (
      nodeDetails === null ||
      nodeDetails.browsingContextGroupId !== browsingContext.group.id
    ) {
      return null;
    }

    if (nodeDetails.nodeWeakRef) {
      return nodeDetails.nodeWeakRef.get();
    }

    return null;
  }

  /**
   * Get detailed information for the node reference.
   *
   * @param {string} nodeId
   *
   * @returns {NodeReferenceDetails}
   *     Node details like: browsingContextId
   */
  getReferenceDetails(nodeId) {
    const details = this.#seenNodesMap.get(nodeId);

    return details !== undefined ? details : null;
  }
}
