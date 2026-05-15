/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.redesign.view

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.FilledButton
import org.mozilla.fenix.R
import org.mozilla.fenix.onboarding.store.OnboardingStore
import org.mozilla.fenix.onboarding.view.Action
import org.mozilla.fenix.onboarding.view.OnboardingPageState
import org.mozilla.fenix.onboarding.view.ToolbarOption
import org.mozilla.fenix.onboarding.view.ToolbarOptionType
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

private val TOOLBAR_IMAGE_HEIGHT = 150.dp

/**
 * A Composable for displaying toolbar placement onboarding page content.
 *
 * @param onboardingStore The [OnboardingStore] that holds the toolbar selection state.
 * @param pageState The page content that's displayed.
 * @param onToolbarSelectionClicked Callback for when a toolbar selection is clicked.
 */
@Composable
fun ToolbarOnboardingPageRedesign(
    onboardingStore: OnboardingStore,
    pageState: OnboardingPageState,
    onToolbarSelectionClicked: (ToolbarOptionType) -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(if (pageState.shouldShowElevation) 6.dp else 0.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.weight(TITLE_TOP_SPACER_WEIGHT))

            Column(
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .weight(CONTENT_WEIGHT)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(36.dp),
            ) {
                Text(
                    text = pageState.title,
                    textAlign = TextAlign.Start,
                    style = MaterialTheme.typography.headlineSmall,
                )

                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    ToolbarPositionOptions(
                        onboardingStore = onboardingStore,
                        pageState = pageState,
                        onToolbarSelectionClicked = onToolbarSelectionClicked,
                    )
                }
            }

            FilledButton(
                text = pageState.primaryButton.text,
                modifier = Modifier
                    .width(width = FirefoxTheme.layout.size.maxWidth.small)
                    .semantics {
                        testTag = pageState.title + "onboarding_card_redesign.positive_button"
                    },
                onClick = pageState.primaryButton.onClick,
            )
        }
    }

    LaunchedEffect(pageState) {
        pageState.onRecordImpressionEvent()
    }
}

@Composable
private fun ToolbarPositionOptions(
    onboardingStore: OnboardingStore,
    pageState: OnboardingPageState,
    onToolbarSelectionClicked: (ToolbarOptionType) -> Unit,
) {
    val state by onboardingStore.stateFlow.collectAsState()
    pageState.toolbarOptions?.let { options ->
        Row(horizontalArrangement = Arrangement.spacedBy(26.dp)) {
            options.forEach {
                ToolbarPositionOption(
                    option = it,
                    isSelected = it.toolbarType == state.toolbarOptionSelected,
                    onClick = { onToolbarSelectionClicked(it.toolbarType) },
                )
            }
        }
    }
}

@Composable
private fun ToolbarPositionOption(
    option: ToolbarOption,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier.clickable(
            role = Role.Button,
            interactionSource = remember { MutableInteractionSource() },
            indication = null, // Prevents onClick press/ripple animation
            onClick = onClick,
        ),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(8.dp))

        Image(
            painter = painterResource(option.toolbarType.imageRes(isSelected)),
            contentDescription = null, // Decorative only
            modifier = Modifier.height(TOOLBAR_IMAGE_HEIGHT),
        )

        Spacer(Modifier.height(26.dp))

        Text(
            text = option.label,
            modifier = Modifier.align(Alignment.CenterHorizontally),
            style = FirefoxTheme.typography.headline7,
        )

        Spacer(Modifier.height(12.dp))

        SelectedCheckmark(isSelected)
    }
}

@DrawableRes
private fun ToolbarOptionType.imageRes(isSelected: Boolean): Int =
    when (this) {
        ToolbarOptionType.TOOLBAR_TOP ->
            if (isSelected) {
                R.drawable.nova_onboarding_toolbar_top_active
            } else {
                R.drawable.nova_onboarding_toolbar_top_inactive
            }

        ToolbarOptionType.TOOLBAR_BOTTOM ->
            if (isSelected) {
                R.drawable.nova_onboarding_toolbar_bottom_active
            } else {
                R.drawable.nova_onboarding_toolbar_bottom_inactive
            }
    }

@Composable
private fun SelectedCheckmark(selected: Boolean = false) {
    if (selected) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .padding(1.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.tertiary),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_checkmark_24),
                contentDescription = null, // Decorative only.
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier
                    .size(24.dp)
                    .padding(2.dp),
            )
        }
    } else {
        Box(
            modifier = Modifier
                .size(24.dp)
                .border(
                    width = 3.dp,
                    color = MaterialTheme.colorScheme.outlineVariant,
                    shape = CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) { }
    }
}

@FlexibleWindowLightDarkPreview
@Composable
private fun OnboardingPagePreview() {
    FirefoxTheme {
        ToolbarOnboardingPageRedesign(
            onboardingStore = OnboardingStore(),
            pageState = OnboardingPageState(
                imageRes = R.drawable.ic_onboarding_customize_toolbar,
                title = stringResource(id = R.string.nova_onboarding_toolbar_selection_title),
                description = "", // Unused in redesign
                primaryButton = Action(
                    text = stringResource(
                        id = R.string.nova_onboarding_continue_button,
                    ),
                    onClick = {},
                ),
                toolbarOptions = listOf(
                    ToolbarOption(
                        toolbarType = ToolbarOptionType.TOOLBAR_TOP,
                        imageRes = R.drawable.ic_onboarding_top_toolbar,
                        label = stringResource(R.string.nova_onboarding_toolbar_selection_top_label),
                    ),
                    ToolbarOption(
                        toolbarType = ToolbarOptionType.TOOLBAR_BOTTOM,
                        imageRes = R.drawable.ic_onboarding_bottom_toolbar,
                        label = stringResource(R.string.nova_onboarding_toolbar_selection_bottom_label),
                    ),
                ),
                onRecordImpressionEvent = {},
            ),
            onToolbarSelectionClicked = {},
        )
    }
}
