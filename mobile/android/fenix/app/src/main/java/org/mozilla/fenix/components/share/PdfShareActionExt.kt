/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.share

import mozilla.components.browser.state.action.ShareResourceAction
import mozilla.components.browser.state.selector.findTabOrCustomTabOrSelectedTab
import mozilla.components.browser.state.state.content.ShareResourceState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.ktx.kotlin.isContentUrl
import mozilla.components.support.utils.INTENT_TYPE_PDF

internal fun BrowserStore.createPdfShareAction(
    tabId: String?,
    url: String?,
): ShareResourceAction.AddShareAction? {
    val session = state.findTabOrCustomTabOrSelectedTab(tabId)

    if (url == null || session == null) return null

    val resource = if (url.isContentUrl()) {
        ShareResourceState.LocalResource(url, contentType = INTENT_TYPE_PDF)
    } else if (session.content.isPdf) {
        ShareResourceState.InternetResource(
            url = url,
            contentType = INTENT_TYPE_PDF,
            private = session.content.private,
            referrerUrl = session.content.url,
        )
    } else {
        return null
    }

    return ShareResourceAction.AddShareAction(session.id, resource)
}
