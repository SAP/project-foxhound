/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.compose

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.style.Hyphens
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.badge.BADGE_SIZE_SMALL
import mozilla.components.compose.base.badge.BadgedIcon
import mozilla.components.compose.base.theme.information
import mozilla.components.compose.base.theme.surfaceDimVariant
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

/**
 * A [Surface]-backed menu item used in the library menu group, displaying an icon above a label
 * and automatically adapting its background, icon tint, and text color according to [MenuItemState].
 *
 * @param modifier Modifier to apply to the root Surface container.
 * @param isHighlighted Whether this item should display a notification icon.
 * @param iconRes Drawable resource ID for the icon.
 * @param labelRes String resource ID for the label text.
 * @param state The state of the menu item to display.
 * @param shape The [RoundedCornerShape] to clip the background into.
 * @param index The index of the item within the row.
 * @param onClick Invoked when the user taps this item.
 */
@Composable
fun LibraryMenuItem(
    modifier: Modifier = Modifier,
    isHighlighted: Boolean = false,
    @DrawableRes iconRes: Int,
    @StringRes labelRes: Int,
    state: MenuItemState = MenuItemState.ENABLED,
    shape: RoundedCornerShape = RoundedCornerShape(4.dp),
    index: Int = 0,
    onClick: () -> Unit,
) {
    val contentDescription = stringResource(labelRes)

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .clickable(enabled = state != MenuItemState.DISABLED, onClick = onClick)
            .clearAndSetSemantics {
                collectionItemInfo =
                    CollectionItemInfo(
                        rowIndex = 0,
                        rowSpan = 1,
                        columnIndex = index,
                        columnSpan = 1,
                    )
                this.contentDescription = contentDescription
                role = Role.Button
            },
        color = MaterialTheme.colorScheme.surfaceDimVariant,
        shape = shape,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 12.dp),
        ) {
            BadgedIcon(
                painter = painterResource(iconRes),
                isHighlighted = isHighlighted,
                size = BADGE_SIZE_SMALL,
                contentDescription = null,
                containerColor = MaterialTheme.colorScheme.information,
                tint = MaterialTheme.colorScheme.onSurface,
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = stringResource(labelRes),
                style = FirefoxTheme.typography.caption.copy(
                    hyphens = Hyphens.Auto,
                ),
                modifier = Modifier
                    .fillMaxWidth(),
                textAlign = TextAlign.Center,
                maxLines = 2,
                softWrap = true,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun LibraryMenuItemPreview(
    @PreviewParameter(HighlightedItemPreviewParameterProvider::class) isHighlighted: Boolean,
) {
    val spacerWidth = 2.dp
    val innerRounding = 4.dp
    val outerRounding = 28.dp

    val leftShape = RoundedCornerShape(
        topStart = outerRounding,
        topEnd = innerRounding,
        bottomStart = outerRounding,
        bottomEnd = innerRounding,
    )
    val middleShape = RoundedCornerShape(innerRounding)
    val rightShape = RoundedCornerShape(
        topStart = innerRounding,
        topEnd = outerRounding,
        bottomStart = innerRounding,
        bottomEnd = outerRounding,
    )

    FirefoxTheme {
        Row(
            Modifier
                .background(color = MaterialTheme.colorScheme.surface)
                .fillMaxWidth()
                .height(IntrinsicSize.Min)
                .padding(all = FirefoxTheme.layout.space.static100),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LibraryMenuItem(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                isHighlighted = isHighlighted,
                iconRes = iconsR.drawable.mozac_ic_history_24,
                labelRes = R.string.library_history,
                shape = leftShape,
                onClick = {},
            )

            Spacer(Modifier.width(spacerWidth))

            LibraryMenuItem(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                isHighlighted = isHighlighted,
                iconRes = iconsR.drawable.mozac_ic_bookmark_tray_fill_24,
                labelRes = R.string.library_bookmarks,
                shape = middleShape,
                onClick = {},
            )

            Spacer(Modifier.width(spacerWidth))

            LibraryMenuItem(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                isHighlighted = isHighlighted,
                iconRes = iconsR.drawable.mozac_ic_download_24,
                labelRes = R.string.library_downloads,
                shape = middleShape,
                onClick = {},
            )

            Spacer(Modifier.width(spacerWidth))

            LibraryMenuItem(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                isHighlighted = isHighlighted,
                iconRes = iconsR.drawable.mozac_ic_login_24,
                labelRes = R.string.browser_menu_passwords,
                shape = rightShape,
                onClick = {},
            )
        }
    }
}

/**
 * A [PreviewParameterProvider] implementation that provides boolean values
 * representing the loading state of a site.
 */
class HighlightedItemPreviewParameterProvider : PreviewParameterProvider<Boolean> {
    override val values = sequenceOf(true, false)
}
