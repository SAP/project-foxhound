/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  AIWINDOW_URL,
  AIWindow,
} from "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs";

export const AIWindowUI = {
  BOX_ID: "ai-window-box",
  SPLITTER_ID: "ai-window-splitter",
  BROWSER_ID: "ai-window-browser",
  STACK_CLASS: "ai-window-browser-stack",

  /**
   * @param {Window} win
   * @returns {{ chromeDoc: Document, box: Element, splitter: Element } | null}
   */
  _getSidebarElements(win) {
    if (!win) {
      return null;
    }
    const chromeDoc = win.document;
    const box = chromeDoc.getElementById(this.BOX_ID);
    const splitter = chromeDoc.getElementById(this.SPLITTER_ID);

    if (!box || !splitter) {
      return null;
    }
    return { chromeDoc, box, splitter };
  },

  /**
   * Ensure the aiwindow <browser> exists under the sidebar box.
   *
   * @param {Document} chromeDoc
   * @param {Element} box
   * @returns {XULElement} browser
   */
  ensureBrowserIsAppended(chromeDoc, box) {
    const existingBrowser = chromeDoc.getElementById(this.BROWSER_ID);
    if (existingBrowser) {
      return existingBrowser;
    }

    const stack = box.querySelector(`.${this.STACK_CLASS}`);

    if (!stack.isConnected) {
      stack.className = this.STACK_CLASS;
      stack.setAttribute("flex", "1");
      box.appendChild(stack);
    }

    const browser = chromeDoc.createXULElement("browser");
    browser.id = this.BROWSER_ID;
    browser.setAttribute("transparent", "true");
    browser.setAttribute("flex", "1");
    browser.setAttribute("disablehistory", "true");
    browser.setAttribute("disablefullscreen", "true");
    browser.setAttribute("tooltip", "aHTMLTooltip");
    browser.setAttribute("src", AIWINDOW_URL);
    stack.appendChild(browser);
    return browser;
  },

  /**
   * @param {Window} win
   * @returns {boolean} whether the sidebar is open (visible)
   */
  isSidebarOpen(win) {
    const nodes = this._getSidebarElements(win);
    if (!nodes) {
      return false;
    }
    return !nodes.box.hidden;
  },

  _showSidebarElements(box, splitter) {
    box.hidden = false;
    splitter.hidden = false;
    box.parentElement.hidden = false;
  },

  /**
   * Open the AI Window in full window mode
   *
   * @param {Browser} browser
   * @param {ChatConversation} conversation The conversation to open
   */
  openInFullWindow(browser, conversation) {
    this.closeSidebar(browser.ownerGlobal);

    browser.setAttribute("data-conversation-id", conversation.id);

    const { contentDocument } = browser;
    contentDocument.dispatchEvent(
      new browser.contentWindow.CustomEvent("OpenConversation", {
        detail: conversation,
      })
    );
  },

  /**
   * Open the AI Window sidebar
   *
   * @param {Window} win
   * @param {ChatConversation} conversation The conversation to open in the sidebar
   */
  openSidebar(win, conversation) {
    const nodes = this._getSidebarElements(win);
    if (!nodes) {
      return;
    }

    const { box, splitter } = nodes;
    const aiBrowser = this.ensureBrowserIsAppended(win.document, box);

    this._showSidebarElements(box, splitter);
    this._setAskButtonStyle(win, true);

    if (conversation) {
      aiBrowser.setAttribute("data-conversation-id", conversation.id);
    } else {
      aiBrowser.removeAttribute("data-conversation-id");
    }

    const contentDoc = aiBrowser.contentDocument;
    if (contentDoc && aiBrowser.contentWindow) {
      contentDoc.dispatchEvent(
        new aiBrowser.contentWindow.CustomEvent("OpenConversation", {
          detail: conversation,
        })
      );
    }
  },

  /**
   * Close the AI Window sidebar.
   *
   * @param {Window} win
   */
  closeSidebar(win) {
    if (!this.isSidebarOpen(win)) {
      return;
    }
    const { box, splitter } = this._getSidebarElements(win);

    // @todo Bug2012536
    // Test behavior of hidden vs collapsed with the intent that
    // the document doesn't get unloaded so that the document isn't
    // constantly being reloaded as result of tab switches
    box.hidden = true;
    splitter.hidden = true;
    this._setAskButtonStyle(win, false);
  },

  /**
   * Toggle the AI Window sidebar
   *
   * @param {Window} win
   * @returns {boolean} true if now open, false if now closed
   */
  toggleSidebar(win) {
    const nodes = this._getSidebarElements(win);
    if (!nodes) {
      return false;
    }
    const { chromeDoc, box, splitter } = nodes;

    if (!box.hidden) {
      box.hidden = true;
      splitter.hidden = true;
      this._setAskButtonStyle(win, false);
      return false;
    }

    this.ensureBrowserIsAppended(chromeDoc, box);
    this._showSidebarElements(box, splitter);
    this._setAskButtonStyle(win, true);
    return true;
  },

  /**
   * Update the Ask Button style based on the sidebar state.
   *
   * @param {Window} win
   * @param {boolean} sidebarIsOpen
   */
  _setAskButtonStyle(win, sidebarIsOpen) {
    const askBtn = win.document.querySelector("#smartwindow-ask-button");
    if (!askBtn) {
      return;
    }
    askBtn.classList.toggle("sidebar-is-open", sidebarIsOpen);
  },

  /**
   * Moves a full-page AI Window conversation into the sidebar.
   *
   * @param {Window} win
   * @param {object} tab - The tab containing the full-page AI Window
   * @returns {XULElement|null} The sidebar browser element
   */
  async moveFullPageToSidebar(win, tab) {
    const fullPageBrowser = tab.linkedBrowser;
    if (
      !fullPageBrowser?.currentURI ||
      !AIWindow.isAIWindowContentPage(fullPageBrowser.currentURI)
    ) {
      return null;
    }

    let conversationId = null;
    try {
      const aiWindowEl =
        fullPageBrowser.contentDocument?.querySelector("ai-window");
      conversationId = aiWindowEl?.conversationId ?? null;
    } catch {
      // Content may not be accessible
    }

    let conversation = null;
    if (conversationId) {
      conversation =
        await AIWindow.chatStore.findConversationById(conversationId);
    }

    this.openSidebar(win, conversation);

    const nodes = this._getSidebarElements(win);
    return nodes ? nodes.chromeDoc.getElementById(this.BROWSER_ID) : null;
  },
};
