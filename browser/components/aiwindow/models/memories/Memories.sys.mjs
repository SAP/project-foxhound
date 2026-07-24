/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * This module defines functions to generate, deduplicate, and filter memories.
 *
 * The primary method in this module is `generateMemories`, which orchestrates the entire pipeline:
 * 1. Generates initial memories from a specified user data user
 * 2. Deduplicates the newly generated memories against all existing memories
 * 3. Filters out memories with sensitive content (i.e. financial, medical, etc.)
 * 4. Returns the final list of memories objects
 *
 * `generateMemories` requires 3 arguments:
 * 1. `engine`: an instance of `openAIEngine` to call the LLM API
 * 2. `sources`: an object mapping user data source types to aggregated records (i.e., {history: [domainItems, titleItems, searchItems]})
 * 3. `existingMemoriesList`: an array of existing memory summary strings to deduplicate against
 *
 * Example Usage:
 * const engine = await openAIEngine.build(MODEL_FEATURES.MEMORIES, DEFAULT_ENGINE_ID, SERVICE_TYPES.MEMORIES);
 * const sources = {history: [domainItems, titleItems, searchItems]};
 * const existingMemoriesList = [...]; // Array of existing memory summary strings; this should be fetched from memory storage
 * const newMemories = await generateMemories(engine, sources, existingMemoriesList);
 *
 */

import { renderPrompt, openAIEngine, MODEL_FEATURES } from "../Utils.sys.mjs";

import {
  HISTORY,
  CONVERSATION,
  CATEGORIES,
  CATEGORIES_LIST,
  INTENTS,
  INTENTS_LIST,
} from "./MemoriesConstants.sys.mjs";

import {
  INITIAL_MEMORIES_SCHEMA,
  MEMORIES_DEDUPLICATION_SCHEMA,
  MEMORIES_NON_SENSITIVE_SCHEMA,
} from "moz-src:///browser/components/aiwindow/models/memories/MemoriesSchemas.sys.mjs";

/**
 * Generates, deduplicates, and filters memories end-to-end
 *
 * This is the main pipeline function.
 *
 * @param {OpenAIEngine} engine                 openAIEngine instance to call LLM API
 * @param {object} sources                      User data source type to aggregrated records (i.e., {history: [domainItems, titleItems, searchItems]})
 * @param {Array<string>} existingMemoriesList  List of existing memory summary strings to deduplicate against
 * @returns {Promise<Array<Map<{
 *  category: string,
 *  intent: string,
 *  memory_summary: string,
 *  score: number,
 * }>>>}                                        Promise resolving the final list of generated, deduplicated, and filtered memory objects
 */
export async function generateMemories(engine, sources, existingMemoriesList) {
  // Step 1: Generate initial memories
  const initialMemories = await generateInitialMemoriesList(engine, sources);
  // If we don't generate any new memories, just return an empty list immediately instead of doing the rest of the steps
  if (!initialMemories || initialMemories.length === 0) {
    return [];
  }

  // Step 2: Deduplicate against existing memories
  const initialMemoriesSummaries = initialMemories.map(
    memory => memory.memory_summary
  );
  const dedupedMemoriesSummaries = await deduplicateMemories(
    engine,
    existingMemoriesList,
    initialMemoriesSummaries
  );
  // If we don't have any deduped memories, no new memories were generated or we ran into an unexpected JSON parse error, so return an empty list
  if (!dedupedMemoriesSummaries || dedupedMemoriesSummaries.length === 0) {
    return [];
  }

  // Step 3: Filter out sensitive memories
  const nonSensitiveMemoriesSummaries = await filterSensitiveMemories(
    engine,
    dedupedMemoriesSummaries
  );

  // Step 4: Map back to full memory objects and return
  return await mapFilteredMemoriesToInitialList(
    initialMemories,
    nonSensitiveMemoriesSummaries
  );
}

/**
 * Formats a list of strings into a prompt-friendly bullet list
 *
 * @param {List<string>} list
 * @returns {string}
 */
export function formatListForPrompt(list) {
  return list.map(item => `- "${item}"`).join("\n");
}

/**
 * Utility function to cleanly get bullet-formatted category and memory lists
 *
 * @param {string} attributeName  "categories" or "intents"
 * @returns {string}              Formatted list string
 */
export function getFormattedMemoryAttributeList(attributeName) {
  if (attributeName === CATEGORIES) {
    return formatListForPrompt(CATEGORIES_LIST);
  } else if (attributeName === INTENTS) {
    return formatListForPrompt(INTENTS_LIST);
  }
  throw new Error(`Unsupported memory attribute name: ${attributeName}`);
}

/**
 * Extracts a JSON as a map from an LLM response (handles markdown-formatted code blocks)
 *
 * @param {any} response  LLM response
 * @param {any} fallback  Fallback value if parsing fails to protect downstream code
 * @returns {Map}         Parsed JSON object
 */
export function parseAndExtractJSON(response, fallback) {
  const rawContent = response?.finalOutput ?? "";
  const markdownMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const payload = markdownMatch ? markdownMatch[1] : rawContent;
  try {
    return JSON.parse(payload);
  } catch (e) {
    // If we can't parse a JSON from the LLM response, return a tailored fallback value to prevent downstream code failures
    if (e instanceof SyntaxError) {
      console.warn(
        `Could not parse JSON from LLM response; using fallback (${fallback}): ${e.message}`
      );
      return fallback;
    }
    throw new Error(
      `Unexpected error parsing JSON from LLM response: ${e.message}`
    );
  }
}

/**
 * Renders recent history records into CSV tables for prompt input
 *
 * @param {Array<Array<string>>} domainItems   List of aggregated domain items
 * @param {Array<Array<string>>} titleItems    List of aggregated title items
 * @param {Array<object>} searchItems          List of aggregated search items
 * @returns {Promise<string>}   Promise resolving recent browser history rendered as CSV tables
 */
export async function renderRecentHistoryForPrompt(
  domainItems,
  titleItems,
  searchItems
) {
  let finalCSV = "";

  if (titleItems.length) {
    let titleRecordsTable = ["Website Title,Importance Score"];
    for (const titleItem of titleItems) {
      titleRecordsTable.push(titleItem.join(","));
    }
    finalCSV += "# Website Titles\n" + titleRecordsTable.join("\n") + "\n\n";
  }

  if (searchItems.length) {
    let searchRecordsTable = ["Search Query,Importance Score"];
    for (const searchItem of searchItems) {
      for (const searchText of searchItem.q) {
        searchRecordsTable.push(`${searchText},${searchItem.r}`);
      }
    }
    finalCSV += "# Web Searches\n" + searchRecordsTable.join("\n");
  }

  return finalCSV.trim();
}

export async function renderRecentConversationForPrompt(conversationMessages) {
  let finalCSV = "";
  if (conversationMessages.length) {
    let conversationRecordsTable = ["Message"];
    for (const message of conversationMessages) {
      conversationRecordsTable.push(`${message.content}`);
    }
    finalCSV += "# Chat History\n" + conversationRecordsTable.join("\n");
  }
  return finalCSV.trim();
}

/**
 * Sanitizes a single memory object from LLM output, checking required fields and normalizing score
 *
 * @param {*} memory               Raw memory object from LLM
 * @returns {Map<{
 *  category: string|null,
 *  intent: string|null,
 *  memory_summary: string|null,
 *  score: number,
 * }>|null}                         Sanitized memory or null if invalid
 */
function sanitizeMemory(memory) {
  // Shortcut to return nothing if memory is bad
  if (!memory || typeof memory !== "object") {
    return null;
  }

  // Check that the candidate memory object has all the required string fields
  for (const field of ["category", "intent", "memory_summary", "reasoning"]) {
    if (!(field in memory) && typeof memory[field] !== "string") {
      return null;
    }
  }

  // Clamp score to [1,5]; treat missing/invalid as 1
  let score = Number.isFinite(memory.score) ? Math.round(memory.score) : 1;
  if (score < 1) {
    score = 1;
  } else if (score > 5) {
    score = 5;
  }

  return {
    category: memory.category,
    intent: memory.intent,
    memory_summary: memory.memory_summary,
    reasoning: memory.reasoning,
    score,
  };
}

/**
 * Normalizes and validates parsed LLM output into a list of memories to handle LLM output variability
 *
 * @param {*} parsed                JSON-parsed LLM output
 * @returns {Array<Map<{
 *  category: string,
 *  intent: string,
 *  memory_summary: string,
 *  score: number,
 * }>>}                             List of sanitized memories
 */
function normalizeMemoryList(parsed) {
  let list = parsed;
  if (!Array.isArray(list)) {
    // If list isn't an array, check that it's an object with a nested "items" array
    if (list && Array.isArray(list.items)) {
      list = list.items;
    } else if (list && typeof list === "object") {
      // If list isn't an array, check that it's a least a single object, so check that list has memory-like keys
      const looksLikeMemory =
        "category" in list || "intent" in list || "memory_summary" in list;
      if (looksLikeMemory) {
        list = [list];
      }
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map(sanitizeMemory).filter(Boolean);
}

/**
 * Prompts an LLM to generate an initial, unfiltered list of candidate memories from user data
 *
 * @param {openAIEngine} engine     openAIEngine instance to call LLM API
 * @param {object} sources          User data source type to aggregrated records (i.e., {history: [domainItems, titleItems, searchItems]})
 * @returns {Promise<Array<Map<{
 *  category: string,
 *  intent: string,
 *  memory_summary: string,
 *  score: number,
 * }>>>}                            Promise resolving the list of generated memories
 */
export async function generateInitialMemoriesList(engine, sources) {
  const systemPrompt = await engine.loadPrompt(
    MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM
  );

  const userPromptTemplate = await engine.loadPrompt(
    MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_USER
  );

  // Build sources string
  let profileRecordsRenderedStr = "";
  if (sources.hasOwnProperty(HISTORY)) {
    const [domainItems, titleItems, searchItems] = sources[HISTORY];
    profileRecordsRenderedStr += await renderRecentHistoryForPrompt(
      domainItems,
      titleItems,
      searchItems
    );
  }
  if (sources.hasOwnProperty(CONVERSATION)) {
    profileRecordsRenderedStr += await renderRecentConversationForPrompt(
      sources[CONVERSATION]
    );
  }

  // Render user prompt with dynamic values
  const userPrompt = await renderPrompt(userPromptTemplate, {
    categoriesList: getFormattedMemoryAttributeList(CATEGORIES),
    intentsList: getFormattedMemoryAttributeList(INTENTS),
    profileRecordsRenderedStr,
  });

  const response = await engine.run({
    args: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    responseFormat: { type: "json_schema", schema: INITIAL_MEMORIES_SCHEMA },
    fxAccountToken: await openAIEngine.getFxAccountToken(),
  });

  const parsed = parseAndExtractJSON(response, []);
  return normalizeMemoryList(parsed);
}

/**
 * Prompts an LLM to deduplicate new memories against existing ones
 *
 * @param {OpenAIEngine} engine                 openAIEngine instance to call LLM API
 * @param {Array<string>} existingMemoriesList  List of existing memory summary strings
 * @param {Array<string>} newMemoriesList       List of new memory summary strings to deduplicate
 * @returns {Promise<Array<string>>}            Promise resolving the final list of deduplicated memory summary strings
 */
export async function deduplicateMemories(
  engine,
  existingMemoriesList,
  newMemoriesList
) {
  const systemPrompt = await engine.loadPrompt(
    MODEL_FEATURES.MEMORIES_DEDUPLICATION_SYSTEM
  );

  const userPromptTemplate = await engine.loadPrompt(
    MODEL_FEATURES.MEMORIES_DEDUPLICATION_USER
  );

  const userPrompt = await renderPrompt(userPromptTemplate, {
    existingMemoriesList: formatListForPrompt(existingMemoriesList),
    newMemoriesList: formatListForPrompt(newMemoriesList),
  });

  const response = await engine.run({
    args: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    responseFormat: {
      type: "json_schema",
      schema: MEMORIES_DEDUPLICATION_SCHEMA,
    },
    fxAccountToken: await openAIEngine.getFxAccountToken(),
  });

  const parsed = parseAndExtractJSON(response, { unique_memories: [] });

  // Able to extract a JSON, so the fallback wasn't used, but the LLM didn't follow the schema
  if (
    parsed.unique_memories === undefined ||
    !Array.isArray(parsed.unique_memories)
  ) {
    return [];
  }

  // Make sure we filter out any invalid main_memory entries before returning
  return parsed.unique_memories
    .filter(
      item =>
        item.main_memory !== undefined && typeof item.main_memory === "string"
    )
    .map(item => item.main_memory);
}

/**
 * Prompts an LLM to filter out sensitive memories from an memories list
 *
 * @param {OpenAIEngine} engine         openAIEngine instance to call LLM API
 * @param {Array<string>} memoriesList  List of memory summary strings to filter
 * @returns {Promise<Array<string>>}    Promise resolving the final list of non-sensitive memory summary strings
 */
export async function filterSensitiveMemories(engine, memoriesList) {
  const systemPrompt = await engine.loadPrompt(
    MODEL_FEATURES.MEMORIES_SENSITIVITY_FILTER_SYSTEM
  );

  const userPromptTemplate = await engine.loadPrompt(
    MODEL_FEATURES.MEMORIES_SENSITIVITY_FILTER_USER
  );

  const userPrompt = await renderPrompt(userPromptTemplate, {
    memoriesList: formatListForPrompt(memoriesList),
  });

  const response = await engine.run({
    args: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    responseFormat: {
      type: "json_schema",
      schema: MEMORIES_NON_SENSITIVE_SCHEMA,
    },
    fxAccountToken: await openAIEngine.getFxAccountToken(),
  });

  const parsed = parseAndExtractJSON(response, { non_sensitive_memories: [] });

  // Able to extract a JSON, so the fallback wasn't used, but the LLM didn't follow the schema
  if (
    parsed.non_sensitive_memories === undefined ||
    !Array.isArray(parsed.non_sensitive_memories)
  ) {
    return [];
  }

  // Make sure we filter out any invalid entries before returning
  return parsed.non_sensitive_memories.filter(item => typeof item === "string");
}

/**
 *
 * @param {Map<string, any>} initialMemories    List of original, unfiltered memory objects
 * @param {Array<string>} filteredMemoriesList  List of deduplicated and sensitivity-filtered memory summary strings
 * @returns {Promise<Map<string, any>>}         Promise resolving the final list of memory objects
 */
export async function mapFilteredMemoriesToInitialList(
  initialMemories,
  filteredMemoriesList
) {
  return initialMemories.filter(memory =>
    filteredMemoriesList.includes(memory.memory_summary)
  );
}
