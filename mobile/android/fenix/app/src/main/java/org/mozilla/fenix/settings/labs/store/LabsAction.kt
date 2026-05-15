/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.store

import mozilla.components.lib.state.Action
import org.mozilla.fenix.settings.labs.LabsFeature

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
     * [LabsAction] dispatched when the list of features is updated.
     *
     * @property features The new list of [LabsFeature] to store.
     */
    data class UpdateFeatures(val features: List<LabsFeature>) : LabsAction()

    /**
     * [LabsAction] dispatched when a feature is toggled.
     *
     * @property feature The [LabsFeature] to toggle.
     */
    data class ToggleFeature(val feature: LabsFeature) : LabsAction()

    /**
     * [LabsAction] dispatched to restore the default settings without any lab features enabled.
     */
    data object RestoreDefaults : LabsAction()

    /**
     * [LabsAction] dispatched to restart the application.
     */
    data object RestartApplication : LabsAction()

    /**
     * [LabsAction] dispatched to show the dialog for toggling a [LabsFeature].
     *
     * @property feature The [LabsFeature] that will be toggled.
     */
    data class ShowToggleFeatureDialog(val feature: LabsFeature) : LabsAction()

    /**
     * [LabsAction] dispatched to show the dialog for restoring all the [LabsFeature]s to their
     * default disabled state.
     */
    data object ShowRestoreDefaultsDialog : LabsAction()

    /**
     * [LabsAction] dispatched to close the current dialog.
     */
    data object CloseDialog : LabsAction()
}
