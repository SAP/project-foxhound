/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ASRouter: "resource:///modules/asrouter/ASRouter.sys.mjs",
  CustomizableUI:
    "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
  IPProtectionPanel:
    "moz-src:///browser/components/ipprotection/IPProtectionPanel.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionToolbarButton:
    "moz-src:///browser/components/ipprotection/IPProtectionToolbarButton.sys.mjs",
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  requestIdleCallback: "resource://gre/modules/Timer.sys.mjs",
  cancelIdleCallback: "resource://gre/modules/Timer.sys.mjs",
});

const FXA_WIDGET_ID = "fxa-toolbar-menu-button";
const EXT_WIDGET_ID = "unified-extensions-button";

/**
 * IPProtectionWidget is the class for the singleton IPProtection.
 *
 * It is a minimal manager for creating and removing a CustomizableUI widget
 * for IP protection features.
 *
 * It maintains the state of the panels and updates them when the
 * panel is shown or hidden.
 */
class IPProtectionWidget {
  static WIDGET_ID = "ipprotection-button";
  static PANEL_ID = "PanelUI-ipprotection";

  static ENABLED_PREF = "browser.ipProtection.enabled";
  static ADDED_PREF = "browser.ipProtection.added";

  #inited = false;
  created = false;
  #panels = new WeakMap();
  #toolbarButtons = new WeakMap();

  constructor() {
    this.sendReadyTrigger = this.#sendReadyTrigger.bind(this);
  }

  /**
   * Creates the widget.
   */
  init() {
    if (this.#inited) {
      return;
    }
    this.#inited = true;

    if (!this.created) {
      this.#createWidget();
    }

    lazy.CustomizableUI.addListener(this);
  }

  /**
   * Destroys the widget and prevents any updates.
   */
  uninit() {
    if (!this.#inited) {
      return;
    }
    this.#destroyWidget();
    this.#uninitPanels();

    lazy.CustomizableUI.removeListener(this);

    this.#inited = false;
  }

  /**
   * Returns the initialization status
   */
  get isInitialized() {
    return this.#inited;
  }

  /**
   * Creates the CustomizableUI widget.
   */
  #createWidget() {
    const onViewShowing = this.#onViewShowing.bind(this);
    const onViewHiding = this.#onViewHiding.bind(this);
    const onBeforeCreated = this.#onBeforeCreated.bind(this);
    const onCreated = this.#onCreated.bind(this);
    const onDestroyed = this.#onDestroyed.bind(this);
    const item = {
      id: IPProtectionWidget.WIDGET_ID,
      l10nId: "ipprotection-button",
      type: "view",
      viewId: IPProtectionWidget.PANEL_ID,
      onViewShowing,
      onViewHiding,
      onBeforeCreated,
      onCreated,
      onDestroyed,
      disallowSubView: true, // Bug 2016480 - Keeps the VPN panel as standard panel for the Overflow menu
    };
    lazy.CustomizableUI.createWidget(item);

    this.#placeWidget();

    this.created = true;
  }

  /**
   * Places the widget in the nav bar, next to the FxA widget.
   */
  #placeWidget() {
    let wasAddedToToolbar = Services.prefs.getBoolPref(
      IPProtectionWidget.ADDED_PREF,
      false
    );
    let alreadyPlaced = lazy.CustomizableUI.getPlacementOfWidget(
      IPProtectionWidget.WIDGET_ID,
      false,
      true
    );
    if (wasAddedToToolbar || alreadyPlaced) {
      return;
    }

    let prevWidget =
      lazy.CustomizableUI.getPlacementOfWidget(FXA_WIDGET_ID) ||
      lazy.CustomizableUI.getPlacementOfWidget(EXT_WIDGET_ID);
    let pos = prevWidget ? prevWidget.position : null;

    lazy.CustomizableUI.addWidgetToArea(
      IPProtectionWidget.WIDGET_ID,
      lazy.CustomizableUI.AREA_NAVBAR,
      pos
    );
    Services.prefs.setBoolPref(IPProtectionWidget.ADDED_PREF, true);
  }

  /**
   * Destroys the widget if it has been created.
   *
   * This will not remove the pref listeners, so the widget
   * can be recreated later.
   */
  #destroyWidget() {
    if (!this.created) {
      return;
    }
    this.#destroyPanels();
    lazy.CustomizableUI.destroyWidget(IPProtectionWidget.WIDGET_ID);
    this.created = false;
    if (this.readyTriggerIdleCallback) {
      lazy.cancelIdleCallback(this.readyTriggerIdleCallback);
    }
  }

  /**
   * Get the IPProtectionPanel for a given window.
   *
   * @param {Window} window - which window to get the panel for.
   * @returns {IPProtectionPanel}
   */
  getPanel(window) {
    if (!this.created || !window?.PanelUI) {
      return null;
    }

    return this.#panels.get(window);
  }

  /**
   * Get the IPProtectionToolbarButton for a given window.
   *
   * @param {Window} window - which window to get the toolbar button for.
   * @returns {IPProtectionToolbarButton}
   */
  getToolbarButton(window) {
    if (!this.created) {
      return null;
    }

    return this.#toolbarButtons.get(window);
  }

  /**
   * Remove all panels content, but maintains state for if the widget is
   * re-enabled in the same window.
   *
   * Panels will only be removed from the WeakMap if their window is closed.
   */
  #destroyPanels() {
    let panels = ChromeUtils.nondeterministicGetWeakMapKeys(this.#panels);
    for (let panel of panels) {
      this.#panels.get(panel).destroy();
    }
  }

  /**
   * Uninit all panels and toolbar buttons and clear the WeakMaps.
   */
  #uninitPanels() {
    let panels = ChromeUtils.nondeterministicGetWeakMapKeys(this.#panels);
    for (let panel of panels) {
      this.#panels.get(panel).uninit();
    }

    let toolbarButtons = ChromeUtils.nondeterministicGetWeakMapKeys(
      this.#toolbarButtons
    );
    for (let toolbarButton of toolbarButtons) {
      this.#toolbarButtons.get(toolbarButton).uninit();
    }

    this.#panels = new WeakMap();
    this.#toolbarButtons = new WeakMap();
  }

  /**
   * Updates the state of the panel before it is shown.
   *
   * @param {Event} event - the panel shown.
   */
  #onViewShowing(event) {
    let { ownerGlobal } = event.target;
    if (this.#panels.has(ownerGlobal)) {
      let panel = this.#panels.get(ownerGlobal);
      panel.showing(event.target);
    }
  }

  /**
   * Updates the panels visibility.
   *
   * @param {Event} event - the panel hidden.
   */
  #onViewHiding(event) {
    let { ownerGlobal } = event.target;
    if (this.#panels.has(ownerGlobal)) {
      let panel = this.#panels.get(ownerGlobal);
      panel.hiding();
    }
  }

  /**
   * Creates a new IPProtectionPanel for a browser window.
   *
   * @param {Document} doc - the document containing the panel.
   */
  #onBeforeCreated(doc) {
    let { ownerGlobal } = doc;
    if (ownerGlobal && !this.#panels.has(ownerGlobal)) {
      let panel = new lazy.IPProtectionPanel(ownerGlobal, this.variant);
      this.#panels.set(ownerGlobal, panel);
    }
  }

  /**
   * Gets the toolbaritem after the widget has been created,
   * creates the toolbar button with initial state, and adds content to the panel.
   *
   * @param {XULElement} toolbaritem - the widget toolbaritem.
   */
  #onCreated(toolbaritem) {
    let window = toolbaritem.ownerGlobal;
    if (window && !this.#toolbarButtons.has(window)) {
      let toolbarButton = new lazy.IPProtectionToolbarButton(
        window,
        IPProtectionWidget.WIDGET_ID,
        toolbaritem
      );
      this.#toolbarButtons.set(window, toolbarButton);
    }

    this.readyTriggerIdleCallback = lazy.requestIdleCallback(
      this.sendReadyTrigger
    );

    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
  }

  #onDestroyed() {
    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
  }

  async onWidgetRemoved(widgetId) {
    if (widgetId != IPProtectionWidget.WIDGET_ID) {
      return;
    }

    // Shut down VPN connection when widget is removed,
    // but wait to check if it has been moved.
    await Promise.resolve();
    let moved = !!lazy.CustomizableUI.getPlacementOfWidget(widgetId);
    if (!moved) {
      Glean.ipprotection.removedFromToolbar.record();
      lazy.IPPProxyManager.stop();
    }
  }

  async #sendReadyTrigger() {
    await lazy.ASRouter.waitForInitialized;
    const win = Services.wm.getMostRecentBrowserWindow();
    const browser = win?.gBrowser?.selectedBrowser;
    await lazy.ASRouter.sendTriggerMessage({
      browser,
      id: "ipProtectionReady",
    });
  }
}

const IPProtection = new IPProtectionWidget();

export { IPProtection, IPProtectionWidget };
