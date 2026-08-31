/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Thumbnail belonging to a [tab]. If a thumbnail is not available, the favicon
 * will be displayed until the thumbnail is loaded.
 *
 * @param tabThumbnailImageData The tab information needed to render a thumbnail.
 * @param thumbnailSizePx Size of the thumbnail in pixels.
 * @param modifier [Modifier] used to draw the image content.
 * @param shape [Shape] to be applied to the thumbnail card.
 * @param border [BorderStroke] to be applied around the thumbnail card.
 * @param contentDescription Text used by accessibility services
 * to describe what this image represents.
 * @param alignment [Alignment] used to draw the image content.
 */
@Composable
fun TabThumbnail(
    tabThumbnailImageData: TabThumbnailImageData,
    thumbnailSizePx: Int,
    modifier: Modifier = Modifier,
    shape: Shape = CardDefaults.shape,
    border: BorderStroke? = null,
    contentDescription: String? = null,
    alignment: Alignment = Alignment.TopCenter,
) {
    Card(
        modifier = modifier,
        shape = shape,
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = border,
    ) {
        ThumbnailImage(
            tabThumbnailImageData = tabThumbnailImageData,
            thumbnailSizePx = thumbnailSizePx,
            alignment = alignment,
            modifier = Modifier.fillMaxSize(),
            contentDescription = contentDescription,
        )
    }
}

@Preview
@Composable
private fun ThumbnailCardPreview() {
    FirefoxTheme {
        TabThumbnail(
            tabThumbnailImageData = TabThumbnailImageData(
                tabUrl = "www.mozilla.com",
                tabId = "123",
                tabIcon = null,
                isPrivate = false,
            ),
            thumbnailSizePx = 108,
            modifier = Modifier.size(108.dp, 80.dp),
        )
    }
}
