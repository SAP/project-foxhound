/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ai

import androidx.annotation.OptIn
import mozilla.components.browser.engine.gecko.ai.GeckoAIFeaturesUtils.intoAIFeaturesError
import mozilla.components.concept.engine.ai.AIFeature
import mozilla.components.concept.engine.ai.AIFeaturesError
import mozilla.components.concept.engine.ai.AIFeaturesRuntime
import org.mozilla.geckoview.AIFeaturesController
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.GeckoResult

/**
 * Wrapper around the static methods of [AIFeaturesController.RuntimeAIFeatures] to allow
 * the implementation to be swapped out in tests.
 */
interface GeckoAIFeaturesAccessor : AIFeaturesRuntime

/**
 * Default implementation of [GeckoAIFeaturesAccessor].
 *
 * This class directly relays calls to the static methods of
 * [AIFeaturesController.RuntimeAIFeatures] in GeckoView.
 */
@OptIn(ExperimentalGeckoViewApi::class)
internal class DefaultGeckoAIFeaturesAccessor : GeckoAIFeaturesAccessor {

    /**
     * Handles the result of a [GeckoResult] operation.
     *
     * @param T The type of the successful result value.
     * @param geckoResult The [GeckoResult] to handle.
     * @param onSuccess Callback invoked if the operation succeeds with a non-null value.
     * @param onError Callback invoked if the operation fails or if the successful result is null.
     */
    internal fun <T : Any> handleGeckoResult(
        geckoResult: GeckoResult<T>,
        onSuccess: (T) -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ) {
        geckoResult.then(
            { value: T? ->
                if (value != null) {
                    onSuccess(value)
                } else {
                    onError(AIFeaturesError.UnexpectedNull())
                }
                GeckoResult<Void>()
            },
            { throwable ->
                onError(throwable.intoAIFeaturesError())
                GeckoResult<Void>()
            },
        )
    }

    /**
     * Handles the result of a [GeckoResult] operation that does not produce a value (i.e., `Void`).
     *
     * @param TVoid The type of the result, typically `Void` indicating no meaningful value.
     * @param geckoResult The [GeckoResult] to handle.
     * @param onSuccess Callback invoked if the operation succeeds.
     * @param onError Callback invoked if the operation fails.
     */
    internal fun <TVoid> handleVoidGeckoResult(
        geckoResult: GeckoResult<TVoid>,
        onSuccess: () -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ) {
        geckoResult.then(
            { _ ->
                onSuccess()
                GeckoResult<Void>()
            },
            { throwable ->
                onError(throwable.intoAIFeaturesError())
                GeckoResult<Void>()
            },
        )
    }

    /** See [AIFeaturesRuntime.listFeatures]. Maps the GeckoView response into [AIFeature] objects. */
    override fun listFeatures(
        onSuccess: (Map<String, AIFeature>) -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ) {
        handleGeckoResult(
            AIFeaturesController.RuntimeAIFeatures.listFeatures(),
            onSuccess = { geckoMap ->
                onSuccess(
                    geckoMap.mapValues { (_, feature) ->
                        AIFeature(
                            id = feature.id,
                            isEnabled = feature.isEnabled,
                            isAllowed = feature.isAllowed,
                            isBlocked = feature.isBlocked,
                        )
                    },
                )
            },
            onError = onError,
        )
    }

    /** See [AIFeaturesRuntime.setFeatureEnablement]. */
    override fun setFeatureEnablement(
        featureId: String,
        isEnabled: Boolean,
        onSuccess: () -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ) {
        handleVoidGeckoResult(
            AIFeaturesController.RuntimeAIFeatures.setFeatureEnablement(featureId, isEnabled),
            onSuccess,
            onError,
        )
    }

    /** See [AIFeaturesRuntime.makeFeatureAvailable]. */
    override fun makeFeatureAvailable(
        featureId: String,
        onSuccess: () -> Unit,
        onError: (AIFeaturesError) -> Unit,
    ) {
        handleVoidGeckoResult(
            AIFeaturesController.RuntimeAIFeatures.makeFeatureAvailable(featureId),
            onSuccess,
            onError,
        )
    }
}
