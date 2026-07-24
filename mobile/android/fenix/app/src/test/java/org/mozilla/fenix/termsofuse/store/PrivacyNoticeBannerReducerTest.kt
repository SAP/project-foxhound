/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import org.junit.Test

class PrivacyNoticeBannerReducerTest {
    private lateinit var store: PrivacyNoticeBannerStore

    @Test
    fun `WHEN the OnCloseClicked action is received THEN the visibility of the banner is set to false`() {
        store = PrivacyNoticeBannerStore(
            initialState = PrivacyNoticeBannerState(
                visible = true,
            ),
            middleware = emptyList(),
        )

        store.dispatch(PrivacyNoticeBannerAction.OnCloseClicked)

        assertFalse(store.state.visible)
    }

    @Test
    fun `WHEN the OnNavigatedAwayFromHome action is received THEN the visibility of the banner is set to false`() {
        store = PrivacyNoticeBannerStore(
            initialState = PrivacyNoticeBannerState(
                visible = true,
            ),
            middleware = emptyList(),
        )

        store.dispatch(PrivacyNoticeBannerAction.OnNavigatedAwayFromHome)

        assertFalse(store.state.visible)
    }

    @Test
    fun `WHEN a no-op action is received THEN the visibility of the banner does not change`() {
        store = PrivacyNoticeBannerStore(
            initialState = PrivacyNoticeBannerState(
                visible = true,
            ),
            middleware = emptyList(),
        )

        store.dispatch(PrivacyNoticeBannerAction.OnLearnMoreClicked)
        assertTrue(store.state.visible)

        store.dispatch(PrivacyNoticeBannerAction.OnBannerDisplayed)
        assertTrue(store.state.visible)

        store.dispatch(PrivacyNoticeBannerAction.OnPrivacyNoticeClicked)
        assertTrue(store.state.visible)
    }
}
