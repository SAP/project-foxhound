/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.microsurvey.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.IconButton
import mozilla.components.support.utils.KeyboardState
import mozilla.components.support.utils.keyboardAsState
import org.mozilla.fenix.R
import org.mozilla.fenix.microsurvey.ui.ext.MicrosurveyUIData
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

private const val TABLET_WIDTH_FRACTION = 0.5f
private const val NON_TABLET_WIDTH_FRACTION = 1.0f

/**
 * Initial microsurvey prompt displayed to the user to request completion of feedback.
 *
 * @param microsurvey Contains the required microsurvey data for the UI.
 * @param onStartSurveyClicked Handles the on click event of the start survey button.
 * @param onCloseButtonClicked Invoked when the user clicks on the close button.
 */
@Composable
fun MicrosurveyRequestPrompt(
    microsurvey: MicrosurveyUIData,
    onStartSurveyClicked: () -> Unit,
    onCloseButtonClicked: () -> Unit,
) {
    val isKeyboardVisible by keyboardAsState()
    var isMicrosurveyVisible by remember { mutableStateOf(true) }
    isMicrosurveyVisible = isKeyboardVisible == KeyboardState.Closed

    // Animation properties for the microsurvey's visibility transitions.
    AnimatedVisibility(
        visible = isMicrosurveyVisible,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
    ) {
        Surface {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .padding(all = 16.dp)
                        .fillMaxWidth(
                            if (FirefoxTheme.windowSize.isNotSmall()) {
                                TABLET_WIDTH_FRACTION
                            } else {
                                NON_TABLET_WIDTH_FRACTION
                            },
                        ),
                ) {
                    Header(microsurvey.promptTitle) { onCloseButtonClicked() }

                    Spacer(modifier = Modifier.height(8.dp))

                    FilledButton(
                        text = stringResource(id = R.string.micro_survey_continue_button_label),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        onStartSurveyClicked()
                    }
                }
            }
        }
    }
}

@Composable
private fun Header(
    title: String,
    onCloseButtonClicked: () -> Unit,
) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Image(
            painter = painterResource(R.drawable.ic_firefox),
            contentDescription = stringResource(id = R.string.microsurvey_app_icon_content_description),
            modifier = Modifier.size(24.dp),
        )

        Spacer(modifier = Modifier.width(8.dp))

        Text(
            text = title,
            style = FirefoxTheme.typography.headline7,
            modifier = Modifier.weight(1f),
        )

        IconButton(
            onClick = { onCloseButtonClicked() },
            contentDescription = stringResource(id = R.string.microsurvey_close_button_content_description),
            modifier = Modifier.size(20.dp),
        ) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_cross_20),
                contentDescription = null,
            )
        }
    }
}

@FlexibleWindowPreview
@Composable
private fun MicrosurveyRequestPromptPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        MicrosurveyRequestPrompt(
            microsurvey = MicrosurveyUIData(
                id = "",
                promptTitle = "Help make printing in Firefox better. It only takes a sec.",
                icon = iconsR.drawable.mozac_ic_lightbulb_24,
                question = "",
                answers = emptyList(),
            ),
            onStartSurveyClicked = {},
            onCloseButtonClicked = {},
        )
    }
}
