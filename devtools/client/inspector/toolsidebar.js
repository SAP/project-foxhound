/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EventEmitter = require("resource://devtools/shared/event-emitter.js");

class ToolSidebar extends EventEmitter {
  constructor(tabbox, panel, options = {}) {
    super();

    this.#tabbox = tabbox;
    this.#panelDoc = this.#tabbox.ownerDocument;
    this.#toolPanel = panel;
    this.#options = options;

    if (!options.disableTelemetry) {
      this.#telemetry = this.#toolPanel.telemetry;
    }

    if (this.#options.hideTabstripe) {
      this.#tabbox.setAttribute("hidetabs", "true");
    }

    this.render();

    this.#toolPanel.emit("sidebar-created", this);
  }

  TABPANEL_ID_PREFIX = "sidebar-panel-";
  #currentTool;
  #destroyed;
  #options;
  #panelDoc;
  #tabbar;
  #tabbox;
  #telemetry;
  #toolNames;
  #toolPanel;

  // React

  get React() {
    return this.#toolPanel.React;
  }

  get ReactDOM() {
    return this.#toolPanel.ReactDOM;
  }

  get browserRequire() {
    return this.#toolPanel.browserRequire;
  }

  get InspectorTabPanel() {
    return this.#toolPanel.InspectorTabPanel;
  }

  get TabBar() {
    return this.#toolPanel.TabBar;
  }

  // Rendering

  render() {
    const sidebar = this.TabBar({
      menuDocument: this.#toolPanel.toolbox.doc,
      showAllTabsMenu: true,
      allTabsMenuButtonTooltip: this.#options.allTabsMenuButtonTooltip,
      sidebarToggleButton: this.#options.sidebarToggleButton,
      onSelect: this.handleSelectionChange.bind(this),
    });

    this.#tabbar = this.ReactDOM.render(sidebar, this.#tabbox);
  }

  /**
   * Adds all the queued tabs.
   */
  addAllQueuedTabs() {
    this.#tabbar.addAllQueuedTabs();
  }

  /**
   * Register a side-panel tab.
   *
   * @param {string} tab uniq id
   * @param {string} title tab title
   * @param {React.Component} panel component. See `InspectorPanelTab` as an example.
   * @param {boolean} selected true if the panel should be selected
   * @param {number} index the position where the tab should be inserted
   */
  addTab(id, title, panel, selected, index) {
    this.#tabbar.addTab(id, title, selected, panel, null, index);
    this.emit("new-tab-registered", id);
  }

  /**
   * Helper API for adding side-panels that use existing DOM nodes
   * (defined within inspector.xhtml) as the content.
   *
   * @param {string} tab uniq id
   * @param {string} title tab title
   * @param {boolean} selected true if the panel should be selected
   * @param {number} index the position where the tab should be inserted
   */
  addExistingTab(id, title, selected, index) {
    const panel = this.InspectorTabPanel({
      id,
      idPrefix: this.TABPANEL_ID_PREFIX,
      key: id,
      title,
    });

    this.addTab(id, title, panel, selected, index);
  }

  /**
   * Queues a side-panel tab to be added..
   *
   * @param {string} tab uniq id
   * @param {string} title tab title
   * @param {React.Component} panel component. See `InspectorPanelTab` as an example.
   * @param {boolean} selected true if the panel should be selected
   * @param {number} index the position where the tab should be inserted
   */
  queueTab(id, title, panel, selected, index) {
    this.#tabbar.queueTab(id, title, selected, panel, null, index);
    this.emit("new-tab-registered", id);
  }

  /**
   * Helper API for queuing side-panels that use existing DOM nodes
   * (defined within inspector.xhtml) as the content.
   *
   * @param {string} tab uniq id
   * @param {string} title tab title
   * @param {boolean} selected true if the panel should be selected
   * @param {number} index the position where the tab should be inserted
   */
  queueExistingTab(id, title, selected, index) {
    const panel = this.InspectorTabPanel({
      id,
      idPrefix: this.TABPANEL_ID_PREFIX,
      key: id,
      title,
    });

    this.queueTab(id, title, panel, selected, index);
  }

  /**
   * Remove an existing tab.
   *
   * @param {string} tabId The ID of the tab that was used to register it, or
   * the tab id attribute value if the tab existed before the sidebar
   * got created.
   */
  removeTab(tabId) {
    this.#tabbar.removeTab(tabId);

    this.emit("tab-unregistered", tabId);
  }

  /**
   * Show or hide a specific tab.
   *
   * @param {boolean} isVisible True to show the tab/tabpanel, False to hide it.
   * @param {string} id The ID of the tab to be hidden.
   */
  toggleTab(isVisible, id) {
    this.#tabbar.toggleTab(id, isVisible);
  }

  /**
   * Select a specific tab.
   *
   * @param {string} id The ID of the tab
   * @returns {Promise}
   */
  select(id) {
    return this.#tabbar.select(id);
  }

  /**
   * Return the id of the selected tab.
   */
  getCurrentTabID() {
    return this.#currentTool;
  }

  /**
   * Returns the requested tab panel based on the id.
   *
   * @param {string} id
   * @return {DOMNode}
   */
  getTabPanel(id) {
    // Search with and without the ID prefix as there might have been existing
    // tabpanels by the time the sidebar got created
    return this.#panelDoc.querySelector(
      "#" + this.TABPANEL_ID_PREFIX + id + ", #" + id
    );
  }

  /**
   * Event handler.
   */
  handleSelectionChange(id) {
    if (this.#destroyed) {
      return;
    }

    const previousTool = this.#currentTool;
    this.#currentTool = id;

    this.updateTelemetryOnChange(id, previousTool);
    this.emit(this.#currentTool + "-selected");
    this.emit("select", this.#currentTool);
  }

  /**
   * Log toolClosed and toolOpened events on telemetry.
   *
   * @param  {string} currentToolId
   *         id of the tool being selected.
   * @param  {string} previousToolId
   *         id of the previously selected tool.
   */
  updateTelemetryOnChange(currentToolId, previousToolId) {
    if (currentToolId === previousToolId || !this.#telemetry) {
      // Skip telemetry if the tool id did not change or telemetry is unavailable.
      return;
    }

    currentToolId = this.getTelemetryPanelNameOrOther(currentToolId);

    if (previousToolId) {
      previousToolId = this.getTelemetryPanelNameOrOther(previousToolId);
      this.#telemetry.toolClosed(previousToolId, this);

      this.#telemetry.recordEvent("sidepanel_changed", "inspector", null, {
        oldpanel: previousToolId,
        newpanel: currentToolId,
        os: this.#telemetry.osNameAndVersion,
      });
    }
    this.#telemetry.toolOpened(currentToolId, this);
  }

  /**
   * Returns a panel id in the case of built in panels or "other" in the case of
   * third party panels. This is necessary due to limitations in addon id strings,
   * the permitted length of event telemetry property values and what we actually
   * want to see in our telemetry.
   *
   * @param {string} id
   *        The panel id we would like to process.
   */
  getTelemetryPanelNameOrOther(id) {
    if (!this.#toolNames) {
      // Get all built in tool ids. We identify third party tool ids by checking
      // for a "-", which shows it originates from an addon.
      const ids = this.#tabbar.state.tabs.map(({ id: toolId }) => {
        return toolId.includes("-") ? "other" : toolId;
      });

      this.#toolNames = new Set(ids);
    }

    if (!this.#toolNames.has(id)) {
      return "other";
    }

    return id;
  }

  /**
   * Show the sidebar.
   *
   * @param  {string} id
   *         The sidebar tab id to select.
   */
  show(id) {
    this.#tabbox.hidden = false;

    // If an id is given, select the corresponding sidebar tab.
    if (id) {
      this.select(id);
    }

    this.emit("show");
  }

  /**
   * Show the sidebar.
   */
  hide() {
    this.#tabbox.hidden = true;

    this.emit("hide");
  }

  /**
   * Clean-up.
   */
  destroy() {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;

    this.emit("destroy");

    if (this.#currentTool && this.#telemetry) {
      this.#telemetry.toolClosed(this.#currentTool, this);
    }

    this.#toolPanel.emit("sidebar-destroyed", this);

    this.ReactDOM.unmountComponentAtNode(this.#tabbox);

    this.#tabbox = null;
    this.#telemetry = null;
    this.#panelDoc = null;
    this.#toolPanel = null;
  }
}

exports.ToolSidebar = ToolSidebar;
