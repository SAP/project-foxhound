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
import org.mozilla.fenix.settings.labs.LabsItem
import org.mozilla.fenix.settings.labs.LabsItemSlugs
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
 * @param onOpenFeedback Callback invoked to open a Labs item's feedback URL.
 * @param scope [CoroutineScope] used to launch coroutines.
 */
class LabsMiddleware(
    private val settings: Settings,
    private val onRestart: () -> Unit,
    private val onOpenFeedback: (String) -> Unit,
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
            is LabsAction.ToggleLabsItem -> toggleLabsItem(
                store = store,
                item = action.item,
            )
            is LabsAction.ShareFeedbackClicked -> {
                action.item.feedbackUrl?.let(onOpenFeedback)
            }
            else -> Unit
        }

        next(action)
    }

    private fun initialize(
        store: Store<LabsState, LabsAction>,
    ) = scope.launch {
        val items = listOf(
            LabsItem(
                slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                title = R.string.firefox_labs_homepage_as_a_new_tab,
                description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                enrolled = settings.enableHomepageAsNewTab,
                requiresRestart = true,
            ),
        )

        store.dispatch(LabsAction.UpdateLabsItems(items))
    }

    private fun toggleLabsItem(
        store: Store<LabsState, LabsAction>,
        item: LabsItem,
    ) = scope.launch {
        setItemEnrolled(slug = item.slug, enrolled = !item.enrolled)
        if (item.requiresRestart) {
            store.dispatch(LabsAction.RestartApplication)
        }
    }

    private fun restoreDefaults(
        store: Store<LabsState, LabsAction>,
    ) = scope.launch {
        val items = store.state.labsItems
        val anyRequiresRestart = items.any { it.enrolled && it.requiresRestart }

        for (item in items) {
            setItemEnrolled(slug = item.slug, enrolled = false)
        }

        if (anyRequiresRestart) {
            store.dispatch(LabsAction.RestartApplication)
        }
    }

    private fun setItemEnrolled(slug: String, enrolled: Boolean) = scope.launch {
        when (slug) {
            LabsItemSlugs.HOMEPAGE_AS_NEW_TAB -> {
                settings.enableHomepageAsNewTab = enrolled
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
