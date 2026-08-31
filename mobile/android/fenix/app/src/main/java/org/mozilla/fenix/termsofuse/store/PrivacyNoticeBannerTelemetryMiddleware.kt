/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.GleanMetrics.PrivacyNoticeBanner

/**
 * [Middleware] to handle [PrivacyNoticeBannerAction]s telemetry recording.
 */
class PrivacyNoticeBannerTelemetryMiddleware :
    Middleware<PrivacyNoticeBannerState, PrivacyNoticeBannerAction> {

    override fun invoke(
        store: Store<PrivacyNoticeBannerState, PrivacyNoticeBannerAction>,
        next: (PrivacyNoticeBannerAction) -> Unit,
        action: PrivacyNoticeBannerAction,
    ) {
        when (action) {
            is PrivacyNoticeBannerAction.OnBannerDisplayed -> {
                PrivacyNoticeBanner.displayed.record()
                PrivacyNoticeBanner.displayedDate.set()
            }

            is PrivacyNoticeBannerAction.OnPrivacyNoticeClicked -> {
                PrivacyNoticeBanner.privacyNoticeLinkClicked.record()
            }

            is PrivacyNoticeBannerAction.OnLearnMoreClicked -> {
                PrivacyNoticeBanner.learnMoreLinkClicked.record()
            }

            is PrivacyNoticeBannerAction.OnCloseClicked -> {
                PrivacyNoticeBanner.closeClicked.record()
            }

            // no-ops
            is PrivacyNoticeBannerAction.OnNavigatedAwayFromHome,
                -> {
            }
        }

        next(action)
    }
}
