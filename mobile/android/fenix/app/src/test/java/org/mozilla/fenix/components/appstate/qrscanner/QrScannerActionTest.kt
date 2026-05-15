/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.qrscanner

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.AppStoreReducer
import org.mozilla.fenix.components.appstate.qrScanner.QrScannerState

class QrScannerActionTest {

    @Test
    fun `WHEN the QrScanner is requested THEN state should reflect that`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, AppAction.QrScannerAction.QrScannerRequested)

        val expectedState = AppState(
            qrScannerState = QrScannerState(
                isRequesting = true,
                inProgress = false,
                lastScanData = null,
            ),
        )

        assertEquals(expectedState, finalState)
    }

    @Test
    fun `WHEN the QrScanner request is consumed THEN the state should reflect that`() {
        var state = AppState()

        state = AppStoreReducer.reduce(state, AppAction.QrScannerAction.QrScannerRequested)

        var expectedState = AppState(
            qrScannerState = QrScannerState(
                isRequesting = true,
                inProgress = false,
                lastScanData = null,
            ),
        )

        assertEquals(expectedState, state)

        state = AppStoreReducer.reduce(state, AppAction.QrScannerAction.QrScannerRequestConsumed)

        expectedState = AppState(
            qrScannerState = QrScannerState(
                isRequesting = false,
                inProgress = true,
                lastScanData = null,
            ),
        )

        assertEquals(expectedState, state)
    }

    @Test
    fun `WHEN the QrScanner Input is ready THEN the state should reflect that`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, AppAction.QrScannerAction.QrScannerInputAvailable("test"))

        val expectedState = AppState(
            qrScannerState = QrScannerState(
                isRequesting = false,
                inProgress = false,
                lastScanData = "test",
            ),
        )

        assertEquals(expectedState, finalState)
    }

    @Test
    fun `WHEN the QrScanner Input is consumed THEN the state should reflect that`() {
        var state = AppState()

        state = AppStoreReducer.reduce(state, AppAction.QrScannerAction.QrScannerInputAvailable("test"))

        var expectedState = AppState(
            qrScannerState = QrScannerState(
                isRequesting = false,
                inProgress = false,
                lastScanData = "test",
            ),
        )

        assertEquals(expectedState, state)

        state = AppStoreReducer.reduce(state, AppAction.QrScannerAction.QrScannerInputConsumed)

        expectedState = AppState(qrScannerState = QrScannerState.DEFAULT)

        assertEquals(expectedState, state)
    }

    @Test
    fun `WHEN the QrScanner is dismissed THEN the state should reflect that`() {
        var state = AppState()

        state = AppStoreReducer.reduce(state, AppAction.QrScannerAction.QrScannerRequested)

        var expectedState = AppState(
            qrScannerState = QrScannerState(
                isRequesting = true,
                inProgress = false,
                lastScanData = null,
            ),
        )

        assertEquals(expectedState, state)

        state = AppStoreReducer.reduce(state, AppAction.QrScannerAction.QrScannerDismissed)

        expectedState = AppState(qrScannerState = QrScannerState.DEFAULT)

        assertEquals(expectedState, state)
    }
}
