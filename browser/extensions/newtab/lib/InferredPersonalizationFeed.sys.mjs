/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
  PersistentCache: "resource://newtab/lib/PersistentCache.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

import { FeatureModel } from "resource://newtab/lib/InferredModel/FeatureModel.sys.mjs";

import {
  FORMAT,
  AggregateResultKeys,
  DEFAULT_INFERRED_MODEL_DATA,
  DEFAULT_USER_CTR,
} from "resource://newtab/lib/InferredModel/InferredConstants.sys.mjs";

import {
  actionTypes as at,
  actionCreators as ac,
} from "resource://newtab/common/Actions.mjs";

import { MODEL_TYPE } from "./InferredModel/InferredConstants.sys.mjs";

const CACHE_KEY = "inferred_personalization_feed";
const DISCOVERY_STREAM_CACHE_KEY = "discovery_stream";
const INTEREST_VECTOR_UPDATE_HOURS = 24;
const HOURS_TO_MS = 60 * 60 * 1000;
const DAYS_TO_SECONDS = 24 * 60 * 60;

const PREF_USER_INFERRED_PERSONALIZATION =
  "discoverystream.sections.personalization.inferred.user.enabled";
const PREF_SYSTEM_INFERRED_PERSONALIZATION =
  "discoverystream.sections.personalization.inferred.enabled";
const PREF_SYSTEM_INFERRED_MODEL_OVERRIDE =
  "discoverystream.sections.personalization.inferred.model.override";
const PREF_DEBUG_OVERRIDE =
  "discoverystream.sections.personalization.inferred.debug.override";

const DEBUG_OVERRIDE_COARSE_VALUE_DICTIONARY_KEY =
  "debug_override_interest_values";

function timeMSToSeconds(timeMS) {
  return Math.round(timeMS / 1000);
}

const CLICK_TABLE = "moz_newtab_story_click";
const IMPRESSION_TABLE = "moz_newtab_story_impression";
const TEST_MODEL_ID = "TEST";

const OLD_DATA_PRESERVE_DAYS_DEFAULT = 30 * 6;
const OLD_DATA_CLEAR_CHECK_FREQUENCY_MS = 5 * 3600 * 24 * 1000; // 5 days

const KNOWN_TOPICS = new Set([
  "t_business",
  "t_career",
  "t_arts",
  "t_food",
  "t_health",
  "t_home",
  "t_finance",
  "t_government",
  "t_sports",
  "t_tech",
  "t_travel",
  "t_education",
  "t_hobbies",
  "t_society-parenting",
  "t_education-science",
  "t_society",
]);

/**
 * Computes average CTR from raw interval data, counting only known topic features.
 *
 * @param {Array.<Array>} clickDataPerInterval Raw click SQL results per time interval.
 * @param {Array.<Array>} impressionDataPerInterval Raw impression SQL results per time interval.
 * @param {{[key: string]: number}} indexSchema Map of keys to indices in each row.
 * @returns {number} Average CTR, or DEFAULT_USER_CTR if no topic impressions found.
 */
export function computeAverageCTRFromTopics(
  clickDataPerInterval,
  impressionDataPerInterval,
  indexSchema
) {
  const featureIdx = indexSchema[AggregateResultKeys.FEATURE];
  const valueIdx = indexSchema[AggregateResultKeys.VALUE];

  function sumTopics(dataPerInterval) {
    let total = 0;
    for (const intervalData of dataPerInterval) {
      for (const row of intervalData) {
        if (KNOWN_TOPICS.has(row[featureIdx])) {
          total += row[valueIdx];
        }
      }
    }
    return total;
  }

  const impressionsTotal = sumTopics(impressionDataPerInterval);
  if (impressionsTotal <= 0) {
    return DEFAULT_USER_CTR;
  }
  const clicksTotal = sumTopics(clickDataPerInterval);
  return clicksTotal / impressionsTotal;
}

/**
 * A feature that periodically generates a interest vector for inferred personalization.
 */
export class InferredPersonalizationFeed {
  constructor() {
    this.loaded = false;
    this.cache = this.PersistentCache(CACHE_KEY, true);
  }

  async reset() {
    if (this.cache) {
      await this.cache.set("interest_vector", {});
    }
    this.loaded = false;
    this.store.dispatch(
      ac.OnlyToMain({
        type: at.INFERRED_PERSONALIZATION_RESET,
      })
    );
  }

  isEnabled() {
    return (
      this.store.getState().Prefs.values[PREF_USER_INFERRED_PERSONALIZATION] &&
      this.store.getState().Prefs.values[PREF_SYSTEM_INFERRED_PERSONALIZATION]
    );
  }

  isStoreData() {
    return !!this.store.getState().Prefs.values?.trainhopConfig
      ?.newTabSectionsExperiment?.personalizationStoreFeaturesEnabled;
  }

  async init() {
    await this.loadInterestVector(true /* isStartup */);
  }

  async queryDatabaseForTimeIntervals(intervals, table) {
    let results = [];
    for (const interval of intervals) {
      const agg = await this.fetchInferredPersonalizationSummary(
        interval.start,
        interval.end,
        table
      );
      results.push(agg);
    }
    return results;
  }

  /**
   * Get Inferred model raw data
   *
   * @returns JSON of inferred model
   */
  async getInferredModelData() {
    const modelOverrideRaw =
      this.store.getState().Prefs.values[PREF_SYSTEM_INFERRED_MODEL_OVERRIDE];
    if (modelOverrideRaw) {
      if (modelOverrideRaw === TEST_MODEL_ID) {
        return {
          model_id: TEST_MODEL_ID,
          model_data: DEFAULT_INFERRED_MODEL_DATA,
        };
      }
      try {
        return JSON.parse(modelOverrideRaw);
      } catch (_error) {}
    }
    const dsCache = this.PersistentCache(DISCOVERY_STREAM_CACHE_KEY, true);
    const cachedData = (await dsCache.get()) || {};
    let { inferredModel } = cachedData;
    return inferredModel;
  }

  /**
   * Gets overridden interest feature values used by the developer debugging UI.
   *
   * Pref values take precedence when present and valid. If the pref is missing,
   * empty, or invalid JSON, cached override values are returned.
   *
   * @returns {Promise<{ [key: string]: number }>}
   */
  async _getDebugOverrides() {
    const prefValue =
      this.store?.getState?.()?.Prefs?.values?.[PREF_DEBUG_OVERRIDE];
    if (typeof prefValue === "string" && prefValue) {
      try {
        const parsed = JSON.parse(prefValue);
        if (parsed !== null) {
          return parsed;
        }
      } catch (_error) {
        console.error(
          `${PREF_DEBUG_OVERRIDE} pref contains invalid JSON`,
          prefValue
        );
      }
    }
    return (
      (await this.cache.get(DEBUG_OVERRIDE_COARSE_VALUE_DICTIONARY_KEY, {})) ||
      {}
    );
  }

  /**
   * Saves overridden interest feature values for the developer debugging UI.
   *
   * This method stores a map of feature keys to override values, which are used
   * to replace values in the computed interest vector for testing and debugging
   * purposes. Passing `null` or `undefined` clears all overrides.
   *
   * @param {{ [key: string]: number }} [overrides]
   *    A dictionary mapping feature names to their overridden numeric values.
   * @returns {Promise<void>}
   */
  async setDebuggingInterestFeaturesOverride(overrides) {
    this.store?.dispatch?.(
      ac.SetPref(
        PREF_DEBUG_OVERRIDE,
        overrides === null || overrides === undefined
          ? ""
          : JSON.stringify(overrides)
      )
    );
    await this.cache.set(
      DEBUG_OVERRIDE_COARSE_VALUE_DICTIONARY_KEY,
      overrides || {}
    );
  }

  /**
   * Returns metadata describing which interest features support debugging overrides.
   *
   * Each entry in the returned object is keyed by feature name and contains:
   *  - `numValues`: The number of possible values the feature can take (typically 0–3).
   *  - `currentValue`: The feature’s value from the current interest vector, if applicable.
   *  - `overrideValue`: The currently applied override value for the feature, if any.
   *
   * This information is primarily used by developer-facing tooling to inspect
   * and manipulate interest features during testing.
   *
   * @returns {Promise<{
   *   [featureName: string]: {
   *     numValues: number,
   *     currentValue?: number,
   *     overrideValue?: number
   *   }
   * }>}
   */
  async getDebuggingInterestFeaturesSupported() {
    const inferredModel = await this.getInferredModelData();
    if (!inferredModel || !inferredModel.model_data) {
      return {};
    }
    const model = FeatureModel.fromJSON(inferredModel.model_data);
    const features = model.getInterestFeaturesSupported();
    const interestVector = await this.cache.get("interest_vector");
    const coarseInterests = interestVector?.data?.coarseInferredInterests || {};
    if (interestVector) {
      Object.keys(features).forEach(featureName => {
        if (featureName in coarseInterests) {
          features[featureName].currentValue = coarseInterests[featureName];
        }
      });
    }
    const debugOverrides = await this._getDebugOverrides();
    for (const featureName in debugOverrides) {
      if (featureName in features) {
        features[featureName].overrideValue = debugOverrides[featureName];
      }
    }
    return features;
  }

  /**
   * The model computes interest vectors based on aggregated click and impression data over specific time intervals. The feed queries the database for this aggregated data, which is grouped by feature and card format, for each time interval defined by the model. The schema object defines how to interpret the columns of the aggregated data results when computing the interest vectors.
   *
   * Parameters:
   *
   * @param {FeatureModel} model - The inferred model used to compute interest vectors.
   * @param {string} modelId - The ID of the inferred model.
   * @returns {Promise<any>}
   */
  async generateInterestVector(model, modelId) {
    const intervals = model.getDateIntervals(this.Date().now());
    const schema = {
      [AggregateResultKeys.FEATURE]: 0,
      [AggregateResultKeys.FORMAT_ENUM]: 1,
      [AggregateResultKeys.VALUE]: 2,
    };

    const model_id = modelId; // Convert to snake case

    const aggClickPerInterval = await this.queryDatabaseForTimeIntervals(
      intervals,
      CLICK_TABLE
    );
    const isClickModel = model.modelType === MODEL_TYPE.CLICKS;
    const interests = model.computeInterestVectors({
      dataForIntervals: aggClickPerInterval,
      indexSchema: schema,
      model_id,
      applyPostProcessing: isClickModel,
    });

    if (isClickModel) {
      return interests;
    }

    if (
      model.modelType === MODEL_TYPE.CLICK_IMP_PAIR ||
      model.modelType === MODEL_TYPE.CTR
    ) {
      // This model type does not support differential privacy or thresholding
      const aggImpressionsPerInterval =
        await this.queryDatabaseForTimeIntervals(intervals, IMPRESSION_TABLE);
      const ivImpressions = model.computeInterestVector({
        dataForIntervals: aggImpressionsPerInterval,
        indexSchema: schema,
      });

      if (model.modelType === MODEL_TYPE.CTR) {
        // eslint-disable-next-line no-unused-vars
        const { model_id: extractModelId, ...clickTotals } =
          interests.inferredInterests;
        const debugOverrideCoarseValueDictionary =
          await this._getDebugOverrides();
        const averageCtr = model.hasBayesianSmoothing()
          ? computeAverageCTRFromTopics(
              aggClickPerInterval,
              aggImpressionsPerInterval,
              schema
            )
          : null;
        const inferredInterests = model.computeCTRInterestVectors({
          clicks: clickTotals,
          impressions: ivImpressions,
          model_id,
          timeZoneOffset: lazy.NewTabUtils.getUtcOffset(),
          debugOverrideCoarseValueDictionary,
          averageCtr,
        });
        return inferredInterests;
      }
      const res = {
        c: interests.inferredInterests,
        i: ivImpressions,
        model_id,
      };
      return { inferredInterests: res };
    }

    // unsupported modelType
    return {};
  }

  async loadInterestVector(isStartup = false) {
    const cachedData = (await this.cache.get()) || {};
    let { interest_vector } = cachedData;

    const { values } = this.store.getState().Prefs;
    const interestVectorRefreshHours =
      values?.inferredPersonalizationConfig?.iv_refresh_frequency_hours ||
      INTEREST_VECTOR_UPDATE_HOURS;
    let inferredTelemetrySettingsOverrides = {};

    // If we have nothing in cache, or cache has expired, we can make a fresh fetch.
    if (
      !interest_vector?.lastUpdated ||
      !(
        this.Date().now() - interest_vector.lastUpdated <
        interestVectorRefreshHours * HOURS_TO_MS
      )
    ) {
      let lastClearedDB = interest_vector?.lastClearedDB ?? this.Date().now();
      const needsCleanup =
        this.Date().now() - lastClearedDB >= OLD_DATA_CLEAR_CHECK_FREQUENCY_MS;
      if (needsCleanup) {
        await this.clearOldData(
          values?.inferredPersonalizationConfig?.history_cull_days ||
            OLD_DATA_PRESERVE_DAYS_DEFAULT
        );
        lastClearedDB = this.Date().now();
      }

      let interestVectorData = {};
      const inferredModel = await this.getInferredModelData();
      if (inferredModel && inferredModel.model_data) {
        const model = FeatureModel.fromJSON(inferredModel.model_data);
        interestVectorData = await this.generateInterestVector(
          model,
          inferredModel.model_id
        );
        inferredTelemetrySettingsOverrides =
          inferredModel.privacy_overrides ?? {};
      }

      interest_vector = {
        data: interestVectorData,
        lastUpdated: this.Date().now(),
        lastClearedDB,
      };
    }
    await this.cache.set("interest_vector", interest_vector);
    this.loaded = true;

    const updateAction = {
      type: at.INFERRED_PERSONALIZATION_UPDATE,
      data: {
        lastUpdated: interest_vector.lastUpdated,
        inferredInterests: interest_vector.data.inferredInterests,
        coarseInferredInterests: interest_vector.data.coarseInferredInterests,
        coarsePrivateInferredInterests:
          interest_vector.data.coarsePrivateInferredInterests,
        inferredTelemetrySettingsOverrides,
      },
      meta: {
        isStartup,
      },
    };
    this.store.dispatch(ac.BroadcastToContent(updateAction));
  }

  async handleDiscoveryStreamImpressionStats(action) {
    const { tiles } = action.data;

    for (const tile of tiles) {
      const { type, format, pos, topic, section_position, features } = tile;
      if (["organic"].includes(type)) {
        await this.recordInferredPersonalizationImpression({
          format,
          pos,
          topic,
          section_position,
          features,
        });
      }
    }
  }

  async handleDiscoveryStreamUserEvent(action) {
    switch (action.data?.event) {
      case "OPEN_NEW_WINDOW":
      case "CLICK": {
        const { card_type, format, topic, section_position, features } =
          action.data.value ?? {};
        const pos = action.data.action_position;
        if (["organic"].includes(card_type)) {
          await this.recordInferredPersonalizationClick({
            format,
            pos,
            topic,
            section_position,
            features,
          });
        }
        break;
      }
    }
  }

  async recordInferredPersonalizationImpression(tile) {
    await this.recordInferredPersonalizationInteraction(IMPRESSION_TABLE, tile);
  }
  async recordInferredPersonalizationClick(tile) {
    await this.recordInferredPersonalizationInteraction(
      CLICK_TABLE,
      tile,
      true
    );
  }

  async fetchInferredPersonalizationImpression() {
    return await this.fetchInferredPersonalizationInteraction(
      "moz_newtab_story_impression"
    );
  }

  async fetchInferredPersonalizationSummary(startTime, endTime, table) {
    let sql = `SELECT feature, card_format_enum, SUM(feature_value) FROM ${table}
      WHERE timestamp_s > ${timeMSToSeconds(startTime)}
      AND timestamp_s < ${timeMSToSeconds(endTime)}
       GROUP BY feature, card_format_enum`;
    const { activityStreamProvider } = lazy.NewTabUtils;
    const interactions = await activityStreamProvider.executePlacesQuery(sql);
    return interactions;
  }

  /**
   * Deletes older data from a table
   *
   * @param {int} preserveAgeDays Number of days to preserve
   * @param {*} table Table to clear
   */
  async clearOldDataOfTable(
    preserveAgeDays,
    table,
    placesUtils = lazy.PlacesUtils
  ) {
    let sql = `DELETE FROM ${table}
      WHERE timestamp_s < ${timeMSToSeconds(this.Date().now()) - preserveAgeDays * DAYS_TO_SECONDS}`;
    try {
      await placesUtils.withConnectionWrapper(
        "newtab/lib/InferredPersonalizationFeed.sys.mjs: clearOldDataOfTable",
        async db => {
          await db.execute(sql);
        }
      );
    } catch (ex) {
      console.error(`Error clearning places data ${ex}`);
    }
  }

  /**
   * Deletes older data from impression and click tables
   *
   * @param {int} preserveAgeDays Number of days to preserve (defaults to 6 months)
   */
  async clearOldData(preserveAgeDays) {
    await this.clearOldDataOfTable(preserveAgeDays, IMPRESSION_TABLE);
    await this.clearOldDataOfTable(preserveAgeDays, CLICK_TABLE);
  }

  async recordInferredPersonalizationInteraction(
    table,
    tile,
    extraClickEvent = false
  ) {
    const timestamp_s = timeMSToSeconds(this.Date().now());
    const card_format_enum = FORMAT[tile.format];
    const position = tile.pos;
    const section_position = tile.section_position || 0;
    let featureValuePairs = [];
    if (extraClickEvent) {
      featureValuePairs.push(["click", 1]);
    }
    if (tile.features) {
      featureValuePairs = featureValuePairs.concat(
        Object.entries(tile.features)
      );
    }
    if (table !== CLICK_TABLE && table !== IMPRESSION_TABLE) {
      return;
    }
    const primaryValues = {
      timestamp_s,
      card_format_enum,
      position,
      section_position,
    };

    const insertValues = featureValuePairs.map(pair =>
      Object.assign({}, primaryValues, {
        feature: pair[0],
        feature_value: pair[1],
      })
    );

    let sql = `
    INSERT INTO ${table}(feature, timestamp_s, card_format_enum, position, section_position, feature_value)
    VALUES (:feature, :timestamp_s, :card_format_enum, :position, :section_position, :feature_value)
    `;
    await lazy.PlacesUtils.withConnectionWrapper(
      "newtab/lib/InferredPersonalizationFeed.sys.mjs: recordInferredPersonalizationImpression",
      async db => {
        await db.execute(sql, insertValues);
      }
    );
  }

  async fetchInferredPersonalizationInteraction(table) {
    if (
      table !== "moz_newtab_story_impression" &&
      table !== "moz_newtab_story_click"
    ) {
      return [];
    }

    let sql = `SELECT feature, timestamp_s, card_format_enum, position, section_position, feature_value
    FROM ${table}`;
    //sql += `WHERE timestamp_s >= ${beginTimeSecs * 1000000}`;
    //sql += `AND timestamp_s < ${endTimeSecs * 1000000}`;

    const { activityStreamProvider } = lazy.NewTabUtils;
    const interactions = await activityStreamProvider.executePlacesQuery(sql);

    return interactions;
  }

  async onPrefChangedAction(action) {
    switch (action.data.name) {
      case PREF_USER_INFERRED_PERSONALIZATION:
      case PREF_SYSTEM_INFERRED_PERSONALIZATION:
        if (this.isEnabled() && action.data.value) {
          await this.loadInterestVector();
        } else {
          await this.reset();
        }
        break;
    }
  }

  async onAction(action) {
    switch (action.type) {
      case at.INIT:
        if (this.isEnabled()) {
          await this.init();
        }
        break;
      case at.UNINIT:
        await this.reset();
        break;
      case at.DISCOVERY_STREAM_DEV_SYSTEM_TICK:
      case at.SYSTEM_TICK:
        if (this.loaded && this.isEnabled()) {
          await this.loadInterestVector();
        }
        break;
      case at.INFERRED_PERSONALIZATION_CLEAR_INTEREST_VECTOR:
        if (this.cache) {
          // Clear the interest vector. It will be recalculated on the next tick if the feature is enabled.
          await this.cache.set("interest_vector", {});
        }
        break;
      case at.INFERRED_PERSONALIZATION_REFRESH:
        if (this.isEnabled()) {
          await this.reset();
          await this.loadInterestVector();
          const features = await this.getDebuggingInterestFeaturesSupported();
          this.store.dispatch(
            ac.BroadcastToContent({
              type: at.INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE,
              data: features,
            })
          );
        }
        break;
      case at.INFERRED_PERSONALIZATION_DEBUG_FEATURES_REQUEST: {
        const features = await this.getDebuggingInterestFeaturesSupported();
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE,
            data: features,
          })
        );
        break;
      }
      case at.INFERRED_PERSONALIZATION_DEBUG_OVERRIDES_SET: {
        await this.setDebuggingInterestFeaturesOverride(action.data);
        const features = await this.getDebuggingInterestFeaturesSupported();
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.INFERRED_PERSONALIZATION_DEBUG_FEATURES_UPDATE,
            data: features,
          })
        );
        break;
      }
      case at.PLACES_HISTORY_CLEARED:
        await this.clearOldData(0);
        break;
      case at.DISCOVERY_STREAM_IMPRESSION_STATS:
        // We have the ability to collect feature impressions when the feature is off
        if (this.isEnabled() || this.isStoreData()) {
          await this.handleDiscoveryStreamImpressionStats(action);
        }
        break;
      case at.DISCOVERY_STREAM_USER_EVENT:
        if (this.isEnabled() || this.isStoreData()) {
          await this.handleDiscoveryStreamUserEvent(action);
        }
        break;
      case at.PREF_CHANGED:
        await this.onPrefChangedAction(action);
        break;
    }
  }
}

/**
 * Creating a thin wrapper around PersistentCache, and Date.
 * This makes it easier for us to write automated tests that simulate responses.
 */
InferredPersonalizationFeed.prototype.PersistentCache = (...args) => {
  return new lazy.PersistentCache(...args);
};
InferredPersonalizationFeed.prototype.Date = () => {
  return Date;
};
