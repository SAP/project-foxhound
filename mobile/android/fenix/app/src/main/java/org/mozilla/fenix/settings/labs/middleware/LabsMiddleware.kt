/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.middleware

import android.content.SharedPreferences
import androidx.core.content.edit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.labs.FeatureKey
import org.mozilla.fenix.settings.labs.LabsFeature
import org.mozilla.fenix.settings.labs.store.LabsAction
import org.mozilla.fenix.settings.labs.store.LabsState
import org.mozilla.fenix.utils.Settings

/**
 * [Middleware] implementation for handling [LabsAction] and managing the [LabsState] for the
 * Firefox Labs screen.
 *
 * @param settings An instance of [Settings] to read and write to the [SharedPreferences]
 * properties.
 * @param onRestart Callback invoked to restart the application.
 * @param scope [CoroutineScope] used to launch coroutines.
 */
class LabsMiddleware(
    private val settings: Settings,
    private val onRestart: () -> Unit,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
) : Middleware<LabsState, LabsAction> {

    override fun invoke(
        store: Store<LabsState, LabsAction>,
        next: (LabsAction) -> Unit,
        action: LabsAction,
    ) {
        when (action) {
            is LabsAction.InitAction -> initialize(store = store)
            is LabsAction.RestartApplication -> restartApplication()
            is LabsAction.RestoreDefaults -> restoreDefaults(store = store)
            is LabsAction.ToggleFeature -> toggleFeature(
                store = store,
                feature = action.feature,
            )

            else -> Unit
        }

        next(action)
    }

    private fun initialize(
        store: Store<LabsState, LabsAction>,
    ) = scope.launch {
        val features = listOf(
            LabsFeature(
                key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
                name = R.string.firefox_labs_homepage_as_a_new_tab,
                description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                enabled = settings.enableHomepageAsNewTab,
            ),
        )

        store.dispatch(LabsAction.UpdateFeatures(features))
    }

    private fun toggleFeature(
        store: Store<LabsState, LabsAction>,
        feature: LabsFeature,
    ) = scope.launch {
        setFeatureEnabled(key = feature.key, enabled = !feature.enabled)
        store.dispatch(LabsAction.RestartApplication)
    }

    private fun restoreDefaults(
        store: Store<LabsState, LabsAction>,
    ) = scope.launch {
        for (key in FeatureKey.entries) {
            setFeatureEnabled(key = key, enabled = false)
        }

        store.dispatch(LabsAction.RestartApplication)
    }

    private fun setFeatureEnabled(key: FeatureKey, enabled: Boolean) = scope.launch {
        when (key) {
            FeatureKey.HOMEPAGE_AS_A_NEW_TAB -> {
                settings.enableHomepageAsNewTab = enabled
            }
        }
    }

    private fun restartApplication() = scope.launch {
        settings.preferences.edit {
            commit()
        }
        onRestart()
    }
}
