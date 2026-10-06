/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into chrome windows with the subscript loader. Wrap in
// a block to prevent accidentally leaking globals onto `window`.
{
  ChromeUtils.defineESModuleGetters(this, {
    BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  });

  /**
   * A footer which appears in the corner of the inactive panel in split view.
   *
   * The footer displays the favicon and domain name of the site.
   */
  class MozSplitViewFooter extends MozXULElement {
    #initialized = false;

    #isInsecure = false;
    /** @type {HTMLSpanElement} */
    securityElement = null;

    /** @type {HTMLImageElement} */
    iconElement = null;
    #iconSrc = "";

    /** @type {HTMLSpanElement} */
    uriElement = null;
    /** @type {nsIURI} */
    #uri = null;

    #browserProgressListener = {
      QueryInterface: ChromeUtils.generateQI([
        Ci.nsIWebProgressListener,
        Ci.nsISupportsWeakReference,
      ]),
      onLocationChange: (aWebProgress, aRequest, aLocation) => {
        if (aWebProgress?.isTopLevel && aLocation) {
          this.#updateUri(aLocation);
        }
      },
      onSecurityChange: (aWebProgress, aRequest, aState) =>
        this.#toggleInsecure(
          !!(
            aState & Ci.nsIWebProgressListener.STATE_IS_INSECURE ||
            aState & Ci.nsIWebProgressListener.STATE_IS_BROKEN
          )
        ),
    };

    /** @type {XULElement} */
    #tab = null;

    static markup = `
      <hbox class="split-view-security-warning" hidden="">
        <html:img role="presentation" src="chrome://global/skin/icons/security-broken.svg" />
        <html:span data-l10n-id="urlbar-trust-icon-notsecure-label"></html:span>
      </hbox>
      <html:img class="split-view-icon" hidden="" role="presentation"/>
      <html:span class="split-view-uri"></html:span>
      <toolbarbutton image="chrome://global/skin/icons/more.svg"
                     data-l10n-id="urlbar-split-view-button" />
    `;

    connectedCallback() {
      if (this.#initialized) {
        return;
      }
      this.appendChild(this.constructor.fragment);

      this.securityElement = this.querySelector(".split-view-security-warning");
      this.iconElement = this.querySelector(".split-view-icon");
      this.uriElement = this.querySelector(".split-view-uri");
      this.menuButtonElement = this.querySelector("toolbarbutton");

      // Ensure these elements are up-to-date, as this info may have been set
      // prior to inserting this element into the DOM.
      this.#updateSecurityElement();
      this.#updateIconElement();
      this.#updateUriElement();

      this.addEventListener("click", this);
      this.menuButtonElement.addEventListener("command", this);

      this.#initialized = true;
    }

    disconnectedCallback() {
      this.#resetTab();
    }

    handleEvent(e) {
      switch (e.type) {
        case "click":
          e.stopPropagation();
          break;
        case "command":
          gBrowser.openSplitViewMenu(this.menuButtonElement);
          break;
        case "TabAttrModified":
          for (const attribute of e.detail.changed) {
            this.#handleTabAttrModified(attribute);
          }
          break;
      }
    }

    #handleTabAttrModified(attribute) {
      switch (attribute) {
        case "image":
          this.#updateIconSrc(this.#tab.image);
          break;
      }
    }

    /**
     * Update the insecure flag and refresh the security warning visibility.
     *
     * @param {boolean} isInsecure
     */
    #toggleInsecure(isInsecure) {
      this.#isInsecure = isInsecure;
      if (this.securityElement) {
        this.#updateSecurityElement();
      }
      if (this.iconElement) {
        this.#updateIconElement();
      }
    }

    #updateSecurityElement() {
      const isWebsite =
        this.#uri.schemeIs("http") || this.#uri.schemeIs("https");
      this.securityElement.hidden = !isWebsite || !this.#isInsecure;
    }

    /**
     * Update the footer icon to the given source URI.
     *
     * @param {string} iconSrc
     */
    #updateIconSrc(iconSrc) {
      this.#iconSrc = iconSrc;
      if (this.iconElement) {
        this.#updateIconElement();
      }
    }

    #updateIconElement() {
      let canShowIcon = !this.#isInsecure && this.#iconSrc;
      if (canShowIcon) {
        this.iconElement.setAttribute("src", this.#iconSrc);
      } else {
        this.iconElement.removeAttribute("src");
      }
      this.iconElement.hidden = !canShowIcon;
    }

    /**
     * Update the footer URI display with the formatted domain string.
     *
     * @param {nsIURI} uri
     */
    #updateUri(uri) {
      this.hidden = uri.specIgnoringRef === "about:opentabs";
      this.#uri = uri;
      if (this.uriElement) {
        this.#updateUriElement();
      }
      if (this.securityElement) {
        this.#updateSecurityElement();
      }
    }

    #updateUriElement() {
      const uriString = this.#uri
        ? BrowserUtils.formatURIForDisplay(this.#uri)
        : "";
      this.uriElement.textContent = uriString;
    }

    /**
     * Link the footer to the provided tab so it stays in sync.
     *
     * @param {MozTabbrowserTab} tab
     */
    setTab(tab) {
      this.#resetTab();

      // Track favicon changes.
      this.#updateIconSrc(tab.image);
      tab.addEventListener("TabAttrModified", this);

      // Track URI and security changes.
      this.#updateUri(tab.linkedBrowser.currentURI);
      const securityState = tab.linkedBrowser.securityUI.state;
      this.#toggleInsecure(
        !!(
          securityState & Ci.nsIWebProgressListener.STATE_IS_INSECURE ||
          securityState & Ci.nsIWebProgressListener.STATE_IS_BROKEN
        )
      );
      tab.linkedBrowser.addProgressListener(
        this.#browserProgressListener,
        Ci.nsIWebProgress.NOTIFY_LOCATION | Ci.nsIWebProgress.NOTIFY_SECURITY
      );

      this.#tab = tab;
    }

    /**
     * Remove the footer's association with the current tab.
     */
    #resetTab() {
      if (this.#tab) {
        this.#tab.removeEventListener("TabAttrModified", this);
        if (this.#tab.linkedBrowser?.webProgress) {
          this.#tab.linkedBrowser.removeProgressListener(
            this.#browserProgressListener
          );
        }
      }
      this.#tab = null;
    }
  }

  customElements.define("split-view-footer", MozSplitViewFooter);
}
