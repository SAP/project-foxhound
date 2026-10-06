/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  captureThumbnail:
    "moz-src:///browser/components/aiwindow/models/HistoryThumbnails.sys.mjs",
  SmartWindowTelemetry:
    "moz-src:///browser/components/aiwindow/ui/modules/SmartWindowTelemetry.sys.mjs",
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  AIWindowTelemetry:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowTelemetry.sys.mjs",
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  URILoadingHelper: "resource:///modules/URILoadingHelper.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

/**
 * JSWindowActor to pass data between AIChatContent singleton and content pages.
 */
export class AIChatContentParent extends JSWindowActorParent {
  #settingsURI = Services.io.newURI("about:settings");
  #prefsURI = Services.io.newURI("about:preferences");

  /**
   * Returns true if the URI points to the browser settings page.
   * Matches both about:preferences and its about:settings alias,
   *
   * @param {nsIURI} uri - A parsed URI object
   * @returns {boolean}
   */
  isSettingsURI(uri) {
    return (
      uri.equalsExceptRef(this.#settingsURI) ||
      uri.equalsExceptRef(this.#prefsURI)
    );
  }

  dispatchMessageToChatContent(message) {
    // Ideally we should allowlist or use a schema to validate what we send to
    // the child process, that is bug 2022057.
    // We can't send URL objects through IPC, so we need to remove the pageUrl
    // property before sending the message to the child process. We don't want
    // to change the original message object which is used elsewhere, so we
    // do a shallow clone first:
    message = Object.assign({}, message);
    delete message.pageUrl;
    this.sendAsyncMessage("AIChatContent:DispatchMessage", message);
  }

  dispatchTruncateToChatContent(payload) {
    this.sendAsyncMessage("AIChatContent:TruncateConversation", payload);
  }

  dispatchRemoveAppliedMemoryToChatContent(payload) {
    this.sendAsyncMessage("AIChatContent:RemoveAppliedMemory", payload);
  }

  /**
   * Dispatch seen links for a conversation. This can be a partial set of seen links
   * for incremental updates, or the full list of links.
   *
   * @param {object} payload
   * @param {string} payload.conversationId
   * @param {Set<string>} payload.seenUrls
   */
  dispatchSeenUrlsToChatContent(payload) {
    this.sendAsyncMessage("AIChatContent:SeenUrls", payload);
  }

  setGeneratingOnChatContent(isGenerating) {
    this.sendAsyncMessage("AIChatContent:SetGenerating", { isGenerating });
  }

  /**
   * Forward the conversation's history results pool to the content page. Sent
   * only when the pool changes (a search_browsing_history tool call ran).
   *
   * @param {object} payload
   * @param {object[]} payload.records
   */
  dispatchHistoryResultsToChatContent(payload) {
    this.sendAsyncMessage("AIChatContent:HistoryResults", payload);
  }

  receiveMessage({ data, name }) {
    switch (name) {
      case "AIChatContent:DispatchFollowUp":
        this.#handleFollowUpFromChild(data);
        break;

      case "AIChatContent:Ready":
        this.#notifyContentReady();
        break;

      case "AIChatContent:DispatchNewChat":
        this.#handleNewChat();
        break;

      case "AIChatContent:DispatchAction":
        this.#handleFooterActionFromChild(data);
        break;

      case "AIChatContent:OpenLink":
        this.#handleOpenLink(data);
        break;

      case "AIChatContent:AccountSignIn":
        this.#handleAccountSignIn();
        break;

      case "AIChatContent:ToolUIUpdate":
        this.#handleToolUIUpdate(data);
        break;

      case "AIChatContent:RequestAssets":
        this.#handleRequestAssets(data);
        break;

      case "AIChatContent:HistoryGridRender":
      case "AIChatContent:HistoryGridItemClick":
        lazy.AIWindowTelemetry.recordHistoryGridEvent(
          this.#getAIWindowElement(),
          data,
          name
        );
        break;

      default:
        console.warn(`AIChatContentParent received unknown message: ${name}`);
        break;
    }
    return undefined;
  }

  #notifyContentReady() {
    const aiWindow = this.#getAIWindowElement();
    aiWindow?.onContentReady();
  }

  #handleFooterActionFromChild(data) {
    try {
      const aiWindow = this.#getAIWindowElement();
      aiWindow.handleFooterAction(data);
    } catch (e) {
      console.warn("Could not handle footer action from AI Window chat", e);
    }
  }

  #handleOpenLink(data) {
    const aiWindow = this.#getAIWindowElement();
    aiWindow?.onOpenLink();

    try {
      const { url } = data;
      if (!url) {
        return;
      }

      const uri = Services.io.newURI(url);
      if (
        uri.scheme !== "http" &&
        uri.scheme !== "https" &&
        !this.isSettingsURI(uri)
      ) {
        return;
      }

      const window = this.browsingContext.topChromeWindow;

      if (!window) {
        return;
      }

      lazy.SmartWindowTelemetry.recordUriLoad();
      const currentPageURL = window.gBrowser.selectedBrowser.currentURI.spec;

      // Only treat it as "same link" if the URL is identical.
      // If anything differs (hash/query/path), let normal navigation proceed.
      if (url === currentPageURL) {
        lazy.AIWindowUI.handleSameLinkClick(window);
        return;
      }

      if (this.isSettingsURI(uri)) {
        lazy.URILoadingHelper.switchToTabHavingURI(window, url, true, {});
        return;
      }

      const { userContextId } =
        window.gBrowser.selectedBrowser.browsingContext.originAttributes;
      const triggeringPrincipal =
        Services.scriptSecurityManager.createNullPrincipal({ userContextId });
      const where = lazy.BrowserUtils.whereToOpenLink(data);

      if (where === "current") {
        const tabFound = lazy.URILoadingHelper.switchToTabHavingURI(
          window,
          url,
          false,
          {}
        );
        if (tabFound) {
          return;
        }
      }

      lazy.URILoadingHelper.openWebLinkIn(window, url, where, {
        triggeringPrincipal,
        userContextId,
        forceForeground: false,
      });
    } catch (e) {
      console.warn("Could not open link from AI Window chat", e);
    }
  }

  async #handleAccountSignIn() {
    const browser = this.browsingContext.topChromeWindow.gBrowser;
    const success = await lazy.AIWindow.launchSignInFlow(browser);
    if (success) {
      this.#handleRetryAfterError();
    }
  }

  #handleRetryAfterError() {
    try {
      const aiWindow = this.#getAIWindowElement();
      aiWindow.handleFooterAction({ action: "retry-after-error" });
    } catch (e) {
      console.warn("Could not handle Retry from AI Window chat", e);
    }
  }

  #handleNewChat() {
    try {
      const aiWindow = this.#getAIWindowElement();
      aiWindow.onCreateNewChatClick();
    } catch (e) {
      console.warn("Could not open new Smart Window chat", e);
    }
  }

  #getAIWindowElement() {
    const browser = this.browsingContext.embedderElement;
    const root = browser?.getRootNode?.();
    if (root?.host?.localName === "ai-window") {
      return root.host;
    }
    return browser?.ownerDocument?.querySelector("ai-window") ?? null;
  }

  #handleFollowUpFromChild(data) {
    try {
      const aiWindow = this.#getAIWindowElement();
      aiWindow.onQuickPromptClicked(data.text, false);
    } catch (e) {
      console.warn("Could not submit follow-up from AI Window chat", e);
    }
  }

  #handleToolUIUpdate(data) {
    try {
      const aiWindow = this.#getAIWindowElement();
      aiWindow.handleToolUIUpdate(data);
    } catch (e) {
      console.warn("Could not handle tool UI update from AI Window chat", e);
    }
  }

  /**
   * For a set of history results, resolve the page assets — the thumbnail
   * (`moz-page-thumb://` URI, or null) and whether Places has a real favicon for
   * the page — then send them back to the requesting message.
   *
   * @param {object} data
   * @param {string} data.messageId - Identifies the message whose grid requested
   *   the assets, echoed back so the content side can route the results.
   * @param {Array<{url: string, thumbnail?: string}>} data.items
   */
  async #handleRequestAssets({ messageId, items }) {
    try {
      const images = await Promise.all(
        (items ?? []).map(async ({ url, thumbnail }) => ({
          url,
          image: await lazy.captureThumbnail(thumbnail),
          hasFavicon: await this.#pageHasFavicon(url),
        }))
      );

      this.sendAsyncMessage("AIChatContent:AssetsReady", {
        messageId,
        images,
      });
    } catch (e) {
      console.warn("Could not resolve history assets for AI Window chat", e);
    }
  }

  /**
   * Whether Places has a stored favicon for the page. When false, a
   * `page-icon:` request for the URL would render the default favicon, so the
   * UI can choose its own fallback instead.
   *
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async #pageHasFavicon(url) {
    try {
      const favicon = await lazy.PlacesUtils.favicons.getFaviconForPage(
        Services.io.newURI(url)
      );
      return !!favicon;
    } catch (e) {
      return false;
    }
  }
}
