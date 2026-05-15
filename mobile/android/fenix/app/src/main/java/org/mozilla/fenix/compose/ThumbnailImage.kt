/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.trace
import kotlinx.coroutines.launch
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.compose.base.theme.information
import mozilla.components.compose.base.utils.inComposePreview
import mozilla.components.concept.base.images.ImageLoadRequest
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import org.mozilla.fenix.R
import org.mozilla.fenix.components.components
import org.mozilla.fenix.tabstray.TabsTrayTraceTag
import org.mozilla.fenix.theme.FirefoxTheme

private val FallbackIconSize = 36.dp

/**
 * Thumbnail belonging to a [TabSessionState]. Asynchronously fetches the bitmap from storage.
 *
 * @param tab The [TabSessionState] of the thumbnail to fetch.
 * @param thumbnailSizePx The requested size of the thumbnail in pixels.
 * @param alignment [Alignment] used to draw the image content.
 * @param modifier [Modifier] used to draw the image content.
 * @param contentDescription Optional text used by accessibility services to describe what this image
 * represents.
 */
@Composable
fun ThumbnailImage(
    tab: TabSessionState,
    thumbnailSizePx: Int,
    alignment: Alignment,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
) {
    val request = ImageLoadRequest(
        id = tab.id,
        size = thumbnailSizePx,
        isPrivate = tab.content.private,
    )

    ThumbnailImage(
        request = request,
        modifier = modifier,
        alignment = alignment,
        fallbackContent = {
            FallbackContent(
                tab = tab,
                modifier = modifier,
                contentDescription = contentDescription,
            )
        },
    )
}

/**
 * Thumbnail belonging to a [ImageLoadRequest]. Asynchronously fetches the bitmap from storage.
 *
 * @param request [ImageLoadRequest] used to fetch the thumbnail bitmap.
 * @param modifier [Modifier] used to draw the image content.
 * @param contentScale [ContentScale] used to draw image content.
 * @param alignment [Alignment] used to draw the image content.
 * @param fallbackContent The content to display with a thumbnail is unable to be loaded.
 */
@Composable
fun ThumbnailImage(
    request: ImageLoadRequest,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    alignment: Alignment = Alignment.Center,
    fallbackContent: @Composable () -> Unit,
) {
    if (inComposePreview) {
        Box(modifier = modifier)
    } else {
        trace(TabsTrayTraceTag.TRACE_THUMBNAIL_IMAGE_CREATION) {
            var state by remember { mutableStateOf(ThumbnailImageState(null, false)) }
            val scope = rememberCoroutineScope()
            val storage = components.core.thumbnailStorage

            DisposableEffect(Unit) {
                if (!state.hasLoaded) {
                    scope.launch {
                        val thumbnailBitmap = storage.loadThumbnail(request).await()
                        thumbnailBitmap?.prepareToDraw()
                        state = ThumbnailImageState(
                            bitmap = thumbnailBitmap,
                            hasLoaded = true,
                        )
                    }
                }

                onDispose {
                    // Recycle the bitmap to liberate the RAM. Without this, a list of [ThumbnailImage]
                    // will bloat the memory. This is a trade-off, however, as the bitmap
                    // will be re-fetched if this Composable is disposed and re-loaded.
                    state.bitmap?.recycle()
                    state = ThumbnailImageState(
                        bitmap = null,
                        hasLoaded = false,
                    )
                }
            }

            if (state.bitmap == null && state.hasLoaded) {
                fallbackContent()
            } else {
                state.bitmap?.let { bitmap ->
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = null,
                        modifier = modifier,
                        contentScale = contentScale,
                        alignment = alignment,
                    )
                }
            }
        }
    }
}

/**
 * The fallback content when a tab thumbnail bitmap is unavailable.
 *
 * If a favicon is available through [tab], this icon will be used. Otherwise, a new favicon will be fetched.
 *
 * @param tab [TabSessionState] containing the tab data and potential fallback favicon.
 * @param modifier [Modifier] used to draw the image content.
 * @param contentDescription Optional text used by accessibility services to describe what this content
 * represents.
 */
@Composable
private fun FallbackContent(
    tab: TabSessionState,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
) {
    Box(
        modifier = modifier
            .background(color = MaterialTheme.colorScheme.surfaceContainerLowest)
            .fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        val icon = tab.content.icon?.asImageBitmap()
        if (icon != null) {
            LaunchedEffect(icon) {
                icon.prepareToDraw()
            }

            Image(
                bitmap = icon,
                contentDescription = contentDescription,
                modifier = Modifier
                    .size(FallbackIconSize)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.FillWidth,
            )
        } else if (tab.content.url == ABOUT_HOME_URL) {
            Image(
                painter = painterResource(id = R.drawable.ic_firefox),
                contentDescription = null,
                modifier = Modifier
                    .size(FallbackIconSize)
                    .clip(RoundedCornerShape(8.dp)),
            )
        } else {
            Favicon(
                url = tab.content.url,
                size = FallbackIconSize,
            )
        }
    }
}

/**
 * State wrapper for [ThumbnailImage].
 */
private data class ThumbnailImageState(
    val bitmap: Bitmap?,
    val hasLoaded: Boolean,
)

/**
 * This preview does not demo anything. This is to ensure that [ThumbnailImage] does not break other previews.
 */
@Preview
@Composable
private fun ThumbnailImagePreview() {
    FirefoxTheme {
        Column {
            ThumbnailImage(
                request = ImageLoadRequest("1", 1, false),
                modifier = Modifier.size(50.dp),
                contentScale = ContentScale.Crop,
                alignment = Alignment.Center,
                fallbackContent = {},
            )

            ThumbnailImage(
                tab = createTab(url = "www.mozilla.com", title = "Mozilla"),
                thumbnailSizePx = 100,
                alignment = Alignment.Center,
                modifier = Modifier
                    .size(50.dp)
                    .background(color = MaterialTheme.colorScheme.information),
            )

            FallbackContent(
                tab = createTab(url = ABOUT_HOME_URL, title = "Mozilla"),
                modifier = Modifier.size(50.dp),
            )
        }
    }
}
