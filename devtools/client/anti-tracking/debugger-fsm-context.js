/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Finite State Machine (FSM) context for interactive debugging of tracker blocking.
 * This class manages the state transitions and interactions for the debugging process.
 */
class DebuggerFSMContext {
  /**
   * Creates an instance of DebuggerFSMContext.
   *
   * @param {Array} allTrackers - A non-empty list of all trackers to be managed by the FSM context.
   * @param {object} callbacks - An object containing optional callback functions.
   * @param {Function} [callbacks.onPromptTextUpdate] - Callback invoked when the prompt text is updated.
   * @param {Function} [callbacks.onButtonStateUpdate] - Callback invoked when the button state is updated.
   * @param {Function} [callbacks.onTrackersBlockedStateUpdate] - Callback invoked when the trackers blocked state is updated.
   */
  constructor(
    allTrackers,
    { onPromptTextUpdate, onButtonStateUpdate, onTrackersBlockedStateUpdate }
  ) {
    this.allTrackers = allTrackers;
    this.subdomainStageTrackers = new Set();
    this.necessaryTrackers = new Set();
    this.onTrackersBlockedStateUpdate =
      onTrackersBlockedStateUpdate || (() => {});
    this.onPromptTextUpdate = onPromptTextUpdate || (() => {});
    this.onButtonStateUpdate = onButtonStateUpdate || (() => {});
    this.onTrackersBlockedStateUpdate(false, this.allTrackers);
    this.onButtonStateUpdate("stop-debugging", false);
    this.changeState(new DomainStageState(this));
  }

  /**
   * Transition to a new FSM state.
   *
   * @param {object} state - The new state instance.
   */
  changeState(state) {
    this.state = state;
  }

  /**
   * Called when user clicks "Continue".
   */
  async onTestNextTracker() {
    await this.state.onTestNextTracker();
  }

  /**
   * Called when user clicks "Website Broke".
   */
  async onWebsiteBroke() {
    await this.state.onWebsiteBroke();
  }

  /**
   * Stop interactive debugging and reset all states.
   */
  async stop() {
    this.onPromptTextUpdate(undefined, `Interactive debugger stopped.`);
    await this.onTrackersBlockedStateUpdate(false, this.allTrackers);
    this.onButtonStateUpdate("test-next-tracker", true);
    this.onButtonStateUpdate("website-broke", true);
    this.onButtonStateUpdate("stop-debugging", true);
  }
}

class FSMState {
  /**
   * Base class for FSM states.
   *
   * @param {DebuggerFSMContext} debuggerFSMContext - The FSM context.
   */
  constructor(debuggerFSMContext) {
    this.debuggerFSMContext = debuggerFSMContext;
  }

  /**
   * Handle the "Continue" button click to test the next tracker.
   */
  onTestNextTracker() {
    throw new Error("onTestNextTracker must be implemented in derived class");
  }

  /**
   * Handle the "Website Broke" button click to unblock the last tracker.
   */
  onWebsiteBroke() {
    throw new Error("onWebsiteBroke must be implemented in derived class");
  }
}

/**
 * This stage groups trackers by their top-level domain and allows the user to test
 * each domain group separately. If a website breaks, the user can use `onWebsiteBroke`
 * to unblock the last group and continue testing the next domain group.
 * If the website is not broken, the user can use `onTestNextTracker` to test the next domain group.
 * If all groups are tested, it transitions to the individual domain stage.
 */
class DomainStageState extends FSMState {
  constructor(debuggerFSMContext) {
    super(debuggerFSMContext);
    this.domainGroups = this.groupByDomain(debuggerFSMContext.allTrackers);
    this.lastGroup = null;
    this.debuggerFSMContext.onPromptTextUpdate(
      this.domainGroups.length,
      "Click 'Continue' to start domain debugging."
    );
    this.debuggerFSMContext.onButtonStateUpdate("test-next-tracker", false);
  }

  /**
   * Handle the "Continue" button click to test the next domain group.
   */
  async onTestNextTracker() {
    this.lastGroup = this.domainGroups.shift();
    const count = this.domainGroups.length;
    // If no more domain groups to check, transition to subdomain stage
    if (!this.lastGroup) {
      this.debuggerFSMContext.onPromptTextUpdate(
        count,
        "Domain debugging finished. Starting subdomain tracker stage. Click 'Continue' to proceed."
      );
      this.debuggerFSMContext.onButtonStateUpdate("website-broke", true);
      this.debuggerFSMContext.changeState(
        new SubdomainStageState(this.debuggerFSMContext)
      );
      return;
    }
    await this.debuggerFSMContext.onTrackersBlockedStateUpdate(
      true,
      this.lastGroup.hosts
    );
    this.debuggerFSMContext.onButtonStateUpdate("website-broke", false);
    this.debuggerFSMContext.onPromptTextUpdate(
      count,
      `Blocked domain group '${this.lastGroup.domain}'. If the website is broken, click 'Website Broke', otherwise 'Continue'.`
    );
  }

  /**
   * Handle the "Website Broke" button click to unblock the last group.
   */
  async onWebsiteBroke() {
    if (this.lastGroup && this.lastGroup.hosts) {
      this.lastGroup.hosts.forEach(tracker =>
        this.debuggerFSMContext.subdomainStageTrackers.add(tracker)
      );
      // Unblock the group to restore site
      await this.debuggerFSMContext.onTrackersBlockedStateUpdate(
        false,
        this.lastGroup.hosts
      );
      const count = this.domainGroups.length;
      this.debuggerFSMContext.onPromptTextUpdate(
        count,
        `Domain group '${this.lastGroup.domain}' will be tested individually later. Click 'Continue' to test the next domain group.`
      );
      this.debuggerFSMContext.onButtonStateUpdate("website-broke", true);
    }
  }

  /**
   * Group trackers by their top-level domain.
   *
   * @param {string[]} trackers - List of tracker hostnames.
   */
  groupByDomain(trackers) {
    const domainGroupsMap = {};
    trackers.forEach(tracker => {
      const domain = Services.eTLD.getBaseDomainFromHost(tracker);
      if (!domainGroupsMap[domain]) {
        domainGroupsMap[domain] = new Set();
      }
      domainGroupsMap[domain].add(tracker);
    });
    return Object.entries(domainGroupsMap).map(([domain, hosts]) => ({
      domain,
      hosts: Array.from(hosts),
    }));
  }
}

/**
 * Subdomain stage: block/unblock each tracker separately. This stage is very similar to the domain stage,
 * but it allows the user to test each subdomain tracker individually. This ensures we can identify
 * which specific subdomain tracker is causing issues, rather than just the top-level domain.
 */
class SubdomainStageState extends FSMState {
  constructor(debuggerFSMContext) {
    super(debuggerFSMContext);
    this.subdomains = Array.from(debuggerFSMContext.subdomainStageTrackers);
    this.lastSubdomain = null;
  }

  async onTestNextTracker() {
    this.lastSubdomain = this.subdomains.shift();
    const count = this.subdomains.length;
    if (!this.lastSubdomain) {
      this.debuggerFSMContext.changeState(
        new CompletedState(this.debuggerFSMContext)
      );
      return;
    }
    await this.debuggerFSMContext.onTrackersBlockedStateUpdate(true, [
      this.lastSubdomain,
    ]);
    this.debuggerFSMContext.onButtonStateUpdate("website-broke", false);
    this.debuggerFSMContext.onPromptTextUpdate(
      count,
      `Blocked subdomain '${this.lastSubdomain}'. If the website is broken, click 'Website Broke', otherwise 'Continue'.`
    );
  }

  async onWebsiteBroke() {
    if (this.lastSubdomain) {
      this.debuggerFSMContext.necessaryTrackers.add(this.lastSubdomain);
      await this.debuggerFSMContext.onTrackersBlockedStateUpdate(false, [
        this.lastSubdomain,
      ]);
      const count = this.subdomains.length;
      this.debuggerFSMContext.onButtonStateUpdate("website-broke", true);
      this.debuggerFSMContext.onPromptTextUpdate(
        count,
        `Added '${this.lastSubdomain}' to necessary trackers. Click 'Continue' to test the next subdomain.`
      );
    }
  }
}

class CompletedState extends FSMState {
  constructor(debuggerFSMContext) {
    super(debuggerFSMContext);
    this.debuggerFSMContext.onPromptTextUpdate(
      undefined,
      `Subdomain debugging finished. Please add the following to the exceptions list: ${Array.from(this.debuggerFSMContext.necessaryTrackers).join(", ")}`,
      true
    );
    this.debuggerFSMContext.onButtonStateUpdate("test-next-tracker", true);
    this.debuggerFSMContext.onButtonStateUpdate("website-broke", true);
    this.debuggerFSMContext.onButtonStateUpdate("stop-debugging", true);
  }
}

// Only export for Node.js (test) environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DebuggerFSMContext,
    DomainStageState,
    SubdomainStageState,
    CompletedState,
  };
}

exports.DebuggerFSMContext = DebuggerFSMContext;
