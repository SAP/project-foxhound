package org.mozilla.fenix.dataChoicesStore

import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.engine.Engine
import mozilla.components.lib.crash.store.CrashReportOption
import mozilla.components.service.nimbus.NimbusApi
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.isNull
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mozilla.fenix.R
import org.mozilla.fenix.components.metrics.MetricController
import org.mozilla.fenix.components.metrics.MetricServiceType
import org.mozilla.fenix.crashes.SettingsCrashReportCache
import org.mozilla.fenix.settings.SupportUtils
import org.mozilla.fenix.settings.datachoices.ChoiceAction
import org.mozilla.fenix.settings.datachoices.DataChoicesMiddleware
import org.mozilla.fenix.settings.datachoices.DataChoicesState
import org.mozilla.fenix.settings.datachoices.DataChoicesStore
import org.mozilla.fenix.settings.datachoices.LearnMore
import org.mozilla.fenix.settings.datachoices.ViewCreated
import org.mozilla.fenix.utils.Settings

@RunWith(AndroidJUnit4::class)
class DataChoicesMiddlewareTest {

    private lateinit var settings: Settings
    private lateinit var nimbus: NimbusApi
    private lateinit var engine: Engine
    private lateinit var metrics: MetricController
    private lateinit var nav: NavController
    private lateinit var learnMore: (SupportUtils.SumoTopic) -> Unit
    private lateinit var crashReportCache: SettingsCrashReportCache

    @Before
    fun setup() {
        settings = mock()
        nimbus = mock()
        engine = mock()
        metrics = mock()
        nav = mock()
        learnMore = mock()
        crashReportCache = mock()
    }

    @Test
    fun `when the view is created then the current state is loaded from cache`() = runTest {
        `when`(settings.isTelemetryEnabled).thenReturn(false)
        `when`(settings.isDailyUsagePingEnabled).thenReturn(false)
        `when`(settings.isExperimentationEnabled).thenReturn(false)
        `when`(settings.isMarketingTelemetryEnabled).thenReturn(false)
        `when`(crashReportCache.getReportOption())
            .thenReturn(CrashReportOption.Auto)

        val store = makeStore(this)

        store.dispatch(ViewCreated)

        testScheduler.advanceUntilIdle()

        assertEquals(false, store.state.telemetryEnabled)
        assertEquals(false, store.state.usagePingEnabled)
        assertEquals(false, store.state.studiesEnabled)
        assertEquals(false, store.state.measurementDataEnabled)
        assertEquals(CrashReportOption.Auto, store.state.selectedCrashOption)
    }

    @Test
    fun `when telemetry is clicked then telemetry and experimentation are toggled and components are notified`() =
        runTest {
            `when`(settings.isTelemetryEnabled).thenReturn(true)
            `when`(settings.isExperimentationEnabled).thenReturn(true)

            val store = makeStore(this)

            store.dispatch(ChoiceAction.TelemetryClicked)

            verify(settings).isTelemetryEnabled = false
            assertEquals(false, store.state.telemetryEnabled)
            verify(settings).isExperimentationEnabled = false
            verify(metrics).stop(MetricServiceType.Data)
            verify(nimbus).resetTelemetryIdentifiers()
            verify(engine).notifyTelemetryPrefChanged(false)
        }

    @Test
    fun `when measurement data is clicked then marketing telemetry is toggled`() = runTest {
        `when`(settings.isMarketingTelemetryEnabled).thenReturn(false)
        val store = makeStore(this)

        store.dispatch(ChoiceAction.MeasurementDataClicked)

        verify(settings).isMarketingTelemetryEnabled = true
        assertEquals(false, store.state.measurementDataEnabled)
        verify(metrics).start(MetricServiceType.Marketing)
    }

    @Test
    fun `when usage ping is clicked then daily usage ping is toggled`() = runTest {
        `when`(settings.isDailyUsagePingEnabled).thenReturn(true)
        val store = makeStore(this)

        store.dispatch(ChoiceAction.UsagePingClicked)

        verify(settings).isDailyUsagePingEnabled = false
        assertEquals(false, store.state.usagePingEnabled)
        verify(metrics).stop(MetricServiceType.UsageReporting)
    }

    @Test
    fun `when a crash report option is selected then it is saved to the crash report cache`() =
        runTest {
            val store = makeStore(this)

            store.dispatch(ChoiceAction.ReportOptionClicked(CrashReportOption.Never))
            testScheduler.advanceUntilIdle()

            verify(crashReportCache).setReportOption(CrashReportOption.Never)
            assertEquals(CrashReportOption.Never, store.state.selectedCrashOption)
        }

    @Test
    fun `when studies is clicked then navigation to the studies screen is triggered`() = runTest {
        val destination = mock(NavDestination::class.java)
        `when`(destination.id).thenReturn(R.id.dataChoicesFragment)
        `when`(nav.currentDestination).thenReturn(destination)

        val store = makeStore(this)
        store.dispatch(ChoiceAction.StudiesClicked)

        val directionsCaptor = argumentCaptor<NavDirections>()
        verify(nav).navigate(directionsCaptor.capture(), isNull<NavOptions>())

        val capturedDirections = directionsCaptor.allValues.first()
        assertEquals(
            R.id.action_dataChoicesFragment_to_studiesFragment,
            capturedDirections.actionId,
        )
    }

    @Test
    fun `when learn more is clicked then the corresponding help topic callback is invoked`() =
        runTest {
            var invokedTopic: SupportUtils.SumoTopic? = null
            val store = makeStore(scope = this) { topic -> invokedTopic = topic }

            store.dispatch(LearnMore.TelemetryLearnMoreClicked)
            assertEquals(SupportUtils.SumoTopic.TECHNICAL_AND_INTERACTION_DATA, invokedTopic)

            store.dispatch(LearnMore.MeasurementDataLearnMoreClicked)
            assertEquals(SupportUtils.SumoTopic.MARKETING_DATA, invokedTopic)

            store.dispatch(LearnMore.CrashLearnMoreClicked)
            assertEquals(SupportUtils.SumoTopic.CRASH_REPORTS, invokedTopic)

            store.dispatch(LearnMore.UsagePingLearnMoreClicked)
            assertEquals(SupportUtils.SumoTopic.USAGE_PING_SETTINGS, invokedTopic)
        }

    private fun makeStore(
        scope: CoroutineScope,
        learnMoreClicked: (SupportUtils.SumoTopic) -> Unit = {},
    ) = DataChoicesStore(
        initialState = DataChoicesState(),
        middleware = listOf(
            DataChoicesMiddleware(
                settings = settings,
                learnMoreClicked = learnMoreClicked,
                nimbusSdk = nimbus,
                engine = engine,
                metrics = metrics,
                navController = nav,
                crashReportCache = crashReportCache,
                scope = scope,
            ),
        ),
    )
}
