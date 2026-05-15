/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import mozilla.components.lib.state.Action
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store

/**
 * [State] of the Privacy Notice banner.
 */
data class PrivacyNoticeBannerState(
    val visible: Boolean,
) : State

/**
 * [Action]s related to the [PrivacyNoticeBannerStore]
 */
sealed interface PrivacyNoticeBannerAction : Action {
    /**
     * Triggered when the user clicks the close button on the banner.
     */
    data object OnCloseClicked : PrivacyNoticeBannerAction

    /**
     * Triggered when the user clicks the Privacy Notice link on the banner.
     */
    data object OnPrivacyNoticeClicked : PrivacyNoticeBannerAction

    /**
     * Triggered when the user clicks the Learn More link on the banner.
     */
    data object OnLearnMoreClicked : PrivacyNoticeBannerAction

    /**
     * Triggered when navigating away from the home fragment.
     */
    data object OnNavigatedAwayFromHome : PrivacyNoticeBannerAction

    /**
     * Triggered when the banner is displayed.
     */
    data object OnBannerDisplayed : PrivacyNoticeBannerAction
}

/**
 * A [Store] that holds the [PrivacyNoticeBannerState]
 */
class PrivacyNoticeBannerStore(
    initialState: PrivacyNoticeBannerState,
    middleware: List<Middleware<PrivacyNoticeBannerState, PrivacyNoticeBannerAction>>,
) : Store<PrivacyNoticeBannerState, PrivacyNoticeBannerAction>(
    initialState = initialState,
    reducer = ::reduce,
    middleware = middleware,
)

private fun reduce(
    state: PrivacyNoticeBannerState,
    action: PrivacyNoticeBannerAction,
): PrivacyNoticeBannerState {
    return when (action) {
        is PrivacyNoticeBannerAction.OnCloseClicked,
        is PrivacyNoticeBannerAction.OnNavigatedAwayFromHome,
            -> state.copy(visible = false)

        is PrivacyNoticeBannerAction.OnLearnMoreClicked,
        is PrivacyNoticeBannerAction.OnBannerDisplayed,
        is PrivacyNoticeBannerAction.OnPrivacyNoticeClicked,
            -> state
    }
}
