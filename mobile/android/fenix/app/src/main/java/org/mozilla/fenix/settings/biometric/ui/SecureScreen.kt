/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui

import android.view.Window
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.compose.LocalLifecycleOwner
import mozilla.components.lib.state.helpers.StoreProvider.Companion.composableStore
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.settings.biometric.ui.state.BiometricAuthenticationState
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.AuthenticationFlowAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.LifecycleAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenAction.UnlockScreenAction
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenState
import org.mozilla.fenix.settings.biometric.ui.state.SecureScreenStore
import org.mozilla.fenix.settings.logins.ui.BiometricAuthenticationDialog

/**
 * A composable that wraps content requiring biometric or device credential authentication.
 * It observes the authentication state from the provided [store] and displays the appropriate UI.
 *
 * @param store The [SecureScreenStore] that manages the state for this screen.
 * @param title The title to be displayed on the authentication prompt.
 * @param onExit A callback invoked when the user indicates to exit the secure screen.
 * @param content The composable content to display after successful authentication.
 */
@Composable
fun SecureScreen(
    store: SecureScreenStore = provideStore(),
    title: String,
    onExit: () -> Unit = {},
    content: @Composable () -> Unit,
) {
    val state by store.stateFlow.collectAsState()

    LaunchedEffect(state.shouldExit) {
        if (state.shouldExit) {
            onExit()
        }
    }

    SecureScreenImpl(
        title = title,
        state = state.authenticationState,
        handleAction = {
            store.dispatch(it)
        },
        content = content,
    )
}

@Composable
internal fun SecureScreenImpl(
    title: String,
    state: BiometricAuthenticationState,
    handleAction: (SecureScreenAction) -> Unit,
    content: @Composable () -> Unit,
) {
    ObserveLifecycle(
        onPause = { handleAction(LifecycleAction.OnPause) },
        onResume = { handleAction(LifecycleAction.OnResume) },
        onDispose = { handleAction(LifecycleAction.OnDispose) },
    )

    when (state) {
        is BiometricAuthenticationState.Inert -> {
            StartAuthorization(
                onStart = {
                    handleAction(AuthenticationFlowAction.Started)
                },
            )
        }

        is BiometricAuthenticationState.InProgress -> {
            BiometricAuthenticationDialog(
                title = title,
                onAuthSuccess = {
                    handleAction(AuthenticationFlowAction.Succeeded)
                },
                onAuthFailure = {
                    handleAction(AuthenticationFlowAction.Failed)
                },
            )
        }

        is BiometricAuthenticationState.ReadyToLock,
        is BiometricAuthenticationState.Failed,
            -> {
            NotAuthorized(
                title = title,
                onUnlockClicked = {
                    handleAction(UnlockScreenAction.UnlockTapped)
                },
                onLeaveClicked = {
                    handleAction(UnlockScreenAction.LeaveTapped)
                },
            )
        }

        is BiometricAuthenticationState.Authorized -> {
            content()
        }
    }
}

@Composable
private fun StartAuthorization(onStart: () -> Unit) {
    LaunchedEffect(Unit) {
        onStart()
    }
}

@Composable
private fun NotAuthorized(
    title: String,
    onUnlockClicked: () -> Unit = {},
    onLeaveClicked: () -> Unit = {},
) {
    UnlockScreen(
        title = title,
        onUnlockClicked = onUnlockClicked,
        onLeaveClicked = onLeaveClicked,
    )
}

@Composable
private fun ObserveLifecycle(
    onPause: () -> Unit = {},
    onResume: () -> Unit = {},
    onDispose: () -> Unit = {},
) {
    val activityContext = LocalActivity.current as ComponentActivity

    DisposableEffect(LocalLifecycleOwner.current) {
        val lifecycle = ProcessLifecycleOwner.get().lifecycle
        val observer = object : DefaultLifecycleObserver {
            override fun onPause(owner: LifecycleOwner) {
                super.onPause(owner)
                activityContext.window?.lock()
                onPause()
            }

            override fun onResume(owner: LifecycleOwner) {
                super.onResume(owner)
                if (activityContext.settings().allowScreenCaptureInSecureScreens) {
                    activityContext.window?.unlock()
                } else {
                    activityContext.window?.lock()
                }
                onResume()
            }
        }
        lifecycle.addObserver(observer)

        onDispose {
            activityContext.window?.unlock()
            onDispose()
            lifecycle.removeObserver(observer)
        }
    }
}

private fun Window.lock() = addFlags(WindowManager.LayoutParams.FLAG_SECURE)
private fun Window.unlock() = clearFlags(WindowManager.LayoutParams.FLAG_SECURE)

@Composable
private fun provideStore() = composableStore(SecureScreenState.Initial) {
    SecureScreenStore(it)
}.value
