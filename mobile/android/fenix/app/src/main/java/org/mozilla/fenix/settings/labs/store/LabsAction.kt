/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.store

import mozilla.components.lib.state.Action
import org.mozilla.fenix.settings.labs.LabsItem

/**
 * Actions to dispatch through the [LabsStore] to modify the [LabsState].
 */
sealed class LabsAction : Action {

    /**
     * [LabsAction] dispatched to indicate that the store is initialized and ready to use.
     * This action is dispatched automatically before any other action is processed.
     * Its main purpose is to trigger initialization logic in middlewares.
     */
    data object InitAction : LabsAction()

    /**
     * [LabsAction] dispatched when the list of Labs items is updated.
     *
     * @property items The new list of [LabsItem]s to store.
     */
    data class UpdateLabsItems(val items: List<LabsItem>) : LabsAction()

    /**
     * [LabsAction] dispatched when a Labs item is toggled.
     *
     * @property item The [LabsItem] to toggle.
     */
    data class ToggleLabsItem(val item: LabsItem) : LabsAction()

    /**
     * [LabsAction] dispatched to restore the default settings without any Labs items enabled.
     */
    data object RestoreDefaults : LabsAction()

    /**
     * [LabsAction] dispatched to restart the application.
     */
    data object RestartApplication : LabsAction()

    /**
     * [LabsAction] dispatched to show the confirmation dialog for toggling a [LabsItem]
     * that requires an application restart.
     *
     * @property item The [LabsItem] that will be toggled.
     */
    data class ShowToggleLabsItemDialog(val item: LabsItem) : LabsAction()

    /**
     * [LabsAction] dispatched to show the dialog for restoring all the [LabsItem]s to their
     * default disabled state.
     */
    data object ShowRestoreDefaultsDialog : LabsAction()

    /**
     * [LabsAction] dispatched to close the current dialog.
     */
    data object CloseDialog : LabsAction()

    /**
     * [LabsAction] dispatched when the user taps a Labs item's "Share feedback" link.
     *
     * @property item The [LabsItem] whose feedback link was tapped.
     */
    data class ShareFeedbackClicked(val item: LabsItem) : LabsAction()
}
