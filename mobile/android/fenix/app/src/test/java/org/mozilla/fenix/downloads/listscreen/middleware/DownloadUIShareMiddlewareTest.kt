/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.middleware

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.net.toUri
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.lib.state.Store
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.DownloadFileUtils
import mozilla.components.support.utils.FakeDownloadFileUtils
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIAction
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIStore

@RunWith(AndroidJUnit4::class)
class DownloadUIShareMiddlewareTest {
    private lateinit var context: Context
    private lateinit var downloadFileUtils: DownloadFileUtils
    private lateinit var middleware: DownloadUIShareMiddleware
    private lateinit var store: Store<DownloadUIState, DownloadUIAction>

    @Before
    fun setup() {
        context = spyk(testContext)
    }

    @Test
    fun `WHEN ShareUrlClicked is dispatched THEN share the URL`() {
        downloadFileUtils = FakeDownloadFileUtils(findShareableDownloadFileUri = { _, _ -> "file.txt".toUri() })

        middleware = DownloadUIShareMiddleware(
            applicationContext = context,
            downloadFileUtils = downloadFileUtils,
        )
        store = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(middleware),
        )

        val url = "https://mozilla.org"

        store.dispatch(DownloadUIAction.ShareUrlClicked(url))

        verify { context.startActivity(match { it.action == Intent.ACTION_CHOOSER }) }
    }

    @Test
    fun `WHEN ShareFileClicked is dispatched THEN share the file if URI is found`() {
        val directoryPath = "path"
        val fileName = "file.txt"
        val contentType = "text/plain"

        downloadFileUtils = FakeDownloadFileUtils(findShareableDownloadFileUri = { _, _ -> fileName.toUri() })

        middleware = DownloadUIShareMiddleware(
            applicationContext = context,
            downloadFileUtils = downloadFileUtils,
        )
        store = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(middleware),
        )

        store.dispatch(DownloadUIAction.ShareFileClicked(directoryPath, fileName, contentType))

        verify { context.startActivity(match { it.action == Intent.ACTION_CHOOSER }) }
    }

    @Test
    fun `WHEN ShareFileClicked is dispatched AND URI is NOT found THEN do NOT share the file`() {
        val directoryPath = "path"
        val fileName = "file.txt"
        val contentType = "text/plain"
        downloadFileUtils = FakeDownloadFileUtils(findShareableDownloadFileUri = { _, _ -> null })

        middleware = DownloadUIShareMiddleware(
            applicationContext = context,
            downloadFileUtils = downloadFileUtils,
        )

        store = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(middleware),
        )
        store.dispatch(DownloadUIAction.ShareFileClicked(directoryPath, fileName, contentType))

        verify(exactly = 0) { context.startActivity(any()) }
    }
}
