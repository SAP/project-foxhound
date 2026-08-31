/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

/**
 * State related to voice search functionality.
 */
data class VoiceSearchState(
    /**
     * Whether the app is currently requesting voice input from the user.
     */
    val isRequestingVoiceInput: Boolean = false,
    /**
     * The search terms received from voice input, if any.
     */
    val voiceInputResult: String? = null,
)
