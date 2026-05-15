/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.lib.state.Store
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.compose.list.SwitchListItem
import org.mozilla.fenix.theme.FirefoxTheme

@Composable
internal fun EmailMasksSettingsScreen(
    store: Store<EmailMasksState, EmailMasksAction>,
) {
    val state by store.stateFlow.collectAsState()

    Surface {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            EmailMasksSummary(
                isChecked = state.isSuggestMasksEnabled,
                onEmailMaskPreferenceToggled = { enabled ->
                    if (enabled) {
                        store.dispatch(EmailMasksUserAction.SuggestEmailMasksEnabled)
                    } else {
                        store.dispatch(EmailMasksUserAction.SuggestEmailMasksDisabled)
                    }
                },
                onLearnMoreClicked = {
                    store.dispatch(EmailMasksUserAction.LearnMoreClicked)
                },
            )

            ManageEmailMasksRow(
                onManageClicked = {
                    store.dispatch(EmailMasksUserAction.ManageClicked)
                },
            )
        }
    }
}

@Composable
private fun EmailMasksSummary(
    isChecked: Boolean,
    onEmailMaskPreferenceToggled: (Boolean) -> Unit,
    onLearnMoreClicked: () -> Unit,
) {
    Column {
        SwitchListItem(
            label = stringResource(R.string.preferences_email_masks_suggest_title),
            checked = isChecked,
            description = stringResource(R.string.preferences_email_masks_suggest_summary),
            maxDescriptionLines = Int.MAX_VALUE,
            showSwitchAfter = true,
            onClick = { enabled ->
                onEmailMaskPreferenceToggled(enabled)
            },
        )

        LearnMoreLink(
            learnMoreText = stringResource(R.string.preferences_email_masks_suggest_learn_more),
            onLearnMoreClicked = onLearnMoreClicked,
        )
    }
}

@Composable
private fun ManageEmailMasksRow(
    onManageClicked: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clickable(role = Role.Button) { onManageClicked() }
            .padding(horizontal = FirefoxTheme.layout.space.dynamic200),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(R.string.preferences_email_masks_manage_title),
            modifier = Modifier.weight(1f),
        )
        Icon(
            painter = painterResource(R.drawable.ic_open_in_new),
            contentDescription = null,
        )
    }
}

@Composable
private fun LearnMoreLink(
    learnMoreText: String,
    onLearnMoreClicked: () -> Unit,
) {
    val learnMoreState = LinkTextState(
        text = learnMoreText,
        url = "",
        onClick = {
            onLearnMoreClicked()
        },
    )

    ListItem(
        modifier = Modifier.clickable(onClick = { onLearnMoreClicked() }),
        headlineContent = {
            LinkText(
                text = learnMoreText,
                linkTextStates = listOf(learnMoreState),
                linkTextDecoration = TextDecoration.Underline,
                shouldApplyAccessibleSize = true,
            )
        },
    )
}

@PreviewLightDark
@Composable
private fun EmailMasksSettingsScreenPreview() {
    FirefoxTheme {
        EmailMasksSettingsScreen(
            store = Store(
                initialState = EmailMasksState(),
                reducer = { state, _ -> state },
            ),
        )
    }
}
