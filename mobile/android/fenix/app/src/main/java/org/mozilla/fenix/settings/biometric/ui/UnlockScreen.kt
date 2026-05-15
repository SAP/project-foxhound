/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.utils.getResolvedAttrResId
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.isLargeWindow
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme

private const val FILL_WIDTH_LARGE_WINDOW = 0.5f
private const val FILL_WIDTH_DEFAULT = 1.0f

/**
 * A screen allowing users to unlock their logins.
 *
 * @param title The title of the screen.
 * @param onUnlockClicked Invoked when the user taps the unlock button.
 * @param onLeaveClicked Invoked when the user taps the leave logins text.
 */
@Composable
internal fun UnlockScreen(
    title: String,
    onUnlockClicked: () -> Unit,
    onLeaveClicked: () -> Unit,
) {
    Surface {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            Header(title)

            Footer(onUnlockClicked, onLeaveClicked)
        }
    }
}

@Composable
private fun Header(title: String) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Logo()

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = title,
            textAlign = TextAlign.Center,
            style = FirefoxTheme.typography.headline6,
            maxLines = 2,
        )
    }
}

@Composable
private fun Logo() {
    Row(
        modifier = Modifier
            .padding(32.dp)
            .height(62.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            modifier = Modifier.padding(end = 14.dp),
            painter = painterResource(getResolvedAttrResId(R.attr.fenixWordmarkLogo)),
            contentDescription = null,
        )

        Image(
            modifier = Modifier.height(28.dp),
            painter = painterResource(getResolvedAttrResId(R.attr.fenixWordmarkText)),
            contentDescription = stringResource(R.string.app_name),
        )
    }
}

@Composable
private fun Footer(onUnlockClicked: () -> Unit, onLeaveClicked: () -> Unit) {
    val fillWidthFraction = if (LocalContext.current.isLargeWindow()) {
        FILL_WIDTH_LARGE_WINDOW
    } else {
        FILL_WIDTH_DEFAULT
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .padding(horizontal = 16.dp)
            .fillMaxWidth(fillWidthFraction),
    ) {
        FilledButton(
            text = stringResource(id = R.string.logins_biometric_unlock_button),
            modifier = Modifier.fillMaxWidth(),
            onClick = onUnlockClicked,
        )

        Spacer(modifier = Modifier.height(8.dp))

        TextButton(
            text = stringResource(R.string.logins_biometric_leave_button),
            onClick = onLeaveClicked,
        )
    }
}

@FlexibleWindowPreview
@Composable
private fun UnlockLoginsScreenContent(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        UnlockScreen(
            title = "Unlock to view your secure feature",
            onUnlockClicked = {},
            onLeaveClicked = {},
        )
    }
}
