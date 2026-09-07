/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

const { ERRORS, WARNINGS, MAX_ITEM_COUNT } = ChromeUtils.importESModule(
  "resource:///modules/contentsharing/ContentSharingUtils.sys.mjs"
);
const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const MAX_PREVIEW_LINKS = 3;
const WINDOW_BREAKPOINT_SIZE = 830;
const lazy = {};

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "CONTENT_SHARING_SERVER_URL",
  "browser.contentsharing.server.url",
  ""
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "CONTENT_SHARING_DEBUG",
  "browser.contentsharing.debug",
  false
);

const DEFAULT_COPY_ICON = "chrome://global/skin/icons/edit-copy.svg";
const DEFAULT_COPY_L10N_ID = "content-sharing-modal-copy-link";

const COPIED_COPY_ICON = "chrome://global/skin/icons/check.svg";
const COPIED_COPY_L10N_ID = "content-sharing-modal-link-copied";

const ACCEPTABLE_USE_POLICY_URL =
  "https://www.mozilla.org/about/legal/acceptable-use/";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-card.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-message-bar.mjs";

/**
 * Element used for content sharing modal content
 */
export class ContentSharingModal extends MozLitElement {
  static properties = {
    shareResult: { type: Object },
    size: { type: String, reflect: true },
    loading: { type: Boolean },
  };

  static queries = {
    title: ".share-title",
    linkCount: ".share-count",
    links: { all: ".link" },
    moreLinks: ".more-links",
    previewCard: ".preview > moz-card",
    copyButton: "#copy-button",
    viewPageButton: "#view-page",
    signInButton: "#sign-in",
    loadingButton: "#loading-button",
    tooManyLinks: ".too-many-links",
    errorMessageBar: "moz-message-bar",
  };

  async getUpdateComplete() {
    await super.getUpdateComplete();
    await this.previewCard?.updateComplete;
  }

  async connectedCallback() {
    super.connectedCallback();

    let { shareResult, loadingPromise, size } = window.arguments?.[0] ?? {};

    this.shareResult = shareResult;
    if (loadingPromise) {
      this.loading = true;
      this.shareResult = (await loadingPromise).shareResult;
      this.loading = false;
    }

    // The modal does not resize with the window so when the modal is opened
    // from ContentSharingUtils the current windows width is passed. If the
    // window width is less than 830, the modal will open in the "small" state.
    this.size = size < WINDOW_BREAKPOINT_SIZE ? "small" : null;
  }

  close() {
    // Borrowing a hack from unexpectedScriptLoad.js, which we use to ensure
    // opened tabs are foregrounded. To be fixed in bug 2040823.
    window.top.document.documentElement.removeAttribute("window-modal-open");

    window.close();
  }

  linkTemplate(link) {
    if (link.type === "bookmarks") {
      return html`<div class="link">
        <img class="link-icon" src="chrome://global/skin/icons/folder.svg" />
        <span class="link-title">${link.title}</span>
      </div>`;
    }

    return html`<div class="link">
      <img class="link-icon" src="page-icon:${link.url}" />
      <span class="link-title">${link.title}</span>
    </div>`;
  }

  linksInfoTemplate() {
    if (this.shareResult.warning === WARNINGS.TOO_MANY_LINKS) {
      return html`<div class="too-many-links">
        <img class="icon" src="chrome://global/skin/icons/error.svg" />
        <span
          data-l10n-id="content-sharing-modal-too-many-links-2"
          data-l10n-args=${JSON.stringify({
            count: MAX_ITEM_COUNT,
          })}
        ></span>
      </div> `;
    }

    return html`<div
      class="more-links"
      data-l10n-id="content-sharing-modal-more-tabs"
      data-l10n-args=${JSON.stringify({
        count: this.shareResult.share.links.length - MAX_PREVIEW_LINKS,
      })}
    ></div>`;
  }

  linksTemplate() {
    if (!this.shareResult.share?.links) {
      return null;
    }

    if (this.shareResult.share.links.length > MAX_PREVIEW_LINKS) {
      return html`${this.shareResult.share.links
        .slice(0, 3)
        .map(link => this.linkTemplate(link))}
      ${this.linksInfoTemplate()}`;
    }

    return this.shareResult.share.links.map(link => this.linkTemplate(link));
  }

  handleViewPageClick() {
    Glean.collectionShare.ctaClicked.record({
      button: "view-page",
      signed_in: true,
    });
    this.close();
    this.documentGlobal.frameElement.documentGlobal.openWebLinkIn(
      this.shareResult.url,
      "tab"
    );
  }

  handleCopyClick() {
    window.navigator.clipboard.writeText(this.shareResult.url);
    Glean.collectionShare.ctaClicked.record({
      button: "copy-button",
      signed_in: true,
    });

    this.copyButton.setAttribute("iconsrc", COPIED_COPY_ICON);
    this.copyButton.setAttribute("data-l10n-id", COPIED_COPY_L10N_ID);

    new Promise(r => setTimeout(r, 1000)).then(() => {
      this.copyButton.setAttribute("iconsrc", DEFAULT_COPY_ICON);
      this.copyButton.setAttribute("data-l10n-id", DEFAULT_COPY_L10N_ID);
    });
  }

  handleSignInClick() {
    Glean.collectionShare.ctaClicked.record({
      button: "sign-in",
      signed_in: false,
    });
    const accountSlug = lazy.CONTENT_SHARING_DEBUG
      ? "/accounts/dummy/login/"
      : "/accounts/fxa/login/";
    const signInURL = lazy.CONTENT_SHARING_SERVER_URL + accountSlug;
    this.close();
    this.documentGlobal.frameElement.documentGlobal.openWebLinkIn(
      signInURL,
      "tab"
    );
  }

  acceptableUseClick(event) {
    if (!HTMLAnchorElement.isInstance(event.target)) {
      return;
    }
    event.preventDefault();
    this.close();
    // Need to do this explicity because just clicking isn't opening a tab
    this.documentGlobal.frameElement.documentGlobal.openWebLinkIn(
      event.target.href,
      "tab"
    );
  }

  loadingTemplate() {
    return html`<moz-button-group
      ><moz-button
        disabled
        id="loading-button"
        iconsrc="chrome://global/skin/icons/loading.svg"
        data-l10n-id="content-sharing-modal-generating-page"
        type="icon"
      ></moz-button
    ></moz-button-group>`;
  }

  descriptionActionTemplate() {
    if (this.loading) {
      return this.loadingTemplate();
    }

    // If we got the url or
    // if there were no errors or
    // if were not signed in and got an unauthorized error
    if (
      this.shareResult.url ||
      !this.shareResult.error ||
      (!this.shareResult.isSignedIn &&
        this.shareResult.error === ERRORS.UNAUTHORIZED)
    ) {
      return html`<moz-button-group
        >${this.buttonsTemplate()}</moz-button-group
      >`;
    }

    if (this.shareResult.error === ERRORS.INVALID_SCHEMA) {
      return html`<moz-message-bar
        type="critical"
        data-l10n-id="content-sharing-modal-no-shareable-links"
      ></moz-message-bar>`;
    }

    if (this.shareResult.error) {
      return html`<moz-message-bar
        type="critical"
        data-l10n-id="content-sharing-modal-generic-error-2"
      ></moz-message-bar>`;
    }

    // I don't think we can be in this state?
    return null;
  }

  buttonsTemplate() {
    // Note: Avoid changing existing button IDs, because they are submitted
    // with button click telemetry. If new buttons or added, or IDs change,
    // be sure to update the list of buttons in metrics.yaml.
    if (this.shareResult.isSignedIn) {
      return html`<moz-button
          @click=${this.handleViewPageClick}
          id="view-page"
          data-l10n-id="content-sharing-modal-view-page-2"
        ></moz-button
        ><moz-button
          id="copy-button"
          iconsrc=${DEFAULT_COPY_ICON}
          data-l10n-id=${DEFAULT_COPY_L10N_ID}
          type="primary"
          @click=${this.handleCopyClick}
        ></moz-button>`;
    }

    return html`<moz-button
      @click=${this.handleSignInClick}
      id="sign-in"
      data-l10n-id="content-sharing-modal-sign-in-2"
      type="primary"
    ></moz-button>`;
  }

  policyTemplate() {
    if (this.shareResult.isSignedIn) {
      return null;
    }

    return html`<div class="policy" @click=${this.acceptableUseClick}>
      <span data-l10n-id="content-sharing-modal-policy"
        ><a
          data-l10n-name="aup-link"
          href=${ACCEPTABLE_USE_POLICY_URL}
          target="_blank"
        ></a
      ></span>
    </div>`;
  }

  previewTitleTemplate() {
    if (this.shareResult.share.type === "tabs") {
      return html`<div>
        <img
          class="share-icon"
          src="chrome://browser/content/contentsharing/content-sharing-icon.svg"
        />
        <span class="share-title">${this.shareResult.share.title}</span>
      </div>`;
    }

    return html`<span class="share-title">${this.shareResult.share.title}</span
      ><span class="share-count"
        ><img
          class="share-icon"
          src="chrome://browser/content/contentsharing/content-sharing-icon.svg"
        />
        ${this.shareResult.share.links.length}</span
      >`;
  }

  render() {
    if (!this.shareResult.share) {
      return null;
    }

    return html`<link
        rel="stylesheet"
        href="chrome://browser/content/contentsharing/content-sharing-modal.css"
      />
      <link
        rel="stylesheet"
        href="chrome://global/skin/in-content/common.css"
      />
      <div id="background-image"></div>
      <div id="plain-background"></div>
      <div class="container">
        <div class="preview">
          <moz-card
            ><label class="share-header">${this.previewTitleTemplate()}</label>
            <div class="link-preview-list">${this.linksTemplate()}</div>
          </moz-card>
        </div>
        <div class="description">
          <moz-button
            @click=${this.close}
            type="ghost"
            id="close-button"
            iconsrc="chrome://global/skin/icons/close.svg"
          ></moz-button>

          <div class="description-content">
            <div>
              <h2
                data-l10n-id=${this.shareResult.isSignedIn
                  ? "content-sharing-modal-title-signed-in"
                  : "content-sharing-modal-title-2"}
              ></h2>
              <p
                data-l10n-id=${this.shareResult.isSignedIn
                  ? "content-sharing-modal-description-signed-in"
                  : "content-sharing-modal-description-2"}
              ></p>
            </div>
            ${this.descriptionActionTemplate()}
          </div>

          <div class="empty"></div>
        </div>
      </div>
      ${this.policyTemplate()}`;
  }
}
customElements.define("content-sharing-modal", ContentSharingModal);
