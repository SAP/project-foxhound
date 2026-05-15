/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.theme

import androidx.compose.runtime.Composable
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.theme.DefaultThemeProvider
import org.mozilla.fenix.theme.Theme
import org.mozilla.fenix.theme.ThemeProvider

/**
 * [ThemeProvider] for the Tab Manager.
 *
 * When on [Page.PrivateTabs], [Theme.Private] is used. Otherwise, we fallback to [DefaultThemeProvider].
 */
class TabManagerThemeProvider(val selectedPage: Page) : ThemeProvider {
    @Composable
    override fun provideTheme(): Theme =
        if (selectedPage == Page.PrivateTabs) {
            Theme.Private
        } else {
            DefaultThemeProvider.provideTheme()
        }
}
