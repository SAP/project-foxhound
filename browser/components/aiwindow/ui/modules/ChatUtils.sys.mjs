/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  CryptoUtils: "moz-src:///services/crypto/modules/utils.sys.mjs",
});

import { MESSAGE_ROLE } from "./ChatConstants.sys.mjs";
import { ChatConversation } from "./ChatConversation.sys.mjs";
import { ChatMessage, ChatHistoryResult } from "./ChatMessage.sys.mjs";

/**
 * Creates a 12 characters GUID with 72 bits of entropy.
 *
 * @returns {string} A base64url encoded GUID.
 */
export function makeGuid() {
  return ChromeUtils.base64URLEncode(lazy.CryptoUtils.generateRandomBytes(9), {
    pad: false,
  });
}

/**
 * Parse a conversation row from the database into a ChatConversation
 * object.
 *
 * @param {object} row - The database row to parse.
 * @returns {ChatConversation} The parsed conversation object.
 */
export function parseConversationRow(row) {
  return new ChatConversation({
    id: row.getResultByName("conv_id"),
    title: row.getResultByName("title"),
    description: row.getResultByName("description"),
    pageUrl: URL.parse(row.getResultByName("page_url")),
    pageMeta: parseJSONOrNull(row.getResultByName("page_meta")),
    createdDate: row.getResultByName("created_date"),
    updatedDate: row.getResultByName("updated_date"),
    status: row.getResultByName("status"),
  });
}

/**
 * Parse message rows from the database into an array of ChatMessage
 * objects.
 *
 * @param {object} rows - The database rows to parse.
 * @returns {Array<ChatMessage>} The parsed message objects.
 */
export function parseMessageRows(rows) {
  return rows.map(row => {
    return new ChatMessage({
      id: row.getResultByName("message_id"),
      createdDate: row.getResultByName("created_date"),
      parentMessageId: row.getResultByName("parent_message_id"),
      revisionRootMessageId: row.getResultByName("revision_root_message_id"),
      ordinal: row.getResultByName("ordinal"),
      isActiveBranch: !!row.getResultByName("is_active_branch"),
      role: row.getResultByName("role"),
      modelId: row.getResultByName("model_id"),
      params: parseJSONOrNull(row.getResultByName("params")),
      usage: parseJSONOrNull(row.getResultByName("usage")),
      content: parseJSONOrNull(row.getResultByName("content")),
      convId: row.getResultByName("conv_id"),
      pageUrl: URL.parse(row.getResultByName("page_url")),
      turnIndex: row.getResultByName("turn_index"),
      memoriesEnabled: row.getResultByName("memories_enabled"),
      memoriesFlagSource: row.getResultByName("memories_flag_source"),
      memoriesApplied: parseJSONOrNull(row.getResultByName("memories_applied")),
      webSearchQueries: parseJSONOrNull(
        row.getResultByName("web_search_queries")
      ),
    });
  });
}

/**
 * Parse conversation rows from the database into an array of ChatHistoryResult
 * objects.
 *
 * @param {Array<object>} rows - The database rows to parse.
 * @returns {Array<ChatHistoryResult>} The parsed chat history result entries
 */
export function parseChatHistoryViewRows(rows) {
  return rows.map(row => {
    const urlsString = row.getResultByName("urls");
    const urls = urlsString
      ? urlsString
          .split(",")
          .filter(url => url && url.trim())
          .map(url => new URL(url.trim()))
      : [];

    return new ChatHistoryResult({
      convId: row.getResultByName("conv_id"),
      title: row.getResultByName("title"),
      createdDate: row.getResultByName("created_date"),
      updatedDate: row.getResultByName("updated_date"),
      urls,
    });
  });
}

/**
 * Try to parse a JSON string, returning null if it fails or the value is falsy.
 *
 * @param {string} value - The JSON string to parse.
 * @returns {object|null} The parsed object or null.
 */
export function parseJSONOrNull(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

/**
 * Try to stringify a value if it is truthy, otherwise return null.
 *
 * @param {*} value - A value to JSON.stringify()
 *
 * @returns {string|null} - JSON string
 */
export function toJSONOrNull(value) {
  return value ? JSON.stringify(value) : null;
}

/**
 * Converts the different types of message roles from
 * the database numeric type to a string label
 *
 * @param {number} role - The database numeric role type
 * @returns {string} - A human readable role label
 */
export function getRoleLabel(role) {
  switch (role) {
    case MESSAGE_ROLE.USER:
      return "User";

    case MESSAGE_ROLE.ASSISTANT:
      return "Assistant";

    case MESSAGE_ROLE.SYSTEM:
      return "System";

    case MESSAGE_ROLE.TOOL:
      return "Tool";
  }

  return "";
}
