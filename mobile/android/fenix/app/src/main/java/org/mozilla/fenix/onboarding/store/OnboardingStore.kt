/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import mozilla.components.lib.state.Action
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import org.mozilla.fenix.onboarding.view.ToolbarOptionType

/**
 * [State] for the onboarding views.
 *
 * @property toolbarOptionSelected the selected toolbar option.
 */
data class OnboardingState(
    val toolbarOptionSelected: ToolbarOptionType = ToolbarOptionType.TOOLBAR_TOP,
) : State

/**
 * [Action] implementation related to [OnboardingStore].
 */
sealed interface OnboardingAction : Action {

    /**
     * Triggered when the store is initialized.
     */
    data object Init : OnboardingAction

    /**
     * [Action] implementation related to toolbar selection.
     */
    sealed interface OnboardingToolbarAction : OnboardingAction {
        /**
         * Updates the selected toolbar option to the given [selected] value.
         */
        data class UpdateSelected(val selected: ToolbarOptionType) : OnboardingToolbarAction
    }
}

/**
 * A [Store] that holds the [OnboardingState] for the onboarding pages and reduces [OnboardingAction]s
 * dispatched to the store.
 */
class OnboardingStore(
    initialState: OnboardingState = OnboardingState(),
    middleware: List<Middleware<OnboardingState, OnboardingAction>> = emptyList(),
) :
    Store<OnboardingState, OnboardingAction>(
        initialState = initialState,
        reducer = ::reducer,
        middleware = middleware,
    ) {
    init {
        dispatch(OnboardingAction.Init)
    }
}

private fun reducer(
    state: OnboardingState,
    action: OnboardingAction,
): OnboardingState =
    when (action) {
        is OnboardingAction.Init -> state

        is OnboardingAction.OnboardingToolbarAction.UpdateSelected -> state.copy(
            toolbarOptionSelected = action.selected,
        )
    }
