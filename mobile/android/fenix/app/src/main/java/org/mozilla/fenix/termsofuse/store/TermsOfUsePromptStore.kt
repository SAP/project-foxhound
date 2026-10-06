/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import mozilla.components.lib.state.Action
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store

/**
 * [State] for the terms of use prompt.
 */
data object TermsOfUsePromptState : State

/**
 * [Action] related to [TermsOfUsePromptStore].
 */
sealed interface TermsOfUsePromptAction : Action {

    /**
     * Triggered when the prompt is created.
     */
    data object OnPromptCreated : TermsOfUsePromptAction

    /**
     * Triggered when the prompt has been displayed.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnImpression(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the user clicks `accept`.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnAcceptClicked(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the user clicks 'remind me later'.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnRemindMeLaterClicked(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the user clicks 'learn more'.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnLearnMoreClicked(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the user clicks 'privacy notice'.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnPrivacyNoticeClicked(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the user clicks 'terms of use'.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnTermsOfUseClicked(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the user closes the prompt by swiping, hitting back, or tapping the
     * background scrim.
     *
     * @property surface The [Surface] that the prompt was displayed on.
     */
    data class OnPromptManuallyDismissed(val surface: Surface) : TermsOfUsePromptAction

    /**
     * Triggered when the prompt is dismissed for any reason.
     */
    data object OnPromptDismissed : TermsOfUsePromptAction
}

/**
 * A [Store] that holds the [TermsOfUsePromptState].
 */
class TermsOfUsePromptStore(
    initialState: TermsOfUsePromptState = TermsOfUsePromptState,
    middleware: List<Middleware<TermsOfUsePromptState, TermsOfUsePromptAction>>,
) : Store<TermsOfUsePromptState, TermsOfUsePromptAction>(
    initialState = initialState,
    reducer = { _, _ -> TermsOfUsePromptState },
    middleware = middleware,
)
