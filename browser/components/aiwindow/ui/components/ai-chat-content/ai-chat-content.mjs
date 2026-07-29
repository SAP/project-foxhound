/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/assistant-message-footer.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/chat-assistant-error.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/chat-assistant-loader.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/website-chip-container.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/ai-website-confirmation.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/kit-mention.mjs";

const FOLLOW_UP_QTY = 2;
/**
 * UI labels for tool results and follow-ups.
 */
const UI_TYPES = {
  WEBSITE_CONFIRMATION: "website-confirmation",
  AI_ACTION_RESULT: "ai-action-result",
  CANCELLED_COMPONENT: "cancelled-component",
  ACTION_LOG: "action-log",
  RETRY_COMPONENT: "retry-component",
};
/**
 * UI update types for communicating user interactions with tool UIs back to the actor.
 */
const UI_UPDATE_TYPES = {
  CONFIRMATION_TAB_SELECTION: "confirmation-tab-selection",
  CANCEL_TAB_SELECTION: "cancel-tab-selection",
  UNDO_TAB_CLOSE: "undo-tab-close",
  RETRY_PROMPT: "retry-prompt",
};

/**
 * A custom element for managing AI Chat Content
 */
export class AIChatContent extends MozLitElement {
  static properties = {
    assistantIsLoading: { type: Boolean },
    assistantResponseAnnouncement: { type: String, state: true },
    conversationState: { type: Array },
    followUpSuggestions: { type: Array },
    errorObj: { type: Object },
    isSearching: { type: Boolean },
    tokens: { type: Object },
    seenUrls: { type: Object },
    conversationId: { type: String },
  };

  #lastScrollReq = null;
  #overflowObserver = null;
  #scrollHandler = null;
  #scrollClickHandler = null;
  #scrollRafId = null;
  #pendingAnnouncementMessageId = null;
  #scrollPositions = new Map();

  /**
   * Content-side mirror of the current conversation's history results pool,
   * synced from the parent via `aiChatContentActor:history-results`. The
   * canonical pool lives on the parent `ChatConversation`; this copy is a render
   * cache, reset whenever the displayed conversation changes. The active
   * (streaming) message binds this live pool; a message freezes a snapshot of it
   * when it completes so later searches can't retroactively alter it.
   *
   * @type {Map<string, object>}
   */
  #historyResultsPool = new Map();

  constructor() {
    super();
    this.assistantIsLoading = false;
    this.assistantResponseAnnouncement = "";
    this.conversationState = [];
    this.followUpSuggestions = [];
    this.errorObj = null;
    this.isSearching = false;

    /**
     * The set of URLs that have been seen by the conversation. Used for determining
     * if a URL will be unfurled or not.
     *
     * @type {Set<string>}
     */
    this.seenUrls = new Set();

    /**
     * The current conversationId for the seenUrls.
     *
     * @type {null | string}
     */
    this.conversationId = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#initEventListeners();

    this.dispatchEvent(
      new CustomEvent("AIChatContent:Ready", { bubbles: true })
    );
    this.#initFooterActionListeners();
    this.#initOverflowObserver();
    this.#initScrollListener();
    this.#scrollPositions.clear();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#overflowObserver?.disconnect();
    this.#overflowObserver = null;
    this.#teardownScrollListener();
  }

  #dispatchAction(action, detail) {
    this.dispatchEvent(
      new CustomEvent("AIChatContent:DispatchAction", {
        bubbles: true,
        composed: true,
        detail: {
          action,
          ...(detail ?? {}),
        },
      })
    );
  }

  /**
   * Initialize event listeners for AI chat content events
   */

  #initEventListeners() {
    this.addEventListener(
      "aiChatContentActor:message",
      this.messageEvent.bind(this)
    );

    this.addEventListener(
      "aiChatContentActor:truncate",
      this.truncateEvent.bind(this)
    );

    this.addEventListener(
      "aiChatContentActor:remove-applied-memory",
      this.removeAppliedMemoryEvent.bind(this)
    );

    this.addEventListener(
      "aiChatContentActor:seen-urls",
      this.#handleSeenUrls.bind(this)
    );

    this.addEventListener(
      "aiChatContentActor:set-generating",
      this.#handleSetGenerating.bind(this)
    );

    this.addEventListener(
      "aiChatContentActor:assets-ready",
      this.#handleAssetsReady.bind(this)
    );

    this.addEventListener(
      "aiChatContentActor:history-results",
      this.#handleHistoryResults.bind(this)
    );

    this.addEventListener(
      "aiChatError:retry-message",
      this.retryUserMessageAfterError.bind(this)
    );

    this.addEventListener(
      "SmartWindowPrompt:prompt-selected",
      this.#onFollowUpSelected.bind(this)
    );

    this.addEventListener(
      "aiChatError:new-chat",
      this.openNewChatAfterError.bind(this)
    );

    this.addEventListener(
      "aiChatError:sign-in",
      this.openAccountSignInAfterError.bind(this)
    );

    this.addEventListener("ai-chat-message:complete", event => {
      const { messageId, text } = event.detail ?? {};
      if (messageId && messageId === this.#pendingAnnouncementMessageId) {
        this.#pendingAnnouncementMessageId = null;
        this.assistantResponseAnnouncement = text || "";
      }
    });
  }

  /**
   * Initialize event listeners for footer actions (retry, copy, etc.)
   * emitted by child components.
   */

  #initFooterActionListeners() {
    this.addEventListener("copy-message", event => {
      const { messageId } = event.detail ?? {};
      const text = this.#getAssistantMessageBody(messageId);
      this.#dispatchAction("copy", { messageId, text });
    });

    this.addEventListener("copy-table", event => {
      const { messageId, lineRange } = event.detail ?? {};
      const text = this.#getAssistantMessageBody(messageId);
      const tableMarkdown = text
        .split("\n")
        .slice(lineRange[0], lineRange[1])
        .join("\n");
      this.#dispatchAction("copy-table", { messageId, text: tableMarkdown });
    });

    this.addEventListener("retry-message", event => {
      this.#dispatchAction("retry", event.detail);
    });

    this.addEventListener("retry-without-memories", event => {
      this.#dispatchAction("retry-without-memories", event.detail);
    });

    this.addEventListener("remove-applied-memory", event => {
      this.#dispatchAction("remove-applied-memory", event.detail);
    });

    this.addEventListener("toggle-applied-memories", event => {
      this.#dispatchAction("toggle-applied-memories", event.detail);
    });

    this.addEventListener("manage-memories", event => {
      this.#dispatchAction("manage-memories", event.detail);
    });

    this.addEventListener("open-memories-learn-more", event => {
      this.#dispatchAction("open-memories-learn-more", event.detail);
    });

    this.addEventListener("thumbs-up", event => {
      this.#dispatchAction("thumbs-up", event.detail);
    });

    this.addEventListener("thumbs-down", event => {
      this.#dispatchAction("thumbs-down", event.detail);
    });
  }

  #initOverflowObserver() {
    this.#overflowObserver = new ResizeObserver(() => {
      const wrapper = this.shadowRoot.querySelector(".chat-content-wrapper");
      const innerWrapper = this.shadowRoot.querySelector(".chat-inner-wrapper");

      if (!wrapper || !innerWrapper) {
        return;
      }

      const hasContent = innerWrapper.children.length;
      // Use a 10px threshold to avoid false positives from layout differences
      const thresholdPadding = 10;

      wrapper.toggleAttribute(
        "overflowing",
        hasContent &&
          wrapper.scrollHeight > wrapper.clientHeight + thresholdPadding
      );
    });
    this.updateComplete.then(() => {
      this.#overflowObserver.observe(
        this.shadowRoot.querySelector(".chat-inner-wrapper")
      );
    });
  }

  get #wrapper() {
    return this.shadowRoot?.querySelector(".chat-content-wrapper");
  }

  get #jumpButton() {
    return this.shadowRoot?.querySelector(".jump-to-bottom-button");
  }

  #initScrollListener() {
    this.updateComplete.then(() => {
      if (!this.isConnected) {
        return;
      }
      const wrapper = this.#wrapper;
      const btn = this.#jumpButton;
      if (!wrapper || !btn) {
        return;
      }
      this.#scrollHandler = () => {
        if (this.#scrollRafId) {
          return;
        }
        this.#scrollRafId = requestAnimationFrame(() => {
          this.#scrollRafId = null;
          const distanceFromBottom =
            wrapper.scrollHeight - wrapper.scrollTop - wrapper.clientHeight;
          const threshold = wrapper.clientHeight * 0.5;
          const show = distanceFromBottom > threshold;
          const atBottom = distanceFromBottom < 1;
          if (btn.hasAttribute("visible") !== show) {
            btn.toggleAttribute("visible", show);
            btn.toggleAttribute("disabled", !show);
          }
          if (wrapper.hasAttribute("scrolled-to-bottom") !== atBottom) {
            wrapper.toggleAttribute("scrolled-to-bottom", atBottom);
          }
        });
      };
      this.#scrollClickHandler = () => {
        wrapper.scrollTop = wrapper.scrollHeight;
      };
      wrapper.addEventListener("scroll", this.#scrollHandler);
      btn.addEventListener("click", this.#scrollClickHandler);
    });
  }

  #teardownScrollListener() {
    if (this.#scrollRafId) {
      cancelAnimationFrame(this.#scrollRafId);
      this.#scrollRafId = null;
    }
    if (this.#scrollHandler) {
      this.#wrapper?.removeEventListener("scroll", this.#scrollHandler);
      this.#scrollHandler = null;
    }
    if (this.#scrollClickHandler) {
      this.#jumpButton?.removeEventListener("click", this.#scrollClickHandler);
      this.#scrollClickHandler = null;
    }
  }

  #getAssistantMessageBody(messageId) {
    if (!messageId) {
      return "";
    }

    const msg = this.conversationState.find(m => {
      return m?.role === "assistant" && m?.messageId === messageId;
    });

    return msg?.body ?? "";
  }

  #onFollowUpSelected(event) {
    event.stopPropagation();
    this.followUpSuggestions = [];
    this.dispatchEvent(
      new CustomEvent("AIChatContent:DispatchFollowUp", {
        detail: { text: event.detail.text },
        bubbles: true,
      })
    );
  }

  /**
   * Add new seen URLs to the current conversation.
   *
   * @param {object} event
   * @param {object} event.detail
   * @param {string} event.detail.conversationId
   * @param {Set<string>} event.detail.seenUrls
   */
  #handleSeenUrls({ detail: { conversationId, seenUrls } }) {
    if (this.conversationId == conversationId) {
      this.seenUrls = this.seenUrls.union(seenUrls);
    } else {
      this.conversationId = conversationId;
      this.seenUrls = seenUrls;
    }
  }

  messageEvent(event) {
    const message = event.detail;

    if (message?.content?.isError) {
      this.handleErrorEvent(message?.content);
      return;
    }

    this.errorObj = null;

    switch (message.role) {
      case "loading":
        this.#checkConversationState(message);
        this.handleLoadingEvent(event);
        break;
      case "assistant":
        this.#checkConversationState(message);
        this.handleAIResponseEvent(event);
        break;
      case "tool":
        this.#checkConversationState(message);
        this.handleToolMessageEvent(event);
        break;
      case "user":
        this.#checkConversationState(message);
        this.handleUserPromptEvent(event);
        break;
      case "assistant-message-complete":
        this.#setMessageComplete(message);
        break;
      case "restored-all-messages-in-a-conversation":
        this.#restoreChatScrollPosition(message.convId);
        break;
      // Used to clear the conversation state via side effects ( new conv id )
      case "clear-conversation":
        this.#checkConversationState(message);
    }
  }

  #handleSetGenerating(event) {
    this.assistantIsLoading = !!event.detail?.isGenerating;
    if (!this.assistantIsLoading) {
      this.isSearching = false;
    }
    this.requestUpdate();
  }

  /**
   * Apply the history assets resolved by the parent (page thumbnail and favicon
   * status) to a message's history results. Reassigns a fresh historyResults
   * Map so the ai-chat-message sees a changed reference and recalculates its
   * grid loading state.
   *
   * @param {CustomEvent} event
   * @param {string} event.detail.messageId
   * @param {Array<{url: string, image: string|null, hasFavicon: boolean}>} event.detail.images
   */
  #handleAssetsReady(event) {
    const { messageId, images } = event.detail ?? {};
    if (!messageId || !images?.length) {
      return;
    }

    const entry = this.conversationState.find(
      msg => msg?.messageId === messageId
    );

    if (!entry?.historyResults) {
      return;
    }

    let changed = false;
    for (const { url, image, hasFavicon } of images) {
      const record = entry.historyResults.get(url);
      if (!record) {
        continue;
      }
      if (record.image !== image) {
        record.image = image;
        changed = true;
      }
      if (record.hasFavicon !== hasFavicon) {
        record.hasFavicon = hasFavicon;
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    entry.historyResults = new Map(entry.historyResults);
    this.requestUpdate();
  }

  /**
   * Sync the conversation-level history results pool from the parent (fired only
   * when a search_browsing_history tool call is invoked) and hand the live pool
   * to the active streaming message so it can hide/reveal lists as they stream.
   * Completed messages keep their frozen snapshots.
   *
   * @param {CustomEvent} event
   * @param {object[]} event.detail.records
   */
  #handleHistoryResults(event) {
    const { records } = event.detail ?? {};
    if (!records?.length) {
      return;
    }

    // Preserve any content-applied thumbnail on records we already hold.
    for (const record of records) {
      if (!this.#historyResultsPool.has(record.url)) {
        this.#historyResultsPool.set(record.url, record);
      }
    }

    const active = this.conversationState.findLast(
      msg => msg?.role === "assistant" && !msg.isLastChunk
    );

    if (active) {
      active.historyResults = new Map(this.#historyResultsPool);
      this.requestUpdate();
    }
  }

  async #restoreChatScrollPosition(convId) {
    await this.updateComplete;

    // Making sure we check if convId hasn't changed while we awaited
    const lastMessage = this.conversationState.findLast(
      m => m.convId === convId
    );
    if (!lastMessage) {
      return;
    }

    // Wait a frame to ensure the footer and its children are visible
    await new Promise(r =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );

    const wrapper = this.#wrapper;
    if (!wrapper) {
      return;
    }

    const savedPosition = this.#scrollPositions.get(convId);
    if (savedPosition?.contentHeight) {
      this.shadowRoot
        ?.querySelector(".chat-inner-wrapper")
        ?.style.setProperty("--content-height", savedPosition.contentHeight);
    }

    const goToBottom =
      !savedPosition ||
      savedPosition.wasAtBottom ||
      savedPosition.wasWaitingForResponse;

    if (!goToBottom) {
      wrapper.scrollTo({
        top: savedPosition.scrollTop,
        behavior: "instant",
      });
      return;
    }

    const lastChild = this.shadowRoot.querySelector(
      ".chat-inner-wrapper"
    )?.lastElementChild;
    if (lastChild) {
      lastChild.scrollIntoView({ block: "end", behavior: "instant" });
      return;
    }
    wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: "instant" });
  }

  get #kitMention() {
    return this.shadowRoot?.querySelector("kit-mention");
  }

  #setMessageComplete(message) {
    const messageId = message.content?.id;
    if (!messageId) {
      return;
    }

    // Seed the pool from the snapshot carried on the completion event. The
    // streaming-time history-results dispatch races the message lifecycle and
    // can arrive late, be missed, or be cleared by a conversation reset; the
    // completion snapshot makes the grid render deterministically. Don't
    // clobber records we already hold (they may carry a resolved thumbnail).
    for (const record of message.historyResults ?? []) {
      if (!this.#historyResultsPool.has(record.url)) {
        this.#historyResultsPool.set(record.url, record);
      }
    }

    const assistantLastMessage = this.conversationState.findLast(
      msg => msg?.messageId === messageId
    );

    if (assistantLastMessage) {
      assistantLastMessage.isLastChunk = true;
      // Freeze a snapshot of the current pool so this message matches the URLs
      // it lists; later searches grow the pool but won't alter this message.
      if (this.#historyResultsPool.size) {
        assistantLastMessage.historyResults = new Map(this.#historyResultsPool);
      }
    }

    this.#pendingAnnouncementMessageId = messageId;
    this.assistantResponseAnnouncement = "";
    this.requestUpdate();
  }

  #clearAssistantResponseAnnouncement() {
    this.#pendingAnnouncementMessageId = null;
    this.assistantResponseAnnouncement = "";
  }

  /**
   * Check if conversationState needs to be cleared
   *
   * @param {ChatMessage} message
   */
  #checkConversationState(message) {
    // Use find/findLast instead of at(0)/at(-1) because
    // conversationState is a sparse array indexed by ordinal and
    // at() can land on a hole (undefined) after truncation.
    const lastMessage = this.conversationState.findLast(m => m);
    const firstMessage = this.conversationState.find(m => m);
    const isReloadingSameConvo =
      firstMessage &&
      firstMessage.convId === message.convId &&
      firstMessage.ordinal === message.ordinal;
    const convIdChanged = message.convId !== lastMessage?.convId;

    if (convIdChanged && lastMessage?.convId && this.#wrapper) {
      this.saveScrollPosition(lastMessage, this.#wrapper);
    }

    // If the conversation ID has changed, reset the conversation state
    if (convIdChanged || isReloadingSameConvo) {
      this.conversationState = [];
      this.#historyResultsPool = new Map();
      this.followUpSuggestions = [];
      this.#clearAssistantResponseAnnouncement();
      this.isSearching = false;
      this.#kitMention?.reset();
      if (convIdChanged) {
        this.shadowRoot
          ?.querySelector(".chat-inner-wrapper")
          ?.style.removeProperty("--content-height");
      }
      this.requestUpdate();
    }
  }

  /* Saves the scroll position when we switch tabs */
  saveScrollPosition(lastMessage, wrapper) {
    const innerWrapper = this.shadowRoot.querySelector(".chat-inner-wrapper");

    // if element is near the bottom (50px or less)
    // we scroll all the way to the end as default
    let wasAtBottom = true;
    const lastChild = innerWrapper?.lastElementChild;
    if (lastChild) {
      const lastChildRect = lastChild.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      wasAtBottom = lastChildRect.bottom <= wrapperRect.bottom + 50;
    }

    const wasWaitingForResponse =
      this.assistantIsLoading ||
      this.isSearching ||
      lastMessage.role !== "assistant" ||
      !lastMessage.isLastChunk;

    this.#scrollPositions.set(lastMessage.convId, {
      scrollTop: wrapper.scrollTop,
      wasAtBottom,
      wasWaitingForResponse,
      contentHeight:
        innerWrapper?.style.getPropertyValue("--content-height") || null,
    });
  }

  handleLoadingEvent(event) {
    const { isSearching } = event.detail;
    this.#clearAssistantResponseAnnouncement();
    this.isSearching = !!isSearching;
    this.requestUpdate();
  }

  handleErrorEvent(error) {
    this.isSearching = false;
    this.errorObj = error;
    this.requestUpdate();
  }

  /**
   * Handle tool role messages produced when a toolcall completes
   *
   * @param {CustomEvent} event
   */
  handleToolMessageEvent(event) {
    const { convId, ordinal, content, actionLog } = event.detail ?? {};

    if (!content?.name || !actionLog?.uiType) {
      return;
    }

    // uiTypes that this conversation knows how to render as tool UI
    const ACCEPTED_UI_TYPES = [UI_TYPES.ACTION_LOG];
    if (!ACCEPTED_UI_TYPES.includes(actionLog.uiType)) {
      return;
    }

    this.conversationState[ordinal] = {
      role: "tool",
      uiType: actionLog.uiType,
      convId,
      ordinal,
      toolCallId: content.tool_call_id,
      toolName: content.name,
      pendingLabel: actionLog.pendingLabel,
      row: actionLog.row,
    };

    this.requestUpdate();
  }

  /**
   *  Handle user prompt events
   *
   * @param {CustomEvent} event - The custom event containing the user prompt
   */

  handleUserPromptEvent(event) {
    this.followUpSuggestions = [];
    const { convId, content, ordinal, isPreviousMessage } = event.detail;
    if (!isPreviousMessage) {
      this.#clearAssistantResponseAnnouncement();
    }
    this.conversationState[ordinal] = {
      role: "user",
      body: content.body,
      contextMentions: content.contextMentions,
      pageUrl: content.contextPageUrl ?? null,
      convId,
      ordinal,
    };
    this.requestUpdate();
    if (!isPreviousMessage) {
      this.#scrollUserMessageIntoView();
    }
  }

  retryUserMessageAfterError() {
    const lastMessage = this.conversationState.findLast(m => m);

    if (!lastMessage) {
      return;
    }

    this.#dispatchAction("retry-after-error", {
      ...lastMessage,
      content: {
        type: "text",
        body: lastMessage.body,
        contextMentions: lastMessage.contextMentions,
      },
    });
  }

  #isAIResponseValid(content, toolUIData) {
    return (typeof content?.body === "string" && content.body) || !!toolUIData;
  }

  /**
   * Handle AI response events
   *
   * @param {CustomEvent} event - The custom event containing the response
   */

  handleAIResponseEvent(event) {
    this.isSearching = false;

    const {
      convId,
      ordinal,
      id: messageId,
      content,
      memoriesApplied,
      showMemoriesCallout,
      webSearchQueries = [],
      followUpSuggestions = [],
      isPreviousMessage,
      toolUIData,
      kit,
      isRestored,
    } = event.detail;

    if (!this.#isAIResponseValid(content, toolUIData)) {
      return;
    }

    // favor web search display over follow ups.
    this.followUpSuggestions = webSearchQueries.length
      ? []
      : followUpSuggestions.slice(0, FOLLOW_UP_QTY);

    const isLastChunk =
      !!isPreviousMessage || !!this.conversationState[ordinal]?.isLastChunk;

    let historyResults;
    if (isLastChunk) {
      // A completed message keeps its frozen snapshot
      historyResults = this.conversationState[ordinal]?.historyResults;
    } else if (this.#historyResultsPool.size) {
      // A streaming message binds the live pool so it can
      // hide/reveal lists as items arrive.
      historyResults = new Map(this.#historyResultsPool);
    }

    this.conversationState[ordinal] = {
      role: "assistant",
      convId,
      messageId,
      body: content.body,
      appliedMemories: memoriesApplied ?? [],
      showCallout: showMemoriesCallout ?? false,
      isLastChunk,
      toolUIData,
      historyResults,
      isRestored,
    };

    if (kit && !isPreviousMessage) {
      this.#kitMention?.trigger({ value: kit, convId });
    }

    this.requestUpdate();
  }

  #scrollUserMessageIntoView() {
    let scrollReq = {};
    this.#lastScrollReq = scrollReq;
    this.updateComplete.then(() => {
      const msgs = this.shadowRoot?.querySelectorAll(".chat-bubble-user");
      if (!msgs?.length) {
        return;
      }
      let lastMessage = msgs[msgs.length - 1];
      requestAnimationFrame(() => {
        if (scrollReq !== this.#lastScrollReq) {
          return;
        }
        let elTop = lastMessage.offsetTop;
        lastMessage.parentNode.style.setProperty(
          "--content-height",
          `calc(${elTop}px + 100% - var(--smart-window-top-spacing-chat))`
        );

        requestAnimationFrame(() => {
          if (scrollReq == this.#lastScrollReq) {
            lastMessage.scrollIntoView({ block: "start" });
          }
        });
      });
    });
  }

  truncateEvent(event) {
    const { messageId } = event.detail ?? {};
    if (!messageId) {
      return;
    }

    const idx = this.conversationState.findIndex(m => {
      return m?.role === "assistant" && m?.messageId === messageId;
    });

    if (idx === -1) {
      return;
    }

    this.conversationState = this.conversationState.slice(0, idx);
    this.requestUpdate();
  }

  removeAppliedMemoryEvent(event) {
    const { messageId, memoryId } = event.detail ?? {};
    const msg = this.conversationState.find(m => {
      return m?.role === "assistant" && m?.messageId === messageId;
    });

    msg.appliedMemories = msg.appliedMemories.filter(
      memory => memory?.id !== memoryId
    );
    this.requestUpdate();
  }

  openNewChatAfterError() {
    const event = new CustomEvent("AIChatContent:DispatchNewChat", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  /**
   * Returns the chips to display for a message, suppressing the current-tab
   * chip when the page context hasn't changed since the previous user message.
   *
   * @param {object} msg - A conversationState entry.
   * @param {string|null} lastContextPageUrl - The page URL of the preceding
   * user message, or undefined if there is none.
   * @returns {ContextWebsite[]}
   */
  #getVisibleChips(msg, lastContextPageUrl) {
    // If this message is on the same page as the previous message,
    // hide the page URL chip to avoid showing duplicate page context
    if (!msg || msg.role !== "user" || !msg.contextMentions?.length) {
      return [];
    }
    const currentPageUrl = msg.pageUrl;
    const shouldHideDuplicatePageChip =
      currentPageUrl && currentPageUrl === lastContextPageUrl;
    if (shouldHideDuplicatePageChip) {
      return msg.contextMentions.filter(
        chip => URL.parse(chip.url)?.href !== currentPageUrl
      );
    }
    return msg.contextMentions;
  }

  openAccountSignInAfterError() {
    const event = new CustomEvent("AIChatContent:AccountSignIn", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  #getCloseTabsData(confirmedData) {
    const selectedTabs = confirmedData.selectedTabs || [];
    const tabCount = selectedTabs.length;

    // Format rows to show the closed tabs
    const rows = [];
    if (selectedTabs.length) {
      rows.push({
        labelL10nId: "smart-window-closed-tabs-row-label",
        items: selectedTabs.map(tab => ({
          url: tab.url,
          label: tab.title,
        })),
      });
    }

    return {
      labelL10nId: "smart-window-closed-tabs-label",
      labelL10nArgs: { count: tabCount },
      summaryL10nId: "smart-window-closed-tabs-summary",
      summaryL10nArgs: { count: tabCount },
      rows,
      isExpanded: false,
    };
  }

  #getRestoreTabsData(originalClosedTabs) {
    const restoredCount = originalClosedTabs.length;
    // Format rows to show both closed and restored tabs
    const rows = [
      {
        labelL10nId: "smart-window-closed-tabs-row-label",
        items: originalClosedTabs.map(({ url, title }) => ({
          url,
          label: title,
        })),
      },
      {
        labelL10nId: "smart-window-restored-row-label",
        labelL10nArgs: { count: restoredCount },
        // Design opted out of showing items here.
      },
    ];

    return {
      labelL10nId: "smart-window-closed-and-restored-label",
      summaryL10nId: "smart-window-restore-success-summary",
      summaryL10nArgs: { count: restoredCount },
      rows,
      isExpanded: true,
    };
  }

  /**
   * Render a turn's tool calls as a single grouped action log container
   *
   * @param {Array<object>} toolMsgs - one entry per tool call this turn
   * @param {boolean} isComplete - whether the turn has finished
   */
  #renderActionLogGroup(toolMsgs, isComplete) {
    const finalMessage = {
      l10nId: "action-log-completed-steps",
      l10nArgs: { count: toolMsgs.length },
    };
    const summary = isComplete
      ? finalMessage
      : toolMsgs[toolMsgs.length - 1]?.pendingLabel;
    return html`
      <ai-action-result
        .labelL10nId=${summary?.l10nId}
        .labelL10nArgs=${summary?.l10nArgs}
        .rows=${this.#buildGroupedActionLogRows(toolMsgs)}
        .isExpanded=${false}
      ></ai-action-result>
    `;
  }

  /**
   * Render the appropriate tool UI for a tool message, if applicable.
   *
   * @param {object} msg - A conversationState entry.
   * @returns {TemplateResult|nothing} - The rendered tool UI or nothing if not applicable.
   */
  #renderToolUI(msg) {
    if (!msg.toolUIData) {
      return nothing;
    }

    const toolUIData = msg.toolUIData;

    switch (toolUIData.uiType) {
      case UI_TYPES.WEBSITE_CONFIRMATION:
        return this.#renderWebsiteConfirmation(msg);
      case UI_TYPES.AI_ACTION_RESULT:
        return this.#renderActionResult(msg);
      case UI_TYPES.CANCELLED_COMPONENT:
        return this.#renderCancelledComponent();
      case UI_TYPES.RETRY_COMPONENT:
        return this.#renderRetryComponent(msg);
      default:
        return nothing;
    }
  }

  #handleConfirmationSubmit = (event, messageId, toolCallId) => {
    this.#dispatchToolUIUpdate({
      messageId,
      toolCallId,
      updateType: UI_UPDATE_TYPES.CONFIRMATION_TAB_SELECTION,
      updateData: event.detail,
    });
  };

  #handleConfirmationClose = (event, messageId, toolCallId) => {
    this.#dispatchToolUIUpdate({
      messageId,
      toolCallId,
      updateType: UI_UPDATE_TYPES.CANCEL_TAB_SELECTION,
      updateData: event.detail,
    });
  };

  #renderWebsiteConfirmation(msg) {
    const toolUIData = msg.toolUIData;
    // For restored website confirmations, show a retry component instead
    if (msg.isRestored) {
      return this.#renderRetryComponent(msg);
    }

    return html`
      <ai-website-confirmation
        .tabs=${toolUIData.properties?.tabs || []}
        @ai-website-confirmation:submit=${event =>
          this.#handleConfirmationSubmit(
            event,
            msg.messageId,
            toolUIData.toolCallId
          )}
        @ai-website-confirmation:close=${event =>
          this.#handleConfirmationClose(
            event,
            msg.messageId,
            toolUIData.toolCallId
          )}
      ></ai-website-confirmation>
    `;
  }

  #renderActionResult(msg) {
    const toolUIData = msg.toolUIData;
    // Extract the confirmed selections and operation data
    const confirmedData = toolUIData.properties?.confirmedData || {};
    const wasRestored = confirmedData.wasRestored || false;

    // Get the data object for the action result component
    const actionResultData = wasRestored
      ? this.#getRestoreTabsData(confirmedData.originalClosedTabs || [])
      : this.#getCloseTabsData(confirmedData);

    let canUndo = !wasRestored && !!confirmedData.operationId;
    // Override can undo if explicitly dismissed
    if (toolUIData.properties?.undoDismissed) {
      canUndo = false;
    }

    // Handle undo action if applicable
    const onUndo = canUndo
      ? () =>
          this.#dispatchToolUIUpdate({
            messageId: msg.messageId,
            toolCallId: toolUIData.toolCallId,
            updateType: UI_UPDATE_TYPES.UNDO_TAB_CLOSE,
            updateData: {
              operationId: confirmedData.operationId,
              selectedTabs: confirmedData.selectedTabs || [],
              actionTimestamp: confirmedData.actionTimestamp,
            },
          })
      : undefined;

    // Explicitly render the ai-action-result component
    return html`
      <ai-action-result
        .labelL10nId=${actionResultData.labelL10nId}
        .labelL10nArgs=${actionResultData.labelL10nArgs}
        .summaryL10nId=${actionResultData.summaryL10nId}
        .summaryL10nArgs=${actionResultData.summaryL10nArgs}
        .rows=${actionResultData.rows}
        .canUndo=${canUndo}
        .isExpanded=${actionResultData.isExpanded}
        @action-result-undo=${onUndo}
      ></ai-action-result>
    `;
  }

  #renderCancelledComponent() {
    return html`<div data-l10n-id="smart-window-cancelled-label"></div>`;
  }

  #renderRetryComponent(msg) {
    const toolUIData = msg.toolUIData;
    const originalPrompt = toolUIData.properties?.originalUserPrompt || "";
    return html`
      <div>
        <p data-l10n-id="smartwindow-nl-retry-message"></p>
        <moz-button
          class="tool-retry-button"
          @click=${() =>
            this.#handleRetryClick(
              msg.messageId,
              toolUIData.toolCallId,
              originalPrompt
            )}
          data-l10n-id="smartwindow-nl-retry-tool-button"
        ></moz-button>
      </div>
    `;
  }

  #handleRetryClick = (messageId, toolCallId, originalPrompt) => {
    this.#dispatchToolUIUpdate({
      messageId,
      toolCallId,
      updateType: UI_UPDATE_TYPES.RETRY_PROMPT,
      updateData: { prompt: originalPrompt },
    });
  };

  #dispatchToolUIUpdate(data) {
    this.dispatchEvent(
      new CustomEvent("AIChatContent:ToolUIUpdate", {
        bubbles: true,
        composed: true,
        detail: data,
      })
    );
  }

  #renderMessage(msg, chips) {
    if (!msg) {
      return nothing;
    }

    // Check if this is a retry component that should be rendered at the top
    const isRetryComponent =
      msg.toolUIData?.uiType === UI_TYPES.RETRY_COMPONENT;

    return html`
      <div class=${`chat-bubble chat-bubble-${msg.role}`}>
        ${msg.role === "assistant" && isRetryComponent
          ? this.#renderToolUI(msg)
          : nothing}
        ${chips?.length
          ? html`<website-chip-container
              .websites=${chips}
            ></website-chip-container>`
          : nothing}
        <ai-chat-message
          .message=${msg.body}
          .role=${msg.role}
          .messageId=${msg.messageId}
          .complete=${msg.role === "assistant" && !!msg.isLastChunk}
          .conversationId=${this.conversationId}
          .seenUrls=${this.seenUrls}
          .historyResults=${msg.historyResults}
        ></ai-chat-message>
        ${msg.role === "assistant" && msg.toolUIData && !isRetryComponent
          ? this.#renderToolUI(msg)
          : nothing}
        ${msg.role === "assistant" && msg.isLastChunk
          ? html`
              <assistant-message-footer
                .messageId=${msg.messageId}
                .appliedMemories=${msg.appliedMemories}
                .showCallout=${msg.showCallout}
              ></assistant-message-footer>
            `
          : nothing}
      </div>
    `;
  }

  #renderFollowUpSuggestions() {
    if (!this.followUpSuggestions?.length) {
      return nothing;
    }
    return html`<smartwindow-prompts
      .prompts=${this.followUpSuggestions.map(text => ({
        text,
        type: "followup",
      }))}
      mode="followup"
    ></smartwindow-prompts>`;
  }

  #renderLoader() {
    if (!this.assistantIsLoading) {
      return nothing;
    }
    return html`<chat-assistant-loader
      .mode=${this.isSearching ? "search" : "default"}
    ></chat-assistant-loader>`;
  }

  #renderError() {
    if (!this.errorObj) {
      return nothing;
    }
    return html`<chat-assistant-error
      .error=${this.errorObj}
    ></chat-assistant-error>`;
  }

  /**
   * Build the render list one turn at a time.
   *
   * The model creates an empty assistant placeholder before tools run so by
   * ordinal the assistant has a lower index than the toolcall messages it produces.
   * We buffer per turn so action log UI render above the assistant reply,
   * flipping that ordinal order for display
   *
   * @return {Array<{ type: string, msg: object, contextPageUrl?: string }>}
   */
  #buildTurnRenderItems() {
    const items = [];
    let lastContextPageUrl;
    let pendingActionLogs = [];
    let pendingAssistantMessage = null;
    let pendingAssistantContextUrl;

    // Commit the current turn's buffered action logs and assistant reply into
    // items. Action log render above the assistant message
    //
    // isComplete marks whether the turn has finished
    const appendPendingAssistantTurn = isComplete => {
      if (!pendingActionLogs.length && !pendingAssistantMessage) {
        return;
      }

      // Emit one grouped action-log item per turn carrying all the tool
      // messages of that turn. The renderer collapses them into a single
      // <ai-action-result> with one row per tool.
      if (pendingActionLogs.length) {
        items.push({
          type: "action-log",
          msgs: pendingActionLogs,
          isComplete,
        });
      }

      if (pendingAssistantMessage) {
        items.push({
          type: "message",
          msg: pendingAssistantMessage,
          contextPageUrl: pendingAssistantContextUrl,
        });
      }

      pendingActionLogs = [];
      pendingAssistantMessage = null;
      pendingAssistantContextUrl = undefined;
    };

    for (const msg of this.conversationState) {
      if (!msg) {
        continue;
      }

      // Hold tool UI messages for the current turn
      if (msg.uiType === UI_TYPES.ACTION_LOG) {
        pendingActionLogs.push(msg);
        continue;
      }

      // Hold the assistant reply
      // If a previous assistant is still pending, commit it first, so it isn't dropped
      if (msg.role === "assistant") {
        if (pendingAssistantMessage) {
          appendPendingAssistantTurn(true);
        }

        pendingAssistantMessage = msg;
        pendingAssistantContextUrl = lastContextPageUrl;
        continue;
      }

      // A user or any other role ends the previous turn. Commit first then push.
      appendPendingAssistantTurn(true);

      // Capture the previous context URL for this message's duplicate-chip check,
      // then update lastContextPageUrl for subsequent messages.
      const contextPageUrl = lastContextPageUrl;
      if (msg.role === "user") {
        lastContextPageUrl = msg.pageUrl;
      }

      items.push({
        type: "message",
        msg,
        contextPageUrl,
      });
    }

    // Commit anything still pending at end of loop. The in-flight turn is
    // complete once assistantIsLoading set false
    appendPendingAssistantTurn(!this.assistantIsLoading);

    return items;
  }

  /**
   * Collect the per-tool rows for the grouped action log card
   *
   * @param {Array<object>} toolMsgs
   * @returns {Array<{ labelL10nId?: string, labelL10nArgs?: object, label?: string, items: Array }>}
   */
  #buildGroupedActionLogRows(toolMsgs) {
    return toolMsgs.map(msg => msg.row).filter(Boolean);
  }

  #renderMessages() {
    return this.#buildTurnRenderItems().map(item => {
      const { type, msgs, msg, isComplete, contextPageUrl } = item;
      if (type === "action-log") {
        return this.#renderActionLogGroup(msgs, isComplete);
      }

      const chips = this.#getVisibleChips(msg, contextPageUrl);
      return this.#renderMessage(msg, chips);
    });
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-chat-content.css"
      />
      <div class="chat-content-wrapper" tabindex="-1">
        <div class="chat-inner-wrapper">
          ${this.#renderMessages()} ${this.#renderFollowUpSuggestions()}
          ${this.#renderLoader()} ${this.#renderError()}
        </div>
      </div>
      <kit-mention variant="sidebar"></kit-mention>
      <div
        class="assistant-response-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        ${this.assistantResponseAnnouncement}
      </div>
      <moz-button
        class="jump-to-bottom-button"
        data-l10n-id="aiwindow-jump-to-bottom"
        data-l10n-attrs="aria-label,tooltiptext"
        iconsrc="chrome://global/skin/icons/shaft-arrow-down.svg"
        disabled
        type="ghost icon"
      ></moz-button>
    `;
  }
}

customElements.define("ai-chat-content", AIChatContent);
