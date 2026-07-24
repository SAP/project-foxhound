/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  getRecentHistory,
  sessionizeVisits,
  generateProfileInputs,
  aggregateSessions,
  topkAggregates,
  countRecentVisits,
} from "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistorySource.sys.mjs";
import { getRecentChats } from "./MemoriesChatSource.sys.mjs";
import {
  DEFAULT_ENGINE_ID,
  MODEL_FEATURES,
  openAIEngine,
  renderPrompt,
  SERVICE_TYPES,
} from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs";
import { MemoryStore } from "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs";
import {
  CATEGORIES,
  INTENTS,
  HISTORY as SOURCE_HISTORY,
  CONVERSATION as SOURCE_CONVERSATION,
  PREF_GENERATE_MEMORIES,
} from "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs";
import {
  getFormattedMemoryAttributeList,
  parseAndExtractJSON,
  generateMemories,
} from "moz-src:///browser/components/aiwindow/models/memories/Memories.sys.mjs";
import { MEMORIES_MESSAGE_CLASSIFY_SCHEMA } from "moz-src:///browser/components/aiwindow/models/memories/MemoriesSchemas.sys.mjs";
import { AIWindow } from "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs";
import { EveryWindow } from "resource:///modules/EveryWindow.sys.mjs";
import { AIWindowAccountAuth } from "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs";
import { EmbeddingsGenerator } from "chrome://global/content/ml/EmbeddingsGenerator.sys.mjs";
import { cosSim } from "chrome://global/content/ml/NLPUtils.sys.mjs";

const K_DOMAINS_FULL = 100;
const K_TITLES_FULL = 100;
const K_SEARCHES_FULL = 10;

const K_DOMAINS_DELTA = 30;
const K_TITLES_DELTA = 60;
const K_SEARCHES_DELTA = 10;

// for initial memory generation batches
const TOKEN_BUDGET = 2000;

const DEFAULT_HISTORY_FULL_LOOKUP_DAYS = 60;
const DEFAULT_HISTORY_FULL_MAX_RESULTS = 3000;
const DEFAULT_HISTORY_DELTA_MAX_RESULTS = 500;
const DEFAULT_CHAT_FULL_MAX_RESULTS = 50;
const DEFAULT_CHAT_HALF_LIFE_DAYS_FULL_RESULTS = 7;

const LAST_HISTORY_MEMORY_TS_ATTRIBUTE = "last_history_memory_ts";
const LAST_CONVERSATION_MEMORY_TS_ATTRIBUTE = "last_chat_memory_ts";
/**
 * MemoriesManager class
 */
export class MemoriesManager {
  // Exposed to be stubbed for testing
  static _getRecentChats = getRecentChats;

  // openaiEngine for memory generation
  static #openAIEngineGenerationPromise = null;

  // openAIEngine for memory usage
  static #openAIEngineUsagePromise = null;

  // Embeddings cache for semantic memory search
  static #embeddingsGenerator = null;
  static #memoryEmbeddingsCache = null;
  static #memoryCacheKey = null;

  /**
   * Creates and returns an openAIEngine instance for memory generation.
   * This engine loads prompts for: initial generation, deduplication, sensitivity filter.
   *
   * @returns {Promise<openAIEngine>}  openAIEngine instance
   */
  static async ensureOpenAIEngineForGeneration() {
    const buildFresh = () => {
      this.#openAIEngineGenerationPromise = openAIEngine.build(
        MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
        `${DEFAULT_ENGINE_ID}-memories-generation`,
        SERVICE_TYPES.MEMORIES
      );
      return this.#openAIEngineGenerationPromise;
    };

    if (!this.#openAIEngineGenerationPromise) {
      return await buildFresh();
    }

    let engine;
    try {
      engine = await this.#openAIEngineGenerationPromise;
    } catch (e) {
      this.#openAIEngineGenerationPromise = null;
      return await buildFresh();
    }

    const status = engine?.engineInstance?.engineStatus;
    if (status !== "ready") {
      this.#openAIEngineGenerationPromise = null;
      return await buildFresh();
    }
    return engine;
  }

  /**
   * Creates and returns an openAIEngine instance for memory usage.
   * This engine loads prompts for: message classification, relevant context.
   *
   * @returns {Promise<openAIEngine>}  openAIEngine instance
   */
  static async ensureOpenAIEngineForUsage() {
    const buildFresh = () => {
      this.#openAIEngineUsagePromise = openAIEngine.build(
        MODEL_FEATURES.MEMORIES_MESSAGE_CLASSIFICATION_SYSTEM,
        `${DEFAULT_ENGINE_ID}-memories-usage`,
        SERVICE_TYPES.MEMORIES
      );
      return this.#openAIEngineUsagePromise;
    };

    if (!this.#openAIEngineUsagePromise) {
      return await buildFresh();
    }

    let engine;
    try {
      engine = await this.#openAIEngineUsagePromise;
    } catch (e) {
      this.#openAIEngineUsagePromise = null;
      return await buildFresh();
    }

    const status = engine?.engineInstance?.engineStatus;
    if (status !== "ready") {
      this.#openAIEngineUsagePromise = null;
      return await buildFresh();
    }
    return engine;
  }

  /**
   * Generates, saves, and returns memories from pre-computed sources
   *
   * @param {object} sources      User data source type to aggregrated records (i.e., {history: [domainItems, titleItems, searchItems]})
   * @param {string} sourceName   Specific source type from which memories are generated ("history" or "conversation")
   * @returns {Promise<Memory[]>}
   *          A promise that resolves to the list of persisted memories
   *          (newly created or updated), sorted and shaped as returned by
   *          {@link MemoryStore.addMemory}.
   */
  static async generateAndSaveMemoriesFromSources(sources, sourceName) {
    const now = Date.now();
    const existingMemories = await this.getAllMemories();
    const existingMemoriesSummaries = existingMemories.map(
      i => i.memory_summary
    );
    const engine = await this.ensureOpenAIEngineForGeneration();
    const memories = await generateMemories(
      engine,
      sources,
      existingMemoriesSummaries
    );
    const { persistedMemories } = await this.saveMemories(
      memories,
      sourceName,
      now
    );
    return persistedMemories;
  }

  /**
   * Generates and persists memories derived from the user's recent browsing history.
   *
   * This method:
   *  1. Reads {@link last_history_memory_ts} via {@link getLastHistoryMemoryTimestamp}.
   *  2. Decides between:
   *     - Full processing (first run, no prior timestamp):
   *         * Uses a days-based cutoff (DEFAULT_HISTORY_FULL_LOOKUP_DAYS).
   *         * Uses max-results cap (DEFAULT_HISTORY_FULL_MAX_RESULTS).
   *         * Uses full top-k settings (K_DOMAINS_FULL, K_TITLES_FULL, K_SEARCHES_FULL).
   *     - Delta processing (subsequent runs, prior timestamp present):
   *         * Uses an absolute cutoff via `sinceMicros = lastTsMs * 1000`.
   *         * Uses a smaller max-results cap (DEFAULT_HISTORY_DELTA_MAX_RESULTS).
   *         * Uses delta top-k settings (K_DOMAINS_DELTA, K_TITLES_DELTA, K_SEARCHES_DELTA).
   *  3. Calls {@link getAggregatedBrowserHistory} with the computed options to obtain
   *     domain, title, and search aggregates.
   *  4. Calls {@link generateAndSaveMemoriesFromSources} with retrieved history to generate and save new memories.
   *
   * @returns {Promise<Memory[]>}
   *          A promise that resolves to the list of persisted history memories
   *          (newly created or updated), sorted and shaped as returned by
   *          {@link MemoryStore.addMemory}.
   */
  static async generateMemoriesFromBrowsingHistory() {
    const now = Date.now();
    // get last history memory timestamp in ms
    const lastTsMs = await this.getLastHistoryMemoryTimestamp();
    const isDelta = typeof lastTsMs === "number" && lastTsMs > 0;
    // set up the options based on delta or full (first) run
    let recentHistoryOpts = {};
    let topkAggregatesOpts;
    if (isDelta) {
      recentHistoryOpts = {
        sinceMicros: lastTsMs * 1000,
        maxResults: DEFAULT_HISTORY_DELTA_MAX_RESULTS,
      };
      topkAggregatesOpts = {
        k_domains: K_DOMAINS_DELTA,
        k_titles: K_TITLES_DELTA,
        k_searches: K_SEARCHES_DELTA,
        now,
      };
    } else {
      recentHistoryOpts = {
        days: DEFAULT_HISTORY_FULL_LOOKUP_DAYS,
        maxResults: DEFAULT_HISTORY_FULL_MAX_RESULTS,
      };
      topkAggregatesOpts = {
        k_domains: K_DOMAINS_FULL,
        k_titles: K_TITLES_FULL,
        k_searches: K_SEARCHES_FULL,
        now,
      };
    }

    const [domainItems, titleItems, searchItems] =
      await this.getAggregatedBrowserHistory(
        recentHistoryOpts,
        topkAggregatesOpts
      );
    const sources = { history: [domainItems, titleItems, searchItems] };

    const hasAnyHistory = sources.history.some(
      items => Array.isArray(items) && !!items.length
    );

    if (!hasAnyHistory) {
      console.warn(
        "MemoriesManager.generateMemoriesFromBrowsingHistory: " +
          "History aggregates are empty; skipping memory generation."
      );
      return [];
    }

    const batches = this._createHistoryBatches(
      domainItems,
      titleItems,
      searchItems,
      TOKEN_BUDGET
    );

    const allGeneratedMemories = [];
    for (let i = 0; i < batches.length; i++) {
      const batchSources = { history: batches[i] };
      const batchMemories = await this.generateAndSaveMemoriesFromSources(
        batchSources,
        SOURCE_HISTORY
      );
      allGeneratedMemories.push(...batchMemories);
    }

    return allGeneratedMemories;
  }

  /**
   * Generates and persists memories derived from the user's recent chat history.
   *
   * This method:
   *  1. Reads {@link last_chat_memory_ts} via {@link getLastConversationMemoryTimestamp}.
   *  2. Decides between:
   *     - Full processing (first run, no prior timestamp):
   *         * Pulls all messages from the beginning of time.
   *     - Delta processing (subsequent runs, prior timestamp present):
   *         * Pulls all messages since the last timestamp.
   *  3. Calls {@link getRecentChats} with the computed options to obtain messages.
   *  4. Calls {@link generateAndSaveMemoriesFromSources} with messages to generate and save new memories.
   *
   * @returns {Promise<Memory[]>}
   *          A promise that resolves to the list of persisted conversation memories
   *          (newly created or updated), sorted and shaped as returned by
   *          {@link MemoryStore.addMemory}.
   */
  static async generateMemoriesFromConversationHistory() {
    // get last chat memory timestamp in ms
    const lastTsMs = await this.getLastConversationMemoryTimestamp();
    const isDelta = typeof lastTsMs === "number" && lastTsMs > 0;

    let startTime = 0;

    // If this is a subsequent run, set startTime to lastTsMs, the last time we generated chat-based memories
    if (isDelta) {
      startTime = lastTsMs;
    }

    const chatMessages = await this._getRecentChats(
      startTime,
      DEFAULT_CHAT_FULL_MAX_RESULTS,
      DEFAULT_CHAT_HALF_LIFE_DAYS_FULL_RESULTS
    );
    const sources = { conversation: chatMessages };

    if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
      console.warn(
        "MemoriesManager.generateMemoriesFromConversationHistory: " +
          "No recent chat messages found; skipping memory generation."
      );
      return [];
    }

    return await this.generateAndSaveMemoriesFromSources(
      sources,
      SOURCE_CONVERSATION
    );
  }

  /**
   * Retrieves and aggregates recent browser history into top-k domain, title, and search aggregates.
   *
   * @param {object} [recentHistoryOpts={}]
   * @param {number} [recentHistoryOpts.sinceMicros=null]
   *        Optional absolute cutoff in microseconds since epoch (Places
   *        visit_date). If provided, this is used directly as the cutoff:
   *        only visits with `visit_date >= sinceMicros` are returned.
   *
   *        This is the recommended way to implement incremental reads:
   *        store the max `visitDateMicros` from the previous run and pass
   *        it (or max + 1) back in as `sinceMicros`.
   *
   * @param {number} [recentHistoryOpts.days=DEFAULT_DAYS]
   *        How far back to look if `sinceMicros` is not provided.
   *        The cutoff is computed as:
   *          cutoff = now() - days * MS_PER_DAY
   *
   *        Ignored when `sinceMicros` is non-null.
   *
   * @param {number} [recentHistoryOpts.maxResults=DEFAULT_MAX_RESULTS]
   *        Maximum number of rows to return from the SQL query (after
   *        sorting by most recent visit). Note that this caps the number
   *        of visits, not distinct URLs.
   * @param {object} [topkAggregatesOpts]
   * @param {number} [topkAggregatesOpts.k_domains=30]    Max number of domain aggregates to return
   * @param {number} [topkAggregatesOpts.k_titles=60]     Max number of title aggregates to return
   * @param {number} [topkAggregatesOpts.k_searches=10]   Max number of search aggregates to return
   * @param {number} [topkAggregatesOpts.now]             Current time; seconds or ms, normalized internally.}
   * @returns {Promise<[Array, Array, Array]>}            Top-k domain, title, and search aggregates
   */
  static async getAggregatedBrowserHistory(
    recentHistoryOpts = {},
    topkAggregatesOpts = {
      k_domains: K_DOMAINS_DELTA,
      k_titles: K_TITLES_DELTA,
      k_searches: K_SEARCHES_DELTA,
      now: undefined,
    }
  ) {
    const recentVisitRecords = await getRecentHistory(recentHistoryOpts);
    const sessionized = sessionizeVisits(recentVisitRecords);
    const profilePreparedInputs = generateProfileInputs(sessionized);
    const [domainAgg, titleAgg, searchAgg] = aggregateSessions(
      profilePreparedInputs
    );

    return await topkAggregates(
      domainAgg,
      titleAgg,
      searchAgg,
      topkAggregatesOpts
    );
  }

  /**
   * Retrieves all stored memories.
   * This is a quick-access wrapper around MemoryStore.getMemories() with no additional processing.
   *
   * @param {object} [opts={}]
   * @param {boolean} [opts.includeSoftDeleted=false]
   *        Whether to include soft-deleted memories.
   * @returns {Promise<Array<Map<{
   *  memory_summary: string,
   *  category: string,
   *  intent: string,
   *  score: number,
   * }>>>}                                    List of memories
   */
  static async getAllMemories(opts = { includeSoftDeleted: false }) {
    return await MemoryStore.getMemories(opts);
  }

  /**
   * Retrieves memories by ID.
   * This is a quick-access wrapper around MemoryStore.getMemories() specifically requiring the memoryIds option.
   *
   * @param {Array<string>} memoryIds   List of memory IDs
   * @returns {Promise<Array<Map<{
   *  memory_summary: string,
   *  category: string,
   *  intent: string,
   *  score: number,
   * }>>>}
   */
  static async getMemoriesByID(memoryIds) {
    return await MemoryStore.getMemories({ memoryIds });
  }

  /**
   * Returns the last timestamp (in ms since Unix epoch) when a history-based
   * memory was generated, as persisted in MemoryStore.meta.
   *
   * If the store has never been updated, this returns 0.
   *
   * @returns {Promise<number>}  Milliseconds since Unix epoch
   */
  static async getLastHistoryMemoryTimestamp() {
    const meta = await MemoryStore.getMeta();
    return meta.last_history_memory_ts || 0;
  }

  /**
   * Returns the last timestamp (in ms since Unix epoch) when a chat-based
   * memory was generated, as persisted in MemoryStore.meta.
   *
   * If the store has never been updated, this returns 0.
   *
   * @returns {Promise<number>}  Milliseconds since Unix epoch
   */
  static async getLastConversationMemoryTimestamp() {
    const meta = await MemoryStore.getMeta();
    return meta.last_chat_memory_ts || 0;
  }

  /**
   * Persist a list of generated memories and update the appropriate meta timestamp.
   *
   * @param {Array<object>|null|undefined} generatedMemories
   *        Array of MemoryPartial-like objects to persist.
   * @param {"history"|"conversation"} source
   *        Source of these memories; controls which meta timestamp to update.
   * @param {number} [nowMs=Date.now()]
   *        Optional "now" timestamp in ms, for meta update fallback.
   *
   * @returns {Promise<{ persistedMemories: Array<object>, newTimestampMs: number | null }>}
   */
  static async saveMemories(generatedMemories, source, nowMs = Date.now()) {
    const persistedMemories = [];

    if (Array.isArray(generatedMemories)) {
      for (const memoryPartial of generatedMemories) {
        const stored = await MemoryStore.addMemory(memoryPartial);
        persistedMemories.push(stored);
      }
    }

    // Decide which meta field to update
    let metaKey;
    if (source === SOURCE_HISTORY) {
      metaKey = LAST_HISTORY_MEMORY_TS_ATTRIBUTE;
    } else if (source === SOURCE_CONVERSATION) {
      metaKey = LAST_CONVERSATION_MEMORY_TS_ATTRIBUTE;
    } else {
      // Unknown source: don't update meta, just return persisted results.
      return {
        persistedMemories,
        newTimestampMs: null,
      };
    }

    // Compute new timestamp: prefer max(updated_at) if present, otherwise fall back to nowMs.
    let newTsMs = nowMs;
    if (persistedMemories.length) {
      const maxUpdated = persistedMemories.reduce(
        (max, i) => Math.max(max, i.updated_at ?? 0),
        0
      );
      if (maxUpdated > 0) {
        newTsMs = maxUpdated;
      }
    }

    await MemoryStore.updateMeta({
      [metaKey]: newTsMs,
    });

    return {
      persistedMemories,
      newTimestampMs: newTsMs,
    };
  }

  /**
   * Soft deletes a memory by its ID.
   * Soft deletion sets the memory's `is_deleted` flag to true. This prevents memory getter functions
   * from returning the memory when using default parameters. It does not delete the memory from storage.
   *
   * From the user's perspective, soft-deleted memories will not be used in assistant responses but will still exist in storage.
   *
   * @param {string} memoryId        ID of the memory to soft-delete
   * @returns {Promise<Memory|null>} The soft-deleted memory, or null if not found
   */
  static async softDeleteMemoryById(memoryId) {
    return await MemoryStore.softDeleteMemory(memoryId);
  }

  /**
   * Hard deletes a memory by its ID.
   * Hard deletion permenantly removes the memory from storage entirely. This method should be used
   * by UI to allow users to delete memories they no longer want stored.
   *
   * @param {string} memoryId        ID of the memory to hard-delete
   * @returns {Promise<boolean>}      True if the memory was found and deleted, false otherwise
   */
  static async hardDeleteMemoryById(memoryId) {
    return await MemoryStore.hardDeleteMemory(memoryId);
  }

  /**
   * Classifies a user message into memory categories and intents.
   *
   * @param {string} message                                                        User message to classify
   * @returns {Promise<Map<{categories: Array<string>, intents: Array<string>}>>}}  Categories and intents into which the message was classified
   */
  static async memoryClassifyMessage(message) {
    const engine = await this.ensureOpenAIEngineForUsage();
    const systemPrompt = await engine.loadPrompt(
      MODEL_FEATURES.MEMORIES_MESSAGE_CLASSIFICATION_SYSTEM
    );
    const userPromptTemplate = await engine.loadPrompt(
      MODEL_FEATURES.MEMORIES_MESSAGE_CLASSIFICATION_USER
    );
    const userPrompt = await renderPrompt(userPromptTemplate, {
      message,
      categories: getFormattedMemoryAttributeList(CATEGORIES),
      intents: getFormattedMemoryAttributeList(INTENTS),
    });

    const response = await engine.run({
      args: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: {
        type: "json_schema",
        schema: MEMORIES_MESSAGE_CLASSIFY_SCHEMA,
      },
      fxAccountToken: await openAIEngine.getFxAccountToken(),
    });

    const parsed = parseAndExtractJSON(response, {
      categories: [],
      intents: [],
    });

    if (!parsed.categories || !parsed.intents) {
      return { categories: [], intents: [] };
    }
    return parsed;
  }

  /**
   * Clears the embeddings cache. Used for testing.
   *
   * @private
   */
  static _clearEmbeddingsCache() {
    this.#memoryEmbeddingsCache = null;
    this.#memoryCacheKey = null;
  }

  /**
   * Computes a hash of memories for cache invalidation.
   * Uses incremental FNV-1a hashing to avoid allocating large concatenated strings
   * based on https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
   *
   * @param {Array} memories  Array of memory objects with id and updated_at fields
   * @returns {number}        32-bit hash representing the memories state
   */
  static #computeMemoriesHash(memories) {
    // FNV-1a offset basis (32-bit)
    let hash = 0x811c9dc5;

    for (const m of memories) {
      const str = `${m.id}-${m.updated_at}`;
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        // FNV prime, keep 32-bit
        hash = (hash * 0x01000193) >>> 0;
      }
    }

    return hash;
  }

  /**
   * Fetches relevant memories for a given user message using semantic similarity.
   * Uses embeddings and cosine similarity for fast, accurate memory retrieval.
   *
   * @param {string} message                  User message to find relevant memories for
   * @param {number} topK                     Number of top relevant memories to return (default: 5)
   * @param {number} similarityThreshold      Minimum similarity score (0-1) to include (default: 0.3)
   * @returns {Promise<Array<{
   *  memory_summary: string,
   *  category: string,
   *  intent: string,
   *  score: number,
   *  similarity: number,
   * }>>}                                     List of relevant memories sorted by similarity
   */
  static async getRelevantMemories(
    message,
    topK = 5,
    similarityThreshold = 0.3
  ) {
    const memories = await MemoriesManager.getAllMemories();

    if (memories.length === 0) {
      return [];
    }

    // Lazy initialize embeddings generator
    if (!this.#embeddingsGenerator) {
      this.#embeddingsGenerator = new EmbeddingsGenerator({
        backend: "onnx-native",
        embeddingSize: 384,
      });
    }

    // Re-embed memories only if cache is invalid
    const currentCacheKey = this.#computeMemoriesHash(memories);
    if (
      !this.#memoryEmbeddingsCache ||
      this.#memoryCacheKey !== currentCacheKey
    ) {
      const memoryTexts = memories.map(m => {
        const summary = m.memory_summary?.toLowerCase() || "";
        const reasoning = m.reasoning?.toLowerCase() || "";
        return reasoning ? `${summary}. ${reasoning}` : summary;
      });
      const result = await this.#embeddingsGenerator.embedMany(memoryTexts);
      this.#memoryEmbeddingsCache = result.output || result;
      this.#memoryCacheKey = currentCacheKey;
    }

    const queryResult = await this.#embeddingsGenerator.embed(
      message.toLowerCase()
    );
    let queryEmbedding = queryResult.output || queryResult;

    if (Array.isArray(queryEmbedding) && queryEmbedding.length === 1) {
      queryEmbedding = queryEmbedding[0];
    }

    // Calculate cosine similarity
    const similarities = this.#memoryEmbeddingsCache.map((memEmb, idx) => ({
      ...memories[idx],
      similarity: cosSim(queryEmbedding, memEmb),
    }));

    // Filter by threshold, sort by similarity, and return top K
    return similarities
      .filter(m => m.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Helper returns true if memories generation should be enabled.
   *
   * Gating logic for all schedulers:
   * - browser.smartwindow.enabled pref
   * - memories-specific pref
   * - and whether any AIWindow is currently active
   *
   * If window APIs are not available (or throw), this falls back to false.
   */
  static shouldEnableMemoriesSchedulers() {
    // Pref checks
    const aiWindowEnabled = AIWindow.isAIWindowEnabled();
    const memoriesEnabled = Services.prefs.getBoolPref(
      PREF_GENERATE_MEMORIES,
      false
    );
    const hasConsent = AIWindowAccountAuth.hasToSConsent;

    if (!aiWindowEnabled || !memoriesEnabled || !hasConsent) {
      return false;
    }

    // Window/activity gate (fail closed)
    try {
      return EveryWindow.readyWindows.some(win =>
        AIWindow.isAIWindowActive(win)
      );
    } catch (e) {
      // If we cannot check window state, do NOT enable schedulers.
      return false;
    }
  }

  /**
   * Count recent history visits.
   * Thin wrapper around MemoriesHistorySource.countRecentVisits for callers/tests.
   *
   * @param {object} opts
   * @returns {Promise<number>}
   */
  static async countRecentVisits(opts = {}) {
    return await countRecentVisits(opts);
  }

  // Helper: Estimate token count for history items
  static _estimateHistoryTokens(domainItems, titleItems, searchItems) {
    let chars = 0;

    // Domains: "domain.com,99.5\n"
    chars += domainItems.reduce(
      (sum, [domain, _score]) => sum + domain.length + 10,
      0
    );

    // Titles: "Long Title | domain.com,99.5\n"
    chars += titleItems.reduce(
      (sum, [title, _score]) => sum + title.length + 10,
      0
    );

    // Searches: can have multiple queries per item
    chars += searchItems.reduce(
      (sum, item) => sum + (item.q || []).join(",").length + 20,
      0
    );

    // CSV headers and formatting overhead
    chars += 1000;

    // Rough conversion: 1 token ≈ 4 characters
    return Math.ceil(chars / 4);
  }

  // Helper: Split history items into token-budget-compliant batches
  static _createHistoryBatches(
    domainItems,
    titleItems,
    searchItems,
    tokenBudget
  ) {
    const batches = [];

    // Calculate how many items per batch based on average item size
    const totalItems =
      domainItems.length + titleItems.length + searchItems.length;
    const avgTokensPerItem =
      this._estimateHistoryTokens(domainItems, titleItems, searchItems) /
      totalItems;

    const itemsPerBatch = Math.max(
      10, // Minimum batch size
      Math.floor((tokenBudget * 0.9) / avgTokensPerItem) // 0.9 for safety margin
    );

    // Calculate proportional splits
    const domainRatio = domainItems.length / totalItems;
    const titleRatio = titleItems.length / totalItems;
    const searchRatio = searchItems.length / totalItems;

    const domainsPerBatch = Math.ceil(itemsPerBatch * domainRatio);
    const titlesPerBatch = Math.ceil(itemsPerBatch * titleRatio);
    const searchesPerBatch = Math.ceil(itemsPerBatch * searchRatio);

    let domainIdx = 0;
    let titleIdx = 0;
    let searchIdx = 0;

    while (
      domainIdx < domainItems.length ||
      titleIdx < titleItems.length ||
      searchIdx < searchItems.length
    ) {
      const batchDomains = domainItems.slice(
        domainIdx,
        domainIdx + domainsPerBatch
      );
      const batchTitles = titleItems.slice(titleIdx, titleIdx + titlesPerBatch);
      const batchSearches = searchItems.slice(
        searchIdx,
        searchIdx + searchesPerBatch
      );

      // Only add batch if it has content
      if (
        !!batchDomains.length ||
        !!batchTitles.length ||
        batchSearches.length
      ) {
        batches.push([batchDomains, batchTitles, batchSearches]);
      }

      domainIdx += domainsPerBatch;
      titleIdx += titlesPerBatch;
      searchIdx += searchesPerBatch;
    }

    return batches;
  }
}
