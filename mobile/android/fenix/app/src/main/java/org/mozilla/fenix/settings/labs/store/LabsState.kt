/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.store

import mozilla.components.lib.state.State
import org.mozilla.fenix.settings.labs.LabsItem

/**
 * Value type that represents the state of the Labs screen.
 *
 * @property labsItems A list of [LabsItem]s to display.
 * @property dialogState The current dialog being displayed.
 */
data class LabsState(
    val labsItems: List<LabsItem>,
    val dialogState: DialogState,
) : State {
    companion object {
        val INITIAL = LabsState(
            labsItems = emptyList(),
            dialogState = DialogState.Closed,
        )
    }
}

/**
 * Represents the dialog state of the Firefox Labs screen.
 */
sealed interface DialogState {
    /**
     * The confirmation dialog for toggling a [LabsItem] on or off when it requires a restart.
     *
     * @property item The [LabsItem] being toggled.
     */
    data class ToggleLabsItem(val item: LabsItem) : DialogState

    /**
     * The dialog for restoring all [LabsItem]s to their default disabled state.
     */
    object RestoreDefaults : DialogState

    /**
     * No dialog is being shown.
     */
    object Closed : DialogState
}
