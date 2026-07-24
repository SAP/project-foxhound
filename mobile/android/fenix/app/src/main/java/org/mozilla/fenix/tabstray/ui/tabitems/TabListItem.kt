/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.tabitems

import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.core.DecayAnimationSpec
import androidx.compose.animation.rememberSplineBasedDecay
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.compose.base.RadioCheckmark
import mozilla.components.support.base.utils.MAX_URI_LENGTH
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.DismissibleItemBackground
import org.mozilla.fenix.compose.SwipeToDismissBox2
import org.mozilla.fenix.compose.SwipeToDismissState2
import org.mozilla.fenix.compose.TabThumbnail
import org.mozilla.fenix.ext.toShortUrl
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.ext.toDisplayTitle
import org.mozilla.fenix.tabstray.ui.sharedTabTransition
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.browser.tabstray.R as tabstrayR
import mozilla.components.ui.icons.R as iconsR

private val ThumbnailWidth = 78.dp
private val ThumbnailHeight = 68.dp

/**
 * List item used to display a tab that supports clicks,
 * long clicks, multiselection, and media controls.
 *
 * @param tab The given tab to be render as view a grid item.
 * @param modifier [Modifier] to be applied to the tab list item content.
 * @param isSelected Indicates if the item should be render as selected.
 * @param multiSelectionEnabled Indicates if the item should be render with multi selection options,
 * enabled.
 * @param multiSelectionSelected Indicates if the item should be render as multi selection selected
 * option.
 * @param shouldClickListen Whether or not the item should stop listening to click events.
 * @param swipingEnabled Whether or not the item is swipeable.
 * @param onCloseClick Callback to handle the click event of the close button.
 * @param onClick Callback to handle when item is clicked.
 * @param onLongClick Optional callback to handle when item is long clicked.
 */
@Composable
fun TabListItem(
    tab: TabSessionState,
    modifier: Modifier = Modifier,
    isSelected: Boolean = false,
    multiSelectionEnabled: Boolean = false,
    multiSelectionSelected: Boolean = false,
    shouldClickListen: Boolean = true,
    swipingEnabled: Boolean = true,
    onCloseClick: (tab: TabSessionState) -> Unit,
    onClick: (tab: TabSessionState) -> Unit,
    onLongClick: ((tab: TabSessionState) -> Unit)? = null,
) {
    val decayAnimationSpec: DecayAnimationSpec<Float> = rememberSplineBasedDecay()
    val density = LocalDensity.current
    val isRtl = LocalLayoutDirection.current == LayoutDirection.Rtl

    val swipeState = remember(multiSelectionEnabled, swipingEnabled) {
        SwipeToDismissState2(
            density = density,
            enabled = !multiSelectionEnabled && swipingEnabled,
            decayAnimationSpec = decayAnimationSpec,
            isRtl = isRtl,
        )
    }

    SwipeToDismissBox2(
        state = swipeState,
        onItemDismiss = {
            onCloseClick(tab)
        },
        backgroundContent = {
            DismissibleItemBackground(
                isSwipeActive = swipeState.swipingActive,
                isSwipingToStart = swipeState.swipingActive && swipeState.isSwipingToStart,
            )
        },
    ) {
        TabContent(
            tab = tab,
            isSelected = isSelected,
            multiSelectionEnabled = multiSelectionEnabled,
            multiSelectionSelected = multiSelectionSelected,
            shouldClickListen = shouldClickListen,
            modifier = modifier,
            onCloseClick = onCloseClick,
            onClick = onClick,
            onLongClick = onLongClick,
        )
    }
}

@Suppress("LongMethod", "LongParameterList")
@Composable
private fun TabContent(
    tab: TabSessionState,
    isSelected: Boolean,
    multiSelectionEnabled: Boolean,
    multiSelectionSelected: Boolean,
    shouldClickListen: Boolean,
    modifier: Modifier = Modifier,
    onCloseClick: (tab: TabSessionState) -> Unit,
    onClick: (tab: TabSessionState) -> Unit,
    onLongClick: ((tab: TabSessionState) -> Unit)? = null,
) {
    val contentBackgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.primaryContainer
    } else if (multiSelectionSelected) {
        MaterialTheme.colorScheme.surfaceContainerHigh
    } else {
        MaterialTheme.colorScheme.surfaceContainerLowest
    }

    // Used to propagate the ripple effect to the whole tab
    val interactionSource = remember { MutableInteractionSource() }

    val clickableModifier = if (onLongClick == null) {
        Modifier.clickable(
            enabled = shouldClickListen,
            interactionSource = interactionSource,
            indication = ripple(
                color = clickableColor(),
            ),
            onClick = { onClick(tab) },
        )
    } else {
        Modifier.combinedClickable(
            enabled = shouldClickListen,
            interactionSource = interactionSource,
            indication = ripple(
                color = clickableColor(),
            ),
            onLongClick = { onLongClick(tab) },
            onClick = { onClick(tab) },
        )
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(contentBackgroundColor)
            .then(clickableModifier)
            .padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
            .testTag(TabsTrayTestTag.TAB_ITEM_ROOT)
            .semantics {
                selected = isSelected
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Thumbnail(tab = tab)

        Column(
            modifier = Modifier
                .padding(start = 16.dp)
                .weight(weight = 1f),
        ) {
            Text(
                text = tab.toDisplayTitle().take(MAX_URI_LENGTH),
                color = MaterialTheme.colorScheme.onSurface,
                style = FirefoxTheme.typography.body1,
                overflow = TextOverflow.Ellipsis,
                maxLines = 2,
            )

            Text(
                text = tab.content.url.toShortUrl(),
                color = MaterialTheme.colorScheme.secondary,
                style = FirefoxTheme.typography.body2,
                overflow = TextOverflow.Ellipsis,
                maxLines = 1,
            )
        }

        if (!multiSelectionEnabled) {
            IconButton(
                onClick = { onCloseClick(tab) },
                modifier = Modifier
                    .size(size = 48.dp)
                    .testTag(TabsTrayTestTag.TAB_ITEM_CLOSE),
            ) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_cross_24),
                    contentDescription = stringResource(
                        id = R.string.close_tab_title,
                        tab.toDisplayTitle(),
                    ),
                    tint = MaterialTheme.colorScheme.secondary,
                )
            }
        } else {
            RadioCheckmark(
                isSelected = multiSelectionSelected,
                modifier = Modifier.padding(end = 16.dp),
            )
        }
    }
}

@Composable
private fun clickableColor() = when (isSystemInDarkTheme()) {
    true -> PhotonColors.White
    false -> PhotonColors.Black
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun Thumbnail(
    tab: TabSessionState,
) {
    val density = LocalDensity.current
    val thumbnailSize = with(density) { ThumbnailWidth.toPx() }.toInt()
    TabThumbnail(
        tab = tab,
        thumbnailSizePx = thumbnailSize,
        modifier = Modifier
            .sharedTabTransition(tab = tab)
            .size(
                width = ThumbnailWidth,
                height = ThumbnailHeight,
            )
            .testTag(TabsTrayTestTag.TAB_ITEM_THUMBNAIL),
        shape = RoundedCornerShape(size = 4.dp),
        border = BorderStroke(width = 1.dp, color = MaterialTheme.colorScheme.outlineVariant),
        contentDescription = stringResource(id = tabstrayR.string.mozac_browser_tabstray_open_tab),
    )
}

private data class TabListItemPreviewState(
    val isSelected: Boolean,
    val multiSelectionEnabled: Boolean,
    val multiSelectionSelected: Boolean,
    val url: String = "www.mozilla.org",
    val title: String = "Mozilla Domain",
)

private class TabListItemParameterProvider : PreviewParameterProvider<TabListItemPreviewState> {
    override val values: Sequence<TabListItemPreviewState>
        get() = sequenceOf(
            TabListItemPreviewState(
                isSelected = false,
                multiSelectionEnabled = false,
                multiSelectionSelected = false,
            ),
            TabListItemPreviewState(
                isSelected = true,
                multiSelectionEnabled = false,
                multiSelectionSelected = false,
            ),
            TabListItemPreviewState(
                isSelected = false,
                multiSelectionEnabled = true,
                multiSelectionSelected = false,
            ),
            TabListItemPreviewState(
                isSelected = true,
                multiSelectionEnabled = true,
                multiSelectionSelected = false,
            ),
            TabListItemPreviewState(
                isSelected = false,
                multiSelectionEnabled = true,
                multiSelectionSelected = true,
            ),
            TabListItemPreviewState(
                isSelected = true,
                multiSelectionEnabled = true,
                multiSelectionSelected = true,
            ),
            TabListItemPreviewState(
                isSelected = false,
                multiSelectionEnabled = false,
                multiSelectionSelected = false,
                url = "www.google.com/superlongurl",
                title = "Super super super super super super super super long title",
            ),
        )
}

@Composable
@PreviewLightDark
private fun TabListItemPreview(
    @PreviewParameter(TabListItemParameterProvider::class) tabListItemState: TabListItemPreviewState,
) {
    FirefoxTheme {
        TabListItem(
            tab = createTab(
                url = tabListItemState.url,
                title = tabListItemState.title,
            ),
            isSelected = tabListItemState.isSelected,
            onCloseClick = {},
            onClick = {},
            multiSelectionEnabled = tabListItemState.multiSelectionEnabled,
            multiSelectionSelected = tabListItemState.multiSelectionSelected,
        )
    }
}
