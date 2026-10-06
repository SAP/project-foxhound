/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mozilla.components.compose.base.modifier.skeletonLoader
import mozilla.components.compose.base.modifier.thenConditional
import org.mozilla.fenix.home.topsites.ui.HomepageCard
import org.mozilla.fenix.home.topsites.ui.homepageCardImageShape
import org.mozilla.fenix.theme.FirefoxTheme

const val ITEM_WIDTH = 305
const val IMAGE_SIZE = 66

/**
 * Shared default configuration of a ListItemTabLarge Composable.
 *
 * @param imageUrl URL from where the to download a header image of the tab this composable renders.
 * @param imageContentScale Optional scale parameter used to determine the aspect ratio scaling to
 * be used on the image.
 * @param backgroundColor Background [Color] of the item.
 * @param contentPadding Padding used for the image and details of the item.
 * @param onClick Optional callback to be invoked when this composable is clicked.
 * @param tabDetails [Composable] Displayed to the the end of the image. Allows for variation in the item text style.
 */
@Composable
fun ListItemTabSurface(
    imageUrl: String,
    imageContentScale: ContentScale = ContentScale.FillHeight,
    backgroundColor: Color = MaterialTheme.colorScheme.surfaceContainerLowest,
    contentPadding: PaddingValues = PaddingValues(FirefoxTheme.layout.space.static50),
    onClick: (() -> Unit)? = null,
    tabDetails: @Composable ColumnScope.() -> Unit,
) {
    val modifier = Modifier
        .width(ITEM_WIDTH.dp)
        .fillMaxHeight()
        .thenConditional(
            modifier = Modifier.clickable { onClick!!() },
            predicate = { onClick != null },
        )

    HomepageCard(
        modifier = modifier,
        backgroundColor = backgroundColor,
    ) {
        Row(
            modifier = Modifier
                .fillMaxHeight()
                .padding(contentPadding),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                url = imageUrl,
                modifier = Modifier.size(IMAGE_SIZE.dp)
                    .clip(homepageCardImageShape),
                private = false,
                targetSize = IMAGE_SIZE.dp,
                contentScale = imageContentScale,
                placeholder = {
                    Box(
                        modifier = Modifier
                            .size(IMAGE_SIZE.dp)
                            .clip(homepageCardImageShape)
                            .skeletonLoader(),
                    )
                },
            )

            Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static100))

            Column(
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                tabDetails()
            }
        }
    }
}

@Composable
@PreviewLightDark
private fun ListItemTabSurfacePreview() {
    FirefoxTheme {
        ListItemTabSurface(
            imageUrl = "",
        ) {
            Text(
                text = "This can be anything",
                fontSize = 22.sp,
            )
        }
    }
}

@Composable
@PreviewLightDark
private fun ListItemTabSurfaceWithCustomBackgroundPreview() {
    FirefoxTheme {
        ListItemTabSurface(
            imageUrl = "",
            backgroundColor = Color.Cyan,
        ) {
            Text(
                text = "This can be anything",
                fontSize = 14.sp,
            )
        }
    }
}
