/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.browser.state.state.createTab
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.TabThumbnailImageData
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.data.TabGroupTheme
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.ui.tabitems.TabsTrayItemSelectionState
import org.mozilla.fenix.tabstray.ui.tabitems.tablistItemThumbnailBorder
import org.mozilla.fenix.theme.FirefoxTheme

private val THUMBNAIL_WIDTH = 78.dp
private val THUMBNAIL_HEIGHT = 68.dp

/**
 * A Tab Group presented as a clickable item in a row or list.
 *
 * @param tabGroup The tab group to display.
 * @param onClick The action to be performed when the tab group item is clicked.
 * @param modifier The Modifier
 * @param selectionState: The tab selection state.
 * @param trailingContent Optional trailing content.
 * @param trailingContentColor Optional content color for trailing content.
 * @param shouldClickListen Whether the [TabGroupRow] should respond to click events.
 */
@Composable
fun TabGroupRow(
    tabGroup: TabsTrayItem.TabGroup,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selectionState: TabsTrayItemSelectionState = TabsTrayItemSelectionState(),
    trailingContent: @Composable (() -> Unit)? = null,
    trailingContentColor: Color? = null,
    shouldClickListen: Boolean = true,
) {
    val tabGroupRowContentDescription = pluralStringResource(
        id = R.plurals.add_to_exiting_tab_group_content_description,
        count = tabGroup.tabs.size,
        tabGroup.title,
        tabGroup.tabs.size,
        tabGroup.theme.contentLabel,
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = shouldClickListen, onClick = onClick)
            .testTag("${TabsTrayTestTag.TAB_GROUP_ROOT}.${tabGroup.id}")
            .padding(
                if (trailingContent == null) {
                    PaddingValues(
                        horizontal = FirefoxTheme.layout.space.dynamic200,
                        vertical = FirefoxTheme.layout.space.static100,
                    )
                } else {
                    PaddingValues(
                        start = FirefoxTheme.layout.space.dynamic200,
                        top = FirefoxTheme.layout.space.static100,
                        end = 0.dp,
                        bottom = FirefoxTheme.layout.space.static100,
                    )
                },
            )
            .semantics(mergeDescendants = true) {
                contentDescription = tabGroupRowContentDescription
                role = Role.Button
                selected = selectionState.isFocused
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static200),
    ) {
        TabGroupListThumbnail(
            thumbnails = tabGroup.thumbnails,
        )

        TabGroupTextContent(tabGroup = tabGroup, modifier = Modifier.weight(1f))

        trailingContent?.let { content ->
            CompositionLocalProvider(
                LocalContentColor provides (trailingContentColor ?: LocalContentColor.current),
            ) {
                content()
            }
        }
    }
}

@Composable
private fun TabGroupTextContent(
    tabGroup: TabsTrayItem.TabGroup,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TabGroupThemeDot(tabGroup.theme)

            Spacer(modifier = Modifier.width(4.dp))

            Text(
                text = tabGroup.title,
                modifier = Modifier.clearAndSetSemantics { },
                color = MaterialTheme.colorScheme.onSurface,
                style = FirefoxTheme.typography.body1,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = pluralStringResource(
                id = R.plurals.tab_group_tabs_count_subtitle,
                count = tabGroup.tabs.size,
                tabGroup.tabs.size,
            ),
            modifier = Modifier.clearAndSetSemantics { },
            color = MaterialTheme.colorScheme.secondary,
            style = FirefoxTheme.typography.caption,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun TabGroupListThumbnail(
    thumbnails: List<TabThumbnailImageData>,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .size(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT),
        border = tablistItemThumbnailBorder,
        shape = MaterialTheme.shapes.extraSmall,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
        ),
    ) {
        ThumbnailsGridView(
            thumbnails = thumbnails,
            modifier = Modifier
                .clip(MaterialTheme.shapes.extraSmall)
                .padding(tablistItemThumbnailBorder.width) // inset to prevent spillover
                .fillMaxSize(),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TabGroupRowPreview() {
    val tab = TabsTrayItem.Tab(createTab("test1"))
    val tab2 = TabsTrayItem.Tab(createTab("test2"))
    val tab3 = TabsTrayItem.Tab(createTab("test3"))
    val tab4 = TabsTrayItem.Tab(createTab("test4"))

    TabGroupRow(
        tabGroup = TabsTrayItem.TabGroup(
            title = "Tab Group",
            theme = TabGroupTheme.default,
            tabs = mutableListOf(tab, tab2, tab3, tab4),
            closed = false,
        ),
        onClick = {},
    )
}
