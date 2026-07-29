/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.share

import mozilla.components.browser.state.action.ShareResourceAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.content.ShareResourceState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.utils.INTENT_TYPE_PDF
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PdfShareActionExtTest {

    @Test
    fun `GIVEN url is null WHEN createPdfShareAction is called THEN return null`() {
        val store = BrowserStore()
        assertNull(store.createPdfShareAction(tabId = null, url = null))
    }

    @Test
    fun `GIVEN no tab matches the tabId WHEN createPdfShareAction is called THEN return null`() {
        val store = BrowserStore()
        assertNull(store.createPdfShareAction(tabId = "unknown", url = "https://mozilla.org/doc.pdf"))
    }

    @Test
    fun `GIVEN a content url WHEN createPdfShareAction is called THEN return AddShareAction with LocalResource`() {
        val tab = createTab(url = "content://pdf.pdf", id = "1")
        val store = BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = tab.id))

        val action = store.createPdfShareAction(tabId = tab.id, url = tab.content.url)

        assertEquals(
            ShareResourceAction.AddShareAction(
                tabId = tab.id,
                ShareResourceState.LocalResource(tab.content.url, contentType = INTENT_TYPE_PDF),
            ),
            action,
        )
    }

    @Test
    fun `GIVEN a remote PDF tab WHEN createPdfShareAction is called THEN return AddShareAction with InternetResource`() {
        val url = "https://mozilla.org/document.pdf"
        val tab = createTab(url = url, id = "1", private = true).let {
            it.copy(content = it.content.copy(isPdf = true))
        }
        val store = BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = tab.id))

        val action = store.createPdfShareAction(tabId = tab.id, url = url)

        assertEquals(
            ShareResourceAction.AddShareAction(
                tabId = tab.id,
                ShareResourceState.InternetResource(
                    url = url,
                    contentType = INTENT_TYPE_PDF,
                    private = true,
                    referrerUrl = url,
                ),
            ),
            action,
        )
    }

    @Test
    fun `GIVEN a regular non-PDF page WHEN createPdfShareAction is called THEN return null`() {
        val tab = createTab(url = "https://mozilla.org", id = "1")
        val store = BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = tab.id))

        assertNull(store.createPdfShareAction(tabId = tab.id, url = tab.content.url))
    }
}
