/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
});

/**
 * JSWindowActor to pass data between AIChatContent singleton and content pages.
 */
export class AIChatContentParent extends JSWindowActorParent {
  dispatchMessageToChatContent(response) {
    this.sendAsyncMessage("AIChatContent:DispatchMessage", response);
  }

  dispatchTruncateToChatContent(payload) {
    this.sendAsyncMessage("AIChatContent:TruncateConversation", payload);
  }

  dispatchRemoveAppliedMemoryToChatContent(payload) {
    this.sendAsyncMessage("AIChatContent:RemoveAppliedMemory", payload);
  }

  receiveMessage({ data, name }) {
    switch (name) {
      case "aiChatContentActor:search":
        this.#handleSearchFromChild(data);
        break;

      case "aiChatContentActor:followUp":
        this.#handleFollowUpFromChild(data);
        break;

      case "AIChatContent:Ready":
        this.#notifyContentReady();
        break;

      case "aiChatContentActor:footer-action":
        this.#handleFooterActionFromChild(data);
        break;

      case "AIChatContent:OpenLink":
        this.#handleOpenLink(data);
        break;

      default:
        console.warn(`AIChatContentParent received unknown message: ${name}`);
        break;
    }
    return undefined;
  }

  #notifyContentReady() {
    const aiWindow = this.#getAIWindowElement();
    aiWindow.onContentReady();
  }

  #handleSearchFromChild(data) {
    try {
      const { topChromeWindow } = this.browsingContext;
      lazy.AIWindow.performSearch(data, topChromeWindow);
    } catch (e) {
      console.warn("Could not perform search from AI Window chat", e);
    }
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
    try {
      const { url } = data;
      if (!url) {
        return;
      }

      const uri = Services.io.newURI(url);
      if (uri.scheme !== "http" && uri.scheme !== "https") {
        return;
      }

      const window = this.browsingContext.topChromeWindow;
      if (window) {
        const tabFound = window.switchToTabHavingURI(url, false, {});
        if (!tabFound) {
          window.gBrowser.selectedTab = window.gBrowser.addTab(url, {
            triggeringPrincipal:
              Services.scriptSecurityManager.createNullPrincipal({}),
          });
        }
      }
    } catch (e) {
      console.warn("Could not open link from AI Window chat", e);
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
      aiWindow.submitFollowUp(data.text);
    } catch (e) {
      console.warn("Could not submit follow-up from AI Window chat", e);
    }
  }
}
