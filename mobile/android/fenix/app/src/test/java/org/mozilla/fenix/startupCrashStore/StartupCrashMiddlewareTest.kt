package org.mozilla.fenix.startupCrashStore

import android.text.format.DateUtils
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.CrashReporter
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyLong
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mozilla.fenix.startupCrash.NoTapped
import org.mozilla.fenix.startupCrash.ReopenTapped
import org.mozilla.fenix.startupCrash.ReportTapped
import org.mozilla.fenix.startupCrash.StartupCrashMiddleware
import org.mozilla.fenix.startupCrash.StartupCrashState
import org.mozilla.fenix.startupCrash.StartupCrashStore
import org.mozilla.fenix.startupCrash.UiState
import org.mozilla.fenix.utils.Settings

private const val FIVE_DAYS_IN_MILLIS = DateUtils.DAY_IN_MILLIS * 5

@OptIn(ExperimentalCoroutinesApi::class) // advanceUntilIdle
@RunWith(AndroidJUnit4::class)
class StartupCrashMiddlewareTest {

    private lateinit var settings: Settings
    private lateinit var crashReporter: CrashReporter

    @Before
    fun setup() {
        settings = mock()
        crashReporter = mock()
    }

    @Test
    fun `when Report is tapped then unsent crash reports are submitted and FenixReady is dispatched`() = runTest {
        val crash = Crash.NativeCodeCrash(
            timestamp = 1755089858034L,
            minidumpPath = null,
            extrasPath = null,
            processVisibility = null,
            processType = null,
            breadcrumbs = arrayListOf(),
            remoteType = null,
        )

        `when`(crashReporter.unsentCrashReportsSince(anyLong())).thenReturn(listOf(crash))
        `when`(crashReporter.submitReport(any(), any())).thenReturn(CompletableDeferred(Unit))

        val store = makeStore(scope = this).first

        store.dispatch(ReportTapped)
        advanceUntilIdle()

        val crashCaptor = argumentCaptor<Crash>()
        verify(crashReporter).unsentCrashReportsSince(anyLong())
        verify(crashReporter).submitReport(crashCaptor.capture(), any())
        assertEquals(crash, crashCaptor.value)

        assertEquals(UiState.Finished, store.state.uiState)
    }

    @Test
    fun `when No is tapped then crash defer period is set and FenixReady is dispatched`() = runTest {
        val currentTime = System.currentTimeMillis()

        val store = makeStore(currentTime = { currentTime }, scope = this).first

        store.dispatch(NoTapped)
        advanceUntilIdle()

        verify(settings).crashReportDeferredUntil = currentTime + FIVE_DAYS_IN_MILLIS
        assertEquals(UiState.Finished, store.state.uiState)
    }

    @Test
    fun `when Reopen is tapped then initAndRestart handler is invoked and state is unchanged`() = runTest {
        val storeAndFlag = makeStore(scope = this)

        val store = storeAndFlag.first
        val initAndRestartInvoked = storeAndFlag.second

        val before = store.state
        store.dispatch(ReopenTapped)
        advanceUntilIdle()

        assertEquals(true, initAndRestartInvoked())
        assertEquals(before, store.state)
    }

    private fun makeStore(
        currentTime: () -> Long = { System.currentTimeMillis() },
        scope: TestScope,
    ): Pair<StartupCrashStore, () -> Boolean> {
        var called = false
        val middleware = StartupCrashMiddleware(
            settings = settings,
            crashReporter = crashReporter,
            restartHandler = { called = true },
            currentTimeInMillis = currentTime,
            scope = scope,
        )

        return StartupCrashStore(
            initialState = StartupCrashState(UiState.Idle),
            middleware = listOf(middleware),
        ) to { called }
    }
}
