/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.webcompat.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.Dropdown
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.OutlinedButton
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.text.Text.Resource
import mozilla.components.compose.base.textfield.TextField
import org.mozilla.fenix.Config
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.ThemedValue
import org.mozilla.fenix.theme.ThemedValueProvider
import org.mozilla.fenix.webcompat.BrokenSiteReporterTestTags.BROKEN_SITE_REPORTER_CHOOSE_REASON_BUTTON
import org.mozilla.fenix.webcompat.BrokenSiteReporterTestTags.BROKEN_SITE_REPORTER_SEND_BUTTON
import org.mozilla.fenix.webcompat.store.WebCompatReporterAction
import org.mozilla.fenix.webcompat.store.WebCompatReporterState
import org.mozilla.fenix.webcompat.store.WebCompatReporterState.BrokenSiteReason
import org.mozilla.fenix.webcompat.store.WebCompatReporterStore
import mozilla.components.ui.icons.R as iconsR

private const val PROBLEM_DESCRIPTION_MAX_LINES = 5

/**
 * Top-level UI for the Web Compat Reporter feature.
 *
 * @param store [WebCompatReporterStore] used to manage the state of the Web Compat Reporter feature.
 */
@Suppress("LongMethod")
@Composable
fun WebCompatReporter(
    store: WebCompatReporterStore,
) {
    val state by store.stateFlow.collectAsState()

    var previewSheetVisible by remember { mutableStateOf(false) }

    val scrollState = rememberScrollState()

    BackHandler {
        store.dispatch(WebCompatReporterAction.BackPressed)
    }

    Scaffold(
        topBar = {
            TempAppBar(
                onBackClick = {
                    store.dispatch(WebCompatReporterAction.BackPressed)
                },
                scrollState = scrollState,
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .verticalScroll(scrollState)
                .padding(paddingValues)
                .imePadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .width(FirefoxTheme.layout.size.containerMaxWidth),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LinkText(
                text = stringResource(
                    R.string.webcompat_reporter_description_3,
                    stringResource(R.string.app_name),
                    stringResource(R.string.webcompat_reporter_learn_more),
                ),
                linkTextStates = listOf(
                    LinkTextState(
                        text = stringResource(R.string.webcompat_reporter_learn_more),
                        url = "",
                        onClick = {
                            store.dispatch(WebCompatReporterAction.LearnMoreClicked)
                        },
                    ),
                ),
                style = FirefoxTheme.typography.body2.copy(color = MaterialTheme.colorScheme.onSurface),
                linkTextColor = MaterialTheme.colorScheme.tertiary,
                linkTextDecoration = TextDecoration.Underline,
                textAlign = TextAlign.Start,
            )

            Spacer(modifier = Modifier.height(32.dp))

            TextField(
                value = state.enteredUrl,
                onValueChange = {
                    store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = it))
                },
                placeholder = "",
                errorText = stringResource(id = R.string.webcompat_reporter_url_error_invalid),
                modifier = Modifier.fillMaxWidth(),
                label = stringResource(id = R.string.webcompat_reporter_label_url),
                isError = state.hasUrlTextError,
                singleLine = true,
            )

            Spacer(modifier = Modifier.height(16.dp))

            val reasonErrorText = stringResource(R.string.webcompat_reporter_choose_reason_error)

            Dropdown(
                label = stringResource(id = R.string.webcompat_reporter_label_whats_broken_2),
                placeholder = stringResource(id = R.string.webcompat_reporter_choose_reason_2),
                dropdownItems = state.toDropdownItems(
                    onDropdownItemClick = {
                        store.dispatch(WebCompatReporterAction.ReasonChanged(newReason = it))
                    },
                ),
                modifier = Modifier.thenConditional(
                    modifier = Modifier.semantics { error(reasonErrorText) },
                ) { state.hasReasonDropdownError },
            )

            if (state.hasReasonDropdownError) {
                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = reasonErrorText,
                    // The a11y for this is handled via the `Dropdown` modifier
                    modifier = Modifier.clearAndSetSemantics {
                        testTagsAsResourceId = true
                        testTag = BROKEN_SITE_REPORTER_CHOOSE_REASON_BUTTON
                    },
                    style = FirefoxTheme.typography.caption,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextField(
                value = state.problemDescription,
                onValueChange = {
                    store.dispatch(
                        WebCompatReporterAction.ProblemDescriptionChanged(
                            newProblemDescription = it,
                        ),
                    )
                },
                placeholder = stringResource(id = R.string.webcompat_reporter_problem_description_placeholder_text),
                errorText = "",
                label = stringResource(id = R.string.webcompat_reporter_label_description),
                singleLine = false,
                maxLines = PROBLEM_DESCRIPTION_MAX_LINES,
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier
                    .toggleable(
                        value = state.includeEtpBlockedUrls,
                        role = Role.Checkbox,
                        onValueChange = { isChecked ->
                            store.dispatch(
                                WebCompatReporterAction.IncludeEtpBlockedUrlsChanged(
                                    include = isChecked,
                                ),
                            )
                        },
                    )
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = state.includeEtpBlockedUrls,
                    onCheckedChange = null,
                    modifier = Modifier,
                )

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = stringResource(id = R.string.webcompat_reporter_etp_checkbox_text),
                        color = MaterialTheme.colorScheme.onSurface,
                        style = FirefoxTheme.typography.body1,
                    )

                    Text(
                        text = stringResource(id = R.string.webcompat_reporter_etp_checkbox_description),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = FirefoxTheme.typography.body2,
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                text = stringResource(id = R.string.webcompat_reporter_preview_report),
                modifier = Modifier
                    .fillMaxWidth(),
                contentColor = MaterialTheme.colorScheme.primary,
                onClick = {
                    previewSheetVisible = true
                    store.dispatch(WebCompatReporterAction.OpenPreviewClicked)
                },
            )

            Spacer(modifier = Modifier.height(16.dp))

            FilledButton(
                text = stringResource(id = R.string.webcompat_reporter_send),
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics {
                        testTagsAsResourceId = true
                        testTag = BROKEN_SITE_REPORTER_SEND_BUTTON
                    },
                enabled = state.isSubmitEnabled,
            ) {
                store.dispatch(WebCompatReporterAction.SendReportClicked)
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(
                text = stringResource(id = R.string.webcompat_reporter_cancel),
                modifier = Modifier
                    .fillMaxWidth(),
                onClick = {
                    store.dispatch(WebCompatReporterAction.CancelClicked)
                },
            )

            // Note: the "Add more info" button is not meant for Release, so we're only
            // enabling it in Beta and Nightly/Debug
            if (Config.channel.isBeta || Config.channel.isNightlyOrDebug) {
                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = stringResource(id = R.string.webcompat_reporter_add_more_info),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            store.dispatch(WebCompatReporterAction.AddMoreInfoClicked)
                        },
                    style = FirefoxTheme.typography.body2.copy(textAlign = TextAlign.Center),
                    color = MaterialTheme.colorScheme.tertiary,
                    textDecoration = TextDecoration.Underline,
                )
            }
        }
    }

    if (previewSheetVisible) {
        WebCompatReporterPreviewSheet(
            previewJSON = state.previewJSON,
            onDismissRequest = { previewSheetVisible = false },
            onSendClick = { store.dispatch(WebCompatReporterAction.SendReportClicked) },
            isSendButtonEnabled = state.isSubmitEnabled,
        )
    }
}

/**
 * Helper function used to obtain the list of dropdown menu items derived from [BrokenSiteReason].
 *
 * @param onDropdownItemClick Callback invoked when the particular dropdown item is selected.
 * @return The list of [MenuItem.CheckableItem] to display in the dropdown.
 */
private fun WebCompatReporterState.toDropdownItems(
    onDropdownItemClick: (BrokenSiteReason) -> Unit,
): List<MenuItem.CheckableItem> {
    return BrokenSiteReason.entries.map { reason ->
        MenuItem.CheckableItem(
            text = Resource(reason.displayStringId),
            isChecked = this.reason == reason,
            onClick = {
                onDropdownItemClick(reason)
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TempAppBar(
    onBackClick: () -> Unit,
    scrollState: ScrollState,
) {
    TopAppBar(
        title = {
            Text(
                text = stringResource(id = R.string.webcompat_reporter_screen_title),
                style = FirefoxTheme.typography.headline5,
            )
        },
        navigationIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_back_24),
                    contentDescription = stringResource(R.string.bookmark_navigate_back_button_content_description),
                )
            }
        },
        windowInsets = WindowInsets(
            top = 0.dp,
            bottom = 0.dp,
        ),
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = if (scrollState.canScrollBackward) {
                MaterialTheme.colorScheme.surfaceContainerHigh
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
    )
}

private class WebCompatPreviewParameterProvider : ThemedValueProvider<WebCompatReporterState>(
    sequenceOf(
        // Initial feature opening
        WebCompatReporterState(
            enteredUrl = "www.example.com/url_parameters_that_break_the_page",
        ),
        // Error in URL field
        WebCompatReporterState(
            enteredUrl = "",
        ),
        // Multi-line description
        WebCompatReporterState(
            enteredUrl = "www.example.com/url_parameters_that_break_the_page",
            reason = BrokenSiteReason.Slow,
            problemDescription = "The site wouldn’t load and after I tried xyz it still wouldn’t " +
                    "load and then again site wouldn’t load and after I tried xyz it still wouldn’t " +
                    "load and then again site wouldn’t load and after I tried xyz it still wouldn’t " +
                    "load and then again site wouldn’t load and after I tried xyz it still wouldn’t " +
                    "load and then again site wouldn’t load and after I tried xyz it still wouldn’t " +
                    "load and then again ",
        ),
    ),
)

@Preview
@Composable
private fun WebCompatReporterPreview(
    @PreviewParameter(WebCompatPreviewParameterProvider::class) state: ThemedValue<WebCompatReporterState>,
) {
    FirefoxTheme(state.theme) {
        WebCompatReporter(
            store = WebCompatReporterStore(
                initialState = state.value,
            ),
        )
    }
}
