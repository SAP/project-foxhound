/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/sidebar/sidebar-panel-header.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  PageAssist: "moz-src:///browser/components/genai/PageAssist.sys.mjs",
  AboutReaderParent: "resource:///actors/AboutReaderParent.sys.mjs",
});

import MozInputText from "chrome://global/content/elements/moz-input-text.mjs";

/**
 * A custom element for managing the page assistant input.
 */
export class PageAssistInput extends MozInputText {
  static properties = {
    class: { type: String, reflect: true },
  };

  inputTemplate() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/genai/content/page-assist.css"
      />
      <input
        id="input"
        class=${"with-icon " + ifDefined(this.class)}
        name=${this.name}
        .value=${this.value || ""}
        ?disabled=${this.disabled || this.parentDisabled}
        accesskey=${ifDefined(this.accessKey)}
        placeholder=${ifDefined(this.placeholder)}
        aria-label=${ifDefined(this.ariaLabel ?? undefined)}
        aria-describedby="description"
        @input=${this.handleInput}
        @change=${this.redispatchEvent}
      />
    `;
  }
}
customElements.define("page-assists-input", PageAssistInput);

/**
 * A custom element for managing the page assistant sidebar.
 */
export class PageAssist extends MozLitElement {
  _progressListener = null;
  _onTabSelect = null;
  _onReaderModeChange = null;
  _onUnload = null;

  static properties = {
    userPrompt: { type: String },
    aiResponse: { type: String },
    isCurrentPageReaderable: { type: Boolean },
    matchCountQty: { type: Number },
    currentMatchIndex: { type: Number },
    highlightAll: { type: Boolean },
    snippets: { type: Array },
  };

  constructor() {
    super();
    this.userPrompt = "";
    this.aiResponse = "";
    this.isCurrentPageReaderable = true;
    this.matchCountQty = 0;
    this.currentMatchIndex = 0;
    this.highlightAll = true;
    this.snippets = [];
  }

  get _browserWin() {
    return this.ownerGlobal?.browsingContext?.topChromeWindow || null;
  }
  get _gBrowser() {
    return this._browserWin?.gBrowser || null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._attachReaderModeListener();
    this._initURLChange();
    this._onUnload = () => this._cleanup();
    this._setupFinder();
    this.ownerGlobal.addEventListener("unload", this._onUnload, { once: true });
  }

  disconnectedCallback() {
    // Clean up finder listener
    if (this.browser && this.browser.finder) {
      this.browser.finder.removeResultListener(this);
    }

    if (this._onUnload) {
      this.ownerGlobal.removeEventListener("unload", this._onUnload);
      this._onUnload = null;
    }
    this._cleanup();
    super.disconnectedCallback();
  }

  _setupFinder() {
    const gBrowser = this._gBrowser;

    if (!gBrowser) {
      console.warn("No gBrowser found.");
      return;
    }

    const selected = gBrowser.selectedBrowser;

    // If already attached to this browser, skip
    if (this.browser === selected) {
      return;
    }

    // Clean up old listener if needed
    if (this.browser && this.browser.finder) {
      this.browser.finder.removeResultListener(this);
    }

    this.browser = selected;

    if (this.browser && this.browser.finder) {
      this.browser.finder.addResultListener(this);
    } else {
      console.warn("PageAssist: no finder on selected browser.");
    }
  }

  _cleanup() {
    try {
      const gBrowser = this._gBrowser;
      if (gBrowser && this._progressListener) {
        gBrowser.removeTabsProgressListener(this._progressListener);
      }
      if (gBrowser?.tabContainer && this._onTabSelect) {
        gBrowser.tabContainer.removeEventListener(
          "TabSelect",
          this._onTabSelect
        );
      }
      if (this._onReaderModeChange) {
        lazy.AboutReaderParent.removeMessageListener(
          "Reader:UpdateReaderButton",
          this._onReaderModeChange
        );
      }
    } catch (e) {
      console.error("PageAssist cleanup failed:", e);
    } finally {
      this._progressListener = null;
      this._onTabSelect = null;
      this._onReaderModeChange = null;
    }
  }

  _attachReaderModeListener() {
    this._onReaderModeChange = {
      receiveMessage: msg => {
        // AboutReaderParent.callListeners sets msg.target = the <browser> element
        const browser = msg?.target;
        const selected = this._gBrowser?.selectedBrowser;
        if (!browser || browser !== selected) {
          return; // only care about the active tab
        }
        // AboutReaderParent already set browser.isArticle for this message.
        this.isCurrentPageReaderable = !!browser.isArticle;
      },
    };

    lazy.AboutReaderParent.addMessageListener(
      "Reader:UpdateReaderButton",
      this._onReaderModeChange
    );
  }

  /**
   * Initialize URL change detection
   */
  _initURLChange() {
    const { gBrowser } = this._gBrowser;
    if (!gBrowser) {
      return;
    }

    this._onTabSelect = () => {
      this._setupFinder();
      const browser = gBrowser.selectedBrowser;
      this.isCurrentPageReaderable = !!browser?.isArticle;
    };
    gBrowser.tabContainer.addEventListener("TabSelect", this._onTabSelect);

    this._progressListener = {
      onLocationChange: (browser, webProgress) => {
        if (!webProgress?.isTopLevel) {
          return;
        }
        this.isCurrentPageReaderable = !!browser?.isArticle;
      },
    };
    gBrowser.addTabsProgressListener(this._progressListener);

    // Initial check
    this._onTabSelect();
  }

  /**
   * Fetch Page Data
   *
   * @returns {Promise<null|
   * {
   *  url: string,
   *  title: string,
   *  content: string,
   *  textContent: string,
   *  excerpt: string,
   *  isReaderable: boolean
   * }>}
   */
  async _fetchPageData() {
    const gBrowser = this._gBrowser;

    const windowGlobal =
      gBrowser?.selectedBrowser?.browsingContext?.currentWindowGlobal;

    if (!windowGlobal) {
      return null;
    }

    // Get the parent actor instance
    const actor = windowGlobal.getActor("PageAssist");
    return await actor.fetchPageData();
  }

  _clearFinder() {
    if (this.browser?.finder) {
      this.browser.finder.removeSelection();
      this.browser.finder.highlight(false, "", false);
    }
    this.matchCountQty = 0;
    this.currentMatchIndex = 0;
    this.snippets = [];
  }

  _handlePromptInput = e => {
    const value = e.target.value;
    this.userPrompt = value;

    // If input is empty, clear values
    if (!value) {
      this._clearFinder();
      return;
    }

    // Perform the search
    this.browser.finder.fastFind(value, false, false);

    if (this.highlightAll) {
      // Todo this also needs to take contextRange.
      this.browser.finder.highlight(true, value, false);
    }

    // Request match count - this method will trigger onMatchesCountResult callback
    this.browser.finder.requestMatchesCount(value, {
      linksOnly: false,
      contextRange: 30,
    });
  };

  onMatchesCountResult(result) {
    this.matchCountQty = result.total;
    this.currentMatchIndex = result.current;
    this.snippets = result.snippets || [];
  }

  // Abstract method need to be implemented or it will error
  onHighlightFinished() {
    // Noop.
  }

  // Finder result listener methods
  onFindResult(result) {
    switch (result.result) {
      case Ci.nsITypeAheadFind.FIND_NOTFOUND:
        this.matchCountQty = 0;
        this.currentMatchIndex = 0;
        this.snippets = [];
        break;

      default:
        break;
    }
  }

  _handleSubmit = async () => {
    const pageData = await this._fetchPageData();
    if (!pageData) {
      this.aiResponse = "No page data";
      return;
    }
    const aiResponse = await lazy.PageAssist.fetchAiResponse(
      this.userPrompt,
      pageData
    );
    this.aiResponse = aiResponse ?? "No response";
  };

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/genai/content/page-assist.css"
      />
      <div>
        <sidebar-panel-header
          data-l10n-id="genai-page-assist-sidebar-title"
          data-l10n-attrs="heading"
          view="viewGenaiPageAssistSidebar"
        ></sidebar-panel-header>
        <div class="wrapper">
          ${this.aiResponse
            ? html`<div class="ai-response">${this.aiResponse}</div>`
            : ""}
          <div>
            <page-assists-input
              class="find-input"
              type="text"
              placeholder="Find in page..."
              .value=${this.userPrompt}
              @input=${this._handlePromptInput}
            ></page-assists-input>
            <moz-button
              id="submit-user-prompt-btn"
              type="primary"
              size="small"
              @click=${this._handleSubmit}
            >
              Submit
            </moz-button>
          </div>

          <div>
            ${this.snippets.length
              ? html`<div class="snippets">
                  <h3>Snippets</h3>
                  <ul>
                    ${this.snippets.map(
                      snippet =>
                        html`<li>
                          ${snippet.before}<b>${snippet.match}</b>${snippet.after}
                        </li>`
                    )}
                  </ul>
                </div>`
              : ""}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("page-assist", PageAssist);
