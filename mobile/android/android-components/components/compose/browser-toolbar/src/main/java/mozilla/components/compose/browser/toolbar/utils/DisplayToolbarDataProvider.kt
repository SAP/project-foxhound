/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.utils

import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import mozilla.components.compose.browser.toolbar.concept.Action
import mozilla.components.compose.browser.toolbar.concept.Action.ActionButtonRes
import mozilla.components.compose.browser.toolbar.concept.Action.SearchSelectorAction
import mozilla.components.compose.browser.toolbar.concept.Action.SearchSelectorAction.ContentDescription.StringResContentDescription
import mozilla.components.compose.browser.toolbar.concept.Action.SearchSelectorAction.Icon.DrawableResIcon
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarInteraction.BrowserToolbarEvent
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity.Bottom
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity.Top
import mozilla.components.ui.icons.R as iconsR

internal class DisplayToolbarDataProvider : PreviewParameterProvider<DisplayToolbarPreviewModel> {
    val browserStartActions = listOf(
        ActionButtonRes(
            drawableResId = iconsR.drawable.mozac_ic_home_24,
            contentDescription = android.R.string.untitled,
            onClick = object : BrowserToolbarEvent {},
        ),
    )
    val pageActionsStart = listOf(
        SearchSelectorAction(
            icon = DrawableResIcon(iconsR.drawable.mozac_ic_search_24),
            contentDescription = StringResContentDescription(resourceId = android.R.string.untitled),
            menu = { emptyList() },
            onClick = null,
        ),
    )
    val pageActionsEnd = listOf(
        ActionButtonRes(
            drawableResId = iconsR.drawable.mozac_ic_arrow_clockwise_24,
            contentDescription = android.R.string.untitled,
            onClick = object : BrowserToolbarEvent {},
        ),
    )
    val browserActionsEnd = listOf(
        ActionButtonRes(
            drawableResId = iconsR.drawable.mozac_ic_ellipsis_vertical_24,
            contentDescription = android.R.string.untitled,
            onClick = object : BrowserToolbarEvent {},
        ),
    )
    val title = "Firefox"
    val url = "mozilla.com/firefox"

    override val values = sequenceOf(
        DisplayToolbarPreviewModel(
            browserStartActions = browserStartActions,
            pageActionsStart = pageActionsStart,
            title = title,
            url = url,
            gravity = Top,
            pageActionsEnd = pageActionsEnd,
            browserEndActions = browserActionsEnd,
        ),
        DisplayToolbarPreviewModel(
            browserStartActions = emptyList(),
            pageActionsStart = pageActionsStart,
            title = null,
            url = url,
            gravity = Bottom,
            pageActionsEnd = pageActionsEnd,
            browserEndActions = emptyList(),
        ),
        DisplayToolbarPreviewModel(
            browserStartActions = browserStartActions,
            pageActionsStart = emptyList(),
            title = title,
            url = url,
            gravity = Top,
            pageActionsEnd = emptyList(),
            browserEndActions = browserActionsEnd,
        ),
        DisplayToolbarPreviewModel(
            browserStartActions = emptyList(),
            pageActionsStart = emptyList(),
            title = null,
            url = null,
            gravity = Bottom,
            pageActionsEnd = emptyList(),
            browserEndActions = emptyList(),
        ),
    )
}

internal data class DisplayToolbarPreviewModel(
    val browserStartActions: List<Action>,
    val pageActionsStart: List<Action>,
    val title: String?,
    val url: String?,
    val gravity: ToolbarGravity,
    val pageActionsEnd: List<Action>,
    val browserEndActions: List<Action>,
)
