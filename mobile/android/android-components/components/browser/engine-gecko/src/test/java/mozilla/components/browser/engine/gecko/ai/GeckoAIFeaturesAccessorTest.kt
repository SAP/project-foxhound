/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ai

import mozilla.components.concept.engine.ai.AIFeaturesError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.MockitoAnnotations
import org.mozilla.geckoview.GeckoResult
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLooper
import kotlin.test.assertIs
import kotlin.test.assertNotNull

@RunWith(RobolectricTestRunner::class)
class GeckoAIFeaturesAccessorTest {

    private lateinit var aiFeaturesAccessor: DefaultGeckoAIFeaturesAccessor

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
        aiFeaturesAccessor = DefaultGeckoAIFeaturesAccessor()
    }

    // Helper to create a successfully resolved GeckoResult
    private fun <T> successfulGeckoResult(value: T?): GeckoResult<T> {
        val result = GeckoResult<T>()
        result.complete(value)
        return result
    }

    // Helper to create a failed GeckoResult
    private fun <T> failedGeckoResult(exception: Throwable): GeckoResult<T> {
        val result = GeckoResult<T>()
        result.completeExceptionally(exception)
        return result
    }

    @Test
    fun `handleGeckoResult with successful GeckoResult and non-null value`() {
        var successValue: String? = null
        var errorValue: AIFeaturesError? = null

        aiFeaturesAccessor.handleGeckoResult(
            successfulGeckoResult("Test Success"),
            onSuccess = { successValue = it },
            onError = { errorValue = it },
        )

        ShadowLooper.idleMainLooper()

        assertEquals("Test Success", successValue)
        assertNull(errorValue)
    }

    @Test
    fun `handleGeckoResult with successful GeckoResult (null value)`() {
        var successValue: String? = "Initial"
        var errorValue: AIFeaturesError? = null

        aiFeaturesAccessor.handleGeckoResult(
            successfulGeckoResult<String>(null),
            onSuccess = { successValue = it },
            onError = { errorValue = it },
        )

        ShadowLooper.idleMainLooper()

        assertEquals("Initial", successValue)
        assertNotNull(errorValue)
        assertIs<AIFeaturesError.UnexpectedNull>(errorValue)
    }

    @Test
    fun `handleGeckoResult with failed GeckoResult`() {
        var successValue: String? = null
        var errorValue: AIFeaturesError? = null
        val exception = RuntimeException("Failure")

        aiFeaturesAccessor.handleGeckoResult(
            failedGeckoResult<String>(exception),
            onSuccess = { successValue = it },
            onError = { errorValue = it },
        )

        ShadowLooper.idleMainLooper()

        assertNull(successValue)
        assertIs<AIFeaturesError.UnknownError>(errorValue)
        assertEquals(exception, (errorValue as AIFeaturesError.UnknownError).cause)
    }

    @Test
    fun `handleVoidGeckoResult with successful GeckoResult calls onSuccess`() {
        var successCalled = false
        var errorValue: AIFeaturesError? = null

        aiFeaturesAccessor.handleVoidGeckoResult(
            successfulGeckoResult(Unit),
            onSuccess = { successCalled = true },
            onError = { errorValue = it },
        )

        ShadowLooper.idleMainLooper()

        assertTrue(successCalled)
        assertNull(errorValue)
    }

    @Test
    fun `handleVoidGeckoResult with failed GeckoResult calls onError`() {
        var successCalled = false
        var errorValue: AIFeaturesError? = null
        val exception = RuntimeException("Failure")

        aiFeaturesAccessor.handleVoidGeckoResult(
            failedGeckoResult<Unit>(exception),
            onSuccess = { successCalled = true },
            onError = { errorValue = it },
        )

        ShadowLooper.idleMainLooper()

        assertTrue(!successCalled)
        assertIs<AIFeaturesError.UnknownError>(errorValue)
    }
}
