/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  generateUUID: "chrome://remote/content/shared/UUID.sys.mjs",
});

/**
 * A bidirectional map that maintains two-way mappings between UUIDs and objects.
 *
 * This class ensures that each object maps to exactly one UUID
 * and vice versa. Also it allows efficient lookup in both directions:
 *
 *   - from a UUID to an object
 *   - from an object to a UUID
 */
export class BiMap {
  #idToObject;
  #objectToId;

  constructor() {
    this.#idToObject = new Map();
    this.#objectToId = new Map();
  }

  /**
   * Clears all the mappings.
   */
  clear() {
    this.#idToObject = new Map();
    this.#objectToId = new Map();
  }

  /**
   * Deletes a mapping by the given object.
   *
   * @param {object} object
   *     The object to remove from the BiMap.
   */
  deleteByObject(object) {
    const id = this.#objectToId.get(object);

    if (id !== undefined) {
      this.#objectToId.delete(object);
      this.#idToObject.delete(id);
    }
  }

  /**
   * Deletes a mapping by the given id.
   *
   * @param {string} id
   *     The id to remove from the BiMap.
   */
  deleteById(id) {
    const object = this.#idToObject.get(id);

    if (object !== undefined) {
      this.#idToObject.delete(id);
      this.#objectToId.delete(object);
    }
  }

  /**
   * Retrieves the id for the given object, or inserts a new mapping if not found.
   *
   * @param {object} object
   *     The object to look up or insert.
   *
   * @returns {string}
   *     The id associated with the object.
   */
  getOrInsert(object) {
    if (this.hasObject(object)) {
      return this.getId(object);
    }

    const id = lazy.generateUUID();
    this.#objectToId.set(object, id);
    this.#idToObject.set(id, object);

    return id;
  }

  /**
   * Retrieves the id associated with the given object.
   *
   * @param {object} object
   *     The object to look up.
   *
   * @returns {string}
   *     The id associated with the object, or undefined if not found.
   */
  getId(object) {
    return this.#objectToId.get(object);
  }

  /**
   * Retrieves the object associated with the given id.
   *
   * @param {string} id
   *     The id to look up.
   *
   * @returns {object}
   *     The object associated with the id, or undefined if not found.
   */
  getObject(id) {
    return this.#idToObject.get(id);
  }

  /**
   * Checks whether the BiMap contains the given id.
   *
   * @param {string} id
   *     The id to check for.
   *
   * @returns {boolean}
   *     True if the id exists in the BiMap, false otherwise.
   */
  hasId(id) {
    return this.#idToObject.has(id);
  }

  /**
   * Checks whether the BiMap contains the given object.
   *
   * @param {object} object
   *     The object to check for.
   *
   * @returns {boolean}
   *     True if the object exists in the BiMap, false otherwise.
   */
  hasObject(object) {
    return this.#objectToId.has(object);
  }
}
