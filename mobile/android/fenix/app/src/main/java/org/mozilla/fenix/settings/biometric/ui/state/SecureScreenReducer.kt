/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui.state

import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.AuthenticationFlowAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.LifecycleAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.UnlockScreenAction

/**
 * Reducer for the secure screen. This function takes the current [SecureScreenState] and a
 * [SecureScreenAction], and returns a new state. It delegates the handling of specific action
 * types to corresponding extension functions.
 *
 * @param state The current state of the secure screen.
 * @param action The action to be processed.
 *
 * @return The new state after applying the action.
 */
fun secureScreenReducer(
    state: SecureScreenState,
    action: SecureScreenAction,
): SecureScreenState =
    when (action) {
        is AuthenticationFlowAction -> state.handleAuthenticationFlowAction(action)
        is LifecycleAction -> state.handleLifecycleAction(action)
        is UnlockScreenAction -> state.handleUnlockScreenAction(action)
    }

private fun SecureScreenState.handleUnlockScreenAction(
    action: UnlockScreenAction,
): SecureScreenState {
    return when (action) {
        UnlockScreenAction.LeaveTapped -> copy(shouldExit = true)
        UnlockScreenAction.UnlockTapped -> copy(authenticationState = BiometricAuthenticationState.InProgress)
    }
}

private fun SecureScreenState.handleAuthenticationFlowAction(
    action: AuthenticationFlowAction,
): SecureScreenState {
    return when (action) {
        AuthenticationFlowAction.Failed -> copy(authenticationState = BiometricAuthenticationState.Failed)
        AuthenticationFlowAction.Started -> copy(authenticationState = BiometricAuthenticationState.InProgress)
        AuthenticationFlowAction.Succeeded -> copy(authenticationState = BiometricAuthenticationState.Authorized)
    }
}

private fun SecureScreenState.handleLifecycleAction(
    action: LifecycleAction,
): SecureScreenState {
    return when (action) {
        LifecycleAction.OnPause -> copy(
            authenticationState = if (authenticationState.isAuthorized) {
                BiometricAuthenticationState.ReadyToLock
            } else {
                authenticationState
            },
        )

        LifecycleAction.OnDispose -> this
        LifecycleAction.OnResume -> copy(
            authenticationState = if (authenticationState.isReadyToLock) {
                BiometricAuthenticationState.InProgress
            } else {
                authenticationState
            },
        )
    }
}
