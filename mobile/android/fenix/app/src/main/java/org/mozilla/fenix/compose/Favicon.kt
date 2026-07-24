/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mozilla.components.browser.icons.IconRequest
import mozilla.components.browser.icons.compose.Placeholder
import mozilla.components.browser.icons.compose.WithIcon
import mozilla.components.compose.base.utils.inComposePreview
import org.mozilla.fenix.components.components
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme

internal val FAVICON_ROUNDED_CORNER_SHAPE = RoundedCornerShape(2.dp)

/**
 * Load and display the favicon of a particular website.
 *
 * @param url Website URL for which the favicon will be shown.
 * @param size [Dp] height and width of the image to be loaded.
 * @param modifier [Modifier] to be applied to the layout.
 * @param isPrivate Whether or not a private request (like in private browsing) should be used to
 * download the icon (if needed).
 * @param imageUrl Optional image URL to create an [IconRequest.Resource] from.
 * @param shape The shape used to clip the favicon. Defaults to a slightly rounded rectangle.
 * Use [CircleShape] for a round image.
 */
@Composable
fun Favicon(
    url: String,
    size: Dp,
    modifier: Modifier = Modifier,
    isPrivate: Boolean = false,
    imageUrl: String? = null,
    shape: Shape = FAVICON_ROUNDED_CORNER_SHAPE,
) {
    Favicon(
        size = size,
        modifier = modifier,
        shape = shape,
    ) {
        val iconResource = imageUrl?.let {
            IconRequest.Resource(
                url = imageUrl,
                type = IconRequest.Resource.Type.FAVICON,
            )
        }

        components.core.icons.LoadableImage(
            url = url,
            iconResource = iconResource,
            isPrivate = isPrivate,
            iconSize = size.toIconRequestSize(),
        ) {
            Placeholder {
                FaviconPlaceholder(
                    size = size,
                    modifier = modifier,
                    shape = shape,
                )
            }

            WithIcon { icon ->
                Image(
                    painter = icon.painter,
                    contentDescription = null,
                    modifier = modifier
                        .size(size)
                        .clip(shape),
                    contentScale = ContentScale.Crop,
                )
            }
        }
    }
}

/**
 * Load and display the favicon of a particular website.
 *
 * @param imageResource ID of a drawable resource to be shown.
 * @param size [Dp] height and width of the image to be displayed.
 * @param modifier [Modifier] to be applied to the layout.
 * @param shape The shape used to clip the favicon. Defaults to a slightly rounded rectangle.
 * Use [CircleShape] for a round image.
 */
@Composable
fun Favicon(
    @DrawableRes imageResource: Int,
    size: Dp,
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(2.dp),
) {
    Favicon(
        size = size,
        modifier = modifier,
        shape = shape,
    ) {
        Image(
            painter = painterResource(id = imageResource),
            contentDescription = null,
            modifier = modifier
                .size(size)
                .clip(shape),
            contentScale = ContentScale.Crop,
        )
    }
}

/**
 * Displays a favicon given a [content] slot.
 *
 * @param size [Dp] height and width of the placeholder to display.
 * @param modifier [Modifier] to be applied to the layout.
 * @param shape The shape used to clip the favicon. Defaults to a slightly rounded rectangle.
 * Use [CircleShape] for a round image.
 * @param content The content to be displayed in the favicon.
 */
@Composable
private fun Favicon(
    size: Dp,
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(2.dp),
    content: @Composable () -> Unit,
) {
    if (inComposePreview) {
        FaviconPlaceholder(
            size = size,
            modifier = modifier,
            shape = shape,
        )
    } else {
        content()
    }
}

/**
 * Placeholder used while the Favicon image is loading.
 *
 * @param size [Dp] height and width of the image.
 * @param modifier [Modifier] allowing to control among others the dimensions and shape of the image.
 * @param shape The shape to clip the placeholder to.
 */
@Composable
private fun FaviconPlaceholder(
    size: Dp,
    modifier: Modifier = Modifier,
    shape: Shape,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(
                color = MaterialTheme.colorScheme.surfaceContainerHighest,
            ),
    )
}

@Preview
@Composable
private fun FaviconPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        Favicon(
            url = "www.mozilla.com",
            size = 64.dp,
            modifier = Modifier
                .background(MaterialTheme.colorScheme.surfaceContainerLowest)
                .padding(all = FirefoxTheme.layout.space.static200),
        )
    }
}

@Composable
private fun Dp.toIconRequestSize() = when {
    value <= dimensionResource(IconRequest.Size.DEFAULT.dimen).value -> IconRequest.Size.DEFAULT
    value <= dimensionResource(IconRequest.Size.LAUNCHER.dimen).value -> IconRequest.Size.LAUNCHER
    else -> IconRequest.Size.LAUNCHER_ADAPTIVE
}
