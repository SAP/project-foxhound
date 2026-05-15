/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.menu

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.menu.MenuItem.FixedItem.Level
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.text.Text
import mozilla.components.compose.base.text.value
import mozilla.components.compose.base.theme.AcornTheme
import androidx.compose.material3.DropdownMenu as MaterialDropdownMenu
import androidx.compose.material3.DropdownMenuItem as MaterialDropdownMenuItem
import mozilla.components.ui.icons.R as iconsR

private val MenuItemHeight = 48.dp

/**
 * A dropdown menu that displays a list of [MenuItem]s. The menu can be expanded or collapsed and
 * is displayed as a popup anchored to the menu button that triggers it.
 *
 * @param menuItems the list of [MenuItem]s to display in the menu.
 * @param expanded whether or not the menu is expanded.
 * @param modifier [Modifier] to be applied to the menu.
 * @param offset [DpOffset] from the original anchor position of the menu.
 * @param scrollState [ScrollState] used by the menu's content for vertical scrolling.
 * @param onDismissRequest Invoked when the user requests to dismiss the menu, such as by tapping
 * outside the menu's bounds.
 */
@Composable
fun DropdownMenu(
    menuItems: List<MenuItem>,
    expanded: Boolean,
    modifier: Modifier = Modifier,
    offset: DpOffset = DpOffset(0.dp, 0.dp),
    scrollState: ScrollState = rememberScrollState(),
    onDismissRequest: () -> Unit,
) {
    MaterialDropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        offset = offset,
        scrollState = scrollState,
        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
    ) {
        DropdownMenuContent(
            menuItems = menuItems,
            onDismissRequest = onDismissRequest,
        )

        val density = LocalDensity.current

        LaunchedEffect(Unit) {
            if (expanded) {
                menuItems.indexOfFirst {
                    it is MenuItem.CheckableItem && it.isChecked
                }.takeIf { it != -1 }?.let { index ->
                    val scrollPosition = with(density) { MenuItemHeight.toPx() * index }.toInt()
                    scrollState.scrollTo(scrollPosition)
                }
            }
        }
    }
}

@Composable
private fun DropdownMenuContent(
    menuItems: List<MenuItem>,
    onDismissRequest: () -> Unit,
) {
    menuItems.forEach {
        when (it) {
            is MenuItem.FixedItem -> {
                when (it) {
                    is MenuItem.TextItem -> FlexibleDropdownMenuItem(
                        onClick = {
                            onDismissRequest()
                            it.onClick()
                        },
                        enabled = it.enabled,
                        modifier = Modifier.testTag(it.testTag),
                        level = it.level,
                        content = { TextMenuItemContent(item = it) },
                    )

                    is MenuItem.IconItem -> FlexibleDropdownMenuItem(
                        onClick = {
                            onDismissRequest()
                            it.onClick()
                        },
                        enabled = it.enabled,
                        modifier = Modifier.testTag(it.testTag),
                        level = it.level,
                        content = { IconMenuItemContent(item = it) },
                    )

                    is MenuItem.CheckableItem -> FlexibleDropdownMenuItem(
                        onClick = {
                            onDismissRequest()
                            it.onClick()
                        },
                        enabled = it.enabled,
                        modifier = Modifier
                            .thenConditional(
                                Modifier.selectable(
                                    selected = it.isChecked,
                                    role = Role.Button,
                                    onClick = {
                                        onDismissRequest()
                                        it.onClick()
                                    },
                                ),
                            ) { it.enabled }
                            .testTag(it.testTag)
                            .thenConditional(
                                Modifier.semantics { traversalIndex = -1f },
                            ) { it.isChecked },
                        level = it.level,
                        content = { CheckableMenuItemContent(item = it) },
                    )
                }
            }

            is MenuItem.CustomMenuItem -> FlexibleDropdownMenuItem(
                onClick = {},
                content = {
                    it.content()
                },
            )

            is MenuItem.Divider -> HorizontalDivider()
        }
    }
}

@Composable
private fun TextMenuItemContent(
    item: MenuItem.TextItem,
) {
    MenuItemText(
        text = item.text,
        supportingText = item.supportingText,
    )
}

@Composable
private fun CheckableMenuItemContent(
    item: MenuItem.CheckableItem,
) {
    if (item.isChecked) {
        Icon(
            painter = painterResource(iconsR.drawable.mozac_ic_checkmark_24),
            contentDescription = null,
        )
    } else {
        Spacer(modifier = Modifier.size(24.dp))
    }

    MenuItemText(
        text = item.text,
        supportingText = item.supportingText,
    )
}

@Composable
private fun IconMenuItemContent(
    item: MenuItem.IconItem,
) {
    Icon(
        painter = painterResource(item.drawableRes),
        contentDescription = null,
    )

    MenuItemText(
        text = item.text,
        supportingText = item.supportingText,
    )
}

@Composable
private fun FlexibleDropdownMenuItem(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    contentPadding: PaddingValues = PaddingValues(all = AcornTheme.layout.space.static150),
    interactionSource: MutableInteractionSource? = null,
    level: Level = Level.Default,
    content: @Composable () -> Unit,
) {
    MaterialDropdownMenuItem(
        onClick = onClick,
        modifier = modifier
            .semantics(mergeDescendants = true) {},
        enabled = enabled,
        contentPadding = contentPadding,
        interactionSource = interactionSource,
        text = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(AcornTheme.layout.space.static150),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                content()
            }
        },
        colors = when (level) {
            Level.Default -> MenuDefaults.itemColors()
            Level.Critical -> MenuDefaults.itemColors(textColor = MaterialTheme.colorScheme.error)
        },
    )
}

@Composable
private fun MenuItemText(text: Text, supportingText: Text? = null) {
    Column(
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = text.value,
            style = AcornTheme.typography.body1,
        )

        supportingText?.let {
            Text(
                text = it.value,
                style = AcornTheme.typography.body1,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private data class MenuPreviewParameter(
    val itemType: ItemType,
    val menuItems: List<MenuItem>,
) {
    enum class ItemType {
        TEXT_ITEMS,
        CHECKABLE_ITEMS,
        ICON_ITEMS,
    }
}

private val menuPreviewParameters by lazy {
    listOf(
        MenuPreviewParameter(
            itemType = MenuPreviewParameter.ItemType.TEXT_ITEMS,
            menuItems = listOf(
                MenuItem.TextItem(
                    text = Text.String("Text Item 1"),
                    onClick = {},
                ),
                MenuItem.TextItem(
                    text = Text.String("Text Item 1"),
                    onClick = {},
                    supportingText = Text.String("Supporting text"),
                ),
            ),
        ),
        MenuPreviewParameter(
            itemType = MenuPreviewParameter.ItemType.CHECKABLE_ITEMS,
            menuItems = listOf(
                MenuItem.CheckableItem(
                    text = Text.String("Checkable Item 1"),
                    isChecked = true,
                    onClick = {},
                    supportingText = Text.String("Supporting text"),
                ),
                MenuItem.CheckableItem(
                    text = Text.String("Checkable Item 2"),
                    isChecked = false,
                    onClick = {},
                    supportingText = Text.String("Supporting text"),
                ),
            ),
        ),
        MenuPreviewParameter(
            itemType = MenuPreviewParameter.ItemType.ICON_ITEMS,
            menuItems = listOf(
                MenuItem.IconItem(
                    text = Text.String("Delete"),
                    drawableRes = iconsR.drawable.mozac_ic_delete_24,
                    level = Level.Critical,
                    onClick = {},
                ),
                MenuItem.IconItem(
                    text = Text.String("Have a cookie!"),
                    drawableRes = iconsR.drawable.mozac_ic_cookies_24,
                    onClick = {},
                    supportingText = Text.String("Supporting text"),
                ),
                MenuItem.Divider,
                MenuItem.IconItem(
                    text = Text.String("What's new"),
                    drawableRes = iconsR.drawable.mozac_ic_whats_new_24,
                    onClick = {},
                ),
            ),
        ),
    )
}

@PreviewLightDark
@Composable
@Suppress("LongMethod")
private fun DropdownMenuPreview() {
    AcornTheme {
        Column(
            modifier = Modifier
                .verticalScroll(rememberScrollState())
                .background(color = MaterialTheme.colorScheme.background)
                .fillMaxSize()
                .padding(AcornTheme.layout.space.dynamic400),
            verticalArrangement = Arrangement.spacedBy(AcornTheme.layout.space.dynamic200),
        ) {
            Text(
                text = "Click buttons to expand dropdown menu",
                style = AcornTheme.typography.body1,
                color = MaterialTheme.colorScheme.onSurface,
            )

            Text(
                text = """
                    The menu items along with checkable state should be hoisted in feature logic and simply passed to the DropdownMenu composable. The mapping is done here in the composable as an example, try to do that outside the composables.
                    Note: the menu does not show consistently when ran in an interactive preview. For best results, deploy the preview to a device.
                """.trimIndent(),
                style = AcornTheme.typography.caption,
                color = MaterialTheme.colorScheme.onSurface,
            )

            menuPreviewParameters.forEach {
                Box {
                    var expanded by remember { mutableStateOf(false) }
                    val text by remember { mutableStateOf(it.itemType.name.replace("_", " ")) }

                    FilledButton(
                        text = text,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        expanded = true
                    }
                    DropdownMenu(
                        menuItems = it.menuItems,
                        expanded = expanded,
                        onDismissRequest = { expanded = false },
                    )
                }
            }

            Text(
                text = "Dropdown menu items",
                style = AcornTheme.typography.body1,
                color = MaterialTheme.colorScheme.onSurface,
            )

            Column(
                modifier = Modifier.background(color = MaterialTheme.colorScheme.surfaceContainerLowest),
            ) {
                val menuItems: List<MenuItem> by remember {
                    mutableStateOf(menuPreviewParameters.map { it.menuItems.first() })
                }

                DropdownMenuContent(menuItems) { }
            }

            Text(
                text = "Dropdown menu items with dividers",
                style = AcornTheme.typography.body1,
                color = MaterialTheme.colorScheme.onSurface,
            )

            Column(
                modifier = Modifier.background(color = MaterialTheme.colorScheme.surfaceContainerLowest),
            ) {
                val menuItems: List<MenuItem> = remember {
                    val dividerList = mutableListOf<MenuItem>()
                    menuPreviewParameters.forEach {
                        dividerList.add(it.menuItems.first())
                        dividerList.add(MenuItem.Divider)
                    }
                    dividerList
                }

                DropdownMenuContent(menuItems) { }
            }

            Text(
                text = "Disabled menu items",
                style = AcornTheme.typography.body1,
                color = MaterialTheme.colorScheme.onSurface,
            )

            Column(
                modifier = Modifier.background(color = MaterialTheme.colorScheme.surfaceContainerLowest),
            ) {
                val disabledMenuItems: List<MenuItem> = remember {
                    menuPreviewParameters.map { it.menuItems.first() }.map { item ->
                        when (item) {
                            is MenuItem.TextItem ->
                                item.copy(enabled = false)
                            is MenuItem.IconItem ->
                                item.copy(enabled = false)
                            is MenuItem.CheckableItem ->
                                item.copy(enabled = false)
                            is MenuItem.CustomMenuItem ->
                                item
                            is MenuItem.Divider ->
                                item
                        }
                    }
                }

                DropdownMenuContent(disabledMenuItems) { }
            }

            Text(
                text = "Checkable menu item usage",
                style = AcornTheme.typography.body1,
                color = MaterialTheme.colorScheme.onSurface,
            )

            Column(
                modifier = Modifier.background(color = MaterialTheme.colorScheme.surfaceContainerLowest),
            ) {
                var isChecked by remember { mutableStateOf(true) }

                DropdownMenuContent(
                    menuItems = listOf(
                        MenuItem.CheckableItem(
                            text = Text.String(value = "Click me!"),
                            isChecked = isChecked,
                            onClick = { isChecked = !isChecked },
                        ),
                    ),
                    onDismissRequest = {},
                )
            }
        }
    }
}
