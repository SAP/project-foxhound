/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.biometrics

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.tooling.preview.Preview
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.focus.R
import org.mozilla.focus.ui.theme.FocusTheme
import org.mozilla.focus.ui.theme.focusDimensions
import org.mozilla.focus.ui.theme.focusTypography
import org.mozilla.focus.ui.theme.gradientBackground
import mozilla.components.ui.icons.R as iconsR

@Composable
@Preview
private fun BiometricPromptContentPreview() {
    FocusTheme {
        BiometricPromptContent("Fingerprint operation canceled by user.") {}
    }
}

/**
 * Content of the biometric authentication prompt.
 * @param biometricErrorText Text for an authentication error
 * @param showBiometricPrompt callback for displaying the OS biometric authentication prompt
 */
@Composable
fun BiometricPromptContent(biometricErrorText: String, showBiometricPrompt: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight()
            .gradientBackground(),
    ) {
        Image(
            painter = painterResource(R.drawable.wordmark2),
            contentDescription = stringResource(R.string.app_name),
            modifier = Modifier.padding(start = focusDimensions.paddingLarge, end = focusDimensions.paddingLarge),
        )
        Text(
            style = focusTypography.onboardingButton,
            color = Color.Red,
            text = biometricErrorText,
            modifier = Modifier.padding(top = focusDimensions.paddingDefault, bottom = focusDimensions.paddingDefault),
        )
        ComponentShowBiometricPromptButton { showBiometricPrompt() }
    }
}

@Composable
private fun ComponentShowBiometricPromptButton(showBiometricPrompt: () -> Unit) {
    Button(
        onClick = showBiometricPrompt,
        colors = ButtonDefaults.textButtonColors(
            containerColor = colorResource(R.color.biometric_show_button_background),
        ),
        modifier = Modifier
            .padding(focusDimensions.paddingDefault)
            .fillMaxWidth(),
    ) {
        Image(
            painter = painterResource(iconsR.drawable.mozac_ic_fingerprinter_24),
            contentDescription = stringResource(R.string.biometric_auth_image_description),
            modifier = Modifier.padding(end = focusDimensions.paddingText),
        )
        Text(
            color = PhotonColors.White,
            text = AnnotatedString(stringResource(R.string.show_biometric_button_text)),
        )
    }
}
