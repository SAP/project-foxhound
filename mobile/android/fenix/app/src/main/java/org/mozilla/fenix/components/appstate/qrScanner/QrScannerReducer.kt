/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.qrScanner

import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState

/**
 * A [AppAction.QrScannerAction] reducer that updates [AppState.qrScannerState].
 */
object QrScannerReducer {

    /**
     * Reduces [AppAction.QrScannerAction] dispatches into state changes.
     *
     * @param state The current [AppState].
     * @param action The incoming [AppAction.QrScannerAction] to be reduced.
     */
    fun reduce(state: AppState, action: AppAction.QrScannerAction): AppState = when (action) {
        AppAction.QrScannerAction.QrScannerRequested -> state.copy(
            qrScannerState = QrScannerState(isRequesting = true, inProgress = false, lastScanData = null),
        )
        AppAction.QrScannerAction.QrScannerRequestConsumed -> state.copy(
            qrScannerState = QrScannerState(isRequesting = false, inProgress = true, lastScanData = null),
        )
        AppAction.QrScannerAction.QrScannerDismissed -> state.copy(
            qrScannerState = QrScannerState.DEFAULT,
        )
        is AppAction.QrScannerAction.QrScannerInputAvailable -> state.copy(
            qrScannerState = QrScannerState(isRequesting = false, inProgress = false, lastScanData = action.data),
        )
        AppAction.QrScannerAction.QrScannerInputConsumed -> state.copy(
            qrScannerState = QrScannerState.DEFAULT,
        )
    }
}
