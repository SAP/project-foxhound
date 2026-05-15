/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen

import androidx.navigation.NavController
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIAction
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.settings.settingssearch.PreferenceFileInformation

/**
 * Middleware that handles navigation events for the download feature.
 *
 * @param navController [NavController] used to execute any navigation actions on the UI.
 */
class DownloadNavigationMiddleware(
    private val navController: NavController,
) : Middleware<DownloadUIState, DownloadUIAction> {

    override fun invoke(
        store: Store<DownloadUIState, DownloadUIAction>,
        next: (DownloadUIAction) -> Unit,
        action: DownloadUIAction,
    ) {
        next(action)
        when (action) {
            is DownloadUIAction.NavigationIconClicked -> {
                if (store.state.mode is DownloadUIState.Mode.Editing) {
                    store.dispatch(DownloadUIAction.ExitEditMode)
                } else {
                    navController.popBackStack()
                }
            }
            is DownloadUIAction.SettingsIconClicked -> {
                navController.navigate(
                    resId = PreferenceFileInformation.DownloadsSettingsPreferences.fragmentId,
                )
            }
            else -> {} // no-op
        }
    }
}
