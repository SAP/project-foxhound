/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ai

import androidx.annotation.OptIn
import mozilla.components.concept.engine.ai.AIFeaturesError
import org.mozilla.geckoview.AIFeaturesController
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_COULD_NOT_MAKE_AVAILABLE
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_COULD_NOT_PARSE
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_COULD_NOT_SET
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_UNKNOWN_FEATURE
import org.mozilla.geckoview.ExperimentalGeckoViewApi

/**
 * Utility object for AI features functions related to the Gecko implementation.
 */
@OptIn(ExperimentalGeckoViewApi::class)
object GeckoAIFeaturesUtils {

    /**
     * Convenience method for mapping an [AIFeaturesController.AIFeaturesException] to the
     * Android Components defined error type of [AIFeaturesError].
     *
     * Throwable is the engine throwable that occurred. Ordinarily should be
     * an [AIFeaturesController.AIFeaturesException].
     */
    fun Throwable.intoAIFeaturesError(): AIFeaturesError {
        return if (this is AIFeaturesController.AIFeaturesException) {
            when (code) {
                ERROR_COULD_NOT_PARSE ->
                    AIFeaturesError.CouldNotParseError(this)

                ERROR_UNKNOWN_FEATURE ->
                    AIFeaturesError.UnknownFeatureError(this)

                ERROR_COULD_NOT_SET ->
                    AIFeaturesError.CouldNotSetError(this)

                ERROR_COULD_NOT_MAKE_AVAILABLE ->
                    AIFeaturesError.CouldNotMakeAvailableError(this)

                else -> AIFeaturesError.UnknownError(this)
            }
        } else {
            AIFeaturesError.UnknownError(this)
        }
    }
}
