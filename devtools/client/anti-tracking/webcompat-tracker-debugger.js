/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { BrowserLoader } = ChromeUtils.importESModule(
  "resource://devtools/shared/loader/browser-loader.sys.mjs"
);
const require = BrowserLoader({
  baseURI: "resource://devtools/client/anti-tracking/",
  window,
}).require;

const {
  DebuggerFSMContext,
} = require("resource://devtools/client/anti-tracking/debugger-fsm-context.js");

/**
 * A devtool extension to help streamline the process of debugging tracker-related webcompat issues.
 * This extension supports:
 * - Viewing all blocked resources
 * - Select any of the blocked resources to unblock and test if the website is fixed
 * - An interactive debugger that will narrow down the exact resources that we need to add to the exceptions list
 */
class WebcompatTrackerDebugger {
  constructor(commands) {
    this.selectedTrackers = new Set();
    this.unblockedChannels = new Set();
    this.allTrackers = {};
    this.commands = null;
    this.debuggerFSMContext = null;
    this.commands = commands;
    this.boundOnChannelBlocked = this.onChannelBlocked.bind(this);

    this.setupListeners();
    this.populateTrackerTable();
  }

  onChannelBlocked(subject) {
    const channelBlockedReasonToString = {
      [Ci.nsIUrlClassifierBlockedChannel.TRACKING_PROTECTION]:
        "Tracking Protection",
      [Ci.nsIUrlClassifierBlockedChannel.FINGERPRINTING_PROTECTION]:
        "Fingerprinting Protection",
      [Ci.nsIUrlClassifierBlockedChannel.CRYPTOMINING_PROTECTION]:
        "Cryptomining Protection",
      [Ci.nsIUrlClassifierBlockedChannel.SOCIAL_TRACKING_PROTECTION]:
        "Social Tracking Protection",
    };

    const hostname = new URL(subject.url).hostname;
    this.allTrackers[hostname] = {
      trackerType: channelBlockedReasonToString[subject.reason] || "unknown",
    };
    if (this.unblockedChannels.has(hostname)) {
      const channel = subject.QueryInterface(Ci.nsIUrlClassifierBlockedChannel);
      channel.allow();
    }
    this.populateTrackerTable();
  }

  /**
   * Set up UI and message listeners.
   */
  setupListeners() {
    // Add listener for UrlClassifierBlockedChannel
    const channelClassifier = Cc[
      "@mozilla.org/url-classifier/channel-classifier-service;1"
    ].getService(Ci.nsIChannelClassifierService);
    channelClassifier.addListener(this.boundOnChannelBlocked);
    this.addClickListener("reset", this.onResetClick.bind(this));
    this.addClickListener("block-selected", async () => {
      await this.blockOrUnblockSelected(true);
    });
    this.addClickListener("unblock-selected", async () => {
      await this.blockOrUnblockSelected(false);
    });
    this.addClickListener(
      "interactive-debugging",
      this.onInteractiveDebuggingClick.bind(this)
    );
    this.addClickListener("website-broke", async () => {
      await this.debuggerFSMContext?.onWebsiteBroke();
    });
    this.addClickListener("test-next-tracker", async () => {
      await this.debuggerFSMContext?.onTestNextTracker();
    });
    this.addClickListener("stop-debugging", async () => {
      await this.debuggerFSMContext.stop();
      this.debuggerFSMContext = undefined;
    });
  }

  /**
   * Handler for reset button click.
   */
  onResetClick() {
    this.selectedTrackers.clear();
    this.unblockedChannels.clear();
    this.populateTrackerTable();
  }

  /**
   * Handler for interactive debugging button click.
   */
  onInteractiveDebuggingClick() {
    const callbacks = {
      onPromptTextUpdate: this.onPromptTextUpdate.bind(this),
      onButtonStateUpdate: this.onButtonStateUpdate.bind(this),
      onTrackersBlockedStateUpdate:
        this.onTrackersBlockedStateUpdate.bind(this),
    };
    this.debuggerFSMContext = new DebuggerFSMContext(
      Object.keys(this.allTrackers),
      callbacks
    );
  }

  /**
   * Callback to update the text content of the interactive debugger prompt element.
   *
   * @param {number} count - The number of prompts left. If undefined, the count is omitted.
   * @param {string} text - The text to display in the prompt.
   * @param {boolean} completed - If true, indicates that the debugging session is completed.
   */
  onPromptTextUpdate(count, text, completed = false) {
    const el = document.getElementById("interactive-debugger-prompt");
    if (el) {
      el.textContent = (count !== undefined ? `[${count} left] ` : ``) + text;
      el.classList.toggle("completed", completed);
    }
  }

  /**
   * Callback to update the disabled state of a button element by its ID.
   *
   * @param {string} buttonName - The ID of the button element to update.
   * @param {boolean} isDisabled - Whether the button should be disabled.
   */
  onButtonStateUpdate(buttonName, isDisabled) {
    const el = document.getElementById(buttonName);
    el.disabled = isDisabled;
  }

  /**
   * Handles updates to the blocked state of trackers.
   *
   * @async
   * @param {boolean} blocked - Indicates whether trackers are currently blocked.
   * @param {Set<string>} trackers - A set of tracker identifiers to update.
   * @returns {Promise<void>} Resolves when the top-level target is reloaded and the tracker table is populated.
   */
  async onTrackersBlockedStateUpdate(blocked, trackers) {
    if (blocked) {
      trackers.forEach(tracker => this.unblockedChannels.delete(tracker));
    } else {
      trackers.forEach(tracker => this.unblockedChannels.add(tracker));
    }
    await this.commands.targetCommand.reloadTopLevelTarget(false);
    this.populateTrackerTable();
  }

  /**
   * Helper to add click event listeners safely.
   */
  addClickListener(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", handler);
    }
  }

  /**
   * Block or unblock all selected trackers.
   *
   * @param {boolean} blocked - If true, block the selected trackers; if false, unblock them.
   */
  async blockOrUnblockSelected(blocked) {
    if (this.selectedTrackers.size === 0) {
      return;
    }
    this.selectedTrackers.forEach(tracker => {
      if (blocked) {
        this.unblockedChannels.delete(tracker);
      } else {
        this.unblockedChannels.add(tracker);
      }
    });
    this.populateTrackerTable();
    await this.commands.targetCommand.reloadTopLevelTarget(false);
  }

  /**
   * Render the tracker table.
   */
  populateTrackerTable() {
    const table = document.getElementById("tracker-table");
    if (!table) {
      return;
    }
    table.replaceChildren(this.createTableHead(), this.createTableBody());

    const tableContainer = document.getElementById("tracker-table-container");
    const existingMsg = tableContainer.querySelector(".no-content-message");
    if (existingMsg) {
      existingMsg.remove();
    }

    if (Object.keys(this.allTrackers).length === 0) {
      const noContentMessage = document.createElement("p");
      noContentMessage.textContent =
        "No blocked resources, try refreshing the page.";
      noContentMessage.classList.add("no-content-message");
      tableContainer.append(noContentMessage);
    }
  }

  /**
   * Create the table head for the tracker table.
   *
   * @return {HTMLTableSectionElement} The table head element containing the header row.
   */
  createTableHead() {
    const thead = document.createElement("thead");
    thead.id = "tracker-table-head";
    const headerRow = document.createElement("tr");
    headerRow.id = "tracker-table-header";

    // Select all checkbox
    const selectAllTh = document.createElement("th");
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.addEventListener(
      "change",
      this.onSelectAllChange.bind(this)
    );
    selectAllTh.appendChild(selectAllCheckbox);
    headerRow.appendChild(selectAllTh);

    ["State", "Hostname", "Type", "Action"].forEach(name => {
      const th = document.createElement("th");
      th.textContent = name;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    return thead;
  }

  /**
   * Handler for select all checkbox change event.
   *
   * @param {Event} e - The change event.
   */
  onSelectAllChange(e) {
    const checked = e.target.checked;
    this.selectedTrackers = new Set();
    document.querySelectorAll(".row-checkbox").forEach(cb => {
      cb.checked = checked;
      if (checked) {
        this.selectedTrackers.add(cb.dataset.tracker);
      }
    });
  }

  /**
   * Create the table body for the tracker table.
   *
   * @return {HTMLTableSectionElement} The table body element containing tracker rows.
   */
  createTableBody() {
    const tbody = document.createElement("tbody");
    Object.entries(this.allTrackers).forEach(([hostname, trackerData]) => {
      tbody.appendChild(this.createTrackerRow(hostname, trackerData));
    });
    return tbody;
  }

  /**
   * Create a row for a tracker.
   *
   * @param {string} hostname - The hostname of the tracker.
   * @param {object} trackerData - The data associated with the tracker.
   * @param {string} trackerData.trackerType - The type of tracker (e.g., "tracking", "fingerprinting").
   * @returns {HTMLTableRowElement} The tracker row element.
   */
  createTrackerRow(hostname, trackerData) {
    const isBlocked = !this.unblockedChannels.has(hostname);
    const row = document.createElement("tr");
    row.appendChild(this.createRowCheckboxCell(hostname));

    const isBlockedCell = document.createElement("td");
    isBlockedCell.textContent = isBlocked ? "Blocked 🛑" : "Not Blocked";
    isBlockedCell.classList.toggle("tracker-blocked", isBlocked);
    row.appendChild(isBlockedCell);

    const hostnameCell = document.createElement("td");
    hostnameCell.className = "hostname-cell";
    hostnameCell.textContent = hostname;
    hostnameCell.title = hostname;
    hostnameCell.classList.toggle("tracker-blocked", isBlocked);
    row.appendChild(hostnameCell);

    const trackerTypeCell = document.createElement("td");
    trackerTypeCell.textContent = trackerData.trackerType || "N/A";
    trackerTypeCell.classList.toggle("tracker-blocked", isBlocked);
    row.appendChild(trackerTypeCell);

    row.appendChild(this.createActionCell(hostname, isBlocked));
    return row;
  }

  /**
   * Create a checkbox cell for a tracker row.
   *
   * @param {string} tracker - The tracker identifier (hostname).
   * @returns {HTMLTableCellElement} The checkbox cell element.
   */
  createRowCheckboxCell(tracker) {
    const checkboxCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "row-checkbox";
    checkbox.dataset.tracker = tracker;
    checkbox.checked = this.selectedTrackers.has(tracker);
    checkbox.addEventListener("change", this.onRowCheckboxChange.bind(this));
    checkboxCell.appendChild(checkbox);
    return checkboxCell;
  }

  /**
   * Handler for individual row checkbox change event.
   *
   * @param {Event} e - The change event.
   */
  onRowCheckboxChange(e) {
    const tracker = e.target.dataset.tracker;
    if (e.target.checked) {
      this.selectedTrackers.add(tracker);
    } else {
      this.selectedTrackers.delete(tracker);
    }
  }

  /**
   * Create an action cell (block/unblock button) for a tracker row.
   *
   * @param {string} tracker - The tracker identifier (hostname).
   * @param {boolean} isBlocked - Whether the tracker is currently blocked.
   * @returns {HTMLTableCellElement} The action cell element containing the button.
   */
  createActionCell(tracker, isBlocked) {
    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.textContent = isBlocked ? "Unblock" : "Block";
    button.addEventListener(
      "click",
      this.onActionButtonClick.bind(this, tracker, isBlocked)
    );
    actionCell.appendChild(button);
    return actionCell;
  }

  /**
   * Handler for individual action button click event.
   *
   * @param {string} tracker - The tracker identifier (hostname).
   * @param {boolean} isBlocked - Whether the tracker is currently blocked.
   */
  async onActionButtonClick(tracker, isBlocked) {
    if (isBlocked) {
      this.unblockedChannels.add(tracker);
    } else {
      this.unblockedChannels.delete(tracker);
    }
    this.populateTrackerTable();
    await this.commands.targetCommand.reloadTopLevelTarget(false);
  }

  async destroy() {
    const channelClassifierService = Cc[
      "@mozilla.org/url-classifier/channel-classifier-service;1"
    ].getService(Ci.nsIChannelClassifierService);
    channelClassifierService.removeListener(this.boundOnChannelBlocked);
  }
}

module.exports = { WebcompatTrackerDebugger };
