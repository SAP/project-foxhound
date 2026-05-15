/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  CustomizableUI:
    "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
  IPPExceptionsManager:
    "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs",
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPPProxyStates:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "siteExceptionsFeaturePref",
  "browser.ipProtection.features.siteExceptions",
  false
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "siteExceptionsHintsPref",
  "browser.ipProtection.siteExceptionsHintsEnabled",
  true
);

/**
 * IPProtectionToolbarButton manages the IP Protection toolbar button
 * for a single browser window.
 *
 * Each instance:
 * - Tracks location changes via a progress listener
 * - Updates the button icon according to the proxy state, proxy errors,
 *  offline status, and site exclusions
 * - Handles the visual state of the toolbar button
 */
export class IPProtectionToolbarButton {
  #window = null;
  #progressListener = null;
  #widgetId = null;
  #previousIsExcluded = null;

  static CONFIRMATION_HINT_MESSAGE_ID =
    "confirmation-hint-ipprotection-navigated-to-excluded-site";

  /**
   * Gets the gBrowser from the weak reference to the window.
   *
   * @returns {object|undefined}
   *  The gBrowser object, or undefined if the window has been garbage collected.
   */
  get gBrowser() {
    const win = this.#window.get();
    return win?.gBrowser;
  }

  /**
   * Gets the value of the pref
   * browser.ipProtection.features.siteExceptions.
   *
   * @returns {boolean}
   *  True if site exceptions support is enabled, false otherwise.
   */
  get isExceptionsFeatureEnabled() {
    return lazy.siteExceptionsFeaturePref;
  }

  /**
   * Gets the value of the pref
   * browser.ipProtection.siteExceptionsHintsEnabled.
   *
   * @returns {boolean}
   *  True if confirmation hints for site exceptions are enabled, false otherwise.
   */
  get isExceptionsHintsEnabled() {
    return lazy.siteExceptionsHintsPref;
  }

  /**
   * Gets the toolbaritem for this window.
   *
   * @returns {XULElement|null}
   *  The toolbaritem element, or null if not available.
   */
  get toolbaritem() {
    const win = this.#window.get();
    if (!win) {
      return null;
    }

    return lazy.CustomizableUI.getWidget(this.#widgetId)?.forWindow(win).node;
  }

  constructor(window, widgetId, toolbaritem = null) {
    this.#window = Cu.getWeakReference(window);
    this.#widgetId = widgetId;
    this.handleEvent = this.#handleEvent.bind(this);

    this.#addProgressListener();
    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
    lazy.IPPExceptionsManager.addEventListener(
      "IPPExceptionsManager:ExclusionChanged",
      this.handleEvent
    );

    if (this.gBrowser?.tabContainer) {
      this.gBrowser.tabContainer.addEventListener("TabSelect", this);
    }

    if (toolbaritem) {
      toolbaritem.classList.add("subviewbutton-nav"); // adds the right arrow in overflow menu
      this.updateState(toolbaritem);
    }
  }

  /**
   * Creates and registers a progress listener for the window.
   */
  #addProgressListener() {
    if (!this.gBrowser) {
      return;
    }

    this.#progressListener = {
      onLocationChange: (
        aBrowser,
        aWebProgress,
        _aRequest,
        aLocationURI,
        aFlags
      ) => {
        if (!aWebProgress.isTopLevel) {
          return;
        }

        // Only update if on the currently selected tab
        if (aBrowser !== this.gBrowser?.selectedBrowser) {
          return;
        }

        if (!aLocationURI) {
          return;
        }

        const isReload =
          aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_RELOAD;

        this.updateState(null, { showConfirmationHint: !isReload });
      },
    };

    this.gBrowser.addTabsProgressListener(this.#progressListener);
  }

  /**
   * Event handler for document-level events.
   *
   * @param {Event} event
   *  The event to handle.
   */
  #handleEvent(event) {
    if (
      event.type !== "IPProtectionService:StateChanged" &&
      event.type !== "IPPProxyManager:StateChanged" &&
      event.type !== "IPPExceptionsManager:ExclusionChanged" &&
      event.type !== "TabSelect"
    ) {
      return;
    }

    let exclusionChanged =
      event.type === "IPPExceptionsManager:ExclusionChanged";
    this.updateState(null, { showConfirmationHint: !exclusionChanged });
  }

  /**
   * Updates the button to reflect the current state.
   *
   * This method is called under these circumstances:
   * 1. After creating the toolbar button, to set up the initial icon
   * 2. After an IPProtectionService or IPPProxyManager state change
   * 3. After pressing the site exclusion toggle on the panel and the
   *    exclusion state for a site has changed in ipp-vpn
   * 4. After a location change / page navigation
   * 5. After tab switching
   * 7. After an IPPProxyManager error event occurs
   * 8. The panel opens or closes.
   *
   * @param {XULElement|null} [toolbaritem]
   *  Optional toolbaritem to update directly.
   *  If not provided, looks up the toolbaritem via CustomizableUI.
   *  If provided, but toolbaritem is null, this means the toolbaritem isn't available yet.
   * @param {object} [options]
   *  Optional options object
   * @param {boolean} [options.showConfirmationHint=true]
   *  Whether to show confirmation hints for navigation to excluded sites
   * @param {string} [options.error=undefined]
   *  Error type to show.
   */
  updateState(
    toolbaritem = null,
    options = { showConfirmationHint: true, error: undefined }
  ) {
    const win = this.#window.get();
    if (!win) {
      return;
    }

    toolbaritem ??= this.toolbaritem;

    if (!toolbaritem) {
      return;
    }

    // Check the ipp-vpn permission using IPPExceptionsManager.
    let principal = this.gBrowser?.contentPrincipal;
    let isExcluded = this.#isExcludedSite(principal);

    let isActive = lazy.IPPProxyManager.state === lazy.IPPProxyStates.ACTIVE;

    // Show error icon when proxy manager is in ERROR state.
    let hasProxyError =
      lazy.IPPProxyManager.state === lazy.IPPProxyStates.ERROR;

    let isError = hasProxyError || !!options.error;

    const showConfirmationHint = options.showConfirmationHint ?? true;
    if (showConfirmationHint) {
      this.updateConfirmationHint(win.ConfirmationHint, toolbaritem, {
        isActive,
        isError,
        isExcluded,
      });
    }

    // Null principals reset the previous state to false if
    // the state was initially true. To avoid this, only set
    // the previous state if not a null principal.
    if (principal && !principal.isNullPrincipal) {
      this.#previousIsExcluded = isExcluded;
    }

    this.updateIconStatus(toolbaritem, {
      isActive,
      isError,
      isExcluded,
    });
  }

  /**
   * Shows a confirmation hint after navigating from a
   * protected site to an excluded site while the VPN is on.
   * Ignore the message if there is an error or the VPN is off.
   *
   * @param {object} confirmationHint
   *  The current window's confirmation hint instance
   * @param {XULElement} toolbaritem
   *  The toolbaritem to anchor the confirmation hint to
   * @param {object} status
   *  VPN connection status
   */
  updateConfirmationHint(
    confirmationHint,
    toolbaritem,
    status = { isActive: false, isError: false, isExcluded: false }
  ) {
    if (!confirmationHint) {
      return;
    }

    let exceptionsPrefsEnabled =
      this.isExceptionsFeatureEnabled && this.isExceptionsHintsEnabled;

    const canShowConfirmationHint =
      exceptionsPrefsEnabled &&
      !status.isError &&
      status.isActive &&
      status.isExcluded &&
      !this.#previousIsExcluded;

    if (!canShowConfirmationHint) {
      return;
    }

    confirmationHint.show(
      toolbaritem,
      IPProtectionToolbarButton.CONFIRMATION_HINT_MESSAGE_ID,
      {
        position: "bottomright topright", // panel anchor, message anchor
      }
    );
  }

  /**
   * Updates the toolbar button icon to reflect the VPN connection status
   *
   * @param {XULElement} toolbaritem
   *  The toolbaritem to update
   * @param {object} status
   *  VPN connection status
   */
  updateIconStatus(
    toolbaritem,
    status = { isActive: false, isError: false, isExcluded: false }
  ) {
    if (!toolbaritem) {
      return;
    }

    let isActive = status.isActive;
    let isError = status.isError;
    let isExcluded = status.isExcluded && this.isExceptionsFeatureEnabled;
    let l10nId = isError ? "ipprotection-button-error" : "ipprotection-button";

    toolbaritem.classList.remove(
      "ipprotection-on",
      "ipprotection-error",
      "ipprotection-excluded"
    );

    if (isError) {
      toolbaritem.classList.add("ipprotection-error");
    } else if (isExcluded && isActive) {
      toolbaritem.classList.add("ipprotection-excluded");
    } else if (isActive) {
      toolbaritem.classList.add("ipprotection-on");
    }

    toolbaritem.setAttribute("data-l10n-id", l10nId);
  }

  /**
   * Checks if the given principal is excluded from IP Protection.
   *
   * @param {nsIPrincipal} principal
   *  The principal to check.
   * @returns {boolean}
   *  True if the site is excluded, false otherwise.
   */
  #isExcludedSite(principal) {
    if (!principal || principal.isNullPrincipal) {
      return false;
    }

    return lazy.IPPExceptionsManager.hasExclusion(principal);
  }

  /**
   * Cleans up listeners and observers when the button is destroyed.
   */
  uninit() {
    if (this.gBrowser && this.#progressListener) {
      this.gBrowser.removeTabsProgressListener(this.#progressListener);
    }
    this.#progressListener = null;

    if (this.gBrowser?.tabContainer) {
      this.gBrowser.tabContainer.removeEventListener("TabSelect", this);
    }

    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
    lazy.IPPExceptionsManager.removeEventListener(
      "IPPExceptionsManager:ExclusionChanged",
      this.handleEvent
    );
  }
}
