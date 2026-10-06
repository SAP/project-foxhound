/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.ai

private const val UNSUPPORTED_ERROR = "AI Feature support is not available in this engine."

/**
 * Entry point for interacting with runtime AI features.
 */
interface AIFeaturesRuntime {

    /**
     * Retrieves a map of all known AI features and their current state, keyed by feature ID.
     *
     * @param onSuccess Callback invoked with the map of feature ID to [AIFeature].
     * @param onError Callback invoked if an issue occurred when listing.
     */
    fun listFeatures(
        onSuccess: (Map<String, AIFeature>) -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ): Unit = onError(AIFeaturesError.UnsupportedError(UnsupportedOperationException(UNSUPPORTED_ERROR)))

    /**
     * Enables or blocks the specified AI feature.
     *
     * @param featureId The identifier of the AI feature. May be found through [listFeatures].
     * @param isEnabled True to enable the feature, false to block it.
     * @param onSuccess Callback invoked on successful set.
     * @param onError Callback invoked if an issue occurred.
     */
    fun setFeatureEnablement(
        featureId: String,
        isEnabled: Boolean,
        onSuccess: () -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ): Unit = onError(AIFeaturesError.UnsupportedError(UnsupportedOperationException(UNSUPPORTED_ERROR)))

    /**
     * Makes the given AI feature available (resets to default state).
     *
     * @param featureId The identifier of the AI feature.
     * May be found through [listFeatures].
     * @param onSuccess Callback invoked on successful call.
     * @param onError Callback invoked if an issue occurred.
     */
    fun makeFeatureAvailable(
        featureId: String,
        onSuccess: () -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ): Unit = onError(AIFeaturesError.UnsupportedError(UnsupportedOperationException(UNSUPPORTED_ERROR)))
}
