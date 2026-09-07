/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

/**
 * Actions related to voice search functionality within the application.
 */
sealed class VoiceSearchAction : AppAction() {

    /**
     * A new voice input is requested by the user.
     */
    object VoiceInputRequested : VoiceSearchAction()

    /**
     * The result of a voice input request is available.
     *
     * @property searchTerms The search terms obtained from the user's voice input,
     * or `null` if the operation was cancelled or failed.
     */
    data class VoiceInputResultReceived(
        val searchTerms: String?,
    ) : VoiceSearchAction()

    /**
     * Previous voice input request details are not valid anymore.
     */
    object VoiceInputRequestCleared : VoiceSearchAction()
}
