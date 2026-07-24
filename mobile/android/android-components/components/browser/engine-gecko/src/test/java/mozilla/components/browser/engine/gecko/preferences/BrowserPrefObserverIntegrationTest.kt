package mozilla.components.browser.engine.gecko.preferences

import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.preferences.BrowserPreference
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import org.junit.Test
import org.mockito.ArgumentMatchers.anyList
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.verify

class BrowserPrefObserverIntegrationTest {

    @Test
    fun `WHEN the feature starts THEN register itself as the browser preference delegate`() {
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)

        feature.start()

        verify(engine).registerPrefObserverDelegate(feature)
    }

    @Test
    fun `WHEN the feature stops THEN unregister itself as the browser preference delegate`() {
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)

        feature.stop()

        verify(engine).unregisterPrefObserverDelegate()
    }

    @Test
    fun `WHEN registerPrefForObservation THEN the engine method is invoked`() {
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)

        val onSuccess: () -> Unit = {}
        val onError: (Throwable) -> Unit = {}
        feature.registerPrefForObservation(
            "test.item",
            onSuccess,
            onError,
        )

        verify(engine)
            .registerPrefForObservation(anyString(), any(), any())
    }

    @Test
    fun `WHEN registerPrefsForObservation THEN the engine method is invoked`() {
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)

        val onSuccess: () -> Unit = {}
        val onError: (Throwable) -> Unit = {}
        feature.registerPrefsForObservation(
            listOf("test.item"),
            onSuccess,
            onError,
        )

        verify(engine)
            .registerPrefsForObservation(anyList<String>(), any(), any())
    }

    @Test
    fun `WHEN unregisterPrefForObservation THEN the engine method is invoked`() {
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)

        val onSuccess: () -> Unit = {}
        val onError: (Throwable) -> Unit = {}
        feature.unregisterPrefForObservation(
            "test.item",
            onSuccess,
            onError,
        )

        verify(engine)
            .unregisterPrefForObservation(anyString(), any(), any())
    }

    @Test
    fun `WHEN unregisterPrefsForObservation THEN the engine method is invoked`() {
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)

        val onSuccess: () -> Unit = {}
        val onError: (Throwable) -> Unit = {}
        feature.unregisterPrefsForObservation(
            listOf("test.item"),
            onSuccess,
            onError,
        )

        verify(engine)
            .unregisterPrefsForObservation(anyList<String>(), any(), any())
    }

    @Test
    fun `WHEN onOfferTranslate is called THEN notify onTranslateOffer`() {
        var onPreferenceChangeWasCalled = false
        val engine = mock<Engine>()
        val feature = BrowserPrefObserverIntegration(engine)
        feature.start()

        feature.register(
            object : BrowserPrefObserverIntegration.Observer {
                override fun onPreferenceChange(observedPreference: BrowserPreference<*>) {
                    onPreferenceChangeWasCalled = true
                }
            },
        )

        val pref = BrowserPreference(
            "hello-world",
            value = true,
            defaultValue = false,
            userValue = true,
            hasUserChangedValue = true,
        )
        feature.onPreferenceChange(pref)
        assert(onPreferenceChangeWasCalled)
    }
}
