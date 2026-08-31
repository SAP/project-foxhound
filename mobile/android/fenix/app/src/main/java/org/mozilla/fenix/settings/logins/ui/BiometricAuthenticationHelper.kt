/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.logins.ui

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalContext
import androidx.fragment.app.FragmentActivity

/**
 *  The UI host for displaying the Biometric Authentication dialog
 *
 *  @param title The title of the authentication prompt.
 *  @param onAuthSuccess Callback triggered when biometric authentication succeeds.
 *  @param onAuthFailure Callback triggered when biometric authentication fails.
 */
@Composable
internal fun BiometricAuthenticationDialog(
    title: String,
    onAuthSuccess: () -> Unit,
    onAuthFailure: () -> Unit,
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity ?: return

    if (DefaultBiometricUtils.canUseBiometricAuthentication(activity = activity)) {
        ShowBiometricAuthenticationDialog(
            title = title,
            activity = activity,
            onAuthSuccess = onAuthSuccess,
            onAuthFailure = onAuthFailure,
        )
    } else if (DefaultBiometricUtils.canUsePinVerification(activity = activity)) {
        ShowPinVerificationDialog(
            title = title,
            activity = activity,
            onAuthSuccess = onAuthSuccess,
            onAuthFailure = onAuthFailure,
        )
    } else {
        ShowPinWarningDialog(
            activity = activity,
            onAuthSuccess = onAuthSuccess,
        )
    }
}

@Composable
private fun ShowBiometricAuthenticationDialog(
    title: String,
    activity: FragmentActivity,
    onAuthSuccess: () -> Unit,
    onAuthFailure: () -> Unit,
) {
    DefaultBiometricUtils.showBiometricPromptForCompose(
        title = title,
        activity = activity,
        onAuthSuccess = onAuthSuccess,
        onAuthFailure = onAuthFailure,
    )
}

@Composable
private fun ShowPinVerificationDialog(
    title: String,
    activity: FragmentActivity,
    onAuthSuccess: () -> Unit,
    onAuthFailure: () -> Unit,
) {
    val startForResult =
        rememberLauncherForActivityResult(
            ActivityResultContracts.StartActivityForResult(),
        ) { result: ActivityResult ->
            if (result.resultCode == Activity.RESULT_OK) {
                onAuthSuccess()
            } else {
                onAuthFailure()
            }
        }

    SideEffect {
        DefaultBiometricUtils.getConfirmDeviceCredentialIntent(
            title = title,
            activity = activity,
        )?.also { startForResult.launch(it) }
    }
}

@Composable
private fun ShowPinWarningDialog(activity: FragmentActivity, onAuthSuccess: () -> Unit) {
    DefaultBiometricUtils.showPinWarningPrompt(
        activity = activity,
        onAuthSuccess = onAuthSuccess,
    )
}
