/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.VoiceSearchAction
import org.mozilla.fenix.components.appstate.VoiceSearchState

class VoiceSearchReducerTest {

    @Test
    fun `GIVEN default state WHEN VoiceInputRequested THEN isRequestingVoiceInput is true and voiceInputResult is null`() {
        val initialState = VoiceSearchState(
            isRequestingVoiceInput = false,
            voiceInputResult = "previous result",
        )

        val newState = VoiceSearchReducer.reduce(initialState, VoiceSearchAction.VoiceInputRequested)

        assertEquals(true, newState.isRequestingVoiceInput)
        assertEquals(null, newState.voiceInputResult)
    }

    @Test
    fun `GIVEN requesting input WHEN this could not be recorded THEN isRequestingVoiceInput is false and voiceInputResult is set`() {
        val initialState = VoiceSearchState(
            isRequestingVoiceInput = true,
            voiceInputResult = null,
        )
        val searchTerms = "hello world"

        val newState = VoiceSearchReducer.reduce(initialState, VoiceSearchAction.VoiceInputResultReceived(searchTerms))

        assertEquals(false, newState.isRequestingVoiceInput)
        assertEquals(searchTerms, newState.voiceInputResult)
    }

    @Test
    fun `GIVEN requesting input WHEN there the input is empty THEN isRequestingVoiceInput is false and voiceInputResult is set`() {
        val initialState = VoiceSearchState(
            isRequestingVoiceInput = true,
            voiceInputResult = "",
        )
        val searchTerms = "hello world"

        val newState = VoiceSearchReducer.reduce(initialState, VoiceSearchAction.VoiceInputResultReceived(searchTerms))

        assertEquals(false, newState.isRequestingVoiceInput)
        assertEquals(searchTerms, newState.voiceInputResult)
    }

    @Test
    fun `GIVEN any state WHEN VoiceInputRequestCleared THEN isRequestingVoiceInput is false and voiceInputResult is null`() {
        val initialState = VoiceSearchState(
            isRequestingVoiceInput = true,
            voiceInputResult = "something",
        )

        val newState = VoiceSearchReducer.reduce(initialState, VoiceSearchAction.VoiceInputRequestCleared)

        assertEquals(false, newState.isRequestingVoiceInput)
        assertEquals(null, newState.voiceInputResult)
    }
}
