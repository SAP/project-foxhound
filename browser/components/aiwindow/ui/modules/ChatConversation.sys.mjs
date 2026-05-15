/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  MODEL_FEATURES,
  renderPrompt,
} from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs";

import {
  constructRelevantMemoriesContextMessage,
  constructRealTimeInfoInjectionMessage,
} from "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs";

import { makeGuid, getRoleLabel } from "./ChatUtils.sys.mjs";
import {
  CONVERSATION_STATUS,
  MESSAGE_ROLE,
  SYSTEM_PROMPT_TYPE,
} from "./ChatConstants.sys.mjs";
import {
  AssistantRoleOpts,
  ChatMessage,
  ToolRoleOpts,
  UserRoleOpts,
} from "./ChatMessage.sys.mjs";

const CHAT_ROLES = [MESSAGE_ROLE.USER, MESSAGE_ROLE.ASSISTANT];

/**
 * A conversation containing messages.
 */
export class ChatConversation {
  id;
  title;
  description;
  pageUrl;
  pageMeta;
  createdDate;
  updatedDate;
  status;
  #messages;
  #minNextOrdinal = 0;
  activeBranchTipMessageId;

  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {string} params.title
   * @param {string} params.description
   * @param {URL} params.pageUrl
   * @param {object} params.pageMeta
   * @param {number} [params.createdDate]
   * @param {number} [params.updatedDate]
   * @param {CONVERSATION_STATUS} [params.status]
   * @param {Array<ChatMessage>} [params.messages]
   */
  constructor(params) {
    const {
      id = makeGuid(),
      title,
      description,
      pageUrl,
      pageMeta,
      createdDate = Date.now(),
      updatedDate = Date.now(),
      messages = [],
    } = params;

    this.id = id;
    this.title = title;
    this.description = description;
    this.pageUrl = pageUrl;
    this.pageMeta = pageMeta;
    this.createdDate = createdDate;
    this.updatedDate = updatedDate;
    this.#messages = messages;

    // NOTE: Destructuring params.status causes a linter error
    this.status = params.status || CONVERSATION_STATUS.ACTIVE;
  }

  /**
   * Returns a filtered messages array consisting only of the messages
   * that are meant to be rendered as the chat conversation.
   *
   * @returns {Array<ChatMessage>}
   */
  renderState() {
    return this.#messages.filter(message => {
      const { role, content } = message;
      if (!CHAT_ROLES.includes(role)) {
        return false;
      }
      if (role !== MESSAGE_ROLE.ASSISTANT) {
        return true;
      }
      const { type, body } = content ?? {};
      if (type === "function") {
        return false;
      }
      if (type === "text" && !body) {
        return false;
      }
      return true;
    });
  }

  /**
   * Returns the current turn index for the conversation
   *
   * @returns {number}
   */
  currentTurnIndex() {
    return this.#messages.reduce((turnIndex, message) => {
      return Math.max(turnIndex, message.turnIndex);
    }, 0);
  }

  /**
   * Adds a message to the conversation
   *
   * @param {ConversationRole} role - The type of conversation message
   * @param {object} content - The conversation message contents
   * @param {URL} pageUrl - The current page url when message was submitted
   * @param {number} turnIndex - The current conversation turn/cycle
   * @param {AssistantRoleOpts|ToolRoleOpts|UserRoleOpts} opts - Additional opts for the message
   */
  addMessage(role, content, pageUrl, turnIndex, opts = {}) {
    if (role < 0 || role > MESSAGE_ROLE.TOOL) {
      return;
    }

    if (turnIndex < 0) {
      turnIndex = 0;
    }

    let parentMessageId = null;
    if (this?.messages?.length) {
      const lastMessageIndex = this.messages.length - 1;
      parentMessageId = this.messages[lastMessageIndex].id;
    }

    const convId = this.id;
    const currentMessages = this?.messages || [];
    const maxOrdinal = Math.max(
      this.#minNextOrdinal,
      ...currentMessages.map(m => m.ordinal ?? 0)
    );
    const ordinal = maxOrdinal + 1;

    const messageData = {
      parentMessageId,
      content,
      ordinal,
      pageUrl,
      turnIndex,
      role,
      convId,
      ...opts,
    };

    const newMessage = new ChatMessage(messageData);

    this.messages.push(newMessage);
  }

  /**
   * Add a user message to the conversation
   *
   * @todo Bug 2005424
   * Limit/filter out data uris from message data
   *
   * @param {string} contentBody - The user message content
   * @param {URL?} [pageUrl=null] - The current page url when message was submitted
   * @param {UserRoleOpts} [userOpts=new UserRoleOpts()] - User message options
   * @param {object} [userContext={}] - Contextual information for the user message, such as real time info and relevant memories
   */
  addUserMessage(
    contentBody,
    pageUrl = null,
    userOpts = new UserRoleOpts(),
    userContext = {}
  ) {
    const content = {
      type: "text",
      body: contentBody,
      userContext,
    };

    if (userOpts.contextMentions?.length) {
      content.contextMentions = userOpts.contextMentions;
    }

    let currentTurn = this.currentTurnIndex();
    const newTurnIndex =
      this.#messages.length === 1 ? currentTurn : currentTurn + 1;

    this.addMessage(
      MESSAGE_ROLE.USER,
      content,
      pageUrl,
      newTurnIndex,
      userOpts
    );
  }

  /**
   * Add an assistant message to the conversation
   *
   * @param {string} type - The assistant message type: text|function
   * @param {string} contentBody - The assistant message content
   * @param {AssistantRoleOpts} [assistantOpts=new AssistantRoleOpts()] - ChatMessage options specific to assistant messages
   */
  addAssistantMessage(
    type,
    contentBody,
    assistantOpts = new AssistantRoleOpts()
  ) {
    const content = {
      type,
      body: contentBody,
    };

    this.addMessage(
      MESSAGE_ROLE.ASSISTANT,
      content,
      null,
      this.currentTurnIndex(),
      assistantOpts
    );
  }

  /**
   * Add a tool call message to the conversation
   *
   * @param {object} content - The tool call object to be saved as JSON
   * @param {ToolRoleOpts} [toolOpts=new ToolRoleOpts()] - Message opts for a tool role message
   */
  addToolCallMessage(content, toolOpts = new ToolRoleOpts()) {
    this.addMessage(
      MESSAGE_ROLE.TOOL,
      content,
      null,
      this.currentTurnIndex(),
      toolOpts
    );
  }

  /**
   * Add a system message to the conversation
   *
   * @param {string} type - The assistant message type: text|injected_memories|injected_real_time_info
   * @param {string} contentBody - The system message object to be saved as JSON
   */
  addSystemMessage(type, contentBody) {
    const content = { type, body: contentBody };

    this.addMessage(
      MESSAGE_ROLE.SYSTEM,
      content,
      null,
      this.currentTurnIndex()
    );
  }

  /**
   * Takes a new prompt and generates LLM context messages before
   * adding new user prompt to messages.
   *
   * @param {string} prompt - new user prompt
   * @param {URL} pageUrl - The URL of the page when prompt was submitted
   * @param {openAIEngine} engineInstance
   * @param {UserRoleOpts} [userOpts]
   */
  async generatePrompt(prompt, pageUrl, engineInstance, userOpts = undefined) {
    // Remove stale ephemeral messages before adding new user message
    this.removeSystemTimeMemoriesMessages();

    if (!this.messages.length) {
      const systemPrompt = await engineInstance.loadPrompt(MODEL_FEATURES.CHAT);
      this.addSystemMessage(SYSTEM_PROMPT_TYPE.TEXT, systemPrompt);
    }

    let userContext = {};
    const realTimeContext = await this.getRealTimeInfo(engineInstance, {
      contextMentions: userOpts?.contextMentions,
    });
    if (realTimeContext) {
      userContext[realTimeContext] = realTimeContext;
    }

    if (userOpts?.memoriesEnabled) {
      const memoriesContext = await this.getMemoriesContext(
        prompt,
        engineInstance
      );
      if (memoriesContext) {
        userContext[memoriesContext] = memoriesContext;
      }
    }
    this.addUserMessage(prompt, pageUrl, userOpts, userContext);

    return this;
  }

  /**
   * Removes the given user message and all messages after it from the
   * in-memory conversation, filtering out ephemeral system messages and
   * preserving the highest ordinal so future messages never reuse one.
   * The caller is responsible for deleting the returned messages from
   * the database and re-generating the response.
   *
   * TODO: Bug 2016249 - Rename to something like truncateFromMessage() and
   * consider moving the chatStore.deleteMessages() call into this method.
   *
   * @param {ChatMessage} message
   *
   * @returns {Array<ChatMessage>} - Array of messages removed from the conversation
   */
  async retryMessage(message) {
    if (message.role !== MESSAGE_ROLE.USER) {
      throw new Error("Not a user message");
    }

    // Capture ephemeral system messages before removal so we can return them.
    const ephemeralMessages = this.#messages.filter(
      m =>
        m.role === MESSAGE_ROLE.SYSTEM &&
        (m.content?.type === SYSTEM_PROMPT_TYPE.REAL_TIME ||
          m.content?.type === SYSTEM_PROMPT_TYPE.MEMORIES)
    );

    // Remove ephemeral system messages (they'll be re-added by generatePrompt).
    this.removeSystemTimeMemoriesMessages();

    // Preserve the highest ordinal so addMessage() never reuses one.
    this.#minNextOrdinal = Math.max(
      this.#minNextOrdinal,
      ...this.#messages.map(m => m.ordinal ?? 0)
    );

    const retryMessageIndex = this.#messages.findIndex(
      chatMessage => message.id === chatMessage.id
    );

    if (retryMessageIndex === -1) {
      throw new Error("Unrelated message");
    }

    const toDeleteMessages = this.#messages.splice(retryMessageIndex);
    return [...ephemeralMessages, ...toDeleteMessages];
  }

  /**
   * Removes context system messages (real-time context, memories) that should be
   * regenerated on each turn. These messages contain time-sensitive data that becomes
   * stale between conversation turns.
   */
  removeSystemTimeMemoriesMessages() {
    this.messages = this.messages.filter(message => {
      const isRealTimeInjection =
        message.role === MESSAGE_ROLE.SYSTEM &&
        message.content?.type === SYSTEM_PROMPT_TYPE.REAL_TIME;

      const isMemoriesInjection =
        message.role === MESSAGE_ROLE.SYSTEM &&
        message.content?.type === SYSTEM_PROMPT_TYPE.MEMORIES;

      return !isRealTimeInjection && !isMemoriesInjection;
    });
  }

  /**
   * Gets the real time brower tab data for a new chat message and
   * adds a system message if the real time data API function
   * returns content.
   *
   * @typedef {
   *   (depsOverride?: object) => Promise<{url, title, description, locale, timezone, isoTimestamp, todayDate, hasTabInfo}>
   * } RealTimeApiFunction
   *
   * @param {openAIEngine} engineInstance - The initialized engine instance
   * @param {object} [options]
   * @param {RealTimeApiFunction} [options.getRealTimeMapping=constructRealTimeInfoInjectionMessage]
   * @param {ContextWebsite[]} [options.contextMentions]
   *   URLs provided by the user as additional context
   *
   * @returns {Promise<string|null>} - Promise that resolves with real time info or null
   */
  async getRealTimeInfo(
    engineInstance,
    {
      getRealTimeMapping = constructRealTimeInfoInjectionMessage,
      contextMentions,
    } = {}
  ) {
    const realTimeInfoMapping = await getRealTimeMapping();
    if (realTimeInfoMapping) {
      let realTimePromptRaw = await engineInstance.loadPrompt(
        MODEL_FEATURES.REAL_TIME_CONTEXT_DATE
      );
      if (realTimeInfoMapping.hasTabInfo) {
        const realTimeTabPromptRaw = await engineInstance.loadPrompt(
          MODEL_FEATURES.REAL_TIME_CONTEXT_TAB
        );
        realTimePromptRaw += realTimeTabPromptRaw;
      } else {
        delete realTimeInfoMapping.url;
        delete realTimeInfoMapping.title;
        delete realTimeInfoMapping.description;
      }
      delete realTimeInfoMapping.hasTabInfo;

      if (contextMentions?.length) {
        const contextUrls = contextMentions
          .map(mention => `- ${mention.label} (${mention.url})`)
          .join("\n");
        realTimeInfoMapping.contextUrls = contextUrls;
        const contextMentionsPrompt = await engineInstance.loadPrompt(
          MODEL_FEATURES.REAL_TIME_CONTEXT_MENTIONS
        );
        realTimePromptRaw += contextMentionsPrompt;
      }

      const realTimePrompt = renderPrompt(
        realTimePromptRaw,
        realTimeInfoMapping
      );
      return realTimePrompt ?? null;
    }
    return null;
  }

  /**
   * Gets the memories for a new chat message and adds
   * a system message if the memories API function returns
   * content.
   *
   * @todo Bug2009434
   * Rename type and change enum to renamed values
   *
   * @typedef {{
   *    role: string;
   *    tool_call_id: string;
   *    content: string;
   *  }} MemoryApiFunctionReturn
   *
   *  @typedef {
   *    (message: string) => Promise<null | MemoryApiFunctionReturn>
   *  } MemoriesApiFunction
   *
   * @param {message} message
   * @param {openAIEngine} engineInstance
   * @param {MemoriesApiFunction} [constructMemories=constructRelevantMemoriesContextMessage]
   *
   * @returns {Promise<string|null>} - Promise that resolves with relevant memories or null
   */
  async getMemoriesContext(
    message,
    engineInstance,
    constructMemories = constructRelevantMemoriesContextMessage
  ) {
    const memoriesContext = await constructMemories(message, engineInstance);
    return memoriesContext?.content ?? null;
  }

  /**
   * Retrieves the list of visited sites during a conversation in visited order.
   * Primarily used to retrieve external URLs that the user had a conversation
   * around to display in Chat History view.
   *
   * @param {boolean} [includeInternal=false] - Whether to include internal Firefox URLs
   *
   * @returns {Array<URL>} - Ordered list of visited page URLs for this conversation
   */
  getSitesList(includeInternal = false) {
    const seen = new Set();
    const deduped = [];

    this.messages.forEach(message => {
      if (!message.pageUrl) {
        return;
      }

      if (!includeInternal && !message.pageUrl.protocol.startsWith("http")) {
        return;
      }

      if (!seen.has(message.pageUrl.href)) {
        seen.add(message.pageUrl.href);
        deduped.push(message.pageUrl);
      }
    });

    return deduped;
  }

  /**
   * Returns the most recently visited external sites during this conversation, or null
   * if no external sites have been visited.
   *
   * @returns {URL|null}
   */
  getMostRecentPageVisited() {
    const sites = this.getSitesList();

    return sites.length ? sites.pop() : null;
  }

  /**
   * Converts the persisted message data to OpenAI API format
   *
   * @returns {Array<{ role: string, content: string }>}
   */
  getMessagesInOpenAiFormat() {
    const filteredMsgs = this.#messages.filter(message => {
      return !(
        message.role === MESSAGE_ROLE.ASSISTANT && !message?.content?.body
      );
    });
    const msgsForAPI = filteredMsgs.map(message => {
      const msg = {
        role: getRoleLabel(message.role).toLowerCase(),
        content: message.content?.body ?? message.content,
      };

      if (msg.content.tool_calls) {
        msg.tool_calls = msg.content.tool_calls;
        msg.content = "";
      }

      if (msg.role === "tool") {
        msg.tool_call_id = message.content.tool_call_id;
        msg.name = message.content.name;
        msg.content = JSON.stringify(message.content.body);
      }

      return msg;
    });

    // Inject contextual messages immediately before the last user message, like real time info and relevant memories as USER role messages
    const lastUserMsgIdx = filteredMsgs.findLastIndex(
      msg => msg.role == MESSAGE_ROLE.USER
    );

    if (lastUserMsgIdx > -1) {
      const contextMsgs = Object.values(
        filteredMsgs[lastUserMsgIdx].content.userContext
      ).map(contextMsg => ({
        role: getRoleLabel(MESSAGE_ROLE.USER).toLowerCase(),
        content: contextMsg,
      }));
      msgsForAPI.splice(lastUserMsgIdx, 0, ...contextMsgs);
    }

    return msgsForAPI;
  }

  #updateActiveBranchTipMessageId() {
    this.activeBranchTipMessageId = this.messages
      .filter(m => m.isActiveBranch)
      .sort((a, b) => b.ordinal - a.ordinal)
      .shift()?.id;
  }

  set messages(value) {
    this.#messages = value;
    this.#updateActiveBranchTipMessageId();
  }

  get messages() {
    return this.#messages;
  }
}
