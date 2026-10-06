/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.startupCrash

internal fun startupCrashReducer(state: StartupCrashState, action: StartupCrashAction) = when (action) {
    is NoTapped -> {
        state.copy(uiState = UiState.Finished)
    }
    is ReportTapped -> {
        state.copy(uiState = UiState.Loading)
    }
    is CrashReportCompleted -> {
        state.copy(uiState = UiState.Finished)
    }
    is ReopenTapped,
    -> { state }
}
