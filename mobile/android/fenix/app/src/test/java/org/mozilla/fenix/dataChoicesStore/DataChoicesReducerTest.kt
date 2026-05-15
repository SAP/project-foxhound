package org.mozilla.fenix.dataChoicesStore

import mozilla.components.lib.crash.store.CrashReportOption
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.settings.datachoices.ChoiceAction
import org.mozilla.fenix.settings.datachoices.DataChoicesState
import org.mozilla.fenix.settings.datachoices.SettingsLoaded
import org.mozilla.fenix.settings.datachoices.StudiesLoaded
import org.mozilla.fenix.settings.datachoices.dataChoicesReducer

class DataChoicesReducerTest {

    private val defaultState = DataChoicesState(
        telemetryEnabled = false,
        measurementDataEnabled = false,
        usagePingEnabled = false,
        studiesEnabled = false,
        selectedCrashOption = CrashReportOption.Ask,
    )

    @Test
    fun `when telemetry is clicked then the state of telemetry is toggled`() {
        val before = defaultState.copy(telemetryEnabled = false)
        val after = dataChoicesReducer(before, ChoiceAction.TelemetryClicked)
        assertEquals(true, after.telemetryEnabled)
    }

    @Test
    fun `when measurement data is clicked then measurementDataEnabled is toggled`() {
        val before = defaultState.copy(measurementDataEnabled = false)
        val after = dataChoicesReducer(before, ChoiceAction.MeasurementDataClicked)
        assertEquals(true, after.measurementDataEnabled)
    }

    @Test
    fun `when usage ping is clicked then usagePingEnabled is toggled`() {
        val before = defaultState.copy(usagePingEnabled = false)
        val after = dataChoicesReducer(before, ChoiceAction.UsagePingClicked)
        assertEquals(true, after.usagePingEnabled)
    }

    @Test
    fun `when a crash report option is selected then the selectedCrashOption is updated`() {
        val before = defaultState.copy(selectedCrashOption = CrashReportOption.Never)
        val after = dataChoicesReducer(before, ChoiceAction.ReportOptionClicked(CrashReportOption.Auto))
        assertEquals(CrashReportOption.Auto, after.selectedCrashOption)
    }

    @Test
    fun `when settings are loaded then the entire settings state is replaced`() {
        val action = SettingsLoaded(
            telemetryEnabled = true,
            usagePingEnabled = true,
            studiesEnabled = true,
            showMeasurementDataSection = true,
            measurementDataEnabled = true,
            crashReportOption = CrashReportOption.Never,
        )
        val after = dataChoicesReducer(defaultState, action)
        assertEquals(true, after.telemetryEnabled)
        assertEquals(true, after.usagePingEnabled)
        assertEquals(true, after.studiesEnabled)
        assertEquals(true, after.showMeasurementDataSection)
        assertEquals(true, after.measurementDataEnabled)
        assertEquals(CrashReportOption.Never, after.selectedCrashOption)
    }

    @Test
    fun `when studies are loaded then studiesEnabled is updated`() {
        val before = defaultState.copy(studiesEnabled = false)
        val after = dataChoicesReducer(before, StudiesLoaded(newValue = true))
        assertEquals(true, after.studiesEnabled)
    }
}
