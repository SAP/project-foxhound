/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.termsofuse

import io.mockk.mockk
import io.mockk.verify
import org.junit.Test
import org.mozilla.fenix.termsofuse.store.PrivacyNoticeBannerAction
import org.mozilla.fenix.termsofuse.store.PrivacyNoticeBannerStore

class PrivacyNoticeBannerControllerTest {

    private val store: PrivacyNoticeBannerStore = mockk(relaxed = true)

    private val subject = DefaultPrivacyNoticeBannerController(
        privacyNoticeBannerStore = store,
    )

    @Test
    fun `WHEN onBannerCloseClicked is called THEN the OnCloseClicked action is dispatched`() {
        subject.onBannerCloseClicked()

        verify { store.dispatch(PrivacyNoticeBannerAction.OnCloseClicked) }
    }

    @Test
    fun `WHEN onBannerPrivacyNoticeClicked is called THEN the OnPrivacyNoticeClicked action is dispatched`() {
        subject.onBannerPrivacyNoticeClicked()

        verify { store.dispatch(PrivacyNoticeBannerAction.OnPrivacyNoticeClicked) }
    }

    @Test
    fun `WHEN onBannerLearnMoreClicked is called THEN the OnLearnMoreClicked action is dispatched`() {
        subject.onBannerLearnMoreClicked()

        verify { store.dispatch(PrivacyNoticeBannerAction.OnLearnMoreClicked) }
    }

    @Test
    fun `WHEN onBannerSeen is called THEN the OnBannerDisplayed action is dispatched`() {
        subject.onBannerDisplayed()

        verify { store.dispatch(PrivacyNoticeBannerAction.OnBannerDisplayed) }
    }
}
