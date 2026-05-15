/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implementation of all the disk I/O required by the Memory store
 */

import { JSONFile } from "resource://gre/modules/JSONFile.sys.mjs";
import { CATEGORY_TO_ID_PREFIX } from "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs";

/**
 * MemoryStore
 *
 * In-memory JSON state + persisted JSON file, modeled after SessionStore.
 *
 * File format (on disk):
 * {
 *   "memories": [ { ... } ],
 *   "meta": {
 *     "last_history_memory_ts": 0,
 *     "last_chat_memory_ts": 0,
 *   },
 *   "version": 1
 * }
 */

const MEMORY_STORE_FILE = "memories.json.lz4";
const MEMORY_STORE_VERSION = 1;

// Observer notification topic
const MEMORY_STORE_CHANGED = "memory-store-changed";

// In-memory state
let gState = {
  memories: [],
  meta: {
    last_history_memory_ts: 0,
    last_chat_memory_ts: 0,
  },
  version: MEMORY_STORE_VERSION,
};

// Whether we've finished initial load
let gInitialized = false;
let lazy = {};
let gInitPromise = null;
let gJSONFile = null;

// Where we store the file (choose something similar to sessionstore)
ChromeUtils.defineLazyGetter(lazy, "gStorePath", () => {
  const profD = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
  return PathUtils.join(profD, MEMORY_STORE_FILE);
});

/**
 * Internal helper to load (and possibly migrate) memory data from disk.
 *
 * @returns {Promise<void>}
 */
async function loadMemories() {
  gJSONFile = new JSONFile({
    path: lazy.gStorePath,
    saveDelayMs: 1000,
    compression: "lz4",
    sanitizedBasename: "memories",
  });

  try {
    await gJSONFile.load();
  } catch (ex) {
    console.error("MemoryStore: failed to load state", ex);
    // If load fails, fall back to default gState.
    gJSONFile.data = gState;
    gInitialized = true;
    return;
  }

  // Normalize the loaded data into our expected shape.
  const data = gJSONFile.data;
  if (!data || typeof data !== "object") {
    gJSONFile.data = gState;
  } else {
    gState = {
      memories: Array.isArray(data.memories) ? data.memories : [],
      meta: {
        last_history_memory_ts: data.meta?.last_history_memory_ts || 0,
        last_chat_memory_ts: data.meta?.last_chat_memory_ts || 0,
      },
      version:
        typeof data.version === "number" ? data.version : MEMORY_STORE_VERSION,
    };
    // Ensure JSONFile.data points at our normalized state object.
    gJSONFile.data = gState;
  }

  gInitialized = true;
}

// Public API object
export const MemoryStore = {
  // Observer notification topic
  MEMORY_STORE_CHANGED,

  /**
   * Initialize the store: set up JSONFile and load from disk.
   *
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    if (gInitialized) {
      return;
    }

    if (!gInitPromise) {
      gInitPromise = loadMemories();
    }

    await gInitPromise;
  },

  /**
   * Force writing current in-memory state to disk immediately.
   *
   * This is intended for test only.
   */
  async testOnlyFlush() {
    await this.ensureInitialized();
    if (!gJSONFile) {
      return;
    }
    await gJSONFile._save();
  },

  /**
   * @typedef {object} Memory
   * @property {string} id - Unique identifier for the memory.
   * @property {string} memory_summary - Short human-readable summary of the memory.
   * @property {string} category - Category label for the memory.
   * @property {string} intent - Intent label associated with the memory.
   * @property {string} reasoning - Explanation of why this memory was created.
   * @property {number} score - Numeric score representing the memory's relevance.
   * @property {number} updated_at - Last-updated time in milliseconds since Unix epoch.
   * @property {boolean} is_deleted - Whether the memory is marked as deleted.
   */
  /**
   * @typedef {object} MemoryPartial
   * @property {string} [id] Optional identifier; if omitted, one is derived by makeMemoryId.
   * @property {string} [memory_summary] Optional summary; defaults to an empty string.
   * @property {string} [category] Optional category label; defaults to an empty string.
   * @property {string} [intent] Optional intent label; defaults to an empty string.
   * @property {string} [reasoning] Optional reasoning explanation; defaults to an empty string.
   * @property {number} [score] Optional numeric score; non-finite values are ignored.
   * @property {number} [updated_at] Optional last-updated time in milliseconds since Unix epoch.
   * @property {boolean} [is_deleted] Optional deleted flag; defaults to false.
   */
  /**
   * Add a new memory, or update an existing one with the same id.
   *
   * Any missing fields on {@link MemoryPartial} are defaulted.
   *
   * @param {MemoryPartial} memoryPartial
   * @returns {Promise<Memory>}
   */
  async addMemory(memoryPartial) {
    await this.ensureInitialized();

    const now = Date.now();
    const id = makeMemoryId(memoryPartial);

    let memory = gState.memories.find(i => i.id === id);

    if (memory) {
      const simpleProperties = [
        "memory_summary",
        "category",
        "intent",
        "reasoning",
      ];
      for (const prop of simpleProperties) {
        if (prop in memoryPartial) {
          memory[prop] = memoryPartial[prop];
        }
      }

      const validatedProperties = [
        ["score", v => Number.isFinite(v)],
        ["is_deleted", v => typeof v === "boolean"],
      ];

      for (const [prop, validator] of validatedProperties) {
        if (prop in memoryPartial && validator(memoryPartial[prop])) {
          memory[prop] = memoryPartial[prop];
        }
      }

      memory.updated_at = memoryPartial.updated_at || now;

      gJSONFile?.saveSoon();
      Services.obs.notifyObservers(null, MEMORY_STORE_CHANGED);
      return memory;
    }

    // Otherwise create a new one
    memory = {
      id,
      memory_summary: memoryPartial.memory_summary || "",
      category: memoryPartial.category || "",
      intent: memoryPartial.intent || "",
      reasoning: memoryPartial.reasoning || "",
      score: Number.isFinite(memoryPartial.score) ? memoryPartial.score : 0,
      updated_at: memoryPartial.updated_at || now,
      is_deleted: memoryPartial.is_deleted ?? false,
    };

    gState.memories.push(memory);
    gJSONFile?.saveSoon();
    Services.obs.notifyObservers(null, MEMORY_STORE_CHANGED);
    return memory;
  },

  /**
   * Update an existing memory by id.
   *
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<Memory|null>}
   */
  async updateMemory(id, updates) {
    await this.ensureInitialized();

    const memory = gState.memories.find(i => i.id === id);
    if (!memory) {
      return null;
    }

    const simpleProperties = [
      "memory_summary",
      "category",
      "intent",
      "reasoning",
    ];
    for (const prop of simpleProperties) {
      if (prop in updates) {
        memory[prop] = updates[prop];
      }
    }

    const validatedProperties = [
      ["score", v => Number.isFinite(v)],
      ["is_deleted", v => typeof v === "boolean"],
    ];

    for (const [prop, validator] of validatedProperties) {
      if (prop in updates && validator(updates[prop])) {
        memory[prop] = updates[prop];
      }
    }

    memory.updated_at = updates.updated_at || Date.now();

    gJSONFile?.saveSoon();
    Services.obs.notifyObservers(null, MEMORY_STORE_CHANGED);
    return memory;
  },

  /**
   * Soft delete an memory (set is_deleted = true).
   *
   *  soft deleted memories will be filtered from getMemories
   *
   * @param {string} id
   * @returns {Promise<Memory|null>}
   */
  async softDeleteMemory(id) {
    let memory = await this.updateMemory(id, { is_deleted: true });
    Services.obs.notifyObservers(null, MEMORY_STORE_CHANGED);
    return memory;
  },

  /**
   * hard delete (remove from array).
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async hardDeleteMemory(id) {
    await this.ensureInitialized();
    const idx = gState.memories.findIndex(i => i.id === id);
    if (idx === -1) {
      return false;
    }
    gState.memories.splice(idx, 1);
    gJSONFile?.saveSoon();
    Services.obs.notifyObservers(null, MEMORY_STORE_CHANGED);
    return true;
  },

  /**
   * Get all memories (optionally filtered and sorted).
   *
   * @param {object} [options]
   *   Optional sorting options.
   * @param {"score"|"updated_at"} [options.sortBy="updated_at"]
   *   Field to sort by.
   * @param {"asc"|"desc"} [options.sortDir="desc"]
   *   Sort direction.
   * @param {boolean} [options.includeSoftDeleted=false]
   *   Whether to include soft-deleted memories.
   * @param {Array<string>} [options.memoryIds=[]]
   *   Optional list of memory IDs; will return all if list is empty
   * @returns {Promise<Memory[]>}
   */
  async getMemories({
    sortBy = "updated_at",
    sortDir = "desc",
    includeSoftDeleted = false,
    memoryIds = [],
  } = {}) {
    await this.ensureInitialized();

    let res = gState.memories;

    if (!includeSoftDeleted) {
      res = res.filter(i => !i.is_deleted);
    }

    if (memoryIds.length) {
      res = res.filter(i => memoryIds.includes(i.id));
    }

    if (sortBy) {
      res = [...res].sort((a, b) => {
        const av = a[sortBy] ?? 0;
        const bv = b[sortBy] ?? 0;
        if (av === bv) {
          return 0;
        }
        const cmp = av < bv ? -1 : 1;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return res;
  },

  /**
   * Get current meta block.
   *
   * @returns {Promise<object>}
   */
  async getMeta() {
    await this.ensureInitialized();
    return structuredClone(gState.meta);
  },

  /**
   * Update meta information (last timestamps, top_* info, etc).
   *
   * Example payload:
   * {
   * last_history_memory_ts: 12345,
   * }
   *
   * @param {object} partialMeta
   * @returns {Promise<void>}
   */
  async updateMeta(partialMeta) {
    await this.ensureInitialized();
    const meta = gState.meta;
    const validatedProps = [
      ["last_history_memory_ts", v => Number.isFinite(v)],
      ["last_chat_memory_ts", v => Number.isFinite(v)],
    ];

    for (const [prop, validator] of validatedProps) {
      if (prop in partialMeta && validator(partialMeta[prop])) {
        meta[prop] = partialMeta[prop];
      }
    }

    gJSONFile?.saveSoon();
  },
};

/**
 * Simple deterministic hash of a string → 8-char hex.
 * Based on a 32-bit FNV-1a-like hash.
 *
 * @param {string} str
 * @returns {string}
 */
function hashStringToHex(str) {
  // FNV offset basis
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // FNV prime, keep 32-bit
    hash = (hash * 0x01000193) >>> 0;
  }
  // Convert to 8-digit hex
  return hash.toString(16).padStart(8, "0");
}

/**
 * Build a deterministic memory id from its core fields.
 * If the caller passes an explicit id, we honor that instead.
 *
 * @param {object} memoryPartial
 */
export function makeMemoryId(memoryPartial) {
  if (memoryPartial.id) {
    return memoryPartial.id;
  }

  let id_prefix;
  if (CATEGORY_TO_ID_PREFIX.hasOwnProperty(memoryPartial.category)) {
    id_prefix = CATEGORY_TO_ID_PREFIX[memoryPartial.category];
  } else {
    // Fallback in case the model returns an invalid category
    id_prefix = "mem";
  }

  const summary = (memoryPartial.memory_summary || "").trim().toLowerCase();
  const category = (memoryPartial.category || "").trim().toLowerCase();
  const intent = (memoryPartial.intent || "").trim().toLowerCase();

  const key = `${summary}||${category}||${intent}`;
  const hex = hashStringToHex(key);

  return `${id_prefix}.${hex}`;
}
