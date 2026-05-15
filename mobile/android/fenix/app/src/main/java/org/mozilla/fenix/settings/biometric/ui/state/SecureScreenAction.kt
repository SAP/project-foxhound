/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui.state

import mozilla.components.lib.state.Action

/**
 * This sealed interface represents all possible user actions or events that can occur on the secure screen.
 * These actions are dispatched to the store to trigger state changes.
 */
sealed interface SecureScreenAction : Action {

    /**
     * Represents actions related to the Android component lifecycle.
     */
    sealed interface LifecycleAction : SecureScreenAction {
        /** Dispatched when the component is paused. */
        data object OnPause : LifecycleAction

        /** Dispatched when the component is resumed. */
        data object OnResume : LifecycleAction

        /** Dispatched when the component is disposed or destroyed. */
        data object OnDispose : LifecycleAction
    }

    /**
     * Represents actions related to the biometric/authentication flow.
     */
    sealed interface AuthenticationFlowAction : SecureScreenAction {
        /** Dispatched when the authentication process has started. */
        data object Started : AuthenticationFlowAction

        /** Dispatched when the authentication was successful. */
        data object Succeeded : AuthenticationFlowAction

        /** Dispatched when the authentication has failed. */
        data object Failed : AuthenticationFlowAction
    }

    /**
     * Represents actions initiated by the user on the unlock screen UI.
     */
    sealed interface UnlockScreenAction : SecureScreenAction {
        /** Dispatched when the user taps the "Unlock" button. */
        data object UnlockTapped : UnlockScreenAction

        /** Dispatched when the user taps the "Leave" or exit button. */
        data object LeaveTapped : UnlockScreenAction
    }
}
