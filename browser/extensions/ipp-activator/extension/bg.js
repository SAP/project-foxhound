/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global browser, ConditionFactory */

/**
 * The main class for the IPP activator add-on.
 */
class IPPAddonActivator {
  #initialized = false;

  #tabBaseBreakages;
  #webrequestBaseBreakages;

  #tabBreakages;
  #webrequestBreakages;

  #pendingTabs = new Set(); // pending due to tab URL change while inactive
  #pendingWebRequests = new Map(); // tabId -> Set of pending request URLs
  // tabId -> { domain, l10nId, condition, shown } for every tab that currently
  // has a matching breakage. The entry is kept alive (and the condition keeps
  // listening) even when the condition is false, so we re-show the
  // notification if the condition becomes true again.
  #stateByTab = new Map();

  constructor() {
    this.tabUpdated = this.#tabUpdated.bind(this);
    this.tabActivated = this.#tabActivated.bind(this);
    this.tabRemoved = this.#tabRemoved.bind(this);
    this.onRequest = this.#onRequest.bind(this);
    this.ippExceptionsChanged = this.#ippExceptionsChanged.bind(this);

    this.#loadAndRebuildBreakages().then(() => {
      browser.ippActivator.onDynamicTabBreakagesUpdated.addListener(() =>
        this.#loadAndRebuildBreakages()
      );
      browser.ippActivator.onDynamicWebRequestBreakagesUpdated.addListener(() =>
        this.#loadAndRebuildBreakages()
      );

      this.#init();
    });
  }

  async #init() {
    if (this.#initialized) {
      return;
    }

    // Register only the listeners that are needed for existing breakages.
    this.#registerListeners();

    this.#initialized = true;
  }

  async #fetchBaseBreakages(url) {
    try {
      const res = await fetch(url);
      const base = await res.json();
      return Array.isArray(base) ? base : [];
    } catch (_) {
      return [];
    }
  }

  async #loadAndRebuildBreakages() {
    if (!this.#tabBaseBreakages) {
      const customUrl = await browser.ippActivator.getTabBreakagesUrl();
      this.#tabBaseBreakages = await this.#fetchBaseBreakages(
        browser.runtime.getURL(customUrl || "breakages/tab.json")
      );
    }

    if (!this.#webrequestBaseBreakages) {
      const customUrl = await browser.ippActivator.getWebRequestBreakagesUrl();
      this.#webrequestBaseBreakages = await this.#fetchBaseBreakages(
        browser.runtime.getURL(customUrl || "breakages/webrequest.json")
      );
    }

    let dynamicTab = [];
    try {
      const dynT = await browser.ippActivator.getDynamicTabBreakages();
      dynamicTab = Array.isArray(dynT) ? dynT : [];
    } catch (_) {
      console.warn("Unable to retrieve dynamicTabBreakages");
    }

    let dynamicWr = [];
    try {
      const dynW = await browser.ippActivator.getDynamicWebRequestBreakages();
      dynamicWr = Array.isArray(dynW) ? dynW : [];
    } catch (_) {
      console.warn("Unable to retrieve dynamicWebRequestBreakages");
    }

    this.#tabBreakages = [...(this.#tabBaseBreakages || []), ...dynamicTab];
    this.#webrequestBreakages = [
      ...(this.#webrequestBaseBreakages || []),
      ...dynamicWr,
    ];

    // Adjust listeners if we've already initialized.
    if (this.#initialized) {
      this.#registerListeners();
    }
  }

  #registerListeners() {
    this.#unregisterListeners();

    const needTabUpdated =
      Array.isArray(this.#tabBreakages) && !!this.#tabBreakages.length;
    const needWebRequest =
      Array.isArray(this.#webrequestBreakages) &&
      !!this.#webrequestBreakages.length;
    const needActivation = needTabUpdated || needWebRequest;

    // tabs.onUpdated (only if there are tab breakages)
    if (needTabUpdated) {
      browser.tabs.onUpdated.addListener(this.tabUpdated, {
        properties: ["url", "status"],
      });
    }

    // webRequest.onBeforeRequest (only if there are webRequest breakages)
    if (needWebRequest) {
      browser.webRequest.onBeforeRequest.addListener(
        this.onRequest,
        {
          urls: ["<all_urls>"],
          types: ["media", "sub_frame", "xmlhttprequest"],
        },
        []
      );
    }

    // tabs.onActivated and tabs.onRemoved are needed when either above is needed
    if (needActivation) {
      browser.tabs.onActivated.addListener(this.tabActivated);
      browser.tabs.onRemoved.addListener(this.tabRemoved);
    }

    browser.ippActivator.onIPPExceptionsChanged.addListener(
      this.ippExceptionsChanged
    );
  }

  #unregisterListeners() {
    if (browser.tabs.onUpdated.hasListener(this.tabUpdated)) {
      browser.tabs.onUpdated.removeListener(this.tabUpdated);
    }

    if (browser.tabs.onActivated.hasListener(this.tabActivated)) {
      browser.tabs.onActivated.removeListener(this.tabActivated);
    }

    if (browser.tabs.onRemoved.hasListener(this.tabRemoved)) {
      browser.tabs.onRemoved.removeListener(this.tabRemoved);
    }

    if (browser.webRequest.onBeforeRequest.hasListener(this.onRequest)) {
      browser.webRequest.onBeforeRequest.removeListener(this.onRequest);
    }

    browser.ippActivator.onIPPExceptionsChanged.removeListener(
      this.ippExceptionsChanged
    );

    this.#pendingTabs.clear();
    this.#pendingWebRequests.clear();
  }

  async #ippExceptionsChanged() {
    if (!this.#stateByTab.size) {
      return;
    }

    const tabIds = Array.from(this.#stateByTab.keys());
    await Promise.allSettled(
      tabIds.map(async tabId => {
        try {
          const tab = await browser.tabs.get(tabId);
          if (!tab?.url) {
            return;
          }

          if (await browser.ippActivator.hasExclusion(tab.url)) {
            await this.#dropTabState(tabId);
          }
        } catch (_) {}
      })
    );
  }

  async #tabUpdated(tabId, changeInfo, tab) {
    // React only to URL changes and to load completion; avoid showing during 'loading'
    if (!("url" in changeInfo) && changeInfo.status !== "complete") {
      return;
    }

    // If the tab URL changed, reset any pending web requests for this tab
    if ("url" in changeInfo) {
      try {
        // If we had a notification for a different base domain, hide it
        const info = await browser.ippActivator.getBaseDomainFromURL(
          changeInfo.url || tab?.url || ""
        );
        const entry = this.#stateByTab.get(tabId);
        if (
          entry &&
          entry.domain !== info.baseDomain &&
          entry.domain !== info.host
        ) {
          await this.#dropTabState(tabId);
        }
      } catch (_) {
        // ignore lookup issues
      }
      this.#pendingWebRequests.delete(tabId);
    }

    // If we haven't reached load completion yet, wait for later events
    if (changeInfo.status && changeInfo.status !== "complete") {
      if (!tab.active) {
        this.#pendingTabs.add(tabId);
      }
      return;
    }

    // At this point, either the URL changed and load already completed, or
    // we received the 'complete' status: handle only if tab is active
    if (!tab.active) {
      this.#pendingTabs.add(tabId);
      return;
    }

    await this.#maybeNotify(tab, this.#tabBreakages, tab.url);
  }

  async #tabActivated(activeInfo) {
    const { tabId } = activeInfo || {};

    const hadTabPending = this.#pendingTabs.has(tabId);
    const wrSet = this.#pendingWebRequests.get(tabId);
    const pendingWrUrls = wrSet ? Array.from(wrSet) : [];
    if (!hadTabPending && pendingWrUrls.length === 0) {
      return;
    }

    this.#pendingTabs.delete(tabId);
    this.#pendingWebRequests.delete(tabId);

    let tab;
    try {
      tab = await browser.tabs.get(tabId);
      if (!tab || !tab.active) {
        return;
      }
    } catch (_) {
      // Tab might have been closed; ignore.
      return;
    }

    if (
      hadTabPending &&
      (await this.#maybeNotify(tab, this.#tabBreakages, tab.url))
    ) {
      return;
    }

    for (const url of pendingWrUrls) {
      if (await this.#maybeNotify(tab, this.#webrequestBreakages, url)) {
        return;
      }
    }
  }

  async #maybeNotify(tab, breakages, url) {
    const info = await browser.ippActivator.getBaseDomainFromURL(url);
    if (!info.baseDomain && !info.host) {
      await this.#dropTabState(tab.id);
      return false;
    }

    let domain = info.baseDomain;
    let breakage = breakages.find(
      b => Array.isArray(b.domains) && b.domains.includes(info.baseDomain)
    );
    if (!breakage) {
      breakage = breakages.find(
        b => Array.isArray(b.domains) && b.domains.includes(info.host)
      );
      if (!breakage) {
        await this.#dropTabState(tab.id);
        return false;
      }

      domain = info.host;
    }

    if (await browser.ippActivator.hasExclusion(url)) {
      await this.#dropTabState(tab.id);
      return false;
    }

    // Do not show the same notification again for the same base domain.
    const notified = await browser.ippActivator.getNotifiedDomains();
    if (Array.isArray(notified) && notified.includes(domain)) {
      await this.#dropTabState(tab.id);
      return false;
    }

    // If we already track this tab but for a different domain, reset the state.
    let entry = this.#stateByTab.get(tab.id);
    if (entry && entry.domain !== domain) {
      await this.#dropTabState(tab.id);
      entry = null;
    }

    if (!entry) {
      let condition = null;
      if (breakage.condition !== undefined) {
        const factory = new ConditionFactory({ tabId: tab.id });
        condition = factory.create(breakage.condition);
        await condition.init();
      }

      entry = { domain, l10nId: breakage.l10nId, condition, shown: false };
      this.#stateByTab.set(tab.id, entry);

      if (condition) {
        condition.onChange(() => {
          if (this.#stateByTab.get(tab.id) !== entry) {
            return;
          }
          this.#updateNotification(tab.id);
        });
      }
    }

    return this.#updateNotification(tab.id);
  }

  #updateNotification(tabId) {
    const entry = this.#stateByTab.get(tabId);
    if (!entry) {
      return false;
    }

    const matches = !entry.condition || entry.condition.check();

    if (!matches) {
      if (entry.shown) {
        entry.shown = false;
        browser.ippActivator.hideMessage(tabId);
      }
      return false;
    }

    if (entry.shown) {
      return true;
    }

    entry.shown = true;

    // This function returns when the notification is dismissed. We don't want
    // to wait for that to happen.
    browser.ippActivator
      .showMessage({ l10nId: entry.l10nId }, tabId)
      .then(async dismissed => {
        if (!dismissed) {
          return;
        }

        await browser.ippActivator.addNotifiedDomain(entry.domain);

        // Close all notifications currently shown for the same base domain
        // across all tabs and clean up tracking state.
        const toClose = [];
        for (const [tid, e] of this.#stateByTab.entries()) {
          if (e.domain === entry.domain) {
            toClose.push(tid);
          }
        }

        await Promise.allSettled(toClose.map(id => this.#dropTabState(id)));
      });

    return true;
  }

  async #dropTabState(tabId) {
    const entry = this.#stateByTab.get(tabId);
    if (!entry) {
      return;
    }
    if (entry.condition) {
      entry.condition.uninit();
    }
    if (entry.shown) {
      await browser.ippActivator.hideMessage(tabId);
    }
    this.#stateByTab.delete(tabId);
  }

  async #onRequest(details) {
    if (
      typeof details.tabId !== "number" ||
      details.tabId < 0 ||
      !details.url
    ) {
      return;
    }

    try {
      const tab = await browser.tabs.get(details.tabId);
      if (!tab) {
        return;
      }

      if (tab.active) {
        await this.#maybeNotify(tab, this.#webrequestBreakages, details.url);
      } else {
        const set = this.#pendingWebRequests.get(details.tabId) || new Set();
        set.add(details.url);

        this.#pendingWebRequests.set(details.tabId, set);
      }
    } catch (_) {
      // tab may not exist
    }
  }

  async #tabRemoved(tabId, _removeInfo) {
    // Clean up any pending state associated with the closed tab
    this.#pendingTabs.delete(tabId);
    this.#pendingWebRequests.delete(tabId);
    const entry = this.#stateByTab.get(tabId);
    if (entry?.condition) {
      entry.condition.uninit();
    }
    this.#stateByTab.delete(tabId);
  }
}

/* This object is kept alive by listeners */
new IPPAddonActivator();
