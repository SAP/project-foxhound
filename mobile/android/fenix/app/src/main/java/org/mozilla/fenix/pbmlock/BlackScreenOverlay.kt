/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.pbmlock

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * A full-screen black overlay used to obscure private browsing content.
 */
@Composable
fun BlackScreenOverlay() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    )
}

@Preview
@Composable
private fun BlackScreenOverlayPreview() {
    FirefoxTheme {
        BlackScreenOverlay()
    }
}
