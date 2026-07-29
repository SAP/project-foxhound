/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ai

import mozilla.components.browser.engine.gecko.ai.GeckoAIFeaturesUtils.intoAIFeaturesError
import mozilla.components.concept.engine.ai.AIFeaturesError
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_COULD_NOT_MAKE_AVAILABLE
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_COULD_NOT_PARSE
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_COULD_NOT_SET
import org.mozilla.geckoview.AIFeaturesController.AIFeaturesException.ERROR_UNKNOWN_FEATURE
import org.robolectric.RobolectricTestRunner
import kotlin.test.assertIs

@RunWith(RobolectricTestRunner::class)
class GeckoAIFeaturesUtilsTest {

    @Test
    fun `intoAIFeaturesError maps AIFeaturesException correctly`() {
        val couldNotParseException =
            AIFeaturesException(ERROR_COULD_NOT_PARSE)
        val error1 = couldNotParseException.intoAIFeaturesError()
        assertIs<AIFeaturesError.CouldNotParseError>(error1)
        assertEquals(couldNotParseException, error1.cause)

        val unknownFeatureException =
            AIFeaturesException(ERROR_UNKNOWN_FEATURE)
        val error2 = unknownFeatureException.intoAIFeaturesError()
        assertIs<AIFeaturesError.UnknownFeatureError>(error2)
        assertEquals(unknownFeatureException, error2.cause)

        val couldNotSetException =
            AIFeaturesException(ERROR_COULD_NOT_SET)
        val error3 = couldNotSetException.intoAIFeaturesError()
        assertIs<AIFeaturesError.CouldNotSetError>(error3)
        assertEquals(couldNotSetException, error3.cause)

        val couldNotMakeAvailableException =
            AIFeaturesException(ERROR_COULD_NOT_MAKE_AVAILABLE)
        val error4 = couldNotMakeAvailableException.intoAIFeaturesError()
        assertIs<AIFeaturesError.CouldNotMakeAvailableError>(error4)
        assertEquals(couldNotMakeAvailableException, error4.cause)

        val unknownCodeException = AIFeaturesException(999)
        val error5 = unknownCodeException.intoAIFeaturesError()
        assertIs<AIFeaturesError.UnknownError>(error5)
        assertEquals(unknownCodeException, error5.cause)
    }

    @Test
    fun `intoAIFeaturesError maps generic exception to UnknownError`() {
        val genericException = RuntimeException("Some other error")

        val error = genericException.intoAIFeaturesError()

        assertIs<AIFeaturesError.UnknownError>(error)
        assertEquals(genericException, error.cause)
    }
}
