/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * [Middleware] that reacts to various [TermsOfUsePromptAction]s
 *
 * @param repository the repository for the terms of use prompt
 */
class TermsOfUsePromptPreferencesMiddleware(
    private val repository: TermsOfUsePromptRepository,
) : Middleware<TermsOfUsePromptState, TermsOfUsePromptAction> {
    override fun invoke(
        store: Store<TermsOfUsePromptState, TermsOfUsePromptAction>,
        next: (TermsOfUsePromptAction) -> Unit,
        action: TermsOfUsePromptAction,
    ) {
        when (action) {
            is TermsOfUsePromptAction.OnAcceptClicked ->
                repository.updateHasAcceptedTermsOfUsePreference()

            is TermsOfUsePromptAction.OnRemindMeLaterClicked -> {
                repository.updateHasPostponedAcceptingTermsOfUsePreference()
            }

            is TermsOfUsePromptAction.OnPromptManuallyDismissed ->
                repository.updateHasPostponedAcceptingTermsOfUsePreference()

            is TermsOfUsePromptAction.OnPromptDismissed -> {
                repository.updateLastTermsOfUsePromptTimeInMillis()
                repository.isShowingPrompt = false
            }

            is TermsOfUsePromptAction.OnImpression -> {
                repository.incrementTermsOfUsePromptDisplayedCount()
            }

            is TermsOfUsePromptAction.OnPromptCreated -> {
                repository.isShowingPrompt = true
            }

            // no-ops
            is TermsOfUsePromptAction.OnLearnMoreClicked,
            is TermsOfUsePromptAction.OnPrivacyNoticeClicked,
            is TermsOfUsePromptAction.OnTermsOfUseClicked,
                -> {
            }
        }

        next(action)
    }
}
