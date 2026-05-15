/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.redesign.view

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.FilledButton
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.onboarding.view.Action
import org.mozilla.fenix.onboarding.view.OnboardingMarketingData
import org.mozilla.fenix.onboarding.view.OnboardingPageState
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * UI for an onboarding page that allows the user to opt out of marketing data analytics.
 *
 * @param state the UI state containing strings etc.
 * @param onMarketingDataLearnMoreClick callback for when the user clicks the learn more text link.
 * @param onMarketingOptInToggle callback for when the user toggles the opt-in checkbox.
 * @param onMarketingDataContinueClick callback for when the user clicks the continue button.
 */
@Suppress("LongMethod")
@Composable
fun MarketingDataOnboardingPageRedesign(
    state: OnboardingPageState,
    onMarketingDataLearnMoreClick: () -> Unit,
    onMarketingOptInToggle: (optIn: Boolean) -> Unit,
    onMarketingDataContinueClick: (allowMarketingDataCollection: Boolean) -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(if (state.shouldShowElevation) 6.dp else 0.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.weight(TITLE_TOP_SPACER_WEIGHT))

            var checkboxChecked by remember { mutableStateOf(true) }

            Column(
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .weight(CONTENT_WEIGHT)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(36.dp),
            ) {
                Text(
                    text = state.title,
                    textAlign = TextAlign.Start,
                    style = MaterialTheme.typography.headlineSmall,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Image(
                        modifier = Modifier.height(CONTENT_IMAGE_HEIGHT),
                        painter = painterResource(id = state.imageRes),
                        contentDescription = null,
                    )
                }

                state.marketingData?.let {
                    MarketingDataView(
                        marketingData = it,
                        checkboxChecked = checkboxChecked,
                        onMarketingDataLearnMoreClick = onMarketingDataLearnMoreClick,
                        onMarketingOptInToggle = { isChecked ->
                            checkboxChecked = isChecked
                            onMarketingOptInToggle(isChecked)
                        },
                    )
                }
            }

            FilledButton(
                text = state.primaryButton.text,
                modifier = Modifier
                    .width(width = FirefoxTheme.layout.size.maxWidth.small)
                    .semantics {
                        testTag = state.title + "onboarding_card_redesign.positive_button"
                    },
                onClick = { onMarketingDataContinueClick(checkboxChecked) },
            )
        }
    }

    LaunchedEffect(state) {
        state.onRecordImpressionEvent()
    }
}

@Composable
private fun MarketingDataView(
    marketingData: OnboardingMarketingData,
    checkboxChecked: Boolean,
    onMarketingDataLearnMoreClick: () -> Unit,
    onMarketingOptInToggle: (optIn: Boolean) -> Unit,
) {
    Column {
        Row(
            Modifier.toggleable(
                value = checkboxChecked,
                role = Role.Checkbox,
                onValueChange = {
                    onMarketingOptInToggle.invoke(!checkboxChecked)
                },
            ),
        ) {
            Checkbox(
                modifier = Modifier
                    .align(Alignment.Top)
                    .offset(y = (-12).dp, x = (-12).dp)
                    .clearAndSetSemantics {},
                checked = checkboxChecked,
                onCheckedChange = {
                    onMarketingOptInToggle.invoke(!checkboxChecked)
                },
            )

            LinkText(
                text = marketingData.bodyOneText.updateFirstPlaceholder(marketingData.bodyOneLinkText),
                linkTextStates = listOf(
                    LinkTextState(
                        text = marketingData.bodyOneLinkText,
                        url = "",
                        onClick = { onMarketingDataLearnMoreClick() },
                    ),
                ),
                linkTextDecoration = TextDecoration.Underline,
                style = FirefoxTheme.typography.body2,
                textAlign = TextAlign.Start,
            )
        }
    }
}

@FlexibleWindowLightDarkPreview
@Composable
private fun MarketingDataOnboardingPagePreview() {
    FirefoxTheme {
        MarketingDataOnboardingPageRedesign(
            state = OnboardingPageState(
                imageRes = R.drawable.nova_onboarding_marketing,
                title = stringResource(id = R.string.nova_onboarding_marketing_title),
                description = "", // NB: not used in the redesign
                primaryButton = Action(
                    text = stringResource(id = R.string.nova_onboarding_continue_button),
                    onClick = {},
                ),
                marketingData = OnboardingMarketingData(
                    bodyOneText = stringResource(id = R.string.nova_onboarding_marketing_body),
                    bodyOneLinkText = stringResource(id = R.string.nova_onboarding_marketing_body_link_text),
                    bodyTwoText = "", // NB: not used in the redesign
                ),
            ),
            onMarketingDataLearnMoreClick = {},
            onMarketingOptInToggle = {},
            onMarketingDataContinueClick = {},
        )
    }
}

private fun String.updateFirstPlaceholder(text: String) = replace($$"%1$s", text)
