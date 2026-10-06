/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads.temporary

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ShareResourceAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.content.ShareResourceState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.fetch.Client
import mozilla.components.concept.fetch.Headers.Names.CONTENT_TYPE
import mozilla.components.concept.fetch.MutableHeaders
import mozilla.components.concept.fetch.Request
import mozilla.components.concept.fetch.Response
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.doNothing
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import java.io.File
import java.nio.charset.StandardCharsets

/**
 * The 89a gif header as seen on https://www.w3.org/Graphics/GIF/spec-gif89a.txt
 */
private const val GIF_HEADER = "GIF89a"

@RunWith(AndroidJUnit4::class)
class ShareResourceFeatureTest {

    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var context: Context
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        context = spy(testContext)
        doReturn(temporaryFolder.root).`when`(context).cacheDir
    }

    @Test
    fun `cleanupCache should automatically be called when this class is initialized`() = runTest(testDispatcher) {
        val cacheDir = File(temporaryFolder.root, cacheDirName).apply {
            mkdirs()
            File(this, "leftoverFile").createNewFile()
        }

        assertTrue(cacheDir.listFiles()?.isNotEmpty() == true)

        ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher, testDispatcher)
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(cacheDir.listFiles()?.isEmpty() == true)
    }

    @Test
    fun `ShareFeature starts the share process for AddShareAction which is immediately consumed`() {
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    TabSessionState(
                        "123",
                        ContentState(url = "https://www.mozilla.org"),
                    ),
                ),
            ),
            middleware = listOf(captureActionsMiddleware),
        )

        val shareFeature = spy(ShareResourceFeature(context, store, "123", mock(), testDispatcher, testDispatcher))
        doNothing().`when`(shareFeature).startSharing(any())
        val download = ShareResourceState.InternetResource(url = "testDownload")
        val action = ShareResourceAction.AddShareAction("123", download)
        shareFeature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(action)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(shareFeature).startSharing(download)
        captureActionsMiddleware.assertFirstAction(ShareResourceAction.ConsumeShareAction::class) { action ->
            assertEquals("123", action.tabId)
        }
    }

    @Test
    fun `cleanupCache should delete all files from the cache directory`() = runTest(testDispatcher) {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher, testDispatcher)

        // Clear the 'init' block's coroutine from the queue
        testDispatcher.scheduler.runCurrent()

        val testDir = temporaryFolder.newFolder(cacheDirName)
        File(testDir, "testFile").createNewFile()

        assertTrue(
            "File should exist before cleanup",
            testDir.listFiles()?.isNotEmpty() == true,
            )

        shareFeature.cleanupCache()

        assertTrue(
            "Directory should be empty after manual cleanup",
            testDir.listFiles()?.isEmpty() == true,
        )
    }

    @Test
    fun `startSharing() will download and then share the selected download`() = runTest(testDispatcher) {
        val shareFeature = spy(ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher, testDispatcher))
        val shareState = ShareResourceState.InternetResource(url = "testUrl", contentType = "contentType")
        val downloadedFile = File("filePath")
        doReturn(downloadedFile).`when`(shareFeature).download(any())
        doReturn(true).`when`(shareFeature).shareInternetResource(any(), any(), any(), any())

        shareFeature.scope = this

        shareFeature.startSharing(shareState)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(shareFeature).download(shareState)
        verify(shareFeature).shareInternetResource(downloadedFile.canonicalPath, "contentType", null, null)
        verify(shareFeature, never()).shareLocalPdf(any(), any())
    }

    @Test
    fun `startSharing() will directly share the local PDF`() = runTest(testDispatcher) {
        val shareFeature = spy(ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher))
        val shareState = ShareResourceState.LocalResource(url = "content://pdf.pdf", contentType = "contentType")
        shareFeature.scope = this

        shareFeature.startSharing(shareState)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(shareFeature, never()).download(any())
        verify(shareFeature).shareLocalPdf("content://pdf.pdf", "contentType")
    }

    @Test
    fun `download() will persist in cache the response#body() if available`() = runTest(testDispatcher) {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)
        val inputStream = "test".byteInputStream(StandardCharsets.UTF_8)
        val responseFromShareState = mock<Response>().apply {
            doReturn(Response.Body(inputStream)).`when`(this).body
            doReturn(Response.SUCCESS).`when`(this).status
            doReturn(MutableHeaders()).`when`(this).headers
        }
        val shareState = ShareResourceState.InternetResource("randomUrl.jpg", response = responseFromShareState)

        val result = shareFeature.download(shareState)

        assertTrue(result.exists())
        assertTrue(result.name.endsWith(".$DEFAULT_IMAGE_EXTENSION"))
        assertEquals(cacheDirName, result.parentFile?.name)
        assertEquals("test", result.inputStream().bufferedReader().use { it.readText() })
    }

    @Test(expected = RuntimeException::class)
    fun `download() will throw an error if the request is not successful`() = runTest(testDispatcher) {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)
        val responseFromShareState = mock<Response>().apply {
            doReturn(Response.Body("test".byteInputStream())).`when`(this).body
            doReturn(500).`when`(this).status
        }
        val shareState = ShareResourceState.InternetResource("randomUrl.jpg", response = responseFromShareState)

        shareFeature.download(shareState)
    }

    @Test
    fun `download() will download from the provided url the response#body() if is unavailable`() = runTest(testDispatcher) {
        val client: Client = mock()
        val inputStream = "clientTest".byteInputStream(StandardCharsets.UTF_8)
        doAnswer { Response("randomUrl", 200, MutableHeaders(), Response.Body(inputStream)) }
            .`when`(client).fetch(any())
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, client, testDispatcher)
        val shareState = ShareResourceState.InternetResource("randomUrl")

        val result = shareFeature.download(shareState)

        assertTrue(result.exists())
        assertTrue(result.name.endsWith(".$DEFAULT_IMAGE_EXTENSION"))
        assertEquals(cacheDirName, result.parentFile?.name)
        assertEquals("clientTest", result.inputStream().bufferedReader().use { it.readText() })
    }

    @Test
    fun `download() will create a not private Request if not in private mode`() = runTest(testDispatcher) {
        val client: Client = mock()
        val requestCaptor = argumentCaptor<Request>()
        val inputStream = "clientTest".byteInputStream(StandardCharsets.UTF_8)
        doAnswer { Response("randomUrl.png", 200, MutableHeaders(), Response.Body(inputStream)) }
            .`when`(client).fetch(requestCaptor.capture())
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, client, testDispatcher)
        val shareState = ShareResourceState.InternetResource("randomUrl.png", private = false)

        shareFeature.download(shareState)
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(requestCaptor.value.private)
    }

    @Test
    fun `download() will create a private Request if in private mode`() = runTest(testDispatcher) {
        val client: Client = mock()
        val requestCaptor = argumentCaptor<Request>()
        val inputStream = "clientTest".byteInputStream(StandardCharsets.UTF_8)
        doAnswer { Response("randomUrl.png", 200, MutableHeaders(), Response.Body(inputStream)) }
            .`when`(client).fetch(requestCaptor.capture())
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, client, testDispatcher)
        val shareState = ShareResourceState.InternetResource("randomUrl.png", private = true)

        shareFeature.download(shareState)
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(requestCaptor.value.private)
    }

    @Test
    fun `getFilename(extension) will return a String with the extension suffix`() {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)
        val testExtension = "testExtension"

        val result = shareFeature.getFilename(testExtension)

        assertTrue(result.endsWith(testExtension))
        assertTrue(result.length > testExtension.length)
    }

    @Test
    fun `getTempFile(extension) will return a File from the cache dir and with name ending in extension`() {
        val shareFeature = spy(ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher))
        val testExtension = "testExtension"

        val result = shareFeature.getTempFile(testExtension)

        assertTrue(result.name.endsWith(testExtension))
        assertEquals(shareFeature.getCacheDirectory().absolutePath, result.parentFile?.absolutePath)
    }

    @Test
    fun `getCacheDirectory() will return a new directory in the app's cache`() {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)

        val result = shareFeature.getCacheDirectory()

        assertEquals(temporaryFolder.root.absolutePath, result.parentFile?.absolutePath)
        assertEquals(cacheDirName, result.name)
    }

    @Test
    fun `getMediaShareCacheDirectory creates the needed files if they don't exist`() {
        val shareFeature = spy(ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher))
        val expectedDir = File(temporaryFolder.root, cacheDirName)

        expectedDir.deleteRecursively()
        assertFalse(expectedDir.exists())

        val result = shareFeature.getMediaShareCacheDirectory()

        assertEquals(expectedDir.absolutePath, result.absolutePath)
        assertTrue(result.exists())
    }

    @Test
    fun `getFileExtension returns a default extension if one cannot be extracted`() {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)

        val result = shareFeature.getFileExtension(mock(), mock())

        assertEquals(DEFAULT_IMAGE_EXTENSION, result)
    }

    @Test
    fun `getFileExtension returns an extension based on the media type inferred from the stream`() {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)
        val gifStream = (GIF_HEADER + "testImage").byteInputStream(StandardCharsets.UTF_8)
        // Add the gif mapping to a by default empty shadow of MimeTypeMap.

        val result = shareFeature.getFileExtension(mock(), gifStream)

        assertEquals("gif", result)
    }

    @Test
    fun `getFileExtension returns an extension based on the response headers`() {
        val shareFeature = ShareResourceFeature(context, BrowserStore(), null, mock(), testDispatcher)
        val gifHeaders = MutableHeaders().apply {
            set(CONTENT_TYPE, "image/gif")
        }
        // Add the gif mapping to a by default empty shadow of MimeTypeMap.

        val result = shareFeature.getFileExtension(gifHeaders, mock())

        assertEquals("gif", result)
    }
}
