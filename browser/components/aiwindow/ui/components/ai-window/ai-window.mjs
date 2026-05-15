/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  createParserState,
  consumeStreamChunk,
  flushTokenRemainder,
} from "chrome://browser/content/aiwindow/modules/TokenStreamParser.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/smartwindow-prompts.mjs";

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Chat: "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs",
  MODEL_FEATURES: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  openAIEngine: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  generateChatTitle:
    "moz-src:///browser/components/aiwindow/models/TitleGeneration.sys.mjs",
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  ChatConversation:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs",
  MEMORIES_FLAG_SOURCE:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs",
  MESSAGE_ROLE:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs",
  AssistantRoleOpts:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs",
  UserRoleOpts:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs",
  getRoleLabel:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatUtils.sys.mjs",
  NewTabStarterGenerator:
    "moz-src:///browser/components/aiwindow/models/ConversationSuggestions.sys.mjs",
  generateConversationStartersSidebar:
    "moz-src:///browser/components/aiwindow/models/ConversationSuggestions.sys.mjs",
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", function () {
  return console.createInstance({
    prefix: "ChatStore",
    maxLogLevelPref: "browser.smartwindow.chatStore.loglevel",
  });
});

/**
 * @typedef {{
 *   input: string,
 *   mode: string,
 *   pageUrl: URL,
 *   conversationId: string,
 *   tab: MozTabbrowserTab
 * }} TabStateEventDetail
 */

/**
 * @typedef {{
 *   bubbles: true,
 *   detail: TabStateEventDetail
 * }} TabStateEventOptions
 */

/**
 * @typedef {CustomEvent & {
 *   detail: TabStateEventDetail
 * }} TabStateEvent
 */

const FULLPAGE = "fullpage";
const SIDEBAR = "sidebar";
const PREF_MEMORIES = "browser.smartwindow.memories";
const TAB_FAVICON_CHAT =
  "chrome://browser/content/aiwindow/assets/ask-icon.svg";

/**
 * A custom element for managing AI Window
 *
 * @todo Bug2007583
 * Tests follow up for re-opening conversations
 */
export class AIWindow extends MozLitElement {
  static properties = {
    mode: { type: String, reflect: true }, // sidebar | fullpage
    showStarters: { type: Boolean, state: true },
    showFooter: { type: Boolean, state: true },
  };

  #browser;
  #smartbar;
  #smartbarToggleButton;
  #conversation;
  #memoriesButton = null;
  #memoriesToggled = null;
  #visibilityChangeHandler;
  #starters = [];
  #smartbarResizeObserver = null;
  #windowModeObserver = null;
  #addedContextWebsites = []; // TODO: replace once Bug 2016760 lands

  /**
   * Flags whether the #conversation reference has been updated but the messages
   * have not been delivered via the actor.
   *
   * @type {bool}
   */
  #pendingMessageDelivery;

  #detectModeFromContext() {
    return window.browsingContext?.embedderElement?.id === "ai-window-browser"
      ? SIDEBAR
      : FULLPAGE;
  }

  /**
   * Checks if there's a pending conversation ID to load.
   *
   * @returns {string|null} The conversation ID or null if none exists
   * @private
   */
  #getPendingConversationId() {
    const hostBrowser = window.browsingContext?.embedderElement;
    return hostBrowser?.getAttribute("data-conversation-id") || null;
  }

  /**
   * Gets the browser container element from the shadow DOM.
   *
   * @returns {Element|null} The browser container element, or null if not found
   * @private
   */
  #getBrowserContainer() {
    return this.renderRoot.querySelector("#browser-container");
  }

  #syncSmartbarMemoriesStateFromConversation() {
    if (!this.#smartbar) {
      return;
    }

    const lastUserMessage =
      this.#conversation?.messages?.findLast?.(m => m.role === "user") ?? null;
    if (
      lastUserMessage?.memoriesFlagSource ===
      lazy.MEMORIES_FLAG_SOURCE.CONVERSATION
    ) {
      this.#memoriesToggled = lastUserMessage.memoriesEnabled;
    }
    this.#syncMemoriesButtonUI();
  }

  #syncMemoriesButtonUI() {
    if (!this.#memoriesButton) {
      return;
    }

    this.#memoriesButton.disabled = !this.memoriesPref;
    this.#memoriesButton.pressed =
      this.memoriesPref && (this.#memoriesToggled ?? this.memoriesPref);
  }

  constructor() {
    super();

    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "memoriesPref",
      PREF_MEMORIES,
      null,
      () => this.#syncMemoriesButtonUI()
    );

    this.userPrompt = "";
    this.#browser = null;
    this.#smartbar = null;
    this.#conversation = new lazy.ChatConversation({});
    this.mode = this.#detectModeFromContext();
    this.showStarters = false;
    this.showFooter = this.mode === FULLPAGE;

    // Apply chat-active immediately if loading a conversation to prevent layout flash
    if (this.#getPendingConversationId()) {
      this.classList.add("chat-active");
    }
  }

  /**
   * Gets the conversation id from data-conversation-id attribute
   *
   * @private
   */
  #getDataConvId() {
    if (this.#conversation) {
      return this.#conversation.id;
    }

    const hostBrowser = window.browsingContext?.embedderElement;
    return hostBrowser?.getAttribute("data-conversation-id");
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("mode", this.mode);

    this.ownerDocument.addEventListener("OpenConversation", this);
    this.ownerDocument.addEventListener(
      "smartbar-commit",
      this.#handleSmartbarCommit,
      true
    );

    this.#loadPendingConversation();
    this.#setupWindowModeObserver();

    this.#dispatchChromeEvent(
      "ai-window:connected",
      this.#getAIWindowEventOptions()
    );

    // Ensure disconnectedCallback gets called to clean up listeners
    this.ownerGlobal.addEventListener("unload", () => this.remove(), {
      once: true,
    });
  }

  get conversationId() {
    return this.#conversation?.id;
  }

  handleEvent(event) {
    if (event.detail) {
      this.openConversation(event.detail);
    } else {
      // Handle a null conversation reference by starting a new empty conversation
      this.#onCreateNewChatClick();
    }
  }

  #setupWindowModeObserver() {
    this.#windowModeObserver = (subject, topic) => {
      if (topic === "ai-window-state-changed") {
        if (subject == window.browsingContext?.topChromeWindow) {
          this.#updateSmartbarVisibility();
        }
      }
    };

    Services.obs.addObserver(
      this.#windowModeObserver,
      "ai-window-state-changed"
    );
  }

  #updateSmartbarVisibility() {
    if (!this.#smartbar || !this.#smartbarToggleButton) {
      return;
    }

    const isSmartWindow = lazy.AIWindow.isAIWindowActive(
      window.browsingContext.topChromeWindow
    );

    this.#smartbar.hidden = !isSmartWindow;
    this.#smartbarToggleButton.hidden = isSmartWindow;
  }

  disconnectedCallback() {
    // Clean up visibility change handler
    if (this.#visibilityChangeHandler) {
      this.ownerDocument.removeEventListener(
        "visibilitychange",
        this.#visibilityChangeHandler
      );
      this.#visibilityChangeHandler = null;
    }

    // Clean up window mode observer
    if (this.#windowModeObserver) {
      Services.obs.removeObserver(
        this.#windowModeObserver,
        "ai-window-state-changed"
      );
      this.#windowModeObserver = null;
    }

    // Clean up smartbar toggle button
    if (this.#smartbarToggleButton) {
      this.#smartbarToggleButton.remove();
      this.#smartbarToggleButton = null;
    }

    // Clean up smartbar
    this.ownerDocument.removeEventListener(
      "smartbar-commit",
      this.#handleSmartbarCommit,
      true
    );
    if (this.#smartbar) {
      this.#smartbar.removeEventListener(
        "aiwindow-memories-toggle:on-change",
        this.#handleMemoriesToggle
      );
      this.#smartbar.remove();
      this.#smartbar = null;
      this.#memoriesButton = null;
    }

    // Clean up resize observer
    if (this.#smartbarResizeObserver) {
      this.#smartbarResizeObserver.disconnect();
      this.#smartbarResizeObserver = null;
    }

    // Clean up browser
    if (this.#browser) {
      this.#browser.remove();
      this.#browser = null;
    }

    // Clean up conversation
    this.#conversation = null;

    this.ownerDocument.removeEventListener("OpenConversation", this);

    super.disconnectedCallback();
  }

  /**
   * Loads a conversation if one is set on the data-conversation-id attribute
   * on firstUpdated()
   */
  async #loadPendingConversation() {
    const conversationId = this.#getPendingConversationId();
    if (!conversationId) {
      return;
    }

    const conversation =
      await lazy.AIWindow.chatStore.findConversationById(conversationId);
    if (conversation) {
      this.openConversation(conversation);
    }

    const hostBrowser = window.browsingContext?.embedderElement;
    if (hostBrowser?.hasAttribute("data-continue-streaming")) {
      hostBrowser.removeAttribute("data-continue-streaming");
      this.#continueAfterToolResult();
    }
  }

  async firstUpdated() {
    // Create a real XUL <browser> element from the chrome document
    const doc = this.ownerDocument; // browser.xhtml
    const browser = doc.createXULElement("browser");

    browser.setAttribute("id", "aichat-browser");
    browser.setAttribute("type", "content");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("disableglobalhistory", "true");
    browser.setAttribute("transparent", "true");
    browser.setAttribute("src", "about:aichatcontent");

    const container = this.#getBrowserContainer();
    container.appendChild(browser);

    this.#browser = browser;

    await this.#loadPendingConversation().catch(error => {
      console.error(
        `loadPendingConversation() error: ${error.toString()}, \nstack: ${error.stack}`
      );
    });

    // Defer Smartbar and conversation starters for preloaded documents
    if (doc.hidden) {
      this.#visibilityChangeHandler = () => {
        if (!doc.hidden && !this.#smartbar) {
          this.#getOrCreateSmartbar(doc, container);
          this.#loadStarterPrompts();
        }
      };
      doc.addEventListener("visibilitychange", this.#visibilityChangeHandler, {
        once: true,
      });
    } else {
      this.#getOrCreateSmartbar(doc, container);
      this.#loadStarterPrompts();
    }
  }

  /**
   * Loads conversation starter prompts from the generator and renders them.
   * In sidebar mode, uses LLM-generated prompts based on tab context and memories.
   * In fullpage mode, uses static prompts based on tab count.
   *
   * @private
   */
  async #loadStarterPrompts() {
    if (!this.isConnected) {
      return;
    }

    if (this.#conversation?.messages?.length) {
      return;
    }

    try {
      const gBrowser = window.browsingContext?.topChromeWindow.gBrowser;
      const tabCount = gBrowser?.tabs.length || 0;
      let starters = await lazy.NewTabStarterGenerator.getPrompts(
        tabCount
      ).catch(e => {
        lazy.log.error("[Prompts] Failed to load initial starters:", e);
        return [];
      });

      if (this.mode === SIDEBAR && gBrowser) {
        // Get tab context for LLM-generated prompts
        // @todo bug 2015919 to use same context as visualized in smartbar
        const contextTabs = [gBrowser.selectedTab].map(tab => ({
          title: tab.label,
          url: tab.linkedBrowser.currentURI.spec,
        }));

        // Get memories setting from user preferences
        const memoriesEnabled = this.#memoriesToggled ?? this.memoriesPref;

        const sidebarStarters = await lazy
          .generateConversationStartersSidebar(contextTabs, 2, memoriesEnabled)
          .catch(e => {
            lazy.log.error("[Prompts] Failed to generate sidebar starters:", e);
            return null;
          });

        if (sidebarStarters?.length) {
          starters = sidebarStarters;
        }
      }

      if (!starters || starters.length === 0) {
        return;
      }

      this.#renderStarterPrompts(starters);
    } catch (e) {
      console.error("[Prompts] Failed to load initial starters:", e);
    }
  }

  /**
   * Renders conversation starter prompts in the UI.
   * Sets the starters data and shows the prompts element.
   *
   * @param {Array<{text: string, type: string}>} starters - Array of starter prompt objects
   * @private
   */
  #renderStarterPrompts(starters) {
    if (!this.isConnected) {
      return;
    }

    if (this.#conversation?.messages?.length) {
      return;
    }

    this.#starters = starters;
    this.showStarters = !!starters.length;
  }

  /**
   * Helper method to get or create the smartbar element
   *
   * @param {Document} doc - The document
   * @param {Element} container - The container element
   */
  #getOrCreateSmartbar(doc, container) {
    // Find existing Smartbar or create it when we init the AI Window.
    let smartbar = container.querySelector("#ai-window-smartbar");

    if (!smartbar) {
      // The Smartbar can't be initialized in the shadow DOM and needs
      // to be created from the chrome document.
      smartbar = doc.createElement("moz-smartbar");
      smartbar.id = "ai-window-smartbar";
      smartbar.setAttribute("sap-name", "smartbar");
      smartbar.setAttribute("pageproxystate", "invalid");
      smartbar.setAttribute("popover", "manual");
      smartbar.classList.add("smartbar", "urlbar");

      // Listen before appending to DOM since the event fires synchronously
      // during connectedCallback.
      smartbar.addEventListener(
        "smartbar-initialized",
        () => this.#setupSmartbarFocus(smartbar),
        { once: true }
      );

      const smartbarWrapper = doc.createElement("div");
      smartbarWrapper.id = "smartbar-wrapper";
      smartbarWrapper.appendChild(smartbar);
      container.append(smartbarWrapper);

      // Always show the list of suggestions above input in sidebar mode and
      // below when in fullpage mode.
      smartbar.setAttribute(
        "suggestions-position",
        this.mode === SIDEBAR ? "top" : "bottom"
      );
      smartbar.setAndUpdateContextWebsites(this.#addedContextWebsites);
      smartbar.isSidebarMode = this.mode == "sidebar";

      smartbar.addEventListener("input", this.#handleSmartbarInput);
      smartbar.addEventListener(
        "aiwindow-memories-toggle:on-change",
        this.#handleMemoriesToggle
      );
    }
    this.#smartbar = smartbar;
    this.#memoriesButton = smartbar.querySelector("memories-icon-button");
    this.#syncSmartbarMemoriesStateFromConversation();
    this.#observeSmartbarHeight();

    // Create toggle button, like with Smartbar above
    let toggleButton = container.querySelector("#smartbar-toggle-button");

    if (!toggleButton) {
      toggleButton = doc.createElement("moz-button");
      toggleButton.id = "smartbar-toggle-button";
      toggleButton.type = "primary";
      toggleButton.iconSrc = "chrome://browser/skin/ai-window.svg";
      toggleButton.setAttribute(
        "data-l10n-id",
        "smartwindow-switch-to-smart-window"
      );
      toggleButton.addEventListener("click", () => {
        const chromeWindow = window.browsingContext?.topChromeWindow;
        if (chromeWindow) {
          lazy.AIWindow.toggleAIWindow(chromeWindow, true);
        }
      });
      container.appendChild(toggleButton);
    }
    this.#smartbarToggleButton = toggleButton;
    this.#updateSmartbarVisibility();
  }

  #setupSmartbarFocus(smartbar) {
    let hasAutoFocused = false;
    let isMouseClick = false;

    smartbar.addEventListener("mousedown", () => {
      isMouseClick = true;
      smartbar.toggleAttribute("suppress-focus-border", true);
    });

    smartbar.inputField.addEventListener("focus", () => {
      if (!hasAutoFocused) {
        smartbar.toggleAttribute("suppress-focus-border", true);
        hasAutoFocused = true;
      } else if (!isMouseClick) {
        smartbar.removeAttribute("suppress-focus-border");
      }
      isMouseClick = false;
    });

    smartbar.focus();
  }

  #observeSmartbarHeight() {
    const updateSmartbarHeight = () => {
      const urlbarView = this.#smartbar.querySelector(".urlbarView");
      // The height calculation for the Smartbar assumes that `.urlbarView`
      // is the only dynamically-sized child element.
      const smartbarHeightClosed =
        this.#smartbar.offsetHeight - urlbarView.offsetHeight;

      this.style.setProperty("--smartbar-height", `${smartbarHeightClosed}px`);
    };
    updateSmartbarHeight();

    this.#smartbarResizeObserver = new ResizeObserver(updateSmartbarHeight);
    this.#smartbarResizeObserver.observe(this.#smartbar);
  }

  /**
   * Handles input event from the Smartbar and dispatches
   * a ai-window:smartbar-input event to the window for
   * AIWindowTabStatesManager.sys.mjs to manage the input
   * state of the sidebar chat window.
   *
   * @param {Event} event
   *
   * @private
   */
  #handleSmartbarInput = event => {
    this.#dispatchChromeEvent(
      "ai-window:smartbar-input",
      this.#getAIWindowEventOptions(event.target.value)
    );
  };

  /**
   * Dispatches a TabStateEvent on the chrome window for the
   * AIWindowTabStatesManager.sys.mjs to catch state updates
   * for the ai-window.
   *
   * @param {string} eventName Name of the event
   * @param {TabStateEventOptions} [options={}] Event options/detail
   *
   * @private
   */
  #dispatchChromeEvent(eventName, options = {}) {
    const topChromeWindow = window?.browsingContext?.topChromeWindow;
    topChromeWindow?.dispatchEvent(
      new topChromeWindow.CustomEvent(eventName, options)
    );
  }

  /**
   * Handles the smartbar-commit action for the user prompt
   *
   * @param {CustomEvent} event - The smartbar-commit event
   * @private
   */
  #handleSmartbarCommit = event => {
    const { value, action, contextMentions } = event.detail;
    if (action === "chat") {
      // Disable suggestions after the first chat message.
      // We only want to show suggestions for the initial query,
      // but not for follow-up messages in a conversation.
      if (this.#conversation.messages.length === 0) {
        this.#smartbar.suppressStartQuery({ permanent: true });
      }

      this.submitFollowUp(value, contextMentions);
    }
  };

  submitFollowUp(text, contextMentions) {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) {
      return;
    }
    this.#fetchAIResponse(trimmed, this.#createUserRoleOpts(contextMentions));
  }

  #handleMemoriesToggle = event => {
    this.#memoriesToggled = event.detail.pressed;
    this.#syncMemoriesButtonUI();
  };

  /**
   * Handles the prompt selection event from smartwindow-prompts.
   *
   * @param {CustomEvent} event - The prompt-selected event
   * @private
   */
  #handlePromptSelected = event => {
    const { text } = event.detail;
    this.#fetchAIResponse(text, this.#createUserRoleOpts());
  };

  /**
   * Creates a UserRoleOpts object with current memories settings.
   *
   * @param {ContextWebsite[]} [contextMentions]
   * @returns {UserRoleOpts} Options object with memories configuration
   * @private
   */
  #createUserRoleOpts(contextMentions) {
    return new lazy.UserRoleOpts({
      memoriesEnabled: this.#memoriesToggled ?? this.memoriesPref,
      memoriesFlagSource:
        this.#memoriesToggled == null
          ? lazy.MEMORIES_FLAG_SOURCE.GLOBAL
          : lazy.MEMORIES_FLAG_SOURCE.CONVERSATION,
      contextMentions,
    });
  }

  /**
   * Persists the current conversation state to the database.
   *
   * @private
   */
  async #updateConversation() {
    await lazy.AIWindow.chatStore
      .updateConversation(this.#conversation)
      .catch(updateError => {
        lazy.log.error(`Error updating conversation: ${updateError.message}`);
      });
  }

  /**
   * Generates and sets a title for the conversation if one doesn't exist.
   *
   * @private
   */
  async #addConversationTitle() {
    if (this.#conversation.title) {
      return;
    }

    const firstUserMessage = this.#conversation.messages.find(
      m => m.role === lazy.MESSAGE_ROLE.USER
    );

    const title = await lazy.generateChatTitle(
      firstUserMessage?.content?.body,
      {
        url: firstUserMessage?.pageUrl?.href || "",
        title: this.#conversation.pageMeta?.title || "",
        description: this.#conversation.pageMeta?.description || "",
      }
    );

    this.#conversation.title = title;
    document.title = title;
    this.#updateConversation();
  }

  #updateTabFavicon() {
    if (this.classList.contains("chat-active") || this.mode !== FULLPAGE) {
      return;
    }
    const link = document.getElementById("tabIcon");
    link.href = TAB_FAVICON_CHAT;
  }

  /**
   * Processes tokens from the AI response stream and updates the message.
   * Adds all tokens to their respective arrays in the tokens object and
   * builds the memoriesApplied array for existing_memory tokens.
   *
   * @param {Array<{key: string, value: string}>} tokens - Array of parsed tokens from the stream
   * @param {ChatMessage} currentMessage - The message object being updated
   */
  handleTokens = (tokens, currentMessage) => {
    tokens.forEach(({ key, value }) => {
      currentMessage.tokens[key].push(value);

      // Build Applied Memories Array
      if (key === "existing_memory") {
        currentMessage.memoriesApplied.push(value);
      }

      // Build web search queries
      if (key === "search") {
        currentMessage.webSearchQueries ??= [];
        currentMessage.webSearchQueries.push(value);
      }
    });
  };

  #setBrowserContainerActiveState(isActive) {
    const container = this.renderRoot.querySelector("#browser-container");
    if (!container) {
      return;
    }

    if (isActive) {
      this.classList.add("chat-active");
      return;
    }

    this.classList.remove("chat-active");
  }

  /**
   * Gets the current url of the loaded page.
   *
   * @returns {URL} The page URL
   *
   * @private
   */
  #getCurrentPageUrl() {
    return URL.fromURI(
      window.browsingContext.topChromeWindow.gBrowser.currentURI
    );
  }

  /**
   * Fetches an AI response based on the current user prompt.
   * Validates the prompt, updates conversation state, streams the response,
   * and dispatches updates to the browser actor.
   *
   * @private
   *
   * @param {string} inputText
   * @param {object} [options]
   * @param {boolean} [options.skipUserDispatch=false] - If true, do not dispatch
   * a user message into chat content (used for retries to avoid duplicate
   * user messages).
   * @param {boolean} [options.memoriesEnabled] - Optional per-call override for
   * memory injection; undefined falls back to use global/default behavior.
   */
  #fetchAIResponse = async (
    inputText = false,
    { skipUserDispatch = false, ...userOpts } = {}
  ) => {
    const formattedPrompt = (inputText || "").trim();
    if (!formattedPrompt && inputText !== false) {
      return;
    }
    this.showStarters = false;
    this.showFooter = false;
    this.#updateTabFavicon();
    this.#setBrowserContainerActiveState(true);

    try {
      const engineInstance = await lazy.openAIEngine.build(
        lazy.MODEL_FEATURES.CHAT
      );

      if (formattedPrompt) {
        const pageUrl = this.#getCurrentPageUrl();

        await this.#conversation.generatePrompt(
          formattedPrompt,
          pageUrl,
          engineInstance,
          userOpts
        );

        if (!skipUserDispatch) {
          this.#dispatchMessageToChatContent(
            this.#conversation.messages.at(-1)
          );
        }

        // @todo
        // fill out these assistant message flags
        const assistantRoleOpts = new lazy.AssistantRoleOpts();
        this.#conversation.addAssistantMessage("text", "", assistantRoleOpts);
      }

      const stream = lazy.Chat.fetchWithHistory(
        this.#conversation,
        engineInstance,
        {
          // Use the adjacent tab's browsing context for sidebar or current for
          // fullpage for tools that need context.
          browsingContext:
            this.mode === SIDEBAR
              ? window.browsingContext.topChromeWindow.gBrowser.selectedBrowser
                  .browsingContext
              : window.browsingContext,
        }
      );

      this.#updateConversation();
      this.#addConversationTitle();

      const parserState = createParserState();
      const currentMessage = this.#conversation.messages
        .filter(
          message =>
            message.role === lazy.MESSAGE_ROLE.ASSISTANT &&
            (inputText !== false || message?.content?.type === "text")
        )
        .at(-1);

      if (inputText === false) {
        const separator = currentMessage?.content?.body ? "\n\n" : "";
        if (currentMessage && separator) {
          currentMessage.content.body += separator;
        }
      }

      for await (const chunk of stream) {
        if (chunk && typeof chunk === "object" && "searching" in chunk) {
          this.showSearchingIndicator(chunk.searching, chunk.query);
          continue;
        }
        const { plainText, tokens } = consumeStreamChunk(chunk, parserState);

        if (!currentMessage.tokens) {
          currentMessage.tokens = {
            search: [],
            existing_memory: [],
            followup: [],
          };
        }

        if (!currentMessage.memoriesApplied) {
          currentMessage.memoriesApplied = [];
        }

        if (plainText) {
          currentMessage.content.body += plainText;
        }

        if (tokens?.length) {
          this.handleTokens(tokens, currentMessage);
        }
        this.#updateConversation();
        this.#dispatchMessageToChatContent(currentMessage);
        this.requestUpdate?.();
      }

      // End of stream: if there was an unclosed §... treat as literal text
      const remainder = flushTokenRemainder(parserState);

      if (remainder) {
        currentMessage.content.body += remainder;
        this.#updateConversation();
        this.#dispatchMessageToChatContent(currentMessage);
        this.requestUpdate?.();
      }

      if (currentMessage.memoriesApplied?.length) {
        currentMessage.memoriesApplied =
          await lazy.MemoriesManager.getMemoriesByID(
            currentMessage.memoriesApplied
          );
        this.#updateConversation();
        this.#dispatchMessageToChatContent(currentMessage);
      }
    } catch (e) {
      this.showSearchingIndicator(false, null);
      this.#handleError(e);
      this.requestUpdate?.();
    }
  };

  #handleError(error) {
    const newErrorMessage = {
      role: "",
      content: {
        isError: true,
        status: error?.status,
      },
    };
    this.#dispatchMessageToChatContent(newErrorMessage);
  }

  /**
   * Retrieves the AIChatContent actor from the browser's window global.
   *
   * @returns {Promise<object|null>} The AIChatContent actor, or null if unavailable.
   * @private
   */

  #getAIChatContentActor() {
    if (!this.#browser) {
      lazy.log.warn("AI browser not set, cannot get AIChatContent actor");
      return null;
    }

    const windowGlobal = this.#browser.browsingContext?.currentWindowGlobal;

    if (!windowGlobal) {
      lazy.log.warn("No window global found for AI browser");
      return null;
    }
    try {
      return windowGlobal.getActor("AIChatContent");
    } catch (error) {
      lazy.log.error("Failed to get AIChatContent actor:", error);
      return null;
    }
  }

  /**
   * Dispatches a message to the AIChatContent actor.
   *
   * @param {ChatMessage} message - message to dispatch to chat content actor
   * @returns
   */

  #dispatchMessageToActor(actor, message) {
    const newMessage = { ...message };
    if (typeof message.role !== "string") {
      const roleLabel = lazy.getRoleLabel(newMessage.role).toLowerCase();
      newMessage.role = roleLabel;
    }

    return actor.dispatchMessageToChatContent(newMessage);
  }

  #dispatchMessageToChatContent(message) {
    const actor = this.#getAIChatContentActor();
    return actor ? this.#dispatchMessageToActor(actor, message) : null;
  }

  /**
   * Delivers messages to the child process if there are some pending when the
   * parent actor receives AIChatContent:Ready event from the child process.
   */
  onContentReady() {
    if (!this.#pendingMessageDelivery) {
      return;
    }

    const actor = this.#getAIChatContentActor();
    if (actor) {
      this.#deliverConversationMessages(actor);
    }
  }

  /**
   * Delivers all of the messages of a conversation to the child process
   *
   * @param {JSActor} actor
   */
  #deliverConversationMessages(actor) {
    this.#pendingMessageDelivery = false;

    if (!this.#conversation || !this.#conversation.messages.length) {
      return;
    }

    this.#setBrowserContainerActiveState(true);

    // @todo Bug2013096
    // Add way to batch these messages to the actor in one message
    this.#conversation.renderState().forEach(message => {
      this.#dispatchMessageToActor(actor, message);
    });
  }

  /**
   * Gets event options for a TabStateEvent
   *
   * @param {false|string} [input=false] The latest input contents
   *
   * @returns {TabStateEventOptions}
   *
   * @private
   */
  #getAIWindowEventOptions(input = false) {
    const topChromeWindow = window?.browsingContext?.topChromeWindow;

    return {
      bubbles: true,
      detail: {
        input,
        mode: this.mode,
        pageUrl: this.#getCurrentPageUrl(),
        conversationId: this.#getDataConvId(),
        tab: topChromeWindow?.gBrowser?.selectedTab,
      },
    };
  }

  /**
   * Opens a new conversation and renders the conversation in the child process.
   *
   * @param {ChatConversation} conversation
   */
  openConversation(conversation) {
    if (conversation.messages?.length) {
      this.#conversation = conversation;

      if (this.#conversation.title) {
        document.title = this.#conversation.title;
      }
      this.#updateTabFavicon();

      const hostBrowser = window.browsingContext?.embedderElement;
      hostBrowser?.setAttribute("data-conversation-id", this.#conversation.id);

      // Update smartbar chips to reflect the current tab when sidebar reopens
      if (this.#smartbar && this.mode === "sidebar") {
        this.#smartbar.updateContextChips();
      }

      // This assumes "openConversation" opens an active conversation, possible todo to see
      // if convo has messages before hiding the footer element.
      this.showFooter = false;

      this.showStarters = false;
      const actor = this.#getAIChatContentActor();
      if (this.#browser && actor) {
        this.#deliverConversationMessages(actor);
      } else {
        this.#pendingMessageDelivery = true;
      }
    } else {
      this.#onCreateNewChatClick();
    }

    this.#dispatchChromeEvent(
      "ai-window:opened-conversation",
      this.#getAIWindowEventOptions()
    );
  }

  #onCreateNewChatClick() {
    // Clear the conversation state locally
    this.#conversation = new lazy.ChatConversation({});

    const hostBrowser = window.browsingContext?.embedderElement;
    hostBrowser?.setAttribute("data-conversation-id", this.#conversation.id);

    // Reset memories toggle state
    this.#memoriesToggled = null;
    this.#syncMemoriesButtonUI();

    // Show Smartbar suggestions for cleared chats
    this.#smartbar?.unsuppressStartQuery();

    // Submitting a message with a new convoId here.
    // This will clear the chat content area in the child process via side effect.
    this.#dispatchMessageToChatContent({
      role: "clear-conversation",
      content: { body: "" },
    });

    // Hide chat-active state
    this.#setBrowserContainerActiveState(false);

    this.showStarters = false;

    this.#loadStarterPrompts();
  }

  showSearchingIndicator(isSearching, searchQuery) {
    this.#dispatchMessageToChatContent({
      role: "loading",
      isSearching,
      searchQuery,
      convId: this.conversationId,
      content: { body: "" },
    });
  }

  async reloadAndContinue(conversation) {
    if (!conversation) {
      return;
    }
    this.openConversation(conversation);
    this.#continueAfterToolResult();
  }

  async #continueAfterToolResult() {
    // Show searching indicator if the last tool was run_search
    const lastToolCall = this.#conversation.messages
      .filter(
        m =>
          m.role === lazy.MESSAGE_ROLE.ASSISTANT &&
          m?.content?.type === "function"
      )
      .at(-1);
    const lastToolName =
      lastToolCall?.content?.body?.tool_calls?.[0]?.function?.name;
    if (lastToolName === "run_search") {
      const args = lastToolCall.content.body.tool_calls[0].function.arguments;
      try {
        const { query } = JSON.parse(args || "{}");
        if (query) {
          this.showSearchingIndicator(true, query);
        }
      } catch {}
    }

    this.#fetchAIResponse();
  }

  handleFooterAction(data) {
    const { action, messageId, memory } = data ?? {};

    switch (action) {
      case "retry":
        this.#retryFromAssistantMessageId(messageId, undefined);
        break;

      case "retry-without-memories":
        this.#retryFromAssistantMessageId(messageId, false);
        break;

      case "retry-after-error":
        this.#retryAfterError();
        break;

      case "remove-applied-memory":
        this.#removeAppliedMemory(messageId, memory);
        break;
    }
  }

  #getMessageById(id) {
    return this.#conversation.messages.find(m => m.id === id) ?? null;
  }

  #getUserMessageForAssistantId(assistantMessageId) {
    const assistantMsg = this.#getMessageById(assistantMessageId);
    if (!assistantMsg?.parentMessageId) {
      return null;
    }

    return this.#getMessageById(assistantMsg.parentMessageId) ?? null;
  }

  #retryAfterError() {
    if (this._isRetrying) {
      console.warn("ai-window: retry already in progress");
      return;
    }

    this._isRetrying = true;
    this.#fetchAIResponse(false)
      .catch(error => {
        console.error("Error retrying after error:", error);
      })
      .finally(() => {
        this._isRetrying = false;
      });
  }

  async #retryFromAssistantMessageId(assistantMessageId, withMemories) {
    if (this._isRetrying) {
      console.warn("ai-window: retry already in progress");
      return;
    }

    const userMsg = this.#getUserMessageForAssistantId(assistantMessageId);
    if (!userMsg) {
      return;
    }

    this._isRetrying = true;
    try {
      const actor = this.#getAIChatContentActor();

      // Truncate to the retried turn so retry regenerates only that response.
      actor?.dispatchTruncateToChatContent({ messageId: assistantMessageId });

      // Retry is delete-only here; generation happens via fetchAIResponse below.
      const messagesToDelete = await this.#conversation.retryMessage(userMsg);
      await lazy.AIWindow.chatStore.deleteMessages(messagesToDelete);
      await this.#updateConversation();
      await this.#fetchAIResponse(userMsg.content.body, {
        skipUserDispatch: true,
        memoriesEnabled:
          withMemories ?? this.#memoriesToggled ?? this.memoriesPref,
      });
    } catch (e) {
      console.error("ai-window: retry failed", e);
    } finally {
      this._isRetrying = false;
    }
  }

  async #removeAppliedMemory(messageId, memory) {
    try {
      const memoryId = memory.id;
      const deleted = await lazy.MemoriesManager.hardDeleteMemoryById(memoryId);
      if (!deleted) {
        console.warn("hardDeleteMemory returned false", memoryId);
      }

      const actor = this.#getAIChatContentActor();
      actor?.dispatchRemoveAppliedMemoryToChatContent({
        messageId,
        memoryId,
      });
    } catch (e) {
      console.error("Failed to delete memory", memory, e);
    }
  }

  render() {
    return html`
      <link rel="stylesheet" href="chrome://global/content/widgets.css" />
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-window.css"
      />
      <!-- TODO (Bug 2008938): Make in-page Smartbar styling not dependent on chrome styles -->
      <link rel="stylesheet" href="chrome://browser/skin/smartbar.css" />
      ${this.mode === SIDEBAR
        ? html`<div class="sidebar-header">
            <moz-button
              data-l10n-id="aiwindow-new-chat"
              data-l10n-attrs="tooltiptext,aria-label"
              class="new-chat-icon-button"
              size="default"
              iconsrc="chrome://browser/content/aiwindow/assets/new-chat.svg"
              @click=${this.#onCreateNewChatClick}
            ></moz-button>
          </div>`
        : ""}
      <div id="browser-container"></div>
      ${this.showStarters
        ? html`
            <smartwindow-prompts
              .prompts=${this.#starters}
              .mode=${this.mode}
              @SmartWindowPrompt:prompt-selected=${this.#handlePromptSelected}
            ></smartwindow-prompts>
          `
        : ""}
      ${this.showFooter ? html`<smartwindow-footer></smartwindow-footer>` : ""}
    `;
  }
}

customElements.define("ai-window", AIWindow);
