/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.data.TabGroupTheme

/**
 * A dot that represents a Tab Group theme.
 *
 * @param theme The theme of the tab group to display.
 */
@Composable
fun TabGroupThemeDot(
    theme: TabGroupTheme,
) {
    Box(
        modifier = Modifier
            .size(18.dp)
            .background(
                color = theme.primary,
                shape = CircleShape,
            )
            .testTag(TabsTrayTestTag.BOTTOM_SHEET_CIRCLE),
    )
}
