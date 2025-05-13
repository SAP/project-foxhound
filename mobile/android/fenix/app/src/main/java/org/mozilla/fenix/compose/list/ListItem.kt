/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose.list

import android.content.res.Configuration
import android.widget.Toast
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.Divider
import org.mozilla.fenix.compose.Favicon
import org.mozilla.fenix.compose.annotation.LightDarkPreview
import org.mozilla.fenix.compose.button.RadioButton
import org.mozilla.fenix.compose.ext.thenConditional
import org.mozilla.fenix.theme.FirefoxTheme

private val LIST_ITEM_HEIGHT = 56.dp
private val ICON_SIZE = 24.dp
private val DIVIDER_VERTICAL_PADDING = 6.dp

private const val TOAST_LENGTH = Toast.LENGTH_SHORT

/**
 * List item used to display a label with an optional description text and an optional
 * [IconButton] or [Icon] at the end.
 *
 * @param label The label in the list item.
 * @param modifier [Modifier] to be applied to the layout.
 * @param maxLabelLines An optional maximum number of lines for the label text to span.
 * @param description An optional description text below the label.
 * @param maxDescriptionLines An optional maximum number of lines for the description text to span.
 * @param minHeight An optional minimum height for the list item.
 * @param onClick Called when the user clicks on the item.
 * @param iconPainter [Painter] used to display an icon after the list item.
 * @param iconDescription Content description of the icon.
 * @param iconTint Tint applied to [iconPainter].
 * @param onIconClick Called when the user clicks on the icon. An [IconButton] will be
 * displayed if this is provided. Otherwise, an [Icon] will be displayed.
 */
@Composable
fun TextListItem(
    label: String,
    modifier: Modifier = Modifier,
    maxLabelLines: Int = 1,
    description: String? = null,
    maxDescriptionLines: Int = 1,
    minHeight: Dp = LIST_ITEM_HEIGHT,
    onClick: (() -> Unit)? = null,
    iconPainter: Painter? = null,
    iconDescription: String? = null,
    iconTint: Color = FirefoxTheme.colors.iconPrimary,
    onIconClick: (() -> Unit)? = null,
) {
    ListItem(
        label = label,
        maxLabelLines = maxLabelLines,
        modifier = modifier,
        description = description,
        maxDescriptionLines = maxDescriptionLines,
        minHeight = minHeight,
        onClick = onClick,
    ) {
        if (iconPainter == null) {
            return@ListItem
        }

        Spacer(modifier = Modifier.width(16.dp))

        if (onIconClick == null) {
            Icon(
                painter = iconPainter,
                contentDescription = iconDescription,
                tint = iconTint,
            )
        } else {
            IconButton(
                onClick = onIconClick,
                modifier = Modifier
                    .size(ICON_SIZE)
                    .clearAndSetSemantics {},
            ) {
                Icon(
                    painter = iconPainter,
                    contentDescription = iconDescription,
                    tint = iconTint,
                )
            }
        }
    }
}

/**
 * List item used to display a label and a [Favicon] with an optional description text and
 * an optional [IconButton] at the end.
 *
 * @param label The label in the list item.
 * @param url Website [url] for which the favicon will be shown.
 * @param modifier [Modifier] to be applied to the layout.
 * @param description An optional description text below the label.
 * @param faviconPainter Optional painter to use when fetching a new favicon is unnecessary.
 * @param onClick Called when the user clicks on the item.
 * @param showDivider Whether or not to display a vertical divider line before the [IconButton]
 * at the end.
 * @param iconPainter [Painter] used to display an [IconButton] after the list item.
 * @param iconDescription Content description of the icon.
 * @param onIconClick Called when the user clicks on the icon.
 */
@Composable
fun FaviconListItem(
    label: String,
    url: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    faviconPainter: Painter? = null,
    onClick: (() -> Unit)? = null,
    showDivider: Boolean = false,
    iconPainter: Painter? = null,
    iconDescription: String? = null,
    onIconClick: (() -> Unit)? = null,
) {
    ListItem(
        label = label,
        modifier = modifier,
        description = description,
        onClick = onClick,
        beforeListAction = {
            if (faviconPainter != null) {
                Image(
                    painter = faviconPainter,
                    contentDescription = null,
                    modifier = Modifier.size(ICON_SIZE),
                )
            } else {
                Favicon(
                    url = url,
                    size = ICON_SIZE,
                )
            }

            Spacer(modifier = Modifier.width(16.dp))
        },
        afterListAction = {
            if (iconPainter == null || onIconClick == null) {
                return@ListItem
            }

            if (showDivider) {
                Spacer(modifier = Modifier.width(8.dp))

                Divider(
                    modifier = Modifier
                        .padding(vertical = DIVIDER_VERTICAL_PADDING)
                        .fillMaxHeight()
                        .width(1.dp),
                    color = FirefoxTheme.colors.borderSecondary,
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            IconButton(
                onClick = onIconClick,
                modifier = Modifier.size(ICON_SIZE),
            ) {
                Icon(
                    painter = iconPainter,
                    contentDescription = iconDescription,
                    tint = FirefoxTheme.colors.iconPrimary,
                )
            }
        },
    )
}

/**
 * List item used to display a label and an icon at the beginning with an optional description
 * text and an optional [IconButton] or [Icon] at the end.
 *
 * @param label The label in the list item.
 * @param modifier [Modifier] to be applied to the layout.
 * @param labelTextColor [Color] to be applied to the label.
 * @param descriptionTextColor [Color] to be applied to the description.
 * @param maxLabelLines An optional maximum number of lines for the label text to span.
 * @param description An optional description text below the label.
 * @param enabled Controls the enabled state of the list item. When `false`, the list item will not
 * be clickable.
 * @param minHeight An optional minimum height for the list item.
 * @param onClick Called when the user clicks on the item.
 * @param beforeIconPainter [Painter] used to display an [Icon] before the list item.
 * @param beforeIconDescription Content description of the icon.
 * @param beforeIconTint Tint applied to [beforeIconPainter].
 * @param showDivider Whether or not to display a vertical divider line before the [IconButton]
 * at the end.
 * @param afterIconPainter [Painter] used to display an icon after the list item.
 * @param afterIconDescription Content description of the icon.
 * @param afterIconTint Tint applied to [afterIconPainter].
 * @param onAfterIconClick Called when the user clicks on the icon. An [IconButton] will be
 * displayed if this is provided. Otherwise, an [Icon] will be displayed.
 */
@Composable
fun IconListItem(
    label: String,
    modifier: Modifier = Modifier,
    labelTextColor: Color = FirefoxTheme.colors.textPrimary,
    descriptionTextColor: Color = FirefoxTheme.colors.textSecondary,
    maxLabelLines: Int = 1,
    description: String? = null,
    enabled: Boolean = true,
    minHeight: Dp = LIST_ITEM_HEIGHT,
    onClick: (() -> Unit)? = null,
    beforeIconPainter: Painter,
    beforeIconDescription: String? = null,
    beforeIconTint: Color = FirefoxTheme.colors.iconPrimary,
    showDivider: Boolean = false,
    afterIconPainter: Painter? = null,
    afterIconDescription: String? = null,
    afterIconTint: Color = FirefoxTheme.colors.iconPrimary,
    onAfterIconClick: (() -> Unit)? = null,
) {
    ListItem(
        label = label,
        modifier = modifier,
        labelTextColor = labelTextColor,
        descriptionTextColor = descriptionTextColor,
        maxLabelLines = maxLabelLines,
        description = description,
        enabled = enabled,
        minHeight = minHeight,
        onClick = onClick,
        beforeListAction = {
            Icon(
                painter = beforeIconPainter,
                contentDescription = beforeIconDescription,
                tint = if (enabled) beforeIconTint else FirefoxTheme.colors.iconDisabled,
            )

            Spacer(modifier = Modifier.width(16.dp))
        },
        afterListAction = {
            if (afterIconPainter == null) {
                return@ListItem
            }

            val tint = if (enabled) afterIconTint else FirefoxTheme.colors.iconDisabled

            if (showDivider) {
                Spacer(modifier = Modifier.width(8.dp))

                Divider(
                    modifier = Modifier
                        .padding(vertical = DIVIDER_VERTICAL_PADDING)
                        .fillMaxHeight()
                        .width(1.dp),
                    color = FirefoxTheme.colors.borderSecondary,
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            if (onAfterIconClick == null) {
                Icon(
                    painter = afterIconPainter,
                    contentDescription = afterIconDescription,
                    tint = tint,
                )
            } else {
                IconButton(
                    onClick = onAfterIconClick,
                    modifier = Modifier.size(ICON_SIZE),
                    enabled = enabled,
                ) {
                    Icon(
                        painter = afterIconPainter,
                        contentDescription = afterIconDescription,
                        tint = tint,
                    )
                }
            }
        },
    )
}

/**
 * List item used to display a label with an optional description text and
 * a [RadioButton] at the beginning.
 *
 * @param label The label in the list item.
 * @param selected [Boolean] That indicates whether the [RadioButton] is currently selected.
 * @param modifier [Modifier] to be applied to the layout.
 * @param maxLabelLines An optional maximum number of lines for the label text to span.
 * @param description An optional description text below the label.
 * @param maxDescriptionLines An optional maximum number of lines for the description text to span.
 * @param onClick Called when the user clicks on the item.
 */
@Composable
fun RadioButtonListItem(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    maxLabelLines: Int = 1,
    description: String? = null,
    maxDescriptionLines: Int = 1,
    onClick: (() -> Unit),
) {
    ListItem(
        label = label,
        modifier = modifier
            .semantics(mergeDescendants = true) {
                this.selected = selected
                role = Role.RadioButton
            },
        maxLabelLines = maxLabelLines,
        description = description,
        maxDescriptionLines = maxDescriptionLines,
        onClick = onClick,
        beforeListAction = {
            RadioButton(
                selected = selected,
                modifier = Modifier
                    .size(ICON_SIZE)
                    .clearAndSetSemantics {},
                onClick = onClick,
            )

            Spacer(modifier = Modifier.width(32.dp))
        },
    )
}

/**
 * List item used to display a selectable item with an icon, label description and an action
 * composable at the end.
 *
 * @param label The label in the list item.
 * @param description The description text below the label.
 * @param icon The icon to be displayed at the beginning of the list item.
 * @param isSelected The selected state of the item.
 * @param afterListAction Composable for adding UI to the end of the list item.
 * @param modifier [Modifier] to be applied to the composable.
 */
@Composable
fun SelectableListItem(
    label: String,
    description: String,
    @DrawableRes icon: Int,
    isSelected: Boolean,
    afterListAction: @Composable RowScope.() -> Unit,
    modifier: Modifier = Modifier,
) {
    ListItem(
        label = label,
        description = description,
        modifier = modifier,
        beforeListAction = {
            SelectableItemIcon(
                icon = icon,
                isSelected = isSelected,
            )

            Spacer(modifier = Modifier.width(16.dp))
        },
        afterListAction = afterListAction,
    )
}

/**
 * Icon composable that displays a checkmark icon when the item is selected.
 *
 * @param icon The icon to be displayed.
 * @param isSelected The selected state of the item.
 */
@Composable
private fun SelectableItemIcon(
    @DrawableRes icon: Int,
    isSelected: Boolean,
) {
    if (isSelected) {
        Box(
            modifier = Modifier
                .background(
                    color = FirefoxTheme.colors.layerAccent,
                    shape = CircleShape,
                )
                .size(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painter = painterResource(id = R.drawable.mozac_ic_checkmark_24),
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = PhotonColors.White,
            )
        }
    } else {
        Icon(
            painter = painterResource(id = icon),
            contentDescription = null,
            tint = FirefoxTheme.colors.iconPrimary,
        )
    }
}

/**
 * Base list item used to display a label with an optional description text and
 * the flexibility to add custom UI to either end of the item.
 *
 * @param label The label in the list item.
 * @param modifier [Modifier] to be applied to the layout.
 * @param labelTextColor [Color] to be applied to the label.
 * @param descriptionTextColor [Color] to be applied to the description.
 * @param maxLabelLines An optional maximum number of lines for the label text to span.
 * @param description An optional description text below the label.
 * @param maxDescriptionLines An optional maximum number of lines for the description text to span.
 * @param enabled Controls the enabled state of the list item. When `false`, the list item will not
 * be clickable.
 * @param minHeight An optional minimum height for the list item.
 * @param onClick Called when the user clicks on the item.
 * @param beforeListAction Optional Composable for adding UI before the list item.
 * @param afterListAction Optional Composable for adding UI to the end of the list item.
 */
@Composable
private fun ListItem(
    label: String,
    modifier: Modifier = Modifier,
    labelTextColor: Color = FirefoxTheme.colors.textPrimary,
    descriptionTextColor: Color = FirefoxTheme.colors.textSecondary,
    maxLabelLines: Int = 1,
    description: String? = null,
    maxDescriptionLines: Int = 1,
    enabled: Boolean = true,
    minHeight: Dp = LIST_ITEM_HEIGHT,
    onClick: (() -> Unit)? = null,
    beforeListAction: @Composable RowScope.() -> Unit = {},
    afterListAction: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = modifier
            .height(IntrinsicSize.Min)
            .defaultMinSize(minHeight = minHeight)
            .thenConditional(
                modifier = Modifier.clickable { onClick?.invoke() },
                predicate = { onClick != null && enabled },
            )
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        beforeListAction()

        Column(
            modifier = Modifier.weight(1f),
        ) {
            Text(
                text = label,
                color = if (enabled) labelTextColor else FirefoxTheme.colors.textDisabled,
                overflow = TextOverflow.Ellipsis,
                style = FirefoxTheme.typography.subtitle1,
                maxLines = maxLabelLines,
            )

            description?.let {
                Text(
                    text = description,
                    color = if (enabled) descriptionTextColor else FirefoxTheme.colors.textDisabled,
                    overflow = TextOverflow.Ellipsis,
                    maxLines = maxDescriptionLines,
                    style = FirefoxTheme.typography.body2,
                )
            }
        }

        afterListAction()
    }
}

@Composable
@Preview(name = "TextListItem", uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun TextListItemPreview() {
    FirefoxTheme {
        Box(Modifier.background(FirefoxTheme.colors.layer1)) {
            TextListItem(label = "Label only")
        }
    }
}

@Composable
@Preview(name = "TextListItem with a description", uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun TextListItemWithDescriptionPreview() {
    FirefoxTheme {
        Box(Modifier.background(FirefoxTheme.colors.layer1)) {
            TextListItem(
                label = "Label + description",
                description = "Description text",
            )
        }
    }
}

@Composable
@Preview(name = "TextListItem with a right icon", uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun TextListItemWithIconPreview() {
    FirefoxTheme {
        Column(Modifier.background(FirefoxTheme.colors.layer1)) {
            val context = LocalContext.current
            TextListItem(
                label = "Label + right icon button",
                onClick = {},
                iconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                iconDescription = "click me",
                onIconClick = { Toast.makeText(context, "icon click", TOAST_LENGTH).show() },
            )

            TextListItem(
                label = "Label + right icon",
                onClick = {},
                iconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                iconDescription = "click me",
            )
        }
    }
}

@Composable
@Preview(name = "IconListItem", uiMode = Configuration.UI_MODE_NIGHT_YES)
private fun IconListItemPreview() {
    FirefoxTheme {
        Column(Modifier.background(FirefoxTheme.colors.layer1)) {
            IconListItem(
                label = "Left icon list item",
                onClick = {},
                beforeIconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                beforeIconDescription = "click me",
            )

            IconListItem(
                label = "Left icon list item",
                labelTextColor = FirefoxTheme.colors.textAccent,
                onClick = {},
                beforeIconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                beforeIconDescription = "click me",
                beforeIconTint = FirefoxTheme.colors.iconAccentViolet,
            )

            IconListItem(
                label = "Left icon list item + right icon",
                onClick = {},
                beforeIconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                beforeIconDescription = "click me",
                afterIconPainter = painterResource(R.drawable.mozac_ic_chevron_right_24),
                afterIconDescription = null,
            )

            IconListItem(
                label = "Left icon list item + right icon (disabled)",
                enabled = false,
                onClick = {},
                beforeIconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                beforeIconDescription = "click me",
                afterIconPainter = painterResource(R.drawable.mozac_ic_chevron_right_24),
                afterIconDescription = null,
            )
        }
    }
}

@Composable
@Preview(
    name = "IconListItem with after list action",
    uiMode = Configuration.UI_MODE_NIGHT_YES,
)
private fun IconListItemWithAfterListActionPreview() {
    FirefoxTheme {
        Column(Modifier.background(FirefoxTheme.colors.layer1)) {
            val context = LocalContext.current
            IconListItem(
                label = "IconListItem + right icon + clicks",
                beforeIconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                beforeIconDescription = null,
                afterIconPainter = painterResource(R.drawable.mozac_ic_ellipsis_vertical_24),
                afterIconDescription = "click me",
                onAfterIconClick = { Toast.makeText(context, "icon click", TOAST_LENGTH).show() },
            )

            IconListItem(
                label = "IconListItem + right icon + divider + clicks",
                beforeIconPainter = painterResource(R.drawable.mozac_ic_folder_24),
                beforeIconDescription = null,
                showDivider = true,
                afterIconPainter = painterResource(R.drawable.mozac_ic_ellipsis_vertical_24),
                afterIconDescription = "click me",
                onAfterIconClick = { Toast.makeText(context, "icon click", TOAST_LENGTH).show() },
            )
        }
    }
}

@Composable
@Preview(
    name = "FaviconListItem with a right icon and onClicks",
    uiMode = Configuration.UI_MODE_NIGHT_YES,
)
private fun FaviconListItemPreview() {
    FirefoxTheme {
        Column(Modifier.background(FirefoxTheme.colors.layer1)) {
            val context = LocalContext.current
            FaviconListItem(
                label = "Favicon + right icon + clicks",
                url = "",
                description = "Description text",
                onClick = { Toast.makeText(context, "list item click", TOAST_LENGTH).show() },
                iconPainter = painterResource(R.drawable.mozac_ic_ellipsis_vertical_24),
                onIconClick = { Toast.makeText(context, "icon click", TOAST_LENGTH).show() },
            )

            FaviconListItem(
                label = "Favicon + right icon + show divider + clicks",
                url = "",
                description = "Description text",
                onClick = { Toast.makeText(context, "list item click", TOAST_LENGTH).show() },
                showDivider = true,
                iconPainter = painterResource(R.drawable.mozac_ic_ellipsis_vertical_24),
                onIconClick = { Toast.makeText(context, "icon click", TOAST_LENGTH).show() },
            )

            FaviconListItem(
                label = "Favicon + painter",
                url = "",
                description = "Description text",
                faviconPainter = painterResource(id = R.drawable.mozac_ic_collection_24),
                onClick = { Toast.makeText(context, "list item click", TOAST_LENGTH).show() },
            )
        }
    }
}

@Composable
@LightDarkPreview
private fun RadioButtonListItemPreview() {
    val radioOptions =
        listOf("Radio button first item", "Radio button second item", "Radio button third item")
    val (selectedOption, onOptionSelected) = remember { mutableStateOf(radioOptions[1]) }
    FirefoxTheme {
        Column(Modifier.background(FirefoxTheme.colors.layer1)) {
            radioOptions.forEach { text ->
                RadioButtonListItem(
                    label = text,
                    description = "$text description",
                    onClick = { onOptionSelected(text) },
                    selected = (text == selectedOption),
                )
            }
        }
    }
}

@Composable
@LightDarkPreview
private fun SelectableListItemPreview() {
    FirefoxTheme {
        Column(Modifier.background(FirefoxTheme.colors.layer1)) {
            SelectableListItem(
                label = "Selected item",
                description = "Description text",
                icon = R.drawable.mozac_ic_folder_24,
                isSelected = true,
                afterListAction = {},
            )

            SelectableListItem(
                label = "Non selectable item",
                description = "without after action",
                icon = R.drawable.mozac_ic_folder_24,
                isSelected = false,
                afterListAction = {},
            )

            SelectableListItem(
                label = "Non selectable item",
                description = "with after action",
                icon = R.drawable.mozac_ic_folder_24,
                isSelected = false,
                afterListAction = {
                    IconButton(
                        onClick = {},
                        modifier = Modifier.size(ICON_SIZE),
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.mozac_ic_ellipsis_vertical_24),
                            tint = FirefoxTheme.colors.iconPrimary,
                            contentDescription = null,
                        )
                    }
                },
            )
        }
    }
}
