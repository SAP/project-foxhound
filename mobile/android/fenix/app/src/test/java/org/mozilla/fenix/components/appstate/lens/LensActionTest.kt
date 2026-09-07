/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.lens

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.AppStoreReducer

class LensActionTest {

    @Test
    fun `WHEN Lens is requested THEN state should reflect that`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, AppAction.LensAction.LensRequested)

        val expectedState = AppState(
            lensState = LensState(
                isRequesting = true,
                inProgress = false,
                resultUrl = null,
            ),
        )

        assertEquals(expectedState, finalState)
    }

    @Test
    fun `WHEN Lens is requested with an image URL THEN state reflects the pending image URL`() {
        val initialState = AppState()
        val imageUrl = "https://example.com/image.jpg"

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.LensAction.LensRequestedWithImageUrl(imageUrl),
        )

        val expectedState = AppState(
            lensState = LensState(
                isRequesting = true,
                inProgress = false,
                resultUrl = null,
                pendingImageUrl = imageUrl,
            ),
        )

        assertEquals(expectedState, finalState)
    }

    @Test
    fun `WHEN the Lens request is consumed THEN the state should reflect that`() {
        var state = AppState()

        state = AppStoreReducer.reduce(state, AppAction.LensAction.LensRequested)

        var expectedState = AppState(
            lensState = LensState(
                isRequesting = true,
                inProgress = false,
                resultUrl = null,
            ),
        )

        assertEquals(expectedState, state)

        state = AppStoreReducer.reduce(state, AppAction.LensAction.LensRequestConsumed)

        expectedState = AppState(
            lensState = LensState(
                isRequesting = false,
                inProgress = true,
                resultUrl = null,
            ),
        )

        assertEquals(expectedState, state)
    }

    @Test
    fun `WHEN the Lens result is available THEN the state should reflect that`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.LensAction.LensResultAvailable("https://lens.google.com/results"),
        )

        val expectedState = AppState(
            lensState = LensState(
                isRequesting = false,
                inProgress = false,
                resultUrl = "https://lens.google.com/results",
            ),
        )

        assertEquals(expectedState, finalState)
    }

    @Test
    fun `WHEN the Lens result is consumed THEN the state should reflect that`() {
        var state = AppState()

        state = AppStoreReducer.reduce(
            state,
            AppAction.LensAction.LensResultAvailable("https://lens.google.com/results"),
        )

        var expectedState = AppState(
            lensState = LensState(
                isRequesting = false,
                inProgress = false,
                resultUrl = "https://lens.google.com/results",
            ),
        )

        assertEquals(expectedState, state)

        state = AppStoreReducer.reduce(state, AppAction.LensAction.LensResultConsumed)

        expectedState = AppState(lensState = LensState.DEFAULT)

        assertEquals(expectedState, state)
    }

    @Test
    fun `WHEN Lens is dismissed THEN the state should reflect that`() {
        var state = AppState()

        state = AppStoreReducer.reduce(state, AppAction.LensAction.LensRequested)

        var expectedState = AppState(
            lensState = LensState(
                isRequesting = true,
                inProgress = false,
                resultUrl = null,
            ),
        )

        assertEquals(expectedState, state)

        state = AppStoreReducer.reduce(state, AppAction.LensAction.LensDismissed)

        expectedState = AppState(lensState = LensState.DEFAULT)

        assertEquals(expectedState, state)
    }
}
