/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui.state

import mozilla.components.lib.state.State

/**
 * Represents the state of the authentication process for accessing a secure screen.
 *
 * @property authenticationState The current state of the authentication process.
 * @property shouldExit `true` if the authentication process should be exited.
 */
data class SecureScreenState(
    val authenticationState: BiometricAuthenticationState = BiometricAuthenticationState.Inert,
    val shouldExit: Boolean = false,
) : State {

    companion object {
        val Initial = SecureScreenState()
    }
}
