/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { makeGuid } from "./ChatUtils.sys.mjs";

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
  content;
  convId;
  pageUrl;
  turnIndex;
  memoriesEnabled;
  memoriesFlagSource;
  memoriesApplied;
  webSearchQueries;

  /**
   * @param {object} param
   * @param {number} param.ordinal - The order of the message
   * @param {MessageRole} param.role - The message role
   * @param {object} param.content - The message content object
   * @param {number} param.turnIndex - The message turn, different than ordinal,
   * prompt/reply for example would be one turn
   * @param {URL} [param.pageUrl = null] - A URL object defining which page
   * the user was on when submitting a message if role == user
   * @param {string} [param.id = makeGuid()] - The row.message_id of the
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
   */
  constructor({
    ordinal,
    role,
    content,
    turnIndex,
    pageUrl = null,
    id = makeGuid(),
    createdDate = Date.now(),
    parentMessageId = null,
    convId = null,
    memoriesEnabled = null,
    memoriesFlagSource = null,
    memoriesApplied = null,
    webSearchQueries = null,
    params = null,
    usage = null,
    modelId = null,
    revisionRootMessageId = id,
    isActiveBranch = true,
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
   */
  constructor(
    modelId = null,
    params = null,
    usage = null,
    memoriesEnabled = false,
    memoriesFlagSource = null,
    memoriesApplied = [],
    webSearchQueries = []
  ) {
    this.memoriesEnabled = memoriesEnabled;
    this.memoriesFlagSource = memoriesFlagSource;
    this.memoriesApplied = memoriesApplied;
    this.webSearchQueries = webSearchQueries;
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
