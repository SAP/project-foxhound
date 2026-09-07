/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SitePermissions: "resource:///modules/SitePermissions.sys.mjs",
});

/**
 * Handles sidebar permission UI elements.
 * Creates and manages permission indicators in the sidebar.
 */
export class SidebarPermissionsUI {
  #window;
  #browser;
  #contentBrowser;
  #identityBox;
  #sharingContainer;
  #blockedContainer;
  #notificationBox;
  #sharingIcon;
  #blockedIcon;
  #sharingOpenPanel;
  #blockedOpenPanel;
  #onPanelClick;

  constructor(win, browser) {
    this.#window = win;
    this.#browser = browser;
  }

  /**
   * Set the content browser for permission panel targeting.
   *
   * @param {Browser} browser - The inner browser element that load the web content
   */
  setContentBrowser(browser) {
    this.#contentBrowser = browser;
  }

  /**
   * Creates the static UI skeleton for permission indicators in the sidebar.
   */
  build() {
    const doc = this.#browser.contentDocument;
    const indicator = doc.getElementById("permissions-indicator");
    if (!indicator) {
      return;
    }

    this.#identityBox = this.#createChild(
      doc,
      indicator,
      "identity-permission-box",
      el => {
        el.classList.add("identity-box-button");
        el.setAttribute("data-l10n-id", "urlbar-permissions-granted");
      }
    );
    this.#notificationBox = this.#createChild(
      doc,
      indicator,
      "notification-popup-box",
      el => {
        el.classList.add("anchor-root");
      }
    );
    this.#sharingContainer = this.#createChild(
      doc,
      this.#identityBox,
      "permission-sharing"
    );
    this.#blockedContainer = this.#createChild(
      doc,
      this.#identityBox,
      "blocked-permissions-container"
    );

    // Always create icons so anchor exists for SidebarPopupNotification
    this.#ensureMicIcon();
    this.#ensureSharingIcon();

    // Setup click handler
    if (this.#onPanelClick) {
      this.#identityBox.removeEventListener("click", this.#onPanelClick);
    }
    this.#onPanelClick = this.#handlePanelClick.bind(this);
    this.#identityBox.addEventListener("click", this.#onPanelClick);
  }

  isReady() {
    return !!this.#identityBox;
  }

  isIdentityBoxOpen() {
    return !!this.#identityBox?.getAttribute("open");
  }

  /**
   * Show the microphone request UI for SidebarPopupNotification.
   */
  showMicRequestUI() {
    this.#notificationBox.classList.add("showing");
  }

  /**
   * Show the granted permission UI indicator.
   *
   * @param {string} type - Permission type (e.g. "microphone")
   */
  showGrantedUI(type) {
    this.#ensureSharingIcon();
    this.#sharingIcon.setAttribute("showing", "");
    this.#sharingIcon.setAttribute("sharing", type);
    this.#sharingIcon.setAttribute("paused", "");
    this.#notificationBox.classList.remove("showing");
    this.#identityBox.classList.add("showing");
  }

  /**
   * Show or hide the blocked permission icon.
   *
   * @param showIcon - Whether to show the blocked icon
   */
  showBlockedUI(showIcon) {
    const container = this.#blockedContainer;

    container.replaceChildren();
    if (!showIcon) {
      this.#identityBox.classList.remove("showing");
      return;
    }

    const icon = this.#createBlockedIcon();
    icon.setAttribute("showing", "true");

    container.appendChild(icon);
    container.hidden = false;
    this.#notificationBox.classList.remove("showing");
    this.#identityBox.classList.add("showing");
  }

  /**
   * Update sharing icon from browser's webRTC sharing state.
   *
   * @param {object} sharingState - Browser sharing state object
   * @param {object} [sharingState.webRTC] - WebRTC sharing info
   */
  updateFromBrowserState({ webRTC } = {}) {
    // Handle empty/reset state
    if (!webRTC) {
      this.#sharingIcon.removeAttribute("sharing");
      this.#identityBox.classList.remove("showing");
      return;
    }

    // Check if sidebar has allow permission
    const sidebarAllPerms = lazy.SitePermissions.getAllForBrowser(
      this.#contentBrowser
    );
    const sidebarHasAllow = sidebarAllPerms.some(
      p => p.state === lazy.SitePermissions.ALLOW
    );

    // Check if actually sharing something
    const isSharing = webRTC?.sharing || webRTC?.camera || webRTC?.microphone;

    if (!isSharing) {
      if (sidebarHasAllow) {
        this.#sharingIcon.setAttribute("paused", "true");
        this.#sharingIcon.setAttribute("showing", "");
        return;
      }
      return;
    }

    this.#notificationBox.classList.remove("showing");
    this.#identityBox.classList.add("showing");

    if (webRTC?.sharing) {
      this.#sharingIcon.setAttribute("sharing", webRTC.sharing);
      this.#sharingIcon.removeAttribute("paused");
      this.#sharingIcon.setAttribute("showing", "");
    }
  }

  /**
   * Clear all permission UI indicators.
   */
  clearUI() {
    // Reset sharing icon attributes
    this.#sharingIcon?.removeAttribute("showing");
    this.#sharingIcon?.removeAttribute("sharing");
    this.#sharingIcon?.removeAttribute("paused");

    // Clear blocked container
    this.#blockedContainer?.replaceChildren();
    this.#blockedIcon = null;

    // Hide container
    this.#identityBox?.classList.remove("showing");
    this.#notificationBox?.classList.remove("showing");
  }

  /**
   * Clean up UI elements and event listeners.
   */
  destroy() {
    this.#identityBox?.removeEventListener("click", this.#onPanelClick);
    this.#identityBox = null;
    this.#sharingContainer = null;
    this.#blockedContainer = null;
    this.#notificationBox = null;
    this.#sharingIcon = null;
    this.#blockedIcon = null;
    this.#sharingOpenPanel = null;
    this.#blockedOpenPanel = null;
    this.#onPanelClick = null;
    this.#window = null;
    this.#browser = null;
    this.#contentBrowser = null;
  }

  /**
   * Handles clicks on the identity box to open permission panels.
   * Open sharing or blocked panel depending on what is currently showing.
   */
  #handlePanelClick(e) {
    if (this.#sharingIcon?.hasAttribute("showing")) {
      this.#sharingOpenPanel?.(e);
    }

    if (this.#blockedIcon?.hasAttribute("showing")) {
      this.#blockedOpenPanel?.(e);
    }
  }

  #ensureMicIcon() {
    const doc = this.#browser.contentDocument;
    let icon = doc.getElementById(
      "sidebar-webrtc-microphone-notification-icon"
    );

    if (!icon) {
      icon = doc.createXULElement("image");
      icon.id = "sidebar-webrtc-microphone-notification-icon";
      icon.classList.add("notification-anchor-icon", "microphone-icon");
      icon.setAttribute(
        "data-l10n-id",
        "urlbar-web-rtc-share-microphone-notification-anchor"
      );
      this.#notificationBox.appendChild(icon);
    }

    return icon;
  }

  #ensureSharingIcon() {
    const doc = this.#browser.contentDocument;
    let icon = doc.getElementById("webrtc-sharing-icon");

    if (!icon) {
      icon = doc.createXULElement("image");
      icon.id = "webrtc-sharing-icon";
      icon.classList.add("sharing-icon");
      this.#sharingContainer.appendChild(icon);

      this.#sharingOpenPanel = e => {
        this.#openPermissionPanel({
          event: e,
          anchorNode: this.#identityBox,
          targetBrowser: this.#contentBrowser,
          resetCallback: () => {
            icon.removeAttribute("sharing");
            icon.removeAttribute("removed");
            icon.removeAttribute("showing");
            this.#identityBox.classList.remove("showing");
          },
        });
      };
    }

    this.#sharingIcon = icon;
    return icon;
  }

  #createBlockedIcon() {
    const doc = this.#browser.contentDocument;
    const icon = doc.createXULElement("image");
    icon.classList.add("blocked-permission-icon", "microphone-icon");
    icon.setAttribute("data-l10n-id", "urlbar-microphone-blocked");

    this.#blockedOpenPanel = e => {
      this.#openPermissionPanel({
        event: e,
        anchorNode: this.#blockedContainer,
        targetBrowser: this.#contentBrowser,
        resetCallback: () => {
          icon.removeAttribute("showing");
          this.#identityBox.classList.remove("showing");
        },
      });
    };

    this.#blockedIcon = icon;
    return icon;
  }

  /**
   * Open the permission panel (gPermissionPanel) with custom anchor and browser.
   *
   * @param {object} options - Panel options
   * @param {Event} options.event - Click event that triggered the panel
   * @param {Element} options.anchorNode - Element to anchor the panel to
   * @param {Browser} options.targetBrowser - Browser to show permissions for
   * @param {Function} options.resetCallback - Called when panel closes
   */
  #openPermissionPanel({ event, anchorNode, targetBrowser, resetCallback }) {
    const win = this.#window;
    const gPanel = win.gPermissionPanel;

    event.stopPropagation();

    // Customized anchor and browser override
    gPanel.setAnchor(anchorNode);
    gPanel.setBrowserOverride(targetBrowser);
    gPanel.openPopup(event);
    gPanel._popupAnchorNode = null;

    gPanel._permissionPopup.addEventListener(
      "popuphidden",
      () => {
        if (!gPanel._permissionReloadHint.hidden) {
          resetCallback();
        }
        gPanel.clearBrowserOverride();
      },
      { once: true }
    );
  }

  /**
   * Find or create a XUL box element.
   *
   * @param {Document} doc - The document to create element in
   * @param {Element} parentEle - Parent element to append to
   * @param {string} id - ID for the element
   * @param {Function} [setupFn] - Optional setup function called with the element
   * @returns {Element} The found or created element
   */
  #createChild(doc, parentEle, id, setupFn = null) {
    let el = doc.getElementById(id);
    if (el) {
      return el;
    }

    el = doc.createXULElement("box");
    el.id = id;
    parentEle.appendChild(el);

    if (setupFn) {
      setupFn(el);
    }
    return el;
  }
}
