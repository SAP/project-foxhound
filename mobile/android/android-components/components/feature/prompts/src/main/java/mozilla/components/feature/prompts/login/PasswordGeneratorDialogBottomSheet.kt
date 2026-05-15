/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.feature.prompts.R
import mozilla.components.ui.icons.R as iconsR

private val FONT_SIZE = 16.sp
private val LINE_HEIGHT = 24.sp
private val LETTER_SPACING = 0.15.sp

/**
 * The password generator bottom sheet
 *
 * @param generatedStrongPassword The generated password.
 * @param onUsePassword Invoked when the user clicks on the Use Password button.
 * @param onCancelDialog Invoked when the user clicks on the Not Now button.
 * @param colors The colors of the dialog.
 */
@Composable
fun PasswordGeneratorBottomSheet(
    generatedStrongPassword: String,
    onUsePassword: () -> Unit,
    onCancelDialog: () -> Unit,
    colors: PasswordGeneratorDialogColors = PasswordGeneratorDialogColors.default(),
) {
    Column(
        modifier = Modifier
            .background(colors.background)
            .padding(all = 8.dp)
            .fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        StrongPasswordBottomSheetTitle(colors = colors)

        StrongPasswordBottomSheetDescription(colors = colors)

        StrongPasswordBottomSheetPasswordBox(
            generatedPassword = generatedStrongPassword,
            colors = colors,
        )

        StrongPasswordBottomSheetButtons(
            onUsePassword = { onUsePassword() },
            onCancelDialog = { onCancelDialog() },
            colors = colors,
        )
    }
}

@Composable
private fun StrongPasswordBottomSheetTitle(colors: PasswordGeneratorDialogColors) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Image(
            painter = painterResource(id = iconsR.drawable.mozac_ic_login_24),
            contentDescription = null,
            contentScale = ContentScale.FillWidth,
            colorFilter = ColorFilter.tint(colors.title),
            modifier = Modifier.align(Alignment.CenterVertically),
        )

        Text(
            modifier = Modifier.padding(16.dp),
            text = stringResource(id = R.string.mozac_feature_prompts_suggest_strong_password_title),
            style = TextStyle(
                fontSize = FONT_SIZE,
                lineHeight = LINE_HEIGHT,
                color = colors.title,
                letterSpacing = LETTER_SPACING,
                fontWeight = FontWeight.Bold,
            ),
        )
    }
}

@Composable
private fun StrongPasswordBottomSheetDescription(
    modifier: Modifier = Modifier,
    colors: PasswordGeneratorDialogColors,
) {
    Text(
        modifier = modifier.padding(start = 40.dp, top = 0.dp, end = 12.dp, bottom = 16.dp),
        text = stringResource(id = R.string.mozac_feature_prompts_suggest_strong_password_description_3),
        style = TextStyle(
            fontSize = FONT_SIZE,
            lineHeight = LINE_HEIGHT,
            color = colors.description,
            letterSpacing = LETTER_SPACING,
        ),
    )
}

@Composable
private fun StrongPasswordBottomSheetPasswordBox(
    modifier: Modifier = Modifier,
    generatedPassword: String,
    colors: PasswordGeneratorDialogColors,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 40.dp, top = 8.dp, end = 12.dp, bottom = 8.dp)
            .background(colors.passwordBox)
            .border(1.dp, colors.boxBorder)
            .padding(4.dp),
    ) {
        Text(
            modifier = modifier.padding(8.dp),
            text = generatedPassword,
            style = TextStyle(
                fontSize = FONT_SIZE,
                lineHeight = LINE_HEIGHT,
                color = colors.title,
                letterSpacing = LETTER_SPACING,
            ),
        )
    }
}

@Composable
private fun StrongPasswordBottomSheetButtons(
    onUsePassword: () -> Unit,
    onCancelDialog: () -> Unit,
    colors: PasswordGeneratorDialogColors,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.End),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 16.dp),
    ) {
        TextButton(
            text = stringResource(id = R.string.mozac_feature_prompt_not_now),
            onClick = { onCancelDialog() },
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.background,
                contentColor = colors.cancelText,
            ),
        )

        FilledButton(
            text = stringResource(id = R.string.mozac_feature_prompts_suggest_strong_password_use_password),
            containerColor = colors.confirmButton,
        ) {
            onUsePassword()
        }
    }
}

@Composable
@PreviewLightDark
private fun GenerateStrongPasswordDialogPreview() {
    AcornTheme {
        PasswordGeneratorBottomSheet(
            generatedStrongPassword = "StrongPassword123#",
            onUsePassword = {},
            onCancelDialog = {},
        )
    }
}
