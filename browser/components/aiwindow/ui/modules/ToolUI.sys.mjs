/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * @typedef {object} TabSelectionData
 * @property {string} linkedPanel - ID of the linked panel (e.g., "panel-3-1")
 * @property {string} url - URL of the tab
 * @property {string} title - Display title of the tab
 * @property {string} [iconSrc] - URL for the tab's favicon (optional)
 * @property {boolean} [checked] - Whether the tab is selected in UI (optional)
 */

/**
 * @typedef {object} ToolUpdateData
 * @property {Array<TabSelectionData>} [selectedTabs] - Array of selected tabs
 * @property {string} [operationId] - Operation ID for undo operations
 * @property {boolean} [wasRestored] - Flag indicating tabs were restored
 * @property {number} [restoredCount] - Number of tabs restored
 * @property {Array<TabSelectionData>} [originalClosedTabs] - Original tabs that were closed
 */

/**
 * @typedef {object} HandlerContext
 * @property {object} message - Message containing the tool UI
 * @property {string} toolCallId - ID of the tool call
 * @property {ToolUpdateData} updateData - Update data for the handler
 * @property {object} conversation - Conversation object
 * @property {ChromeWindow} window - Browser window object
 * @property {object} originalData - Original update data passed to handleUpdate
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  tabManagementService:
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs",
  ToolUITelemetry:
    "moz-src:///browser/components/aiwindow/ui/modules/ToolUITelemetry.sys.mjs",
  MESSAGE_ROLE:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "console", function () {
  return console.createInstance({
    prefix: "ToolUI",
  });
});

/**
 * UI labels for tool results and follow-ups.
 */
export const UI_TYPES = {
  WEBSITE_CONFIRMATION: "website-confirmation",
  AI_ACTION_RESULT: "ai-action-result",
  CANCELLED_COMPONENT: "cancelled-component",
  RETRY_COMPONENT: "retry-component",
};

/**
 * UI update types for communicating user interactions with tool UIs back to the actor.
 */
export const UI_UPDATE_TYPES = {
  CONFIRMATION_TAB_SELECTION: "confirmation-tab-selection",
  CANCEL_TAB_SELECTION: "cancel-tab-selection",
  UNDO_TAB_CLOSE: "undo-tab-close",
  RETRY_PROMPT: "retry-prompt",
};

/**
 * Manages the Tool UI updates and orchestrates state changes for tool UI components
 */
export class ToolUI {
  /**
   * Get a tab by its linked panel ID
   *
   * @param {ChromeWindow} win - The browser window object
   * @param {string} linkedPanel - The ID of the linked panel
   * @returns {object|null} The tab object if found, otherwise null
   */
  static #getTabByLinkedPanel(win, linkedPanel) {
    const tab =
      win.gBrowser.tabs.find(t => t.linkedPanel === linkedPanel) ?? null;
    return tab;
  }

  /**
   * Verify that a tab matches the expected selection data
   *
   * @param {MozTabbrowserTab} tab - The browser tab object
   * @param {TabSelectionData} selectionData - The expected tab data from the selection
   * @returns {boolean} True if the tab matches the expected data
   */
  static #verifyTabMatch(tab, selectionData) {
    if (!tab || !selectionData) {
      return false;
    }

    // Check linkedPanel matches
    if (tab.linkedPanel !== selectionData.linkedPanel) {
      lazy.console.warn(
        `Tab linkedPanel mismatch: expected ${selectionData.linkedPanel}, got ${tab.linkedPanel}`
      );
      return false;
    }

    // Check URL matches
    const tabUrl = tab.linkedBrowser?.currentURI?.spec;
    if (tabUrl !== selectionData.url) {
      lazy.console.warn(
        `Tab URL mismatch for panel ${selectionData.linkedPanel}: expected ${selectionData.url}, got ${tabUrl}`
      );
      return false;
    }

    return true;
  }

  /**
   * Close the selected tabs after verification
   *
   * @param {Array<TabSelectionData>} selectedTabs - Array of selected tab objects
   * @param {ChromeWindow} win - The browser window object
   * @returns {Promise<{operationId: string, closedTabs: Array, failedTabs: Array}|null>} Result object with operation details if successful, null otherwise
   */
  static async closeSelectedTabs(selectedTabs = [], win) {
    // Verify we have a valid window
    if (!win) {
      lazy.console.error("No browser window provided");
      return null;
    }

    const verifiedTabObjects = [];

    for (const selectedTab of selectedTabs) {
      const tab = this.#getTabByLinkedPanel(win, selectedTab.linkedPanel);

      if (tab && this.#verifyTabMatch(tab, selectedTab)) {
        verifiedTabObjects.push(tab);
      }
    }

    // Only proceed if we have verified tabs to close
    if (verifiedTabObjects.length === 0) {
      lazy.console.warn("No valid tabs to close after verification");
      return null;
    }

    const activeTab = verifiedTabObjects.find(
      tab => tab === win.gBrowser.selectedTab
    );
    if (activeTab) {
      activeTab.smartWindowActionSource = "close_current_tab";
    }

    const result = await lazy.tabManagementService.closeTabs({
      tabs: verifiedTabObjects,
      window: win,
    });

    return result;
  }

  static #getConfirmationReason(tabs) {
    if (tabs.some(t => t.pinned)) {
      return "pinned_tab";
    }
    if (tabs.some(t => t.selected)) {
      return "active_tab";
    }
    if (tabs.length === 1) {
      return "last_tab";
    }
    return "user_action";
  }

  /* ========================================================================
   * Tool UI Update Handlers
   * ======================================================================== */

  /**
   * Handler for tab selection confirmation
   *
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  static async #handleConfirmationTabSelection(context) {
    const {
      updateData,
      message,
      conversation,
      window,
      originalData,
      mode,
      toolCallId,
    } = context;
    const { selectedTabs = [] } = updateData ?? {};

    const result = await this.closeSelectedTabs(selectedTabs, window);
    if (!result) {
      return false;
    }

    // Record telemetry for browser action prompt response
    lazy.ToolUITelemetry.recordBrowserActionPromptResponse({
      location: mode,
      chat_id: conversation?.id || "",
      message_seq: conversation?.messages?.length || 0,
      action_type: "close_tabs",
      prompt_type: "safety_confirmation",
      response: "confirm",
      selected: selectedTabs.length,
      reason: "user_action",
    });

    // Include the operationId in the update data for potential undo
    const enhancedData = {
      ...originalData,
      updateData: {
        ...updateData,
        operationId: result.operationId,
        actionTimestamp: Date.now(),
      },
    };

    conversation.updateToolUI(message, enhancedData, UI_TYPES.AI_ACTION_RESULT);

    const confirmationMessage = {
      description:
        "User confirmed the requested action. selectedTabs contains the tabs that were acted upon.",
      selectedTabs: selectedTabs.map(({ url, title }) => ({ url, title })),
    };

    const pendingAction = conversation.messages.at(-1)?.content?.body?.action;
    if (pendingAction) {
      confirmationMessage.action = pendingAction;
    }
    conversation.resolvePendingToolConfirmation(
      confirmationMessage,
      toolCallId
    );
    return true;
  }

  /**
   * Handler for tab selection cancellation
   *
   * @param {HandlerContext} context - Handler context
   * @returns {boolean} True if successful
   * @private
   */
  static #handleCancelTabSelection(context) {
    const {
      message,
      conversation,
      originalData,
      mode,
      updateData,
      toolCallId,
    } = context;

    // Use the provided reason or default to user_action for manual cancellations
    const reason = updateData?.reason || "user_action";

    // Record telemetry for browser action prompt response (cancellation)
    lazy.ToolUITelemetry.recordBrowserActionPromptResponse({
      location: mode,
      chat_id: conversation?.id || "",
      message_seq: conversation?.messages?.length || 0,
      action_type: "close_tabs",
      prompt_type: "safety_confirmation",
      response: "cancel",
      selected: 0,
      reason,
    });

    conversation.updateToolUI(
      message,
      originalData,
      UI_TYPES.CANCELLED_COMPONENT
    );
    conversation.resolvePendingToolConfirmation(
      { description: "User cancelled the tab action. No action was taken." },
      toolCallId
    );
    return true;
  }

  /**
   * Handler for undoing tab close operation
   *
   * @param {HandlerContext} context - Handler context
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  static async #handleUndoTabClose(context) {
    const { updateData, message, conversation, window, originalData, mode } =
      context;
    const {
      operationId,
      selectedTabs = [],
      actionTimestamp,
    } = updateData ?? {};
    const undoStartTime = Date.now();

    if (!operationId) {
      lazy.console.error("ToolUI: No operationId provided for undo");
      return false;
    }

    if (!window) {
      lazy.console.error("ToolUI: No window provided for undo");
      return false;
    }

    try {
      const { restoredCount, requestedCount, failedTabs } =
        await lazy.tabManagementService.restoreTabs({
          operationId,
          window,
        });

      lazy.console.log(`Restored ${restoredCount} of ${requestedCount} tabs`);

      // Calculate time delta from when action completed to when undo was clicked
      const timeDelta = actionTimestamp ? undoStartTime - actionTimestamp : 0;

      let undoResult = "success";
      let errorCode = "";

      if (failedTabs && failedTabs > 0) {
        errorCode = "one_or_more_tabs_failed_to_restore";
        undoResult = restoredCount > 0 ? "partial_success" : "error";
      }

      // Record telemetry for browser action undo
      lazy.ToolUITelemetry.recordBrowserActionUndo({
        location: mode,
        chat_id: conversation?.id || "",
        message_seq: conversation?.messages?.length || 0,
        action_type: "close_tabs",
        tabs_restored: restoredCount,
        time_delta: Math.max(0, timeDelta),
        result: undoResult,
        error: errorCode,
      });

      // Update the UI to show the undo was successful
      const enhancedData = {
        ...originalData,
        updateData: {
          ...updateData,
          wasRestored: true,
          restoredCount,
          originalClosedTabs: selectedTabs,
        },
      };

      conversation.updateToolUI(
        message,
        enhancedData,
        UI_TYPES.AI_ACTION_RESULT
      );
      return true;
    } catch (error) {
      // This will only catch catastrophic errors like invalid window
      // since TabManagementService has its own try/catch
      lazy.console.error("Failed to restore tabs:", error);

      // Calculate time delta for error case
      const timeDelta = actionTimestamp ? undoStartTime - actionTimestamp : 0;

      // Record telemetry for catastrophic failure
      lazy.ToolUITelemetry.recordBrowserActionUndo({
        location: mode,
        chat_id: conversation?.id || "",
        message_seq: conversation?.messages?.length || 0,
        action_type: "close_tabs",
        tabs_restored: 0,
        time_delta: Math.max(0, timeDelta),
        result: "error",
        error: error?.name || "invalid_window",
      });

      return false;
    }
  }

  /**
   * Handle retry prompt from the UI (clears the current tool UI)
   *
   * @param {object} context - The handler context
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  static async #handleRetryPrompt(context) {
    const { message, conversation } = context;
    await conversation.updateToolUI(message, null, null);
    return true;
  }

  /**
   * Finds the last assistant text message in a conversation
   *
   * @param {Array} messages - The conversation messages array
   * @returns {object|null} The last assistant text message or null if not found
   * @private
   */
  static #findLastAssistantTextMessage(messages) {
    return (
      messages.findLast(
        message =>
          message.role === lazy.MESSAGE_ROLE.ASSISTANT &&
          message.content?.type === "text"
      ) ?? null
    );
  }

  /* ========================================================================
   * Handler Mapping and Public API
   * ======================================================================== */

  /**
   * Finds the original user prompt that led to the given assistant message
   * by traversing the message chain backwards using parentMessageId
   *
   * @param {Array} messages - All conversation messages
   * @param {object} assistantMessage - The assistant message with tool UI data
   * @returns {string|null} The original user prompt text, or null if not found
   */
  static findOriginalUserPrompt(messages, assistantMessage) {
    // Use parentMessageId to trace back to the user message
    let nextMessageId = assistantMessage.parentMessageId;
    // To prevent potential infinite loops, we set a maximum depth for traversal
    const maxDepth = 5;
    let depth = 0;

    // Follow the chain backwards to find the user message
    while (nextMessageId && depth < maxDepth) {
      const nextMessage = messages.find(m => m.id === nextMessageId);

      if (!nextMessage) {
        break;
      }

      if (
        nextMessage.role === lazy.MESSAGE_ROLE.USER &&
        nextMessage.content?.type === "text"
      ) {
        return nextMessage.content.body;
      }

      // Continue up the chain
      nextMessageId = nextMessage.parentMessageId;
      depth++;
    }

    return null;
  }

  static handleUIDisplayTelemetry(toolUIData, telemetryData) {
    if (toolUIData.uiType !== UI_TYPES.WEBSITE_CONFIRMATION) {
      return;
    }

    const tabs = toolUIData.properties?.tabs ?? [];
    const reason = this.#getConfirmationReason(tabs);

    lazy.ToolUITelemetry.recordBrowserActionPrompt({
      ...telemetryData,
      action_type: "close_tabs",
      prompt_type: "safety_confirmation",
      reason,
      candidates: tabs.length,
      preselected: 0, // we currently don't preselect any tabs
    });
  }

  /**
   * Map of update type strings to their handler functions
   *
   * @private
   */
  static #UPDATE_TYPE_HANDLERS = {
    [UI_UPDATE_TYPES.CONFIRMATION_TAB_SELECTION]:
      this.#handleConfirmationTabSelection.bind(this),
    [UI_UPDATE_TYPES.CANCEL_TAB_SELECTION]:
      this.#handleCancelTabSelection.bind(this),
    [UI_UPDATE_TYPES.UNDO_TAB_CLOSE]: this.#handleUndoTabClose.bind(this),
    [UI_UPDATE_TYPES.RETRY_PROMPT]: this.#handleRetryPrompt.bind(this),
  };

  /**
   * Checks if the conversation has an active website confirmation and auto-cancels it.
   * This should be called when starting a new prompt to clean up pending confirmations.
   *
   * @param {object} conversation - The conversation object containing messages
   * @param {ChromeWindow} window - The browser window object
   * @param {string} mode - The mode of the AI Window (e.g., "sidebar", "popup")
   * @returns {Promise<boolean>} True if a confirmation was cancelled, false otherwise
   */
  static async autoCancelActiveConfirmation(conversation, window, mode) {
    if (!conversation?.messages?.length) {
      lazy.console.log("ToolUI: No conversation messages to check");
      return false;
    }

    const lastAssistantTextMessage = this.#findLastAssistantTextMessage(
      conversation.messages
    );

    // Early return if no website confirmation to cancel
    if (
      lastAssistantTextMessage?.toolUIData?.uiType !==
      UI_TYPES.WEBSITE_CONFIRMATION
    ) {
      lazy.console.log("ToolUI: No active website confirmation to cancel");
      return false;
    }

    lazy.console.log("ToolUI: Found active website confirmation to cancel");

    // Get the original user prompt from the existing toolUIData
    // This was already added when the website confirmation was created
    const originalUserPrompt =
      lastAssistantTextMessage.toolUIData.properties?.originalUserPrompt;

    const cancelData = {
      messageId: lastAssistantTextMessage.id,
      toolCallId: lastAssistantTextMessage.toolUIData.toolCallId,
      updateType: UI_UPDATE_TYPES.CANCEL_TAB_SELECTION,
      updateData: {
        reason: "auto_cancel",
      },
    };

    // Set pending retry state BEFORE the await to avoid race condition
    // We'll clear it if cancellation fails - avoiding setting upstream methods to async for now
    if (originalUserPrompt) {
      conversation.pendingRetry = {
        originalUserPrompt,
        cancelledMessageId: lastAssistantTextMessage.id,
        cancelledToolCallId: lastAssistantTextMessage.toolUIData.toolCallId,
        timestamp: Date.now(),
      };
    }

    const cancelled = await this.handleUpdate(
      cancelData,
      conversation,
      window,
      mode
    );

    // Clear pendingRetry if cancellation failed
    if (!cancelled && originalUserPrompt) {
      conversation.pendingRetry = null;
    }

    return cancelled;
  }

  /**
   * Inject retry toolUIData into a message if there's a pending retry state
   *
   * @param {object} msg - The message object to potentially modify
   * @param {object} conversation - The conversation object that may have pendingRetry
   * @returns {boolean} True if retry toolUIData was injected, false otherwise
   */
  static injectRetryToolUIDataIfNeeded(msg, conversation) {
    lazy.console.log("ToolUI: Checking if retry injection needed", {
      hasPendingRetry: !!conversation?.pendingRetry,
      msgRole: msg?.role,
      contentType: msg?.content?.type,
    });

    if (
      !conversation?.pendingRetry ||
      msg?.role !== lazy.MESSAGE_ROLE.ASSISTANT ||
      msg?.content?.type !== "text"
    ) {
      return false;
    }

    lazy.console.log("ToolUI: Injecting retry component");

    // Create the retry toolUIData with the original prompt
    const retryToolUIData = {
      uiType: UI_TYPES.RETRY_COMPONENT,
      // Generate a unique synthetic ID for UI update handling (required by handleUpdate)
      toolCallId: `retry-${crypto.randomUUID()}`,
      properties: {
        originalUserPrompt: conversation.pendingRetry.originalUserPrompt,
      },
    };

    // Inject the retry toolUIData into the message itself
    msg.toolUIData = retryToolUIData;

    // Clear the pending retry state
    conversation.pendingRetry = null;
    return true;
  }

  /**
   * Handle updates to tool UI components from user interactions
   *
   * @param {object} data - The update data
   * @param {string} data.messageId - ID of the message containing the tool UI
   * @param {string} data.toolCallId - ID of the specific tool call
   * @param {string} data.updateType - Type of update (confirmation, cancellation, etc.)
   * @param {ToolUpdateData} data.updateData - Additional data for the update
   * @param {object} conversation - The conversation object containing messages
   * @param {ChromeWindow} window - The browser window object
   * @param {string} [mode] - The mode of the AI Window (e.g., "sidebar", "popup") for context
   * @returns {Promise<boolean>} True if update was successful, false otherwise
   */
  static async handleUpdate(data, conversation, window, mode) {
    const { messageId, toolCallId, updateType, updateData } = data ?? {};

    if (!messageId || !toolCallId) {
      return false;
    }

    // Find the message in the conversation
    const message = conversation?.messages?.find(m => m.id === messageId);

    // Check if the message exists and has matching toolUIData
    if (message?.toolUIData?.toolCallId !== toolCallId) {
      return false;
    }

    // Get the handler for this update type
    const handler = this.#UPDATE_TYPE_HANDLERS[updateType];
    if (typeof handler !== "function") {
      lazy.console.error(`ToolUI: Unknown updateType "${updateType}"`);
      return false;
    }

    // Call the handler with all context, let it destructure what it needs
    return handler({
      message,
      toolCallId,
      updateData,
      conversation,
      window,
      originalData: data,
      mode,
    });
  }
}
