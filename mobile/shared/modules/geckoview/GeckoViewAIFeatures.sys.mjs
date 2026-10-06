/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TranslationsFeature:
    "chrome://global/content/translations/TranslationsFeature.sys.mjs",
});

/**
 * Android supported AI feature Ids.
 *
 * Bug 2020367: Ideally, this list will be generated or centralized by toolkit in the future.
 */
const ANDROID_AI_FEATURE_IDS = ["translations"];

/**
 * Get an {@link AIFeature} object for a feature id.
 *
 * @param {string} featureId The feature id
 * @returns {typeof AIFeature}
 */
function getAIFeature(featureId) {
  switch (featureId) {
    case "translations":
      return lazy.TranslationsFeature;
    default:
      return null;
  }
}

export const GeckoViewAIFeatures = {
  onEvent(aEvent, aData, aCallback) {
    switch (aEvent) {
      case "GeckoView:AIFeature:ListFeatures": {
        aCallback.onSuccess({
          features: ANDROID_AI_FEATURE_IDS.map(featureId => {
            const feature = getAIFeature(featureId);
            return {
              featureId,
              isEnabled: feature.isEnabled,
              isAllowed: feature.isAllowed,
              isBlocked: feature.isBlocked,
            };
          }),
        });
        break;
      }
      case "GeckoView:AIFeature:SetEnabled": {
        const feature = getAIFeature(aData.featureId);
        if (!feature) {
          aCallback.onError(`Unknown AI feature: '${aData.featureId}'`);
          return;
        }
        (aData.isEnabled ? feature.enable() : feature.block()).then(
          () => aCallback.onSuccess(),
          error =>
            aCallback.onError(
              `Could not set ${aData.featureId} to enabled: ${aData.enabled} error: ${error}`
            )
        );
        break;
      }
      case "GeckoView:AIFeature:MakeAvailable": {
        const feature = getAIFeature(aData.featureId);
        if (!feature) {
          aCallback.onError(`Unknown AI feature: ${aData.featureId}`);
          return;
        }
        feature.makeAvailable().then(
          () => aCallback.onSuccess(),
          error =>
            aCallback.onError(
              `Could not make ${aData.featureId} available error: ${error}`
            )
        );
        break;
      }
    }
  },
};
