/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.engine.gecko.ai.GeckoAIFeaturesAccessor
import mozilla.components.concept.engine.ai.AIFeature
import mozilla.components.concept.engine.ai.AIFeaturesError
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.whenever
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyBoolean
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mozilla.geckoview.GeckoRuntime

@RunWith(AndroidJUnit4::class)
class GeckoEngineAIFeaturesTest {

    private lateinit var runtime: GeckoRuntime
    private lateinit var aiFeaturesAccessor: GeckoAIFeaturesAccessor
    private lateinit var engine: GeckoEngine

    @Before
    fun setup() {
        runtime = mock()
        whenever(runtime.settings).thenReturn(mock())
        aiFeaturesAccessor = mock()
        engine = GeckoEngine(testContext, runtime = runtime, aiFeatures = aiFeaturesAccessor)
    }

    @Test
    fun `WHEN listFeatures is called successfully THEN onSuccess is called`() {
        var onSuccessCalled = false
        var onErrorCalled = false

        val features = mapOf("translations" to AIFeature(id = "translations", isEnabled = true, isAllowed = true, isBlocked = false))

        val onSuccess: (Map<String, AIFeature>) -> Unit = { onSuccessCalled = true }
        val onError: (AIFeaturesError) -> Unit = { onErrorCalled = true }

        `when`(aiFeaturesAccessor.listFeatures(onSuccess, onError))
            .thenAnswer {
                onSuccess.invoke(features)
            }

        engine.aiFeatures.listFeatures(onSuccess = onSuccess, onError = onError)

        verify(aiFeaturesAccessor).listFeatures(onSuccess = onSuccess, onError = onError)
        assertTrue(onSuccessCalled)
        assertFalse(onErrorCalled)
    }

    @Test
    fun `WHEN listFeatures is called AND excepts THEN onError is called`() {
        var onSuccessCalled = false
        var onErrorCalled = false

        val onSuccess: (Map<String, AIFeature>) -> Unit = { onSuccessCalled = true }
        val onError: (AIFeaturesError) -> Unit = { onErrorCalled = true }

        `when`(aiFeaturesAccessor.listFeatures(onSuccess, onError))
            .thenAnswer {
                onError.invoke(AIFeaturesError.UnknownError(Exception()))
            }

        engine.aiFeatures.listFeatures(onSuccess = onSuccess, onError = onError)

        verify(aiFeaturesAccessor).listFeatures(onSuccess = onSuccess, onError = onError)
        assertFalse(onSuccessCalled)
        assertTrue(onErrorCalled)
    }

    @Test
    fun `WHEN setFeatureEnablement is called successfully THEN onSuccess is called`() {
        var onSuccessCalled = false
        var onErrorCalled = false

        val onSuccess: () -> Unit = { onSuccessCalled = true }
        val onError: (AIFeaturesError) -> Unit = { onErrorCalled = true }

        `when`(
            aiFeaturesAccessor.setFeatureEnablement(
                any(),
                anyBoolean(),
                eq(onSuccess),
                eq(onError),
            ),
        ).thenAnswer {
            onSuccess.invoke()
        }

        engine.aiFeatures.setFeatureEnablement(featureId = "translations", isEnabled = true, onSuccess = onSuccess, onError = onError)

        verify(aiFeaturesAccessor).setFeatureEnablement(featureId = "translations", isEnabled = true, onSuccess = onSuccess, onError = onError)
        assertTrue(onSuccessCalled)
        assertFalse(onErrorCalled)
    }

    @Test
    fun `WHEN setFeatureEnablement is called AND excepts THEN onError is called`() {
        var onSuccessCalled = false
        var onErrorCalled = false

        val onSuccess: () -> Unit = { onSuccessCalled = true }
        val onError: (AIFeaturesError) -> Unit = { onErrorCalled = true }

        `when`(
            aiFeaturesAccessor.setFeatureEnablement(
                any(),
                anyBoolean(),
                eq(onSuccess),
                eq(onError),
            ),
        ).thenAnswer {
            onError.invoke(AIFeaturesError.CouldNotSetError(null))
        }

        engine.aiFeatures.setFeatureEnablement(featureId = "translations", isEnabled = false, onSuccess = onSuccess, onError = onError)

        verify(aiFeaturesAccessor).setFeatureEnablement(featureId = "translations", isEnabled = false, onSuccess = onSuccess, onError = onError)
        assertFalse(onSuccessCalled)
        assertTrue(onErrorCalled)
    }

    @Test
    fun `WHEN makeFeatureAvailable is called successfully THEN onSuccess is called`() {
        var onSuccessCalled = false
        var onErrorCalled = false

        val onSuccess: () -> Unit = { onSuccessCalled = true }
        val onError: (AIFeaturesError) -> Unit = { onErrorCalled = true }

        `when`(
            aiFeaturesAccessor.makeFeatureAvailable(
                any(),
                eq(onSuccess),
                eq(onError),
            ),
        ).thenAnswer {
            onSuccess.invoke()
        }

        engine.aiFeatures.makeFeatureAvailable(featureId = "translations", onSuccess = onSuccess, onError = onError)

        verify(aiFeaturesAccessor).makeFeatureAvailable(featureId = "translations", onSuccess = onSuccess, onError = onError)
        assertTrue(onSuccessCalled)
        assertFalse(onErrorCalled)
    }

    @Test
    fun `WHEN makeFeatureAvailable is called AND excepts THEN onError is called`() {
        var onSuccessCalled = false
        var onErrorCalled = false

        val onSuccess: () -> Unit = { onSuccessCalled = true }
        val onError: (AIFeaturesError) -> Unit = { onErrorCalled = true }

        `when`(
            aiFeaturesAccessor.makeFeatureAvailable(
                any(),
                eq(onSuccess),
                eq(onError),
            ),
        ).thenAnswer {
            onError.invoke(AIFeaturesError.CouldNotMakeAvailableError(null))
        }

        engine.aiFeatures.makeFeatureAvailable(featureId = "translations", onSuccess = onSuccess, onError = onError)

        verify(aiFeaturesAccessor).makeFeatureAvailable(featureId = "translations", onSuccess = onSuccess, onError = onError)
        assertFalse(onSuccessCalled)
        assertTrue(onErrorCalled)
    }
}
