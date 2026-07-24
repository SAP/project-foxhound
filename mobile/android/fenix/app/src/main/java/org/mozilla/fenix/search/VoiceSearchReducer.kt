/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search

import org.mozilla.fenix.components.appstate.VoiceSearchAction
import org.mozilla.fenix.components.appstate.VoiceSearchState

/**
 * Reducer for [VoiceSearchAction]s.
 *
 * Handles state transitions for voice search functionality based on incoming actions.
 */
object VoiceSearchReducer {
    /**
     * Computes the next [VoiceSearchState] based on the current state and the given [VoiceSearchAction].
     *
     * @param state The current [VoiceSearchState].
     * @param action The [VoiceSearchAction] to process.
     * @return The new [VoiceSearchState] after applying the action.
     */
    fun reduce(state: VoiceSearchState, action: VoiceSearchAction): VoiceSearchState {
        return when (action) {
            is VoiceSearchAction.VoiceInputRequested ->
                state.copy(
                    isRequestingVoiceInput = true,
                    voiceInputResult = null,
                )
            is VoiceSearchAction.VoiceInputResultReceived ->
                state.copy(
                    voiceInputResult = action.searchTerms,
                    isRequestingVoiceInput = false,
                )
            is VoiceSearchAction.VoiceInputRequestCleared ->
                state.copy(
                    isRequestingVoiceInput = false,
                    voiceInputResult = null,
                )
        }
    }
}
