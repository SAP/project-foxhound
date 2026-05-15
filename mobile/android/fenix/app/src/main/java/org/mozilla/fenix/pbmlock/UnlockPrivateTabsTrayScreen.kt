/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.pbmlock

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.FilledButton
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.isLargeWindow
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

private const val FILL_WIDTH_LARGE_WINDOW = 0.5f
private const val FILL_WIDTH_DEFAULT = 1.0f

/**
 * UI for displaying the Unlock Private Tabs Page in the Tabs Tray.
 *
 * @param modifier The modifier to be applied to the layout.
 * @param onUnlockClicked Invoked when the user taps the unlock button.
 */
@Composable
internal fun UnlockPrivateTabsTrayScreen(
    modifier: Modifier = Modifier,
    onUnlockClicked: () -> Unit,
) {
    val fillWidthFraction = if (LocalContext.current.isLargeWindow()) {
        FILL_WIDTH_LARGE_WINDOW
    } else {
        FILL_WIDTH_DEFAULT
    }

    Scaffold(
        modifier = modifier,
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 32.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                FilledButton(
                    text = stringResource(id = R.string.pbm_authentication_unlock),
                    modifier = Modifier.fillMaxWidth(fillWidthFraction),
                    onClick = onUnlockClicked,
                )
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            Text(
                text = stringResource(id = R.string.pbm_authentication_unlock_private_tabs),
                modifier = Modifier.align(Alignment.Center),
                style = FirefoxTheme.typography.headline6,
            )
        }
    }
}

@FlexibleWindowPreview
@Composable
private fun UnlockPrivateTabsTrayScreenPreview() {
    FirefoxTheme(Theme.Private) {
        UnlockPrivateTabsTrayScreen(onUnlockClicked = {})
    }
}
