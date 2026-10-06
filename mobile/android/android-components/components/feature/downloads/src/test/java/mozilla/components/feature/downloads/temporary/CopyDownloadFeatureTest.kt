/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads.temporary

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.CopyInternetResourceAction
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
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import java.io.File
import java.nio.charset.StandardCharsets

/**
 * The 89a gif header as seen on https://www.w3.org/Graphics/GIF/spec-gif89a.txt
 */
private const val GIF_HEADER = "GIF89a"

@RunWith(AndroidJUnit4::class)
class CopyDownloadFeatureTest {

    private lateinit var context: Context
    private val testDispatcher = StandardTestDispatcher()
    private val scope = TestScope(testDispatcher)

    @get:Rule
    val temporaryFolder = TemporaryFolder()

    @Before
    fun setup() {
        // Effectively reset context mock
        context = spy(testContext)
        doReturn(temporaryFolder.root).`when`(context).cacheDir
    }

    @Test
    fun `cleanupCache should automatically be called when this class is initialized`() = runTest(testDispatcher) {
        val cacheDir = File(context.cacheDir, cacheDirName).also { dir ->
            dir.mkdirs()
            File(dir, "leftoverFile").also { file -> file.createNewFile() }
        }

        assertEquals(1, cacheDir.listFiles()?.size)

        CopyDownloadFeature(context, BrowserStore(), null, mock(), mock(), testDispatcher, testDispatcher)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(0, cacheDir.listFiles()?.size)
    }

    @Test
    fun `CopyFeature starts the copy process for AddCopyAction which is immediately consumed`() {
        val captureMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    TabSessionState(
                        "123",
                        ContentState(url = "https://www.mozilla.org"),
                    ),
                ),
            ),
            middleware = listOf(captureMiddleware),
        )

        val copyFeature = spy(createFeature(store = store, tabId = "123"))
        doNothing().`when`(copyFeature).startCopy(any())

        val download = ShareResourceState.InternetResource(url = "testDownload")
        val action = CopyInternetResourceAction.AddCopyAction("123", download)
        copyFeature.start()

        store.dispatch(action)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(copyFeature).startCopy(download)

        captureMiddleware.assertFirstAction(CopyInternetResourceAction.ConsumeCopyAction::class) { action ->
            assertEquals("123", action.tabId)
        }
    }

    @Test
    fun `cleanupCache should delete all files from the cache directory`() = runTest(testDispatcher) {
        val copyFeature = createFeature()
        val cacheDir = copyFeature.getMediaShareCacheDirectory()

        val testFile = File(cacheDir, "testFile")
        testFile.createNewFile()

        assertTrue("File was created", testFile.exists())

        copyFeature.cleanupCache()

        val remainingFiles = cacheDir.listFiles()?.toList() ?: emptyList()

        assertTrue("Cache not empty. Found: $remainingFiles", remainingFiles.isEmpty())
    }

    @Test
    fun `startCopy() will download and then copy the selected download`() = runTest(testDispatcher) {
        val confirmationAction = mock<() -> Unit>()
        val copyFeature = spy(createFeature(confirmationAction))

        val shareState = ShareResourceState.InternetResource(url = "testUrl", contentType = "contentType")
        val downloadedFile = File("filePath")
        doReturn(downloadedFile).`when`(copyFeature).download(any())
        copyFeature.scope = scope

        copyFeature.startCopy(shareState)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(copyFeature).download(shareState)
        verify(copyFeature).copy(downloadedFile.canonicalPath, confirmationAction)
    }

    @Test
    fun `download() will persist in cache the response#body() if available`() = runTest(testDispatcher) {
        val copyFeature = createFeature()
        val inputStream = "test".byteInputStream(StandardCharsets.UTF_8)
        val responseFromShareState = mock<Response>()
        doReturn(Response.Body(inputStream)).`when`(responseFromShareState).body
        val shareState =
            ShareResourceState.InternetResource("randomUrl.jpg", response = responseFromShareState)
        doReturn(Response.SUCCESS).`when`(responseFromShareState).status
        doReturn(MutableHeaders()).`when`(responseFromShareState).headers

        val result = copyFeature.download(shareState)

        assertTrue(result.exists())
        assertTrue(result.name.endsWith(".$DEFAULT_IMAGE_EXTENSION"))
        assertEquals(cacheDirName, result.parentFile!!.name)
        assertEquals("test", result.inputStream().bufferedReader().use { it.readText() })
    }

    @Test(expected = RuntimeException::class)
    fun `download() will throw an error if the request is not successful`() = runTest(testDispatcher) {
        val copyFeature = createFeature()
        val inputStream = "test".byteInputStream(StandardCharsets.UTF_8)
        val responseFromShareState = mock<Response>()
        doReturn(Response.Body(inputStream)).`when`(responseFromShareState).body
        val shareState =
            ShareResourceState.InternetResource("randomUrl.jpg", response = responseFromShareState)
        doReturn(500).`when`(responseFromShareState).status

        copyFeature.download(shareState)
    }

    @Test
    fun `download() will download from the provided url the response#body() if is unavailable`() = runTest(testDispatcher) {
        val client: Client = mock()
        val inputStream = "clientTest".byteInputStream(StandardCharsets.UTF_8)
        doAnswer { Response("randomUrl", 200, MutableHeaders(), Response.Body(inputStream)) }
            .`when`(client).fetch(any())

        val copyFeature = createFeature(client = client)
        val shareState = ShareResourceState.InternetResource("randomUrl")

        val result = copyFeature.download(shareState)

        assertTrue(result.exists())
        assertTrue(result.name.endsWith(".$DEFAULT_IMAGE_EXTENSION"))
        assertEquals(cacheDirName, result.parentFile!!.name)
        assertEquals("clientTest", result.inputStream().bufferedReader().use { it.readText() })
    }

    @Test
    fun `download() will create a not private Request if not in private mode`() = runTest(testDispatcher) {
        val client: Client = mock()
        val requestCaptor = argumentCaptor<Request>()
        val inputStream = "clientTest".byteInputStream(StandardCharsets.UTF_8)
        doAnswer {
            Response(
                "randomUrl.png",
                200,
                MutableHeaders(),
                Response.Body(inputStream),
            )
        }
            .`when`(client).fetch(requestCaptor.capture())

        val copyFeature = createFeature(client = client)
        val shareState = ShareResourceState.InternetResource("randomUrl.png", private = false)

        copyFeature.download(shareState)

        assertFalse(requestCaptor.value.private)
    }

    @Test
    fun `download() will create a private Request if in private mode`() = runTest(testDispatcher) {
        val client: Client = mock()
        val requestCaptor = argumentCaptor<Request>()
        val inputStream = "clientTest".byteInputStream(StandardCharsets.UTF_8)
        doAnswer {
            Response(
                "randomUrl.png",
                200,
                MutableHeaders(),
                Response.Body(inputStream),
            )
        }
            .`when`(client).fetch(requestCaptor.capture())
        val copyFeature = createFeature(client = client)
        val shareState = ShareResourceState.InternetResource("randomUrl.png", private = true)

        copyFeature.download(shareState)

        assertTrue(requestCaptor.value.private)
    }

    @Test
    fun `getFilename(extension) will return a String with the extension suffix`() {
        val copyFeature = createFeature()
        val testExtension = "testExtension"

        val result = copyFeature.getFilename(testExtension)

        assertTrue(result.endsWith(testExtension))
        assertTrue(result.length > testExtension.length)
    }

    @Test
    fun `getTempFile(extension) will return a File from the cache dir and with name ending in extension`() {
        val copyFeature = createFeature()
        val testExtension = "testExtension"

        val result = copyFeature.getTempFile(testExtension)

        assertTrue(result.name.endsWith(testExtension))
        assertEquals(copyFeature.getCacheDirectory().toString(), result.parent)
    }

    @Test
    fun `getCacheDirectory() will return a new directory in the app's cache`() {
        val copyFeature = createFeature()

        val result = copyFeature.getCacheDirectory()

        assertEquals(context.cacheDir.absolutePath, result.parentFile?.absolutePath)
        assertEquals(cacheDirName, result.name)
    }

    @Test
    fun `getMediaShareCacheDirectory creates the needed files if they don't exist`() {
        val copyFeature = createFeature()

        val result = copyFeature.getMediaShareCacheDirectory()

        assertEquals(cacheDirName, result.name)
        assertTrue(result.exists())
    }

    @Test
    fun `getFileExtension returns a default extension if one cannot be extracted`() {
        val copyFeature = createFeature()

        val result = copyFeature.getFileExtension(mock(), mock())

        assertEquals(DEFAULT_IMAGE_EXTENSION, result)
    }

    @Test
    fun `getFileExtension returns an extension based on the media type inferred from the stream`() {
        val copyFeature = createFeature()
        val gifStream = (GIF_HEADER + "testImage").byteInputStream(StandardCharsets.UTF_8)
        // Add the gif mapping to a by default empty shadow of MimeTypeMap.

        val result = copyFeature.getFileExtension(mock(), gifStream)

        assertEquals("gif", result)
    }

    @Test
    fun `getFileExtension returns an extension based on the response headers`() {
        val copyFeature = createFeature()
        val gifHeaders = MutableHeaders().apply { set(CONTENT_TYPE, "image/gif") }
        // Add the gif mapping to a by default empty shadow of MimeTypeMap.

        val result = copyFeature.getFileExtension(gifHeaders, mock())

        assertEquals("gif", result)
    }

    private fun createFeature(
        confirmationAction: () -> Unit = mock(),
        client: Client = mock(),
        store: BrowserStore = BrowserStore(),
        tabId: String? = null,
    ): CopyDownloadFeature {
        return CopyDownloadFeature(
            context,
            store,
            tabId,
            confirmationAction,
            client,
            testDispatcher,
        )
    }
}
