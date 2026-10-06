/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads.filewriter

import android.content.ContentResolver
import android.content.ContentValues
import android.os.Environment
import android.provider.MediaStore
import androidx.core.net.toUri
import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertEquals
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.FakeDownloadFileUtils
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.anyBoolean
import org.mockito.Mockito.doNothing
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import java.io.File
import java.io.OutputStream

@RunWith(AndroidJUnit4::class)
class DefaultDownloadFileWriterTest {

    private val onUpdateState: ((DownloadState) -> Unit) = mock()
    private val block: ((OutputStream) -> Unit) = mock()
    private lateinit var downloadFileUtils: FakeDownloadFileUtils
    private lateinit var defaultDownloadFileWriter: DefaultDownloadFileWriter

    @Before
    fun setup() {
        downloadFileUtils = spy(FakeDownloadFileUtils())
        defaultDownloadFileWriter = spy(
            DefaultDownloadFileWriter(
                context = testContext,
                downloadFileUtils = downloadFileUtils,
            ),
        )

        doNothing().`when`(defaultDownloadFileWriter).writeToFileUri(
            any(),
            any(),
            anyBoolean(),
            any(),
        )
    }

    @Test
    fun `Given new download and shouldUseScopedStorage is true When useFileStream is called Then it generates unique filename and routes to scoped storage`() {
        val download = DownloadState(
            url = "https://mozilla.org/download",
            fileName = "document.pdf",
        )
        doReturn("content://downloads/public_downloads".toUri()).`when`(defaultDownloadFileWriter)
            .handleDownloadToDefaultDirectory(any(), any(), anyBoolean())

        defaultDownloadFileWriter.useFileStream(
            download = download,
            append = false,
            shouldUseScopedStorage = true,
            onUpdateState = onUpdateState,
            block = block,
        )

        verify(defaultDownloadFileWriter).makeUniqueFileNameIfNecessary(download, false)
        verify(downloadFileUtils).uniqueFileName(download.directoryPath, "document.pdf")
        verify(defaultDownloadFileWriter).useFileStreamScopedStorage(
            download,
            false,
            block,
            onUpdateState,
        )
        verify(defaultDownloadFileWriter).handleDownloadToDefaultDirectory(
            testContext.contentResolver,
            download,
            false,
        )
    }

    @Test
    fun `Given new download and shouldUseScopedStorage is false When useFileStream is called Then it generates unique filename and routes to legacy storage`() {
        val download = DownloadState(url = "https://mozilla.org/download")
        doReturn("content://downloads/public_downloads".toUri()).`when`(defaultDownloadFileWriter)
            .handleDownloadToDefaultDirectory(any(), any(), anyBoolean())

        defaultDownloadFileWriter.useFileStream(
            download = download,
            append = false,
            shouldUseScopedStorage = false,
            onUpdateState = onUpdateState,
            block = block,
        )

        verify(defaultDownloadFileWriter).makeUniqueFileNameIfNecessary(download, false)
        verify(onUpdateState).invoke(download)
        verify(defaultDownloadFileWriter).useFileStreamLegacy(download, false, block)
        verify(defaultDownloadFileWriter).createDirectoryIfNeeded(File(download.filePath).parentFile)
    }

    @Test
    fun `Given download with custom directory and shouldUseScopedStorage is true When useFileStream is called Then it routes to custom directory and verifies SAF permissions`() {
        val customPath = "CustomDirectory"
        val download = DownloadState(
            url = "https://mozilla.org/download",
            directoryPath = customPath,
        )

        doNothing().`when`(defaultDownloadFileWriter).verifySafPermission(any(), any())
        doReturn(customPath.toUri()).`when`(defaultDownloadFileWriter).createNewDocument(
            any(),
            any(),
            any(),
            anyBoolean(),
            any(),
        )

        defaultDownloadFileWriter.useFileStream(
            download = download,
            append = false,
            shouldUseScopedStorage = true,
            onUpdateState = onUpdateState,
            block = block,
        )

        verify(defaultDownloadFileWriter).handleDownloadToCustomDirectory(
            resolver = testContext.contentResolver,
            download = download,
            append = false,
            onUpdateState = onUpdateState,
        )
        verify(defaultDownloadFileWriter).verifySafPermission(
            resolver = testContext.contentResolver,
            directoryUri = customPath.toUri(),
        )
        verify(defaultDownloadFileWriter).createNewDocument(
            resolver = testContext.contentResolver,
            directoryTreeUri = customPath.toUri(),
            download = download,
            append = false,
            onUpdateState = onUpdateState,
        )
    }

    @Test
    fun `Given download with custom directory and shouldUseScopedStorage is true When useFileStream is called Then it returns the correct custom directory URI`() {
        val customPath = "CustomDirectory"
        val download = DownloadState(
            url = "https://mozilla.org/download",
            directoryPath = customPath,
        )

        doNothing().`when`(defaultDownloadFileWriter).verifySafPermission(any(), any())
        doReturn(customPath.toUri()).`when`(defaultDownloadFileWriter).createNewDocument(
            any(),
            any(),
            any(),
            anyBoolean(),
            any(),
        )

        defaultDownloadFileWriter.useFileStream(
            download = download,
            append = false,
            shouldUseScopedStorage = true,
            onUpdateState = onUpdateState,
            block = block,
        )

        verify(defaultDownloadFileWriter).handleDownloadToCustomDirectory(
            resolver = testContext.contentResolver,
            download = download,
            append = false,
            onUpdateState = onUpdateState,
        )
        verify(defaultDownloadFileWriter).verifySafPermission(
            resolver = testContext.contentResolver,
            directoryUri = customPath.toUri(),
        )
        assertEquals(
            defaultDownloadFileWriter.handleDownloadToCustomDirectory(
                resolver = testContext.contentResolver,
                download = download,
                append = false,
                onUpdateState = onUpdateState,
            ),
            customPath.toUri(),
        )
    }

    @Test
    fun `Given scoped storage default download When creating the file Then MediaStore entry includes Downloads metadata`() {
        val resolver = mock<ContentResolver>()
        val insertedUri = "content://downloads/public_downloads/1".toUri()
        val download = DownloadState(
            url = "https://mozilla.org/download",
            fileName = "document.pdf",
            contentType = "application/pdf",
        )

        doReturn(insertedUri).`when`(resolver).insert(any(), any())

        val result = defaultDownloadFileWriter.handleDownloadToDefaultDirectory(
            resolver = resolver,
            download = download,
            append = false,
        )

        val valuesCaptor = ArgumentCaptor.forClass(ContentValues::class.java)
        verify(resolver).insert(
            any(),
            valuesCaptor.capture(),
        )

        assertEquals(insertedUri, result)
        assertEquals("document.pdf", valuesCaptor.value.getAsString(MediaStore.Downloads.DISPLAY_NAME))
        assertEquals(1, valuesCaptor.value.getAsInteger(MediaStore.Downloads.IS_PENDING))
        assertEquals(Environment.DIRECTORY_DOWNLOADS, valuesCaptor.value.getAsString(MediaStore.MediaColumns.RELATIVE_PATH))
        assertEquals("safeContentType", valuesCaptor.value.getAsString(MediaStore.MediaColumns.MIME_TYPE))
    }
}
