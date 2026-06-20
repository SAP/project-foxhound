/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.onboarding.store.OnboardingPreferencesRepository.OnboardingPreference
import org.mozilla.fenix.onboarding.view.ToolbarOptionType

/**
 * [Middleware] that reacts to various [OnboardingAction]s and updates any corresponding preferences.
 *
 * @param repository [OnboardingPreferencesRepository] used to access the relevant preferences.
 * @param coroutineScope The coroutine scope used for emitting flows.
 */
class OnboardingPreferencesMiddleware(
    private val repository: OnboardingPreferencesRepository,
    private val coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Main),
) : Middleware<OnboardingState, OnboardingAction> {
    override fun invoke(
        store: Store<OnboardingState, OnboardingAction>,
        next: (OnboardingAction) -> Unit,
        action: OnboardingAction,
    ) {
        next(action)

        when (action) {
            is OnboardingAction.Init -> {
                coroutineScope.launch {
                    repository.onboardingPreferenceUpdates
                        .collect { preferenceUpdate ->
                            if (preferenceUpdate.value) {
                                val updateAction =
                                    mapOnboardingPreferenceUpdateToStoreAction(preferenceUpdate)
                                store.dispatch(updateAction)
                            }
                        }
                }

                repository.init()
            }

            is OnboardingAction.OnboardingToolbarAction.UpdateSelected -> {
                repository.updateOnboardingPreference(
                    OnboardingPreferencesRepository
                        .OnboardingPreferenceUpdate(action.selected.toOnboardingPreference()),
                )
            }
        }
    }

    private fun ToolbarOptionType.toOnboardingPreference() = when (this) {
        ToolbarOptionType.TOOLBAR_TOP -> OnboardingPreference.TopToolbar
        ToolbarOptionType.TOOLBAR_BOTTOM -> OnboardingPreference.BottomToolbar
    }

    private fun mapOnboardingPreferenceUpdateToStoreAction(
        preferenceUpdate: OnboardingPreferencesRepository.OnboardingPreferenceUpdate,
    ): OnboardingAction {
        return when (preferenceUpdate.preferenceType) {
            OnboardingPreference.TopToolbar ->
                OnboardingAction.OnboardingToolbarAction.UpdateSelected(ToolbarOptionType.TOOLBAR_TOP)

            OnboardingPreference.BottomToolbar ->
                OnboardingAction.OnboardingToolbarAction.UpdateSelected(ToolbarOptionType.TOOLBAR_BOTTOM)
        }
    }
}
