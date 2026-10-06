package org.mozilla.fenix.settings.biometric.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.settings.biometric.ui.state.BiometricAuthenticationState
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.AuthenticationFlowAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.LifecycleAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.UnlockScreenAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenState
import org.mozilla.fenix.settings.biometric.ui.state.secureScreenReducer

class SecureScreenReducerTest {

    @Test
    fun `WHEN authentication flow starts THEN authentication state is set to in progress`() {
        val result = secureScreenReducer(
            state = createState(BiometricAuthenticationState.Inert),
            action = AuthenticationFlowAction.Started,
        )

        assertEquals(
            BiometricAuthenticationState.InProgress,
            result.authenticationState,
        )
    }

    @Test
    fun `WHEN authentication flow succeeds THEN authentication state is set to authorized`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.Inert),
            action = AuthenticationFlowAction.Succeeded,
        )

        assertEquals(
            BiometricAuthenticationState.Authorized,
            result.authenticationState,
        )
    }

    @Test
    fun `WHEN authentication flow fails THEN authentication state is set to failed`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.Inert),
            action = AuthenticationFlowAction.Failed,
        )

        assertEquals(
            BiometricAuthenticationState.Failed,
            result.authenticationState,
        )
    }

    @Test
    fun `GIVEN previously ready to lock WHEN the lifecycle becomes resumed THEN authentication state is set to in progress`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.ReadyToLock),
            action = LifecycleAction.OnResume,
        )

        assertEquals(
            BiometricAuthenticationState.InProgress,
            result.authenticationState,
        )
    }

    @Test
    fun `GIVEN previous state not ready to lock WHEN the lifecycle becomes resumed THEN authentication state is unchanged`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.Authorized),
            action = LifecycleAction.OnResume,
        )

        assertEquals(
            BiometricAuthenticationState.Authorized,
            result.authenticationState,
        )
    }

    @Test
    fun `GIVEN previously authorized WHEN the lifecycle becomes paused THEN state is set to ready to lock`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.Authorized),
            action = LifecycleAction.OnPause,
        )

        assertEquals(
            BiometricAuthenticationState.ReadyToLock,
            result.authenticationState,
        )
    }

    @Test
    fun `GIVEN a previous unauthorized state WHEN the lifecycle becomes paused THEN state remains unchanged`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.Inert),
            action = LifecycleAction.OnPause,
        )

        assertEquals(
            BiometricAuthenticationState.Inert,
            result.authenticationState,
        )
    }

    @Test
    fun `GIVEN previous state WHEN the unlock action is received THEN authentication state is set to in progress`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.ReadyToLock),
            action = UnlockScreenAction.UnlockTapped,
        )

        assertEquals(
            BiometricAuthenticationState.InProgress,
            result.authenticationState,
        )
    }

    @Test
    fun `WHEN the leave action is received THEN state is set to exit`() {
        val result = secureScreenReducer(
            state = createState(authenticationState = BiometricAuthenticationState.Inert),
            action = UnlockScreenAction.LeaveTapped,
        )

        assertTrue(result.shouldExit)
    }

    private fun createState(authenticationState: BiometricAuthenticationState): SecureScreenState {
        return SecureScreenState(authenticationState = authenticationState)
    }
}
