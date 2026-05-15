/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * [Middleware] that reacts to various [PrivacyNoticeBannerAction]s
 *
 * @param repository The repository for the Privacy Notice banner.
 */
class PrivacyNoticeBannerMiddleware(
    private val repository: PrivacyNoticeBannerRepository,
) : Middleware<PrivacyNoticeBannerState, PrivacyNoticeBannerAction> {

    override fun invoke(
        store: Store<PrivacyNoticeBannerState, PrivacyNoticeBannerAction>,
        next: (PrivacyNoticeBannerAction) -> Unit,
        action: PrivacyNoticeBannerAction,
    ) {
        when (action) {
            is PrivacyNoticeBannerAction.OnBannerDisplayed ->
                repository.updatePrivacyNoticeBannerDisplayedPreference()

            // no-ops
            is PrivacyNoticeBannerAction.OnPrivacyNoticeClicked,
            is PrivacyNoticeBannerAction.OnLearnMoreClicked,
            is PrivacyNoticeBannerAction.OnCloseClicked,
            is PrivacyNoticeBannerAction.OnNavigatedAwayFromHome,
                -> {
            }
        }

        next(action)
    }
}
