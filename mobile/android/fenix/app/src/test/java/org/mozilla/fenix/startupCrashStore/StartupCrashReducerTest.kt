package org.mozilla.fenix.startupCrashStore

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.startupCrash.CrashReportCompleted
import org.mozilla.fenix.startupCrash.NoTapped
import org.mozilla.fenix.startupCrash.ReopenTapped
import org.mozilla.fenix.startupCrash.ReportTapped
import org.mozilla.fenix.startupCrash.StartupCrashState
import org.mozilla.fenix.startupCrash.UiState
import org.mozilla.fenix.startupCrash.startupCrashReducer

class StartupCrashReducerTest {

    private val defaultState = StartupCrashState(
        uiState = UiState.Idle,
    )

    @Test
    fun `when No is tapped then uiState is set to Loading`() {
        val before = defaultState.copy(uiState = UiState.Idle)
        val after = startupCrashReducer(before, NoTapped)
        assertEquals(UiState.Finished, after.uiState)
    }

    @Test
    fun `when Report is tapped then uiState is set to Loading`() {
        val before = defaultState.copy(uiState = UiState.Idle)
        val after = startupCrashReducer(before, ReportTapped)
        assertEquals(UiState.Loading, after.uiState)
    }

    @Test
    fun `when the crash report is sent then uiState is set to Finished`() {
        val before = defaultState.copy(uiState = UiState.Loading)
        val after = startupCrashReducer(before, CrashReportCompleted)
        assertEquals(UiState.Finished, after.uiState)
    }

    @Test
    fun `when Reopen is tapped then the state remains unchanged`() {
        val before = defaultState.copy(uiState = UiState.Finished)
        val after = startupCrashReducer(before, ReopenTapped)
        assertEquals(before, after)
    }
}
