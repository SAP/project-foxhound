/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.menu.share.QRCodeDownloader
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.InputStream
import java.io.OutputStream

@RunWith(RobolectricTestRunner::class)
class QRCodeDownloaderTest {

    private val onResponse: (Context, Boolean) -> Unit = { _, _ -> }
    private val downloader = QRCodeDownloader(onResponse)
    private val mockContentResolver: ContentResolver = mockk()
    private val mockContext: Context = mockk()

    @Test
    @Config(sdk = [28])
    fun `WHEN below Android Q THEN save to directory downloads`() {
        val uri = Uri.Builder()
            .scheme("https")
            .authority("www.test.com")
            .build()
        val mockInputStream: InputStream = InputStream.nullInputStream()
        every { mockContentResolver.openInputStream(any()) }.returns(mockInputStream)
        downloader.saveQRCodeToDownloads(
            qrCodeUri = uri,
            contentResolver = mockContentResolver,
            context = mockContext,
        )
        verify(exactly = 0) { mockContentResolver.openOutputStream(any(), any()) }
    }

    @Test
    @Config(sdk = [30])
    fun `WHEN above Android Q THEN save to media store downloads`() {
        val uri = Uri.Builder()
            .scheme("https")
            .authority("www.test.com")
            .build()
        val mockInputStream: InputStream = InputStream.nullInputStream()
        val mockOutputStream: OutputStream = mockk(relaxed = true)

        every { mockContentResolver.openInputStream(any()) }.returns(mockInputStream)
        every { mockContentResolver.insert(any(), any()) }.returns(uri)
        every { mockContentResolver.openOutputStream(uri) }.returns(mockOutputStream)

        downloader.saveQRCodeToDownloads(
            qrCodeUri = uri,
            contentResolver = mockContentResolver,
            context = mockContext,
        )
        verify { mockContentResolver.openOutputStream(any()) }
    }
}
