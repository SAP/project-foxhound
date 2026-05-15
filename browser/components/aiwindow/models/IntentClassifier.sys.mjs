/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createEngine } from "chrome://global/content/ml/EngineProcess.sys.mjs";

const FORCED_CHAT_PHRASES = [
  "amuse me",
  "are we alone",
  "are you alive",
  "are you gpt",
  "are you human",
  "are you real",
  "bark like dog",
  "cheer me up",
  "comfort me",
  "count numbers",
  "curse me",
  "do aliens exist",
  "do we matter",
  "do you dream",
  "do you think",
  "does fate exist",
  "dream meaning",
  "drop wisdom",
  "encourage me",
  "entertain me",
  "explain yourself",
  "flip coin",
  "give blessing",
  "give wisdom",
  "good morning",
  "good night",
  "guess number",
  "hallo",
  "hello",
  "hey",
  "hi",
  "hola",
  "how are you",
  "inspire me",
  "invent a word",
  "invent holiday",
  "invent joke",
  "is god real",
  "life advice",
  "life purpose",
  "list animals",
  "list capitals",
  "list colors",
  "list countries",
  "list elements",
  "list fruits",
  "list metals",
  "list oceans",
  "list planets",
  "list shapes",
  "meaning of life",
  "meow like cat",
  "motivate me",
  "now you are",
  "play a game",
  "pretend alien",
  "pretend child",
  "pretend detective",
  "pretend ghost",
  "pretend pirate",
  "pretend robot",
  "pretend superhero",
  "pretend teacher",
  "pretend wizard",
  "random fact",
  "random number",
  "roll dice",
  "goodbye",
  "simulate chat",
  "simulate future",
  "simulate past",
  "sing like robot",
  "sing lullaby",
  "sing rap",
  "sup",
  "surprise me",
  "teach me",
  "tell bedtime story",
  "tell fortune",
  "tell joke",
  "tell prophecy",
  "tell riddle",
  "tell story",
  "what is art",
  "what is beauty",
  "what is death",
  "what is freedom",
  "what is justice",
  "what is love",
  "what is mind",
  "what is reality",
  "what is right",
  "what is self",
  "what is soul",
  "what is time",
  "what is truth",
  "what is wrong",
  "what model are you",
  "what version",
  "what’s up",
  "which model are you",
  "who am i",
  "who are you",
  "who made you",
  "why are we",
  "write a poem",
  "write a song",
  "write haiku",
  "write quote",
  "your model is",
];

export function normalizeTextForChatAllowlist(s) {
  return s.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

// Split on non-word chars; letters/numbers/_ are "word" characters
export function tokenizeTextForChatAllowlist(s) {
  return normalizeTextForChatAllowlist(s)
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean);
}

export function buildChatAllowlist(phrases) {
  const byLen = new Map(); // len -> Set("tok tok ...")
  for (const p of phrases) {
    const key = tokenizeTextForChatAllowlist(p).join(" ");
    if (!key) {
      continue;
    }
    const k = key.split(" ").length;
    if (!byLen.has(k)) {
      byLen.set(k, new Set());
    }
    byLen.get(k).add(key);
  }
  return byLen;
}

// Factory: returns a fast checker for “does query contain any isolated phrase?”
export function makeIsolatedPhraseChecker(phrases) {
  const byLen = buildChatAllowlist(phrases);
  const cache = new Map();

  return function containsIsolatedPhrase(query) {
    const qNorm = normalizeTextForChatAllowlist(query);
    if (cache.has(qNorm)) {
      return cache.get(qNorm);
    }

    const toks = qNorm.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
    for (const [k, set] of byLen) {
      for (let i = 0; i + k <= toks.length; i++) {
        if (set.has(toks.slice(i, i + k).join(" "))) {
          cache.set(qNorm, true);
          return true;
        }
      }
    }
    cache.set(qNorm, false);
    return false;
  };
}

/**
 * Intent Classifier Engine
 */
export const IntentClassifier = {
  /**
   * Exposing createEngine for testing purposes.
   */

  _createEngine: createEngine,

  /**
   * Initialize forced-chat checker at module load.
   * Keeping it as a property ensures easy stubbing in tests.
   */

  _isForcedChat: makeIsolatedPhraseChecker(FORCED_CHAT_PHRASES),

  /**
   * Gets the intent of the prompt using a text classification model.
   *
   * @param {string} prompt
   * @returns {string} "search" | "chat"
   */

  async getPromptIntent(query) {
    try {
      const cleanedQuery = this._preprocessQuery(query);
      if (this._isForcedChat(cleanedQuery)) {
        return "chat";
      }
      const engine = await this._createEngine({
        featureId: "smart-intent",
        modelId: "mozilla/mobilebert-query-intent-detection",
        modelRevision: "v0.3.0",
        taskName: "text-classification",
      });
      const threshold = 0.8;
      const resp = await engine.run({ args: [[cleanedQuery]] });
      // resp example: [{ label: "chat", score: 0.05 }, { label: "search", score: 0.94 }]
      if (
        resp[0].label.toLowerCase() === "search" &&
        resp[0].score >= threshold
      ) {
        return "search";
      }
      return "chat";
    } catch (error) {
      console.error("Error using intent detection model:", error);
      throw error;
    }
  },

  // Helper function for preprocessing text input
  _preprocessQuery(query) {
    if (typeof query !== "string") {
      throw new TypeError(
        `Expected a string for query preprocessing, but received ${typeof query}`
      );
    }
    return query.replace(/\?/g, "").trim();
  },
};
