/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * @typedef ConversationStatus
 * @property {number} ACTIVE - An active conversation
 * @property {number} ARCHIVE - An archived conversation
 * @property {number} DELETED - A deleted conversation
 */

/**
 * @type {ConversationStatus}
 */
export const CONVERSATION_STATUS = Object.freeze({
  ACTIVE: 0,
  ARCHIVED: 1,
  DELETED: 2,
});

/**
 * @typedef {0 | 1 | 2 | 3} MessageRole
 */

/**
 * @enum {MessageRole}
 */
export const MESSAGE_ROLE = Object.freeze({
  USER: 0,
  ASSISTANT: 1,
  SYSTEM: 2,
  TOOL: 3,
});

/**
 * @typedef {0 | 1 | 2} MemoriesFlagSource
 */

/**
 * @type {MemoriesFlagSource}
 */
export const MEMORIES_FLAG_SOURCE = Object.freeze({
  GLOBAL: 0,
  CONVERSATION: 1,
  MESSAGE_ONCE: 2,
});

/**
 * @typedef { "text" | "injected_memories" | "injected_real_time_info" } SystemPromptType
 */

/**
 * @type {SystemPromptType}
 */
export const SYSTEM_PROMPT_TYPE = Object.freeze({
  TEXT: "text",
  MEMORIES: "injected_memories",
  REAL_TIME: "injected_real_time_info",
});
