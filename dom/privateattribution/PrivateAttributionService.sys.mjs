/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

ChromeUtils.defineESModuleGetters(lazy, {
  IndexedDB: "resource://gre/modules/IndexedDB.sys.mjs",
  DAPTelemetrySender: "resource://gre/modules/DAPTelemetrySender.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "gIsTelemetrySendingEnabled",
  "datareporting.healthreport.uploadEnabled",
  true
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "gIsPPAEnabled",
  "dom.private-attribution.submission.enabled",
  true
);

const MAX_CONVERSIONS = 2;
const DAY_IN_MILLI = 1000 * 60 * 60 * 24;
const CONVERSION_RESET_MILLI = 7 * DAY_IN_MILLI;
const DAP_TIMEOUT_MILLI = 30000;

/**
 *
 */
export class PrivateAttributionService {
  constructor({ dapTelemetrySender, dateProvider, testForceEnabled } = {}) {
    this._dapTelemetrySender = dapTelemetrySender;
    this._dateProvider = dateProvider ?? Date;
    this._testForceEnabled = testForceEnabled;

    this.dbName = "PrivateAttribution";
    this.impressionStoreName = "impressions";
    this.budgetStoreName = "budgets";
    this.storeNames = [this.impressionStoreName, this.budgetStoreName];
    this.dbVersion = 1;
    this.models = {
      default: "lastImpression",
      view: "lastView",
      click: "lastClick",
    };
  }

  get dapTelemetrySender() {
    return this._dapTelemetrySender || lazy.DAPTelemetrySender;
  }

  now() {
    return this._dateProvider.now();
  }

  async onAttributionEvent(sourceHost, type, index, ad, targetHost) {
    if (!this.isEnabled()) {
      return;
    }

    const now = this.now();

    try {
      const impressionStore = await this.getImpressionStore();

      const impression = await this.getImpression(impressionStore, ad, {
        index,
        target: targetHost,
        source: sourceHost,
      });

      const prop = this.getModelProp(type);
      impression.index = index;
      impression.lastImpression = now;
      impression[prop] = now;
      const _prop = this.camelToSnake(prop);
      Glean.privateAttribution.saveImpression[_prop].add(1);

      await this.updateImpression(impressionStore, ad, impression);
      Glean.privateAttribution.saveImpression.success.add(1);
    } catch (e) {
      console.error(e);
      Glean.privateAttribution.saveImpression.error.add(1);
    }
  }

  async onAttributionConversion(
    targetHost,
    task,
    histogramSize,
    lookbackDays,
    impressionType,
    ads,
    sourceHosts
  ) {
    if (!this.isEnabled()) {
      return;
    }

    const now = this.now();

    try {
      const budget = await this.getBudget(targetHost, now);
      const impression = await this.findImpression(
        ads,
        targetHost,
        sourceHosts,
        impressionType,
        lookbackDays,
        histogramSize,
        now
      );

      let index = 0;
      let value = 0;
      if (budget.conversions < MAX_CONVERSIONS && impression) {
        index = impression.index;
        value = 1;
      }

      await this.updateBudget(budget, value, targetHost);
      await this.sendDapReport(task, index, histogramSize, value);
      Glean.privateAttribution.measureConversion.success.add(1);
    } catch (e) {
      console.error(e);
      Glean.privateAttribution.measureConversion.error.add(1);
    }
  }

  async findImpression(ads, target, sources, model, days, histogramSize, now) {
    let impressions = [];

    const impressionStore = await this.getImpressionStore();

    // Get matching ad impressions
    if (ads && ads.length) {
      for (var i = 0; i < ads.length; i++) {
        impressions = impressions.concat(
          (await impressionStore.get(ads[i])) ?? []
        );
      }
    } else {
      impressions = (await impressionStore.getAll()).flat(1);
    }

    // Set attribution model properties
    const prop = this.getModelProp(model);
    const _prop = this.camelToSnake(prop);
    Glean.privateAttribution.measureConversion[_prop].add(1);

    // Find the most relevant impression
    const lookbackWindow = now - days * DAY_IN_MILLI;
    return (
      impressions
        // Filter by target, sources, and lookback days
        .filter(
          impression =>
            impression.target === target &&
            (!sources || sources.includes(impression.source)) &&
            impression[prop] >= lookbackWindow &&
            impression.index < histogramSize
        )
        // Get the impression with the most recent interaction
        .reduce(
          (cur, impression) =>
            !cur || impression[prop] > cur[prop] ? impression : cur,
          null
        )
    );
  }

  async getImpression(impressionStore, ad, defaultImpression) {
    const impressions = (await impressionStore.get(ad)) ?? [];
    const impression = impressions.find(r =>
      this.compareImpression(r, defaultImpression)
    );

    return impression ?? defaultImpression;
  }

  async updateImpression(impressionStore, key, impression) {
    let impressions = (await impressionStore.get(key)) ?? [];

    const i = impressions.findIndex(r => this.compareImpression(r, impression));
    if (i < 0) {
      impressions.push(impression);
    } else {
      impressions[i] = impression;
    }

    await impressionStore.put(impressions, key);
  }

  compareImpression(cur, impression) {
    return cur.source === impression.source && cur.target === impression.target;
  }

  async getBudget(target, now) {
    const budgetStore = await this.getBudgetStore();
    const budget = await budgetStore.get(target);

    if (!budget || now > budget.nextReset) {
      return {
        conversions: 0,
        nextReset: now + CONVERSION_RESET_MILLI,
      };
    }

    return budget;
  }

  async updateBudget(budget, value, target) {
    const budgetStore = await this.getBudgetStore();
    budget.conversions += value;
    await budgetStore.put(budget, target);
  }

  async getImpressionStore() {
    return await this.getStore(this.impressionStoreName);
  }

  async getBudgetStore() {
    return await this.getStore(this.budgetStoreName);
  }

  async getStore(storeName) {
    return (await this.db).objectStore(storeName, "readwrite");
  }

  get db() {
    return this._db || (this._db = this.createOrOpenDb());
  }

  async createOrOpenDb() {
    try {
      return await this.openDatabase();
    } catch {
      Glean.privateAttribution.database.reset.add(1);
      await lazy.IndexedDB.deleteDatabase(this.dbName);
      return this.openDatabase();
    }
  }

  async openDatabase() {
    return await lazy.IndexedDB.open(this.dbName, this.dbVersion, db => {
      this.storeNames.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      });
    });
  }

  async sendDapReport(id, index, size, value) {
    const task = {
      id,
      time_precision: 60,
      measurement_type: "vecu8",
    };

    const measurement = new Array(size).fill(0);
    measurement[index] = value;

    await this.dapTelemetrySender.sendDAPMeasurement(
      task,
      measurement,
      DAP_TIMEOUT_MILLI,
      "conversion"
    );
  }

  getModelProp(type) {
    return this.models[type ? type : "default"];
  }

  isEnabled() {
    return (
      this._testForceEnabled ||
      (lazy.gIsTelemetrySendingEnabled &&
        AppConstants.MOZ_TELEMETRY_REPORTING &&
        lazy.gIsPPAEnabled)
    );
  }

  camelToSnake(camelStr) {
    const snakeStr = camelStr.replace(/([A-Z])/g, function (match) {
      return "_" + match.toLowerCase();
    });
    return snakeStr;
  }

  QueryInterface = ChromeUtils.generateQI([Ci.nsIPrivateAttributionService]);
}
