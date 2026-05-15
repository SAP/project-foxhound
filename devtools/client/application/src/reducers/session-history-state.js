/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  UPDATE_SESSION_HISTORY,
  UPDATE_SESSION_HISTORY_ENTRY,
} = require("resource://devtools/client/application/src/constants.js");

function SessionHistory() {
  return {
    count: 0,
    current: 0,
    rows: [],
    entriesByKey: {},
  };
}

function sessionHistoryReducer(state = SessionHistory(), action) {
  switch (action.type) {
    case UPDATE_SESSION_HISTORY: {
      const { sessionHistory } = action;
      const entriesByKey = {};
      return Object.assign({}, state, {
        count: sessionHistory.count,
        current: sessionHistory.index,
        rows: createRows(sessionHistory, entriesByKey),
        entriesByKey,
      });
    }
    case UPDATE_SESSION_HISTORY_ENTRY: {
      const { sessionHistoryEntry } = action;
      const entryKey = key(sessionHistoryEntry.ID);
      const entry = state.entriesByKey[entryKey];
      if (!entry) {
        return state;
      }
      return {
        ...state,
        entriesByKey: {
          ...state.entriesByKey,
          [entryKey]: {
            ...entry,
            // only title can be updated at the moment
            title: sessionHistoryEntry.title,
          },
        },
      };
    }
    default:
      return state;
  }
}

/**
 * Given a tree-like data structure, performs a pre-order (also known as tree
 * order) traversal of that tree. Since the elements can be anything, the
 * caller needs to supply a way to find how many children a specific node has
 * as well as a way to iterate children.
 *
 * @param {*} root Starting node of the traversal
 * @param {function(*): int} getChildCount Helper to find child count
 * @param {function(*, int): *} getChildAtIndex Helper to find child at index
 */
function* preOrderTraversal(root, getChildCount, getChildAtIndex) {
  const queue = [root];
  while (queue.length) {
    const entry = queue.shift();
    if (!entry) {
      continue;
    }

    for (let index = getChildCount(entry) - 1; index >= 0; --index) {
      queue.unshift(getChildAtIndex(entry, index));
    }

    yield entry;
  }
}

function key(k) {
  return k.toString();
}

class Diagram {
  #parent;
  #entry;
  #key;
  #rows = [];
  #lookup = new Map();

  static EMPTY = Symbol("Diagram.EMPTY");

  /**
   * Create a session history diagram from a particular entry.
   *
   * @param {object|null} parent Parent node
   * @param {object} entry Entry to create the diagram from
   */
  constructor(parent, entry) {
    this.#parent = parent;
    this.#entry = entry;
    this.#key = key(entry.docshellID);
  }

  get entry() {
    return this.#entry;
  }

  get key() {
    return this.#key;
  }

  get parent() {
    return this.#parent;
  }

  get rows() {
    return this.#rows;
  }

  lookup(id) {
    return this.#lookup.get(id);
  }

  /**
   * Append an entry to a row of the diagram.
   *
   * @param {object} entry New entry.
   * @param {int} index Index to append at.
   */
  addChild(entry, index) {
    const id = key(entry.docshellID);
    const row = this.#lookup.getOrInsertComputed(id, () => {
      const newRow = new Array(index).fill(Diagram.EMPTY);
      this.#rows.push({ id, newRow });
      return newRow;
    });

    row.push(entry);
  }
}

function createRows(sessionHistory, entriesByKey) {
  const lookup = new Map();

  const size = sessionHistory.count;
  // We add a rootDiagram for convenience to be able to add top-level entries
  // to it. This diagram will never be rendered to the full diagram, and the
  // id will never be used in lookup.
  const rootDiagram = new Diagram(null, { docshellID: "fakeDocShellID" });
  const getChildCount = entry => entry.childCount;
  const getChildAt = (entry, index) => entry.GetChildAt(index);
  for (let index = 0; index < size; index++) {
    const root = sessionHistory.getEntryAtIndex(index);
    rootDiagram.addChild(root, index);
    lookup.getOrInsertComputed(key(root.docshellID), () => {
      return new Diagram(rootDiagram, root);
    });

    for (const entry of preOrderTraversal(root, getChildCount, getChildAt)) {
      const parent = entry.parent;
      if (parent) {
        const diagram = lookup.get(key(parent.docshellID));
        diagram.addChild(entry, index);
        lookup.getOrInsertComputed(key(entry.docshellID), () => {
          return new Diagram(diagram, entry);
        });
      }
    }
  }

  return Array.from(
    preOrderTraversal(
      rootDiagram,
      entry => entry.rows.length,
      ({ rows }, index) => lookup.get(rows[index].id)
    ),
    diagram => {
      if (!diagram.parent) {
        return [];
      }

      const row = [];
      const entries = diagram.parent.lookup(diagram.key);
      for (let count = entries.length; count > size; count--) {
        entries.push(Diagram.EMPTY);
      }
      let previous = Diagram.EMPTY;
      let newEntry = null;
      while (entries.length) {
        const entry = entries.shift();

        if (entry !== Diagram.EMPTY && previous.ID != entry.ID) {
          const url = new URL(`${entry.URI.spec}`);
          newEntry = {
            age: 1,
            key: key(entry.ID),
            sameDocNav:
              previous !== Diagram.EMPTY && entry.sharesDocumentWith(previous),
          };
          const parent = entry.parent?.navigationId;
          const extra = {};
          if (parent) {
            extra.parent = parent;
          }
          const numChildren = getChildCount(entry);
          if (numChildren) {
            const children = new Array(numChildren);
            for (let index = 0; index < numChildren; ++index) {
              children[index] = getChildAt(entry, index)?.navigationId;
            }
            extra.children = children;
          }

          entriesByKey[key(entry.ID)] = {
            url,
            title: entry.title,
            name: entry.name,
            id: entry.navigationId,
            key: entry.navigationKey,
            bfcache: entry.isInBFCache,
            ...extra,
          };
          row.push(newEntry);
        } else if (entry !== Diagram.EMPTY || previous.empty == Diagram.EMPTY) {
          newEntry.age++;
        } else {
          newEntry = { age: 1 };
          row.push(newEntry);
        }
        previous = entry;
      }

      return row;
    }
  ).filter(row => row.length);
}

module.exports = {
  SessionHistory,
  sessionHistoryReducer,
};
