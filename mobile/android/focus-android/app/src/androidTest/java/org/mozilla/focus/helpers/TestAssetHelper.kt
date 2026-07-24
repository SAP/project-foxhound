/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.helpers

import android.net.Uri
import androidx.core.net.toUri
import okhttp3.mockwebserver.MockWebServer

/**
 * Helper for hosting web pages locally for testing purposes.
 */
object TestAssetHelper {
    data class TestAsset(val url: String, val content: String, val title: String)

    /**
     * Hosts simple websites, found at androidTest/assets/tab[1|2|3].html
     * Returns a list of TestAsset, which can be used to navigate to each and
     * assert that the correct information is being displayed.
     *
     * Content for these pages all follow the same pattern. See [tab1.html] for
     * content implementation details.
     */
    fun MockWebServer.getGenericTabAsset(pageNum: Int) = createTestAsset(
        path = "tab$pageNum.html",
        content = "Tab $pageNum",
        title = "tab$pageNum",
    )

    val MockWebServer.genericAsset
        get() = createTestAsset(
            path = "genericPage.html",
            content = "focus test page",
            title = "GenericPage",
        )

    val MockWebServer.htmlControlsPageAsset
        get() = createTestAsset(
            path = "htmlControls.html",
            title = "Html_Control_Form",
        )

    fun MockWebServer.getEnhancedTrackingProtectionAsset(pageTitle: String) = createTestAsset(
        path = "etpPages/$pageTitle.html",
        title = pageTitle,
    )

    val MockWebServer.imageTestAsset
        get() = createTestAsset("image_test.html")

    fun MockWebServer.getStorageTestAsset(pageTitle: String) = createTestAsset(pageTitle)

    fun MockWebServer.getMediaTestAsset(pageTitle: String) = createTestAsset(
        path = "$pageTitle.html",
        title = pageTitle,
    )

    val MockWebServer.pdfTestAsset
        get() = createTestAsset(
            path = "/resources/pdfFile.pdf",
            content = "Page 1",
            title = "pdfFile.pdf",
        )

    private fun MockWebServer.createTestAsset(
        path: String,
        content: String = "",
        title: String = "",
    ) = TestAsset(
        url(path).toString(),
        content,
        title,
    )
}
