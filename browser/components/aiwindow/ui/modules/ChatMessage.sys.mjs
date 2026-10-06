/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const TOKEN_LABELS = {
  EXISTING_MEMORY: "existing_memory",
  SEARCH: "search",
  FOLLOWUP: "followup",
  KIT: "kit",
};

// Deterministic fallback normalization for follow-up suggestions. Token/tag
// extraction can leave whitespace artifacts ("sentence ."), and the model
// sometimes emits a trailing period or other terminal punctuation that we
// don't want to render in the suggestion chips.
function normalizeFollowUp(value) {
  if (!value) {
    return "";
  }
  return value
    .replace(/[.!?…]+\s*$/u, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ ([.,!?…;:])/g, "$1");
}

/**
 * @import { ContextWebsite } from "chrome://browser/content/urlbar/SmartbarInput.mjs"
 */

/**
 * The text content for a conversation.
 *
 * @typedef {object} TextContent
 * @property {"text"} type - The type discriminator.
 * @property {string} body - The body of the content.
 * @property {Array<ContextWebsite>} [contextMentions] - The mentioned websites.
 * @property {string} [contextPageUrl] - The URL of the context.
 */

/**
 * @typedef {object} FunctionContent
 * @property {"function"} type - The type discriminator
 * @property {{tool_calls: Array<any>}} body - The body of the content.
 */

/**
 * A message in a conversation.
 */
export class ChatMessage {
  id;
  createdDate;
  parentMessageId;
  revisionRootMessageId;
  ordinal;
  isActiveBranch;
  role;
  modelId;
  params;
  usage;

  /**
   * The message content object.
   *
   * @type {TextContent | FunctionContent}
   */
  content;
  convId;
  pageUrl;
  turnIndex;
  memoriesEnabled;
  memoriesFlagSource;
  memoriesApplied;
  webSearchQueries;
  followUpSuggestions; // transient value
  pageHistoryDeleted;
  tokens;
  toolUIData;
  kit;

  /**
   * @param {object} param
   * @param {number} param.ordinal - The order of the message
   * @param {MessageRole} param.role - The message role
   * @param {object} param.content - The message content object
   * @param {number} param.turnIndex - The message turn, different than ordinal,
   * prompt/reply for example would be one turn
   * @param {URL} [param.pageUrl = null] - A URL object defining which page
   * the user was on when submitting a message if role == user
   * @param {string} [param.id = crypto.randomUUID()] - The row.message_id of the
   * message in the database
   * @param {number} [param.createdDate = Date.now()] - The date the message was
   * sent/stored in the database
   * @param {string} [param.parentMessageId = null] - The id of the message
   * which came before this message when it was added to the conversation,
   * null if its the first message of the converation
   * @param {string} [param.convId = null] - The id of the conversation the
   * message belongs to
   * @param {?boolean} param.memoriesEnabled - Whether memories were enabled
   * when the message was submitted if role == assistant
   * @param {MemoriesFlagSource} param.memoriesFlagSource - How the
   * memoriesEnabled flag was determined if role == assistant, one of
   * MEMORIES_FLAG_SOURCE.GLOBAL, MEMORIES_FLAG_SOURCE.CONVERSATION,
   * MEMORIES_FLAG_SOURCE.MESSAGE_ONCE
   * @param {?Array<string>} param.memoriesApplied - List of strings of memories
   * that were applied to a response if memoriesEnabled == true
   * @param {?Array<string>} param.webSearchQueries - List of strings of web
   * search queries that were applied to a response if role == assistant
   * @param {?Array<string>} param.followUpSuggestions - List of strings of follow up
   * questions that were generated from a response if role == assistant
   * @param {object} [param.params = null] - Model params used if role == assistant|tool
   * @param {object} [param.usage = null] - Token usage data for the current
   * response if role == assistant
   * @param {string} [param.modelId = null] - The model used for content
   * generation if role == assistant|tool
   * @param {string} [param.revisionRootMessageId = id] - Reference to the root
   * of this branch, which ID a message branched from. Should be set to the
   * same value as id when a message is first created. If a message is
   * edited/regenerated revisionRootMessageId should remain the same for
   * subsequent edits/regenerations, the id would diverge for subsequent
   * edits/regenerations.
   * @param {boolean} [param.isActiveBranch = true] - Defaults to true when a
   * message is originally generated. If a message is edited/regenerated, the
   * edited message turns to false and the newly edited/regenerated message is
   * the only message of the revision branch set to true.
   * @param {?boolean} param.pageHistoryDeleted - Whether pageUrl was removed due
   * to a history removal action like Forget This Site or Delete Page
   * @param {?object} param.toolUIData - Tool UI data to render with this message
   */
  constructor({
    ordinal,
    role,
    content,
    turnIndex,
    pageUrl = null,
    id = crypto.randomUUID(),
    createdDate = Date.now(),
    parentMessageId = null,
    convId = null,
    memoriesEnabled = null,
    memoriesFlagSource = null,
    memoriesApplied = [],
    webSearchQueries = [],
    followUpSuggestions = [],
    params = null,
    usage = null,
    modelId = null,
    revisionRootMessageId = id,
    isActiveBranch = true,
    pageHistoryDeleted = false,
    toolUIData = null,
  }) {
    this.id = id;
    this.createdDate = createdDate;
    this.parentMessageId = parentMessageId;
    this.revisionRootMessageId = revisionRootMessageId;
    this.isActiveBranch = isActiveBranch;
    this.ordinal = ordinal;
    this.role = role;
    this.modelId = modelId;
    this.params = params;
    this.usage = usage;
    this.content = content;
    this.convId = convId;
    this.pageUrl = pageUrl;
    this.turnIndex = turnIndex;
    this.memoriesEnabled = memoriesEnabled;
    this.memoriesFlagSource = memoriesFlagSource;
    this.memoriesApplied = memoriesApplied;
    this.webSearchQueries = webSearchQueries;
    this.followUpSuggestions = followUpSuggestions;
    this.pageHistoryDeleted = pageHistoryDeleted;
    this.toolUIData = toolUIData;
    this.tokens = {
      search: [],
      existing_memory: [],
      followup: [],
    };
  }

  /**
   * Processes tokens from the AI response stream and updates the message.
   * Adds all tokens to their respective arrays in the tokens object and
   * builds the memoriesApplied array for existing_memory tokens.
   *
   * @param {Array<{key: string, value: string}>} tokens - Array of parsed tokens from the stream
   */
  addTokens(tokens) {
    tokens.forEach(({ key, value }) => {
      let storedValue = value;
      if (key == TOKEN_LABELS.FOLLOWUP) {
        storedValue = normalizeFollowUp(value);
        if (!storedValue) {
          return;
        }
      }

      if (Array.isArray(this.tokens[key])) {
        this.tokens[key].push(storedValue);
      }

      switch (key) {
        case TOKEN_LABELS.EXISTING_MEMORY:
          this.memoriesApplied.push(value);
          break;
        case TOKEN_LABELS.SEARCH:
          this.webSearchQueries.push(value);
          break;
        case TOKEN_LABELS.FOLLOWUP:
          this.followUpSuggestions.push(storedValue);
          break;
        case TOKEN_LABELS.KIT:
          this.kit = value;
      }
    });
  }
}

/**
 * Options required for a conversation message with
 * role of assistant
 */
export class AssistantRoleOpts {
  memoriesEnabled;
  memoriesFlagSource;
  memoriesApplied;
  webSearchQueries;
  params;
  usage;
  modelId;

  /**
   * @param {string} [modelId=null]
   * @param {object} [params=null] - The model params used
   * @param {object} [usage=null] - Token usage data for the current response
   * @param {boolean} [memoriesEnabled=false] - Whether memories were enabled
   * when the message was submitted
   * @param {MemoriesFlagSource} [memoriesFlagSource=null] - How the memoriesEnabled
   * flag was determined
   * @param {?Array<string>} [memoriesApplied=[]] - List of strings of memories
   * that were applied to a response
   * @param {?Array<string>} [webSearchQueries=[]] - List of strings of web search
   * queries that were applied to a response
   * @param {?Array<string>} [followUpSuggestions=[]] - List of strings of follow up
   * questions that were generated from a response
   */
  constructor(
    modelId = null,
    params = null,
    usage = null,
    memoriesEnabled = false,
    memoriesFlagSource = null,
    memoriesApplied = [],
    webSearchQueries = [],
    followUpSuggestions = []
  ) {
    this.memoriesEnabled = memoriesEnabled;
    this.memoriesFlagSource = memoriesFlagSource;
    this.memoriesApplied = memoriesApplied;
    this.webSearchQueries = webSearchQueries;
    this.followUpSuggestions = followUpSuggestions;
    this.params = params;
    this.usage = usage;
    this.modelId = modelId;
  }
}

/**
 * Options required for a conversation message with
 * role of assistant
 */
export class ToolRoleOpts {
  modelId;

  /**
   * @param {string} [modelId=null]
   */
  constructor(modelId = null) {
    this.modelId = modelId;
  }
}

/**
 * Options required for a conversation message with
 * role of user
 */
export class UserRoleOpts {
  revisionRootMessageId;
  memoriesEnabled;
  memoriesFlagSource;
  contextMentions;

  /**
   * @param {string|object} [opts]
   */
  constructor({
    revisionRootMessageId = null,
    memoriesEnabled = null,
    memoriesFlagSource = null,
    contextMentions = null,
  } = {}) {
    if (revisionRootMessageId) {
      this.revisionRootMessageId = revisionRootMessageId;
    }
    this.memoriesEnabled = memoriesEnabled;
    this.memoriesFlagSource = memoriesFlagSource;
    this.contextMentions = contextMentions;
  }
}

/**
 * Used to retrieve chat entries for the History app menu
 */
export class ChatMinimal {
  #id;
  #title;

  /**
   * @param {object} params
   * @param {string} params.convId
   * @param {string} params.title
   */
  constructor({ convId, title }) {
    this.#id = convId;
    this.#title = title;
  }

  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }
}

/**
 * Used to retrieve chat entries for Chat History view
 */
export class ChatHistoryResult {
  #convId;
  #title;
  #createdDate;
  #updatedDate;
  #urls;

  constructor({ convId, title, createdDate, updatedDate, urls }) {
    this.#convId = convId;
    this.#title = title;
    this.#createdDate = createdDate;
    this.#updatedDate = updatedDate;
    this.#urls = urls;
  }

  /**
   * @returns {string}
   */
  get convId() {
    return this.#convId;
  }

  /**
   * @returns {string}
   */
  get title() {
    return this.#title;
  }

  /**
   * @returns {Date}
   */
  get createdDate() {
    return this.#createdDate;
  }

  /**
   * @returns {Date}
   */
  get updatedDate() {
    return this.#updatedDate;
  }

  /**
   * @returns {Array<URL>}
   */
  get urls() {
    return this.#urls;
  }
}
