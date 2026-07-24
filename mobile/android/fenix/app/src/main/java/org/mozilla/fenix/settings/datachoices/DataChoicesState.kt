/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.datachoices

import mozilla.components.lib.crash.store.CrashReportOption
import mozilla.components.lib.state.State

/**
 * Represents the state of the data collections screen
 *
 * @property telemetryEnabled Whether telemetry data collection is enabled.
 * @property usagePingEnabled Whether usage pings are sent.
 * @property studiesEnabled The user's preference for participation in studies or experiments.
 * @property showMeasurementDataSection Whether the UI section related to measurement data should be visible.
 * @property measurementDataEnabled The user's preference for sending of measurement data.
 * @property selectedCrashOption The user's selected preference for handling crash reports.
 */
internal data class DataChoicesState(
    val telemetryEnabled: Boolean = true,
    val usagePingEnabled: Boolean = true,
    val studiesEnabled: Boolean = true,
    val showMeasurementDataSection: Boolean = true,
    val measurementDataEnabled: Boolean = true,
    val selectedCrashOption: CrashReportOption = CrashReportOption.Ask,
) : State
