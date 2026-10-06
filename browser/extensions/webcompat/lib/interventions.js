/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals browser, ContentScriptRegistrationsBuilder, debugLog, InterventionHelpers, MatchPatternCache, SpecialContentScriptKeys */

const ENABLE_INTERVENTIONS_PREF = "enable_interventions";

function getTLDForUrl(url) {
  if (url.startsWith("about:")) {
    return undefined;
  }
  try {
    // MatchPatterns usually have wildcards, so replace asterisks.
    return browser.urlHelpers.getBaseDomainFromHost(
      URL.parse(url.replaceAll("*", "x")).hostname
    );
  } catch (e) {
    console.error("Could not get eTLD for UA Overrides for", url, e);
  }
  return undefined;
}

class InterventionsWebRequestListener {
  #interventionsByTLD = new Map();
  #matchPatternsForInterventions = new Map();
  #excludePatternsForInterventions = new Map();
  #eventName = undefined;
  #listener = undefined;
  #opts = undefined;

  constructor(eventName, listener, opts) {
    this.#eventName = eventName;
    this.#listener = listener;
    this.#opts = opts;
  }

  getMatchingInterventions(url, type) {
    const interventions = this.#interventionsByTLD.get(getTLDForUrl(url));
    if (!interventions) {
      return [];
    }
    return [...interventions].filter(intervention => {
      // Matching the TLD may not be enough, so also check the MatchPatterns.
      for (const {
        pattern,
        types,
      } of this.#excludePatternsForInterventions.get(intervention) ?? []) {
        if ((!types || types.includes(type)) && pattern.matches(url)) {
          return false;
        }
      }
      for (const { pattern, types } of this.#matchPatternsForInterventions.get(
        intervention
      )) {
        if ((!types || types.includes(type)) && pattern.matches(url)) {
          return true;
        }
      }
      return false;
    });
  }

  restartListener() {
    browser.webRequest[this.#eventName].removeListener(this.#listener);
    const urls = [...this.#matchPatternsForInterventions.values()]
      .map(setOfMatchPatterns => [...setOfMatchPatterns])
      .flat()
      .map(config => config.pattern.patterns)
      .flat();
    if (urls.length) {
      browser.webRequest[this.#eventName].addListener(
        this.#listener,
        { urls },
        this.#opts
      );
    }
  }

  interventionHandlesMatchPattern(intervention, infoOrPatternString) {
    const patternString = infoOrPatternString.url ?? infoOrPatternString;
    const actualMatchPatternInstance = MatchPatternCache.get(patternString);

    let set = this.#matchPatternsForInterventions.get(intervention);
    if (!set) {
      set = new Set();
      this.#matchPatternsForInterventions.set(intervention, set);
    }
    const types = infoOrPatternString.types;
    set.add({ pattern: actualMatchPatternInstance, types });

    const tld = getTLDForUrl(patternString);
    set = this.#interventionsByTLD.get(tld);
    if (!set) {
      set = new Set();
      this.#interventionsByTLD.set(tld, set);
    }
    set.add(intervention);
  }

  interventionExcludesMatchPattern(intervention, infoOrPatternString) {
    const patternString = infoOrPatternString.url ?? infoOrPatternString;
    const actualMatchPatternInstance = MatchPatternCache.get(patternString);

    let set = this.#excludePatternsForInterventions.get(intervention);
    if (!set) {
      set = new Set();
      this.#excludePatternsForInterventions.set(intervention, set);
    }
    const types = infoOrPatternString.types;
    set.add({ pattern: actualMatchPatternInstance, types });
  }

  interventionNoLongerHandlesMatchPattern(intervention, infoOrPatternString) {
    const patternString = infoOrPatternString.url ?? infoOrPatternString;
    const actualMatchPatternInstance = MatchPatternCache.get(patternString);

    let set = this.#matchPatternsForInterventions.get(intervention);
    if (set) {
      set.delete(actualMatchPatternInstance);
      if (!set.size) {
        this.#matchPatternsForInterventions.delete(intervention);
      }
    }

    const tld = getTLDForUrl(patternString);
    set = this.#interventionsByTLD.get(tld);
    if (set) {
      set.delete(intervention);
      if (!set.size) {
        this.#interventionsByTLD.delete(tld);
      }
    }
  }

  interventionNoLongerExcludesMatchPattern(intervention, infoOrPatternString) {
    const patternString = infoOrPatternString.url ?? infoOrPatternString;
    const actualMatchPatternInstance = MatchPatternCache.get(patternString);

    let set = this.#excludePatternsForInterventions.get(intervention);
    if (set) {
      set.delete(actualMatchPatternInstance);
      if (!set.size) {
        this.#excludePatternsForInterventions.delete(intervention);
      }
    }
  }
}

// This class encapsulates the logic to actually serve metadata to the special
// isolated content scripts we use, whenever they require it.

class SpecialContentScriptMetadataServer {
  // We cheat and use an InterventionsWebRequestListener to track which bits
  // of metadata our special isolated content scripts need on start-up (to
  // know which bug number to log to the console, which elements to hide, etc).
  #metadata = new InterventionsWebRequestListener();

  #listener = undefined;

  constructor() {
    this.#listener = this.#serve.bind(this);
  }

  start() {
    browser.runtime.onConnect.addListener(this.#listener);
  }

  stopAndClear() {
    this.#metadata = new InterventionsWebRequestListener();
    browser.runtime.onConnect.removeListener(this.#listener);
  }

  addMetadata({ metadata, matches, excludesMatches }) {
    if (!metadata) {
      return;
    }
    for (const matchPattern of matches ?? []) {
      this.#metadata.interventionHandlesMatchPattern(metadata, matchPattern);
    }
    for (const matchPattern of excludesMatches ?? []) {
      this.#metadata.interventionExcludesMatchPattern(metadata, matchPattern);
    }
  }

  clearMetadata(info) {
    if (!info?.metadata) {
      return;
    }
    const { metadata, matches, excludesMatches } = info;
    for (const matchPattern of matches ?? []) {
      this.#metadata.interventionNoLongerHandlesMatchPattern(
        metadata,
        matchPattern
      );
    }
    for (const matchPattern of excludesMatches ?? []) {
      this.#metadata.interventionNoLongerExcludesMatchPattern(
        metadata,
        matchPattern
      );
    }
  }

  #serve(port) {
    const { tab, frameId, url } = port.sender;
    if (url.startsWith("about:")) {
      return;
    }

    const metadata = this.#metadata.getMatchingInterventions(url)[0];
    if (!metadata) {
      port.disconnect();
      return;
    }

    // Pass along non-bug-number metadata we may have as-is (it has already
    // been pre-processed by its addToMetadata function).
    const dataToSend = Object.assign({}, metadata);
    delete dataToSend.bugsByMatchPattern;

    const { cssToInject } = dataToSend;
    if (cssToInject) {
      browser.scripting
        .insertCSS({
          css: cssToInject,
          target: {
            tabId: tab.id,
            frameIds: [frameId],
          },
        })
        .catch(err =>
          console.error(
            `webcompat addon failed to insert CSS on tab ${tab.id} frame ${frameId}: ${err}`
          )
        );
      delete dataToSend.cssToInject;
    }

    // If we have bug-number metadata, provide the correct bug-number
    // for the URL for which the content script has been loaded.
    const { bugsByMatchPattern } = metadata;
    if (bugsByMatchPattern) {
      const bugNumber = this.#getBugNumberForUrl(url, bugsByMatchPattern);
      if (bugNumber) {
        dataToSend.bugNumber = bugNumber;
      }
    }

    if (Object.keys(dataToSend).length) {
      port.postMessage(dataToSend);
    }
    port.disconnect();
  }

  #getBugNumberForUrl(url, bugsByMatchPattern) {
    for (const [pattern, bugNumber] of bugsByMatchPattern) {
      if (pattern.matches(url)) {
        return bugNumber;
      }
    }
    return undefined;
  }
}

class Interventions {
  #appVersion = parseFloat(
    browser.appConstants.getAppVersion().match(/\d+(\.\d+)?/)[0]
  );
  #currentPlatform = InterventionHelpers.getOS();
  #updateChannel = browser.appConstants.getEffectiveUpdateChannel();

  #aboutCompatBroker = undefined;
  #availableInterventions = undefined;
  #customFunctions = undefined;
  #interventionsEnabledByPref = undefined;
  #originalInterventions = undefined;

  // We track initial boot-up with a promise, so our public APIs can wait
  // for boot-up before they tinker with things, to reduce the risk of races.
  #doneBootingUp = undefined;
  #bootedUp = new Promise(resolve => (this.#doneBootingUp = resolve));

  #contentScriptsPerIntervention = new Map();
  #individualDisablingPrefListeners = new Map();

  #listenersForCheckedGlobalPrefs = new Map();
  #cachedCheckedGlobalPrefValues = new Map();

  #specialContentScriptMetadataServer =
    new SpecialContentScriptMetadataServer();

  #requestBlocksListener = new InterventionsWebRequestListener(
    "onBeforeRequest",
    ({ type, url }) => {
      const interventions =
        this.#requestBlocksListener.getMatchingInterventions(url, type);
      if (!interventions?.length) {
        return {};
      }

      for (const intervention of interventions) {
        const { enabled } = intervention;
        if (enabled) {
          console.info("webcompat addon blocked", type, "request to", url);
          return { cancel: true };
        }
      }

      return {};
    },
    ["blocking"]
  );

  #uaOverridesListener = new InterventionsWebRequestListener(
    "onBeforeSendHeaders",
    details => this.#maybeOverrideUAHeaders(details),
    ["blocking", "requestHeaders"]
  );

  constructor(availableInterventions, customFunctions) {
    this.#customFunctions = customFunctions;
    let interventions = availableInterventions;
    if (browser.appConstants.isInAutomation()) {
      this.#originalInterventions = structuredClone(availableInterventions);
      const override = browser.aboutConfigPrefs.getPref("test_interventions");
      if (override) {
        interventions = JSON.parse(override);
      }
    }
    this.#onSourceJSONChanged(interventions);
  }

  #onSourceJSONChanged(availableInterventions) {
    this.#availableInterventions = Object.entries(availableInterventions).map(
      ([id, obj]) => {
        obj.id = id;
        return obj;
      }
    );
  }

  // We want to ensure that the startup path uses synchronous code only,
  // as far as possible, to ensure that the various listeners and content
  // scripts are started as quickly as possible. Post-boot public APIs
  // should call this to ensure they only take place after boot-up, and
  // don't race with any other public API calls or pref-flip handlers.
  async #postStartupAtomicOperation(callback = () => {}) {
    await this.#bootedUp;
    return navigator.locks.request("webcompat_settled", callback);
  }

  // Convenience method for tests.
  async allSettled() {
    await this.#postStartupAtomicOperation();
  }

  async replaceAllInterventions(newInterventions) {
    return await this.#postStartupAtomicOperation(async () => {
      this.#specialContentScriptMetadataServer.stopAndClear();
      this.#stopListenersForTogglingIndividualInterventions();
      await this.#disableInterventionsInternal();
      this.#onSourceJSONChanged(newInterventions);
      await this.#enableInterventionsInternal({
        alsoClearObsoleteContentScripts: true,
      });
      this.#specialContentScriptMetadataServer.start();
      await this.#signalInterventionChangesToAboutCompat(
        this.#availableInterventions
      );
    });
  }

  async onRemoteSettingsUpdate(updatedInterventions) {
    await this.replaceAllInterventions(updatedInterventions);
  }

  async resetToDefaultInterventions() {
    await this.replaceAllInterventions(
      structuredClone(this.#originalInterventions)
    );
  }

  bindAboutCompatBroker(broker) {
    this.#aboutCompatBroker = broker;
  }

  bootup() {
    if (!this.#doneBootingUp) {
      throw new Error("webcompat add-on is already booting/booted");
    }
    const doneBootingUp = this.#doneBootingUp;
    this.#doneBootingUp = undefined;

    browser.aboutConfigPrefs.onPrefChange.addListener(() => {
      this.#postStartupAtomicOperation(async () => {
        await this.#checkInterventionPref();

        // about:compat expects false to show the "disabled by pref" message.
        this.#signalInterventionChangesToAboutCompat(
          this.#interventionsEnabledByPref
            ? this.#availableInterventions
            : false
        );
      });
    }, ENABLE_INTERVENTIONS_PREF);

    this.#checkInterventionPref(true).then(doneBootingUp);
  }

  async updateInterventions(_data) {
    return await this.#postStartupAtomicOperation(async () => {
      this.#specialContentScriptMetadataServer.stopAndClear();
      await this.#disableInterventionsInternal(
        this.getInterventionsByIds(_data.map(i => i.id))
      );
      const data = structuredClone(_data);
      for (const intervention of data) {
        const { id } = intervention;
        const i = this.#availableInterventions.findIndex(v => v.id === id);
        if (i > -1) {
          this.#availableInterventions[i] = intervention;
        } else {
          this.#availableInterventions.push(intervention);
        }
      }
      await this.#enableInterventionsInternal({ whichInterventions: data });
      this.#specialContentScriptMetadataServer.start();
      await this.#signalInterventionChangesToAboutCompat(data ?? false);
      return data;
    });
  }

  #checkInterventionPref(alsoClearObsoleteContentScripts = false) {
    const value = browser.aboutConfigPrefs.getPref(
      ENABLE_INTERVENTIONS_PREF,
      true
    );
    this.#interventionsEnabledByPref = value;
    if (value) {
      return this.#enableInterventionsInternal({
        alsoClearObsoleteContentScripts,
      }).then(() => {
        this.#specialContentScriptMetadataServer.start();
      });
    }
    this.#specialContentScriptMetadataServer.stopAndClear();
    return this.#disableInterventionsInternal();
  }

  getAvailableInterventions() {
    return this.#availableInterventions;
  }

  getAllOriginalInterventions() {
    return this.#originalInterventions;
  }

  getInterventionsByIds(ids) {
    return this.#availableInterventions.filter(({ id }) => ids?.includes(id));
  }

  isEnabled() {
    return this.#interventionsEnabledByPref;
  }

  async enableInterventions(ids, force = false) {
    await this.#postStartupAtomicOperation(async () => {
      const whichInterventions = this.getInterventionsByIds(ids);
      await this.#enableInterventionsInternal({ force, whichInterventions });
      await this.#signalInterventionChangesToAboutCompat(
        whichInterventions ?? false
      );
    });
  }

  async disableInterventions(ids) {
    await this.#postStartupAtomicOperation(async () => {
      const whichInterventions = this.getInterventionsByIds(ids);
      await this.#disableInterventionsInternal(whichInterventions);
      await this.#signalInterventionChangesToAboutCompat(
        whichInterventions ?? false
      );
    });
  }

  getBlocksAndMatchesFor(config) {
    const { bugs } = config;
    return {
      blocks: Object.values(bugs)
        .map(bug => bug.blocks)
        .flat()
        .filter(v => v !== undefined),
      excludeBlocks: Object.values(bugs)
        .map(bug => bug.exclude_blocks)
        .flat()
        .filter(v => v !== undefined),
      excludeMatches: Object.values(bugs)
        .map(bug => bug.exclude_matches)
        .flat()
        .filter(v => v !== undefined),
      matches: Object.values(bugs)
        .map(bug => bug.matches)
        .flat()
        .filter(v => v !== undefined),
    };
  }

  #disableInterventionsInternal(
    whichInterventions = this.#availableInterventions
  ) {
    const contentScriptsToUnregister = [];
    let requestBlocksChanged = false;
    let uaOverridesChanged = false;

    for (const config of whichInterventions) {
      const { active, interventions } = config;
      if (!active) {
        continue;
      }

      const { blocks, excludeBlocks, excludeMatches, matches } =
        this.getBlocksAndMatchesFor(config);

      const contentScriptData = this.#contentScriptsPerIntervention.get(config);
      if (contentScriptData) {
        this.#contentScriptsPerIntervention.delete(config);
        this.#specialContentScriptMetadataServer.clearMetadata(
          contentScriptData.metadata,
          contentScriptData.matches,
          contentScriptData.excludeMatches
        );
        contentScriptsToUnregister.push(...contentScriptData.registrations);
      }

      for (const intervention of interventions) {
        if (!intervention.enabled) {
          continue;
        }

        this.#enableOrDisableCustomFuncs("disable", intervention, config);

        if ("ua_string" in intervention) {
          uaOverridesChanged = true;
          for (const matchPattern of matches) {
            this.#uaOverridesListener.interventionNoLongerHandlesMatchPattern(
              intervention,
              matchPattern
            );
          }
          for (const matchPattern of excludeMatches) {
            this.#uaOverridesListener.interventionNoLongerExcludesMatchPattern(
              intervention,
              matchPattern
            );
          }
        }

        if (blocks.length) {
          requestBlocksChanged = true;
          for (const matchPattern of blocks) {
            this.#requestBlocksListener.interventionNoLongerHandlesMatchPattern(
              intervention,
              matchPattern
            );
          }
          for (const matchPattern of excludeBlocks) {
            this.#requestBlocksListener.interventionNoLongerExcludesMatchPattern(
              intervention,
              matchPattern
            );
          }
        }
      }

      config.active = false;
    }

    if (requestBlocksChanged) {
      this.#requestBlocksListener.restartListener();
    }

    if (uaOverridesChanged) {
      this.#uaOverridesListener.restartListener();
    }

    return this.#disableContentScripts(contentScriptsToUnregister);
  }

  async #signalInterventionChangesToAboutCompat(interventionsChanged) {
    if (interventionsChanged) {
      interventionsChanged =
        this.#aboutCompatBroker.filterInterventions(interventionsChanged);
    }
    await this.#aboutCompatBroker.portsToAboutCompatTabs.broadcast({
      interventionsChanged,
    });
  }

  #onGlobalPrefCheckedByInterventionsChanged(pref) {
    this.#cachedCheckedGlobalPrefValues.delete(pref);
    const toRecheck = this.#availableInterventions.filter(cfg =>
      cfg.interventions.find(i => i.pref_check && pref in i.pref_check)
    );
    this.updateInterventions(toRecheck);
  }

  #checkInterventionNeededBasedOnGlobalPrefs(intervention) {
    if (!intervention.pref_check) {
      return undefined;
    }
    for (const pref of Object.keys(intervention.pref_check ?? {})) {
      if (!this.#listenersForCheckedGlobalPrefs.has(pref)) {
        const listener = () =>
          this.#onGlobalPrefCheckedByInterventionsChanged(pref);
        this.#listenersForCheckedGlobalPrefs.set(pref, listener);
        browser.aboutConfigPrefs.onPrefChange.addListener(listener, pref);
      }
    }
    for (const [pref, value] of Object.entries(intervention.pref_check ?? {})) {
      if (!this.#cachedCheckedGlobalPrefValues.has(pref)) {
        this.#cachedCheckedGlobalPrefValues.set(
          pref,
          browser.aboutConfigPrefs.getPref(pref)
        );
      }
      if (value !== this.#cachedCheckedGlobalPrefValues.get(pref)) {
        return `${pref}=${value}`;
      }
    }
    return undefined;
  }

  async #onIndividualInterventionDisablingPrefChanged(interventionId) {
    const config = this.getInterventionsByIds([interventionId])?.[0];
    if (!config) {
      return;
    }
    const disablingPref = this.#getInterventionDisablingPref(config.id);
    const prefValue = browser.aboutConfigPrefs.getPref(disablingPref);
    this.#postStartupAtomicOperation(async () => {
      if (prefValue === true) {
        await this.#disableInterventionsInternal([config]);
      } else {
        await this.#enableInterventionsInternal({
          whichInterventions: [config],
        });
      }
      return this.#signalInterventionChangesToAboutCompat([config]);
    });
  }

  #whichInterventionsShouldBeSkipped(
    config,
    customFunctionNames,
    isForceEnabled
  ) {
    const reasons = new Map();
    for (const intervention of config.interventions) {
      let reason = InterventionHelpers.shouldSkip(
        intervention,
        this.appVersionOverride ?? this.#appVersion,
        this.#updateChannel,
        customFunctionNames,
        isForceEnabled
      );
      if (reason) {
        reasons.set(intervention, reason);
      }
    }
    return reasons;
  }

  #getInterventionDisablingPref(interventionId) {
    return `disabled_interventions.${interventionId}`;
  }

  #ensureListeningForIndividualInterventionTogglingPref(
    interventionId,
    disablingPref
  ) {
    if (!this.#individualDisablingPrefListeners.has(interventionId)) {
      const listener = () =>
        this.#onIndividualInterventionDisablingPrefChanged(interventionId);
      this.#individualDisablingPrefListeners.set(interventionId, listener);
      browser.aboutConfigPrefs.onPrefChange.addListener(
        listener,
        disablingPref
      );
    }
  }

  #stopListenersForTogglingIndividualInterventions() {
    for (const listener of this.#individualDisablingPrefListeners.values()) {
      browser.aboutConfigPrefs.onPrefChange.removeListener(listener);
    }
    this.#individualDisablingPrefListeners = new Map();
  }

  #enableInterventionsInternal(options) {
    const {
      alsoClearObsoleteContentScripts = false,
      force = false,
      whichInterventions = this.#availableInterventions,
    } = options ?? {};

    const enabledUAoverrides = [];
    const enabledRequestBlocks = [];
    const enabledCustomFuncs = [];
    const forceEnabling = [];
    const skipped = [];

    const customFunctionNames = new Set(Object.keys(this.#customFunctions));

    const contentScriptsToRegister = [];

    for (const config of whichInterventions) {
      if (config.active) {
        continue;
      }

      // Checked by tests, so it's good to reset these now
      // in case these vars are still undefined on the objects.
      config.active = false;
      config.availableOnPlatform = false;
      for (const intervention of config.interventions) {
        intervention.enabled = false;
      }

      if (config.isMissingFiles) {
        skipped.push([config.label, "Webcompat addon version is too old"]);
        continue;
      }

      const disablingPref = this.#getInterventionDisablingPref(config.id);
      const disablingPrefValue =
        browser.aboutConfigPrefs.getPref(disablingPref);

      const whichInterventionsShouldBeSkipped =
        this.#whichInterventionsShouldBeSkipped(
          config,
          customFunctionNames,
          disablingPrefValue === false
        );

      // about:compat uses this var to determine whether to show interventions.
      config.availableOnPlatform =
        disablingPrefValue !== undefined ||
        whichInterventionsShouldBeSkipped.size < config.interventions.length;

      try {
        this.#ensureListeningForIndividualInterventionTogglingPref(
          config.id,
          disablingPref
        );

        // If disabled in about:config, and not being force-enabled
        // in about:compat, we can skip the rest of the checks.
        if (!force && disablingPrefValue === true) {
          skipped.push([
            config.label,
            `force-disabled by pref extensions.webcompat.${disablingPref}`,
          ]);
        } else {
          const { blocks, excludeBlocks, excludeMatches, matches } =
            this.getBlocksAndMatchesFor(config);

          let uaOverridesEnabled = false;
          let requestBlocksEnabled = false;
          let usesCustomFuncs = false;
          let somethingWasEnabled = false;

          const skippedReasons = new Set();

          for (const intervention of config.interventions) {
            const skippedReason =
              whichInterventionsShouldBeSkipped.get(intervention);
            if (skippedReason) {
              skippedReasons.add(skippedReason);
              continue;
            }

            const checkedPrefFailure =
              this.#checkInterventionNeededBasedOnGlobalPrefs(intervention);
            if (checkedPrefFailure) {
              skippedReasons.add(`unneeded since pref ${checkedPrefFailure}`);
              continue;
            }

            if (
              !force &&
              InterventionHelpers.isDisabledByDefault(intervention)
            ) {
              skippedReasons.add("disabled by default");
              continue;
            }

            if (force) {
              forceEnabling.push(config.label);
            }

            if (
              this.#enableOrDisableCustomFuncs("enable", intervention, config)
            ) {
              usesCustomFuncs = true;
            }

            if ("ua_string" in intervention) {
              uaOverridesEnabled = true;
              for (const matchPattern of matches) {
                this.#uaOverridesListener.interventionHandlesMatchPattern(
                  intervention,
                  matchPattern
                );
              }
              for (const matchPattern of excludeMatches) {
                this.#uaOverridesListener.interventionExcludesMatchPattern(
                  intervention,
                  matchPattern
                );
              }
            }

            if (blocks.length) {
              requestBlocksEnabled = true;
              for (const matchPattern of blocks) {
                this.#requestBlocksListener.interventionHandlesMatchPattern(
                  intervention,
                  matchPattern
                );
              }
              for (const matchPattern of excludeBlocks) {
                this.#requestBlocksListener.interventionExcludesMatchPattern(
                  intervention,
                  matchPattern
                );
              }
            }

            somethingWasEnabled = true;
            intervention.enabled = true;
          }

          contentScriptsToRegister.push(
            ...this.buildContentScriptsRegistrationsForIntervention(
              config,
              matches,
              excludeMatches
            )
          );

          if (uaOverridesEnabled) {
            enabledUAoverrides.push(config.label);
          }
          if (requestBlocksEnabled) {
            enabledRequestBlocks.push(config.label);
          }
          if (usesCustomFuncs) {
            enabledCustomFuncs.push(config.label);
          }

          config.active = somethingWasEnabled;

          if (!somethingWasEnabled && skippedReasons.size) {
            skipped.push([config.label, [...skippedReasons.values()]]);
          }
        }
      } catch (e) {
        console.error("Error enabling intervention(s) for", config.label, e);
        skipped.push([config.label, ["unknown error occurred"]]);
      }
    }

    if (enabledRequestBlocks.length) {
      this.#requestBlocksListener.restartListener();
    }

    if (enabledUAoverrides.length) {
      this.#uaOverridesListener.restartListener();
    }

    return Promise.resolve().then(async () => {
      // If we're still booting up, we need to clean out any persisted content
      // scripts for which the intervention has been removed, before we register
      // the ones we have chosen to activate above.
      if (alsoClearObsoleteContentScripts) {
        const info = await InterventionHelpers.ensureOnlyTheseContentScripts(
          contentScriptsToRegister,
          "webcompat intervention"
        );
        if (browser.appConstants.isInAutomation()) {
          this._lastEnabledInfo = info;
        }
      } else {
        await InterventionHelpers.registerContentScripts(
          contentScriptsToRegister,
          "webcompat"
        );
      }

      if (enabledUAoverrides.length) {
        debugLog(
          "Enabled",
          enabledUAoverrides.length,
          "webcompat UA overrides for",
          enabledUAoverrides.sort()
        );
      }
      if (enabledRequestBlocks.length) {
        debugLog(
          "Enabled",
          enabledRequestBlocks.length,
          "webcompat request blocks for",
          enabledRequestBlocks.sort()
        );
      }
      if (enabledCustomFuncs.length) {
        debugLog(
          "Enabled",
          enabledCustomFuncs.length,
          "custom webcompat interventions for",
          enabledCustomFuncs.sort()
        );
      }
      if (forceEnabling.length) {
        debugLog(
          "Force-enabling",
          forceEnabling.length,
          "webcompat interventions",
          forceEnabling.sort()
        );
      }
      if (skipped.length) {
        debugLog(
          "Skipped",
          skipped.length,
          "un-needed webcompat interventions",
          skipped.sort((a, b) => a[0] > b[0])
        );
      }
    });
  }

  buildContentScriptsRegistrationsForIntervention(
    config,
    matches,
    excludeMatches,
    force = false
  ) {
    // There are a few special JSON keys we support which require an isolated
    // content script. We specially manage them to ensure their proper use.
    // We also similarly manage console logging with an isolated script.
    const specialContentScriptKeys = new SpecialContentScriptKeys();

    const regsBuilder = new ContentScriptRegistrationsBuilder();

    const noConsoleMessage = config.interventions?.some(
      i => i.content_scripts?.no_console_message
    );

    // Group all JS and CSS for each intervention we've marked as enabled by
    // whether they are isolated, should run in all frames, etc. Also check
    // which special isolated scripts they will need.
    for (const intervention of config.interventions) {
      specialContentScriptKeys.filterFromContentScriptsSection(intervention);

      if (
        (!intervention.enabled && !force) ||
        (!intervention.content_scripts &&
          !specialContentScriptKeys.areAnyUsedBy(intervention))
      ) {
        continue;
      }

      const { content_scripts = {} } = intervention;
      regsBuilder.add("css", content_scripts);
      regsBuilder.add("js", content_scripts);
      specialContentScriptKeys.foldIn(intervention, noConsoleMessage);
    }

    // Ensure that the special scripts start up if needed.
    specialContentScriptKeys.addRegs(regsBuilder);

    // Now get the actual content script registrations we'll need from that
    // grouped info, and remember the list so we can later easily disable them.
    const registrations = regsBuilder.build(
      config.label,
      matches,
      excludeMatches
    );

    // Gather the data that any special isolated scripts will require on startup,
    // such as which bug number to log to the console, or which elements to hide.
    const contentScriptData = {
      registrations,
      metadata: specialContentScriptKeys.getNeededMetadata(config),
      matches,
      excludeMatches,
    };
    this.#specialContentScriptMetadataServer.addMetadata(contentScriptData);
    this.#contentScriptsPerIntervention.set(config, contentScriptData);
    return registrations;
  }

  #enableOrDisableCustomFuncs(action, intervention, config) {
    let usesCustomFuncs = false;
    for (const [customFuncName, customFunc] of Object.entries(
      this.#customFunctions
    )) {
      if (customFuncName in intervention) {
        for (const details of intervention[customFuncName]) {
          try {
            customFunc[action](details, config);
            usesCustomFuncs = true;
          } catch (e) {
            console.trace(
              `Error while calling custom function ${customFuncName}.${action} for ${config.label}:`,
              e
            );
          }
        }
      }
    }
    return usesCustomFuncs;
  }

  #maybeOverrideUAHeaders(details) {
    const { requestHeaders } = details;

    const interventions = this.#uaOverridesListener.getMatchingInterventions(
      details.url,
      details.type
    );
    if (!interventions?.length) {
      return { requestHeaders };
    }

    for (const intervention of interventions) {
      const { enabled, ua_string } = intervention;

      if (!enabled) {
        return { requestHeaders };
      }

      for (const header of requestHeaders) {
        if (header.name.toLowerCase() !== "user-agent") {
          continue;
        }

        // Don't override the UA if we're on a mobile device that has the
        // "Request Desktop Site" mode enabled. The UA for the desktop mode
        // is set inside Gecko with a simple string replace, so we can use
        // that as a check, see https://searchfox.org/mozilla-central/rev/89d33e1c3b0a57a9377b4815c2f4b58d933b7c32/mobile/android/chrome/geckoview/GeckoViewSettingsChild.js#23-28
        let isMobileWithDesktopMode =
          this.#currentPlatform == "android" &&
          header.value.includes("X11; Linux x86_64");
        if (isMobileWithDesktopMode) {
          return { requestHeaders };
        }

        header.value = InterventionHelpers.applyUAChanges(
          header.value,
          ua_string
        );
      }
    }
    return { requestHeaders };
  }

  async #disableContentScripts(contentScripts) {
    if (!contentScripts?.length) {
      return;
    }
    const ids = (
      await browser.scripting.getRegisteredContentScripts({
        ids: contentScripts.map(s => s.id),
      })
    )?.map(script => script.id);
    try {
      await browser.scripting.unregisterContentScripts({ ids });
    } catch (_) {
      for (const id of ids) {
        try {
          await browser.scripting.unregisterContentScripts({ ids: [id] });
        } catch (e) {
          console.error(
            `Error while unregistering intervention content script`,
            id,
            e
          );
        }
      }
    }
  }
}
