/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.datachoices

import mozilla.components.lib.crash.store.CrashReportOption
import mozilla.components.lib.state.Action

internal sealed interface DataChoicesAction : Action

internal data object ViewCreated : DataChoicesAction

internal sealed class ChoiceAction : DataChoicesAction {
    data object TelemetryClicked : ChoiceAction()
    data object UsagePingClicked : ChoiceAction()
    data object StudiesClicked : ChoiceAction()
    data object MeasurementDataClicked : ChoiceAction()
    data class ReportOptionClicked(val reportOption: CrashReportOption) : DataChoicesAction
}

internal sealed class LearnMore : DataChoicesAction {
    data object TelemetryLearnMoreClicked : LearnMore()
    data object UsagePingLearnMoreClicked : LearnMore()
    data object CrashLearnMoreClicked : LearnMore()
    data object MeasurementDataLearnMoreClicked : LearnMore()
}

internal data class SettingsLoaded(
    val telemetryEnabled: Boolean,
    val usagePingEnabled: Boolean,
    val studiesEnabled: Boolean,
    val showMeasurementDataSection: Boolean,
    val measurementDataEnabled: Boolean,
    val crashReportOption: CrashReportOption,
) : DataChoicesAction

internal data class StudiesLoaded(val newValue: Boolean) : DataChoicesAction
