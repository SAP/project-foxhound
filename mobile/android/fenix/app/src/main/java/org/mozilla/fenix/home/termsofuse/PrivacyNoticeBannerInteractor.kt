/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.termsofuse

/**
 * Interface for interactions with the privacy notice banner.
 */
interface PrivacyNoticeBannerInteractor {
    /**
     * Called when the user clicks the close button.
     */
    fun onPrivacyNoticeBannerCloseClicked()

    /**
     * Called when the user clicks the Privacy Notice link.
     */
    fun onPrivacyNoticeBannerPrivacyNoticeClicked()

    /**
     * Called when the user clicks the Learn more link.
     */
    fun onPrivacyNoticeBannerLearnMoreClicked()

    /**
     * Called when the banner is displayed.
     */
    fun onPrivacyNoticeBannerDisplayed()
}

/**
 * NoOp implementation for compose previews.
 */
object PrivacyNoticeBannerInteractorNoOp : PrivacyNoticeBannerInteractor {
    override fun onPrivacyNoticeBannerCloseClicked() = Unit
    override fun onPrivacyNoticeBannerPrivacyNoticeClicked() = Unit
    override fun onPrivacyNoticeBannerLearnMoreClicked() = Unit
    override fun onPrivacyNoticeBannerDisplayed() = Unit
}
