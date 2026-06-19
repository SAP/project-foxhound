/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  SmartWindowTelemetry:
    "moz-src:///browser/components/aiwindow/ui/modules/SmartWindowTelemetry.sys.mjs",
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  URILoadingHelper: "resource:///modules/URILoadingHelper.sys.mjs",
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

  receiveMessage({ data, name }) {
    switch (name) {
      case "aiChatContentActor:followUp":
        this.#handleFollowUpFromChild(data);
        break;

      case "AIChatContent:Ready":
        this.#notifyContentReady();
        break;

      case "AIChatContent:DispatchNewChat":
        this.#handleNewChat();
        break;

      case "aiChatContentActor:footer-action":
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
}
