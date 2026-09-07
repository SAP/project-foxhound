/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.termsofuse

import org.mozilla.fenix.termsofuse.store.PrivacyNoticeBannerAction
import org.mozilla.fenix.termsofuse.store.PrivacyNoticeBannerStore

/**
 * Interface for handling actions from the Privacy Notice banner.
 */
interface PrivacyNoticeBannerController {
    /**
     * Called when the user clicks the close button.
     */
    fun onBannerCloseClicked()

    /**
     * Called when the user clicks the Privacy Notice link.
     */
    fun onBannerPrivacyNoticeClicked()

    /**
     * Called when the user clicks the Learn more link.
     */
    fun onBannerLearnMoreClicked()

    /**
     * Called when the banner is displayed.
     */
    fun onBannerDisplayed()
}

/**
 * The default implementation of [PrivacyNoticeBannerController].
 */
class DefaultPrivacyNoticeBannerController(
    private val privacyNoticeBannerStore: PrivacyNoticeBannerStore,
) : PrivacyNoticeBannerController {
    override fun onBannerCloseClicked() {
        privacyNoticeBannerStore.dispatch(PrivacyNoticeBannerAction.OnCloseClicked)
    }

    override fun onBannerPrivacyNoticeClicked() {
        privacyNoticeBannerStore.dispatch(PrivacyNoticeBannerAction.OnPrivacyNoticeClicked)
    }

    override fun onBannerLearnMoreClicked() {
        privacyNoticeBannerStore.dispatch(PrivacyNoticeBannerAction.OnLearnMoreClicked)
    }

    override fun onBannerDisplayed() {
        privacyNoticeBannerStore.dispatch(PrivacyNoticeBannerAction.OnBannerDisplayed)
    }
}
