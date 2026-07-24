/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.datachoices

internal fun dataChoicesReducer(state: DataChoicesState, action: DataChoicesAction) = when (action) {
    is ChoiceAction.TelemetryClicked -> {
        state.copy(
            telemetryEnabled = !state.telemetryEnabled,
        )
    }
    is ChoiceAction.MeasurementDataClicked -> {
        state.copy(measurementDataEnabled = !state.measurementDataEnabled)
    }
    is ChoiceAction.UsagePingClicked -> {
        state.copy(usagePingEnabled = !state.usagePingEnabled)
    }
    is ChoiceAction.ReportOptionClicked -> {
        state.copy(selectedCrashOption = action.reportOption)
    }
    is SettingsLoaded ->
        state.copy(
            telemetryEnabled = action.telemetryEnabled,
            usagePingEnabled = action.usagePingEnabled,
            studiesEnabled = action.studiesEnabled,
            showMeasurementDataSection = action.showMeasurementDataSection,
            measurementDataEnabled = action.measurementDataEnabled,
            selectedCrashOption = action.crashReportOption,
        )
    is StudiesLoaded -> {
        state.copy(studiesEnabled = action.newValue)
    }
    LearnMore.CrashLearnMoreClicked,
    LearnMore.MeasurementDataLearnMoreClicked,
    LearnMore.TelemetryLearnMoreClicked,
    LearnMore.UsagePingLearnMoreClicked,
    is ChoiceAction.StudiesClicked,
    is ViewCreated,
    -> { state }
}
