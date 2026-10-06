/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.store

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.browser.store.BrowserScreenAction.CancelPrivateDownloadsOnPrivateTabsClosedAccepted
import org.mozilla.fenix.browser.store.BrowserScreenAction.ClosingLastPrivateTab

class BrowserScreenStoreTest {

    @Test
    fun `WHEN closing the last private tab THEN remember this in state`() {
        val store = buildStore(true)

        store.dispatch(ClosingLastPrivateTab("tabId", 2))

        assertFalse(store.state.cancelPrivateDownloadsAccepted)
    }

    @Test
    fun `WHEN accepting to cancel private downloads on closing the last private tab THEN remember this in state`() {
        val store = buildStore(false)

        store.dispatch(CancelPrivateDownloadsOnPrivateTabsClosedAccepted)

        assertTrue(store.state.cancelPrivateDownloadsAccepted)
    }

    private fun buildStore(
        cancelPrivateDownloadsAccepted: Boolean = false,
    ) = BrowserScreenStore(
        initialState = BrowserScreenState(
            cancelPrivateDownloadsAccepted = cancelPrivateDownloadsAccepted,
        ),
    )
}
