/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.store

import mozilla.components.lib.state.State
import org.mozilla.fenix.settings.labs.LabsFeature

/**
 * Value type that represents the state of the Labs screen.
 *
 * @property labsFeatures A list of [LabsFeature]s to display.
 * @property dialogState The current dialog being displayed.
 */
data class LabsState(
    val labsFeatures: List<LabsFeature>,
    val dialogState: DialogState,
) : State {
    companion object {
        val INITIAL = LabsState(
            labsFeatures = emptyList(),
            dialogState = DialogState.Closed,
        )
    }
}

/**
 * Represents the dialog state of the Firefox Labs screen.
 */
sealed interface DialogState {
    /**
     * The dialog for toggling a [LabsFeature] on or off.
     *
     * @property feature The [LabsFeature] being toggled.
     */
    data class ToggleFeature(val feature: LabsFeature) : DialogState

    /**
     * The dialog for restoring all [LabsFeature]s to their default disabled state.
     */
    object RestoreDefaults : DialogState

    /**
     * No dialog is being shown.
     */
    object Closed : DialogState
}
