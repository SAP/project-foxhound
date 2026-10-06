/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  openAIEngine,
  selectMainConfig,
  MODEL_PREF,
  FEATURE_MAJOR_VERSIONS,
  MODEL_FEATURES,
  PURPOSES,
  SERVICE_TYPES,
} from "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs";

const CUSTOM_PROMPTS_PREF = "browser.smartwindow.customPrompts";
const MODEL_CHOICE_PREF = "browser.smartwindow.firstrun.modelChoice";

export const DEFAULT_PURPOSE = "default";
export const FEATURE_PURPOSES = Object.freeze({
  DEFAULT_PURPOSE: PURPOSES.CHAT,
  [MODEL_FEATURES.CHAT]: PURPOSES.CHAT,
  [MODEL_FEATURES.CONVERSATION_SUGGESTIONS_SIDEBAR_STARTER]:
    PURPOSES.CONVERSATION_STARTERS_SIDEBAR,
  [MODEL_FEATURES.CONVERSATION_SUGGESTIONS_FOLLOWUP]:
    PURPOSES.CONVERSATION_STARTERS_SIDEBAR,
  [MODEL_FEATURES.TITLE_GENERATION]: PURPOSES.TITLE_GENERATION,
  [MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM]:
    PURPOSES.MEMORY_GENERATION,
  [MODEL_FEATURES.MEMORIES_MESSAGE_CLASSIFICATION_SYSTEM]:
    PURPOSES.MEMORY_GENERATION,
});

function getDefaultServiceType(feature) {
  if (feature.startsWith("memories")) {
    return SERVICE_TYPES.MEMORIES;
  }
  return SERVICE_TYPES.AI;
}

/**
 * Reads Remote Settings and runs model-selection logic to pick the single
 * config record for a feature. Throws if no records exist for the feature or
 * if no record matches the current major version / model-choice prefs.
 *
 * @param {string} feature - Feature identifier from MODEL_FEATURES
 * @param {object} [opts]
 * @param {number} [opts.majorVersionOverride] - Override the hardcoded major version
 * @param {string} [opts.modelChoiceIdOverride] - Override the user's model-choice pref (used by per-conversation model switching)
 * @returns {Promise<object>} The selected Remote Settings record
 */
async function selectFeatureConfig(feature, opts = {}) {
  const client = openAIEngine.getRemoteClient();
  const allRecords = await client.get();

  const featureConfigs = allRecords.filter(r => r.feature === feature);
  if (!featureConfigs.length) {
    const err = new Error(
      `No Remote Settings records found for feature: ${feature}`
    );
    err.clientReason = "remoteSettingsUnavailable";
    throw err;
  }

  const majorVersion =
    opts.majorVersionOverride ?? FEATURE_MAJOR_VERSIONS[feature];
  const userModel = Services.prefs.prefHasUserValue(MODEL_PREF)
    ? Services.prefs.getStringPref(MODEL_PREF, "")
    : "";
  const modelChoiceId =
    opts.modelChoiceIdOverride ??
    Services.prefs.getStringPref(MODEL_CHOICE_PREF, "");

  const mainConfig = selectMainConfig(featureConfigs, {
    majorVersion,
    userModel,
    modelChoiceId,
    feature,
  });

  if (!mainConfig) {
    const err = new Error(
      `No matching model config found for feature: ${feature} with major version ${majorVersion}`
    );
    err.clientReason = "modelConfigUnavailable";
    throw err;
  }

  return mainConfig;
}

/**
 * Loads the call context (model, parameters, serviceType, purpose) for a feature.
 *
 * @param {string} feature - Feature identifier from MODEL_FEATURES
 * @param {object} [opts]
 * @param {number} [opts.majorVersionOverride] - Override the hardcoded major version
 * @param {string} [opts.modelChoiceIdOverride] - Override the user's model-choice pref
 * @returns {Promise<{model: string, parameters: object, serviceType: string, purpose: string}>}
 */
export async function loadCallContext(feature, opts = {}) {
  const mainConfig = await selectFeatureConfig(feature, opts);

  let parameters = mainConfig.parameters ?? {};
  if (typeof parameters === "string") {
    try {
      parameters = JSON.parse(parameters);
    } catch (_e) {
      parameters = {};
    }
  }

  return {
    model: mainConfig.model,
    parameters,
    serviceType: mainConfig.service_type ?? getDefaultServiceType(feature),
    purpose:
      mainConfig.purpose ??
      FEATURE_PURPOSES[feature] ??
      FEATURE_PURPOSES[DEFAULT_PURPOSE],
  };
}

/**
 * Loads the prompt text for a feature. Honors the
 * `browser.smartwindow.customPrompts` pref override.
 *
 * @param {string} feature - Feature identifier from MODEL_FEATURES
 * @param {object} [opts]
 * @param {string} [opts.modelChoiceIdOverride] - Override the user's model-choice pref
 * @returns {Promise<string>} The prompt text
 */
export async function loadPrompt(feature, opts = {}) {
  const customPromptsRaw = Services.prefs.getStringPref(
    CUSTOM_PROMPTS_PREF,
    ""
  );
  if (customPromptsRaw) {
    try {
      const override = JSON.parse(customPromptsRaw)?.[feature];
      if (override) {
        return { prompt: override, version: "" };
      }
    } catch (_e) {
      // invalid JSON — fall through to RS
    }
  }

  const mainConfig = await selectFeatureConfig(feature, opts);
  if (!mainConfig.prompts) {
    const err = new Error(`No prompts field in record for feature: ${feature}`);
    err.clientReason = "promptLoadFailure";
    throw err;
  }
  return { prompt: mainConfig.prompts, version: mainConfig.version };
}
