/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui.state

/**
 * Represents the various states of the biometric authentication process for accessing a secure screen.
 */
sealed class BiometricAuthenticationState {
    /**
     * The initial state, before any authentication process has started or after it has been reset.
     */
    data object Inert : BiometricAuthenticationState()

    /**
     * The state where the screen is ready to be locked, but the user has not yet initiated
     * the authentication process. This is typically used to show an unlock button.
     */
    data object ReadyToLock : BiometricAuthenticationState()

    /**
     * The biometric authentication prompt is currently being displayed to the user.
     */
    data object InProgress : BiometricAuthenticationState()

    /**
     * The user has successfully authenticated. The saved logins can be displayed.
     */
    data object Authorized : BiometricAuthenticationState()

    /**
     * The authentication attempt failed.
     */
    data object Failed : BiometricAuthenticationState()

    /**
     * `true` if the current state is [Authorized].
     */
    val isAuthorized: Boolean
        get() = this is Authorized

    /**
     * `true` if the current state is [ReadyToLock].
     */
    val isReadyToLock: Boolean
        get() = this is ReadyToLock
}
