/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.acorn.components.ui

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.painterResource
import mozilla.components.compose.base.button.IconButton
import mozilla.components.ui.icons.R as iconsR

/**
 * A toggle button for switching between light and dark theme.
 */
@Composable
fun ThemeToggleButton() {
    val isDarkMode = isSystemInDarkTheme()

    IconButton(
        onClick = {
            AppCompatDelegate.setDefaultNightMode(
                if (isDarkMode) {
                    AppCompatDelegate.MODE_NIGHT_NO
                } else {
                    AppCompatDelegate.MODE_NIGHT_YES
                },
            )
        },
        contentDescription = if (isDarkMode) "Switch to light theme" else "Switch to dark theme",
    ) {
        Icon(
            painter = painterResource(
                if (isDarkMode) {
                    iconsR.drawable.mozac_ic_night_mode_fill_24
                } else {
                    iconsR.drawable.mozac_ic_night_mode_24
                },
            ),
            contentDescription = null,
        )
    }
}
