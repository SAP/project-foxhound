/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * The [Store] for holding the [LabsState] and applying [LabsAction]s.
 */
class LabsStore(
    initialState: LabsState,
    middleware: List<Middleware<LabsState, LabsAction>> = listOf(),
) : Store<LabsState, LabsAction>(
    initialState = initialState,
    reducer = ::reducer,
    middleware = middleware,
) {
    init {
        dispatch(LabsAction.InitAction)
    }
}

private fun reducer(state: LabsState, action: LabsAction): LabsState {
    return when (action) {
        is LabsAction.InitAction,
        is LabsAction.RestartApplication,
            -> state

        is LabsAction.UpdateFeatures -> state.copy(
            labsFeatures = action.features,
        )

        is LabsAction.RestoreDefaults -> state.copy(
            labsFeatures = state.labsFeatures.map {
                it.copy(enabled = false)
            },
            dialogState = DialogState.Closed,
        )

        is LabsAction.ToggleFeature -> state.copy(
            labsFeatures = state.labsFeatures.map {
                if (it.key == action.feature.key) {
                    it.copy(enabled = !it.enabled)
                } else {
                    it
                }
            },
            dialogState = DialogState.Closed,
        )

        is LabsAction.ShowToggleFeatureDialog -> state.copy(
            dialogState = DialogState.ToggleFeature(action.feature),
        )

        is LabsAction.ShowRestoreDefaultsDialog -> state.copy(
            dialogState = DialogState.RestoreDefaults,
        )

        is LabsAction.CloseDialog -> state.copy(
            dialogState = DialogState.Closed,
        )
    }
}
