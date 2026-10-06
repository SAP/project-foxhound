/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings

import androidx.compose.runtime.Composable
import org.mozilla.focus.R
import org.mozilla.focus.ext.requireComponents
import org.mozilla.focus.state.AppAction

/**
 * A fragment that displays the main settings screen.
 * It uses Jetpack Compose to render its UI.
 *
 * When a user interacts with a setting that requires navigating to a sub-page (e.g., "Search"),
 * this fragment dispatches an [AppAction.OpenSettings] action to handle the navigation logic.
 */
class SettingsFragment : BaseComposeFragment() {
    override val titleRes: Int = R.string.menu_settings

    @Composable
    override fun Content() {
        SettingsScreen { page ->
            requireComponents.appStore.dispatch(AppAction.OpenSettings(page))
        }
    }
}
