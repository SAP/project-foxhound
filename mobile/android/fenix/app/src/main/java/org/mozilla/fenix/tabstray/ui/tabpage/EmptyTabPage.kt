/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.tabpage

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import mozilla.components.support.utils.ext.isLandscape

/**
 * Vertical spacing used when the device is in Portrait.
 */
private val EmptyPageContentOffset = 190.dp

/**
 * UI for displaying an Empty Tab Page in the Tab Manager.
 *
 * @see [NormalTabsPage], [PrivateTabsPage], [SyncedTabsPage]
 *
 * @param modifier The [Modifier] to be applied to the layout.
 * @param content The content of this [EmptyTabPage].
 */
@Composable
internal fun EmptyTabPage(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val isLandscape = LocalContext.current.isLandscape()

    Box(
        modifier = modifier
            .fillMaxSize(),
        contentAlignment = if (isLandscape) {
            Alignment.Center
        } else {
            Alignment.TopCenter
        },
    ) {
        Column {
            CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.secondary) {
                if (!isLandscape) {
                    Spacer(modifier = Modifier.height(EmptyPageContentOffset))
                }

                content()
            }
        }
    }
}
