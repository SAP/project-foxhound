/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.reviewprompt

import android.app.Activity
import androidx.navigation.NavDirections
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import mozilla.components.lib.state.helpers.AbstractBinding
import org.mozilla.fenix.NavGraphDirections
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.PlayStoreReviewPromptController
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.reviewprompt.ReviewPromptState.Eligible.Type
import java.lang.ref.WeakReference

/**
 * A feature that shows either the Google Play Review Prompt or the built-in review prompt based
 * on the eligibility.
 */
class ShowReviewPromptBinding(
    private val appStore: AppStore,
    private val promptController: PlayStoreReviewPromptController,
    private val activityRef: WeakReference<Activity>,
    private val uiScope: CoroutineScope,
    private val navigationDirection: (NavDirections) -> Unit,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<AppState>(appStore, mainDispatcher) {

    override suspend fun onState(flow: Flow<AppState>) {
        flow.map { it.reviewPrompt }
            .distinctUntilChanged()
            .collect {
                when (it) {
                    ReviewPromptState.Unknown, ReviewPromptState.NotEligible -> {}

                    is ReviewPromptState.Eligible -> {
                        when (it.type) {
                            Type.PlayStore -> tryShowPlayStorePrompt()
                            Type.Custom -> navigationDirection.invoke(CUSTOM_PROMPT_DIRECTION)
                        }
                        appStore.dispatch(AppAction.ReviewPromptAction.ReviewPromptShown)
                    }
                }
            }
    }

    private fun tryShowPlayStorePrompt() = uiScope.launch {
        val activity = activityRef.get() ?: return@launch
        promptController.tryPromptReview(activity)
    }

    companion object {
        private val CUSTOM_PROMPT_DIRECTION = NavGraphDirections.actionGlobalCustomReviewPromptDialogFragment()
    }
}
