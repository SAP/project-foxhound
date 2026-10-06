/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.material3.DividerDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.browser.toolbar.ActionContainer
import mozilla.components.compose.browser.toolbar.R
import mozilla.components.compose.browser.toolbar.concept.Action
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_URL_BOX
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.MINIMAL_ADDRESS_BAR
import mozilla.components.compose.browser.toolbar.concept.PageOrigin
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarInteraction.BrowserToolbarEvent
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity.Bottom
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity.Top
import mozilla.components.compose.browser.toolbar.utils.DisplayToolbarDataProvider
import mozilla.components.compose.browser.toolbar.utils.DisplayToolbarPreviewModel
import mozilla.components.support.ktx.kotlin.getRegistrableDomainIndexRange

@Composable
internal fun MinimalDisplayToolbar(
    pageOrigin: PageOrigin,
    pageActionsStart: List<Action>,
    gravity: ToolbarGravity,
    modifier: Modifier = Modifier,
    backgroundColor: Color = MaterialTheme.colorScheme.surface,
    outlineColor: Color = DividerDefaults.color,
    pageActionsStartModifier: Modifier = Modifier,
    originModifier: Modifier = Modifier,
) {
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    val registrableDomain = remember(pageOrigin.url) {
        val url = pageOrigin.url ?: return@remember ""
        val (start, end) = url.getRegistrableDomainIndexRange() ?: return@remember url
        url.substring(start, end)
    }
    val contentDescription = stringResource(
        R.string.mozac_minimal_display_toolbar_content_description,
        registrableDomain,
    )

    Surface(color = backgroundColor) {
        Box {
            Row(
                modifier = modifier
                    .requiredHeight(dimensionResource(R.dimen.mozac_minimal_display_toolbar_height))
                    .clearAndSetSemantics {
                        this.contentDescription = contentDescription
                        testTagsAsResourceId = true
                        testTag = MINIMAL_ADDRESS_BAR
                    }
                    .pointerInput(Unit) {
                        focusRequester.requestFocus()
                        keyboardController?.hide()
                    },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                if (pageActionsStart.isNotEmpty()) {
                    ActionContainer(
                        actions = pageActionsStart,
                        onInteraction = {},
                        modifier = pageActionsStartModifier,
                    )
                }

                Origin(
                    hint = pageOrigin.hint,
                    url = registrableDomain,
                    title = null,
                    textGravity = pageOrigin.textGravity,
                    contextualMenuOptions = pageOrigin.contextualMenuOptions,
                    onClick = null,
                    onLongClick = null,
                    onInteraction = {},
                    modifier = Modifier
                        .testTag(ADDRESSBAR_URL_BOX)
                        .then(originModifier),
                )
            }

            HorizontalDivider(
                modifier = Modifier.align(
                    when (gravity) {
                        Top -> Alignment.BottomCenter
                        Bottom -> Alignment.TopCenter
                    },
                ),
                color = outlineColor,
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun MinimalDisplayToolbarPreview(
    @PreviewParameter(DisplayToolbarDataProvider::class) config: DisplayToolbarPreviewModel,
) {
    AcornTheme {
        Surface {
            MinimalDisplayToolbar(
                pageOrigin = PageOrigin(
                    hint = R.string.mozac_browser_toolbar_search_hint,
                    title = config.title,
                    url = config.url,
                    onClick = object : BrowserToolbarEvent {},
                ),
                pageActionsStart = config.pageActionsStart,
                gravity = config.gravity,
            )
        }
    }
}
