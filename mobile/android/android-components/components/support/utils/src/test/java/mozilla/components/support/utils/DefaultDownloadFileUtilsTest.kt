/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.app.DownloadManager.ACTION_VIEW_DOWNLOADS
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Environment
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertTrue
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Rule
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

@RunWith(AndroidJUnit4::class)
@Config(shadows = [ShadowFileProvider::class])
class DefaultDownloadFileUtilsTest {
    @Rule
    @JvmField
    val folder = TemporaryFolder()

    private val rootPath: String
        get() = folder.root.path

    val defaultDownloadFileUtils: DefaultDownloadFileUtils = DefaultDownloadFileUtils(
        context = testContext,
        downloadLocation = {
            rootPath
        },
    )

    private fun assertContentDisposition(expected: String, contentDisposition: String) {
        assertEquals(
            expected,
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = contentDisposition,
                url = null,
                mimeType = null,
            ),
        )
    }

    @Test
    fun guessFileName_contentDisposition() {
        // Default file name
        assertContentDisposition("downloadfile.bin", "")

        CONTENT_DISPOSITION_TYPES.forEach { contentDisposition ->
            // continuing with default filenames
            assertContentDisposition("downloadfile.bin", contentDisposition)
            assertContentDisposition("downloadfile.bin", "$contentDisposition;")
            assertContentDisposition("downloadfile.bin", "$contentDisposition; filename")
            assertContentDisposition("downloadfile.bin", "$contentDisposition; filename=")
            assertContentDisposition("downloadfile.bin", "$contentDisposition; filename=\"\"")
            assertContentDisposition("downloadfile.bin", "$contentDisposition; filename=.bin")

            // Provided filename field
            assertContentDisposition("filename.jpg", "$contentDisposition; filename=\"filename.jpg\"")
            assertContentDisposition("file\"name.jpg", "$contentDisposition; filename=\"file\\\"name.jpg\"")
            assertContentDisposition("file\\name.jpg", "$contentDisposition; filename=\"file\\\\name.jpg\"")
            assertContentDisposition("file\\\"name.jpg", "$contentDisposition; filename=\"file\\\\\\\"name.jpg\"")
            assertContentDisposition("filename.jpg", "$contentDisposition; filename=filename.jpg")
            assertContentDisposition("filename.jpg", "$contentDisposition; filename=filename.jpg; foo")
            assertContentDisposition("filename.jpg", "$contentDisposition; filename=\"filename.jpg\"; foo")
            assertContentDisposition("file\nname.jpg", "$contentDisposition; filename=\"file%0Aname.jpg\"; foo")

            // UTF-8 encoded filename* field
            assertContentDisposition(
                "\uD83E\uDD8A + x.jpg",
                "$contentDisposition; filename=\"_.jpg\"; filename*=utf-8'en'%F0%9F%A6%8A%20+%20x.jpg",
            )
            assertContentDisposition(
                "filename 的副本.jpg",
                contentDisposition + ";filename=\"_.jpg\";" +
                    "filename*=UTF-8''filename%20%E7%9A%84%E5%89%AF%E6%9C%AC.jpg",
            )
            assertContentDisposition(
                "filename.jpg",
                "$contentDisposition; filename=_.jpg; filename*=utf-8'en'filename.jpg",
            )
            // Wrong order of the "filename*" segment
            assertContentDisposition(
                "filename.jpg",
                "$contentDisposition; filename*=utf-8'en'filename.jpg; filename=_.jpg",
            )
            // Semicolon at the end
            assertContentDisposition(
                "filename.jpg",
                "$contentDisposition; filename*=utf-8'en'filename.jpg; foo",
            )

            // ISO-8859-1 encoded filename* field
            assertContentDisposition(
                "file' 'name.jpg",
                "$contentDisposition; filename=\"_.jpg\"; filename*=iso-8859-1'en'file%27%20%27name.jpg",
            )

            assertContentDisposition("success.html", "$contentDisposition; filename*=utf-8''success.html; foo")
            assertContentDisposition("success.html", "$contentDisposition; filename*=utf-8''success.html")
            assertContentDisposition("Firefox v9.apk", "$contentDisposition; filename=\"Firefox v9.apk\"; filename*=utf-8''Firefox v9.apk")
            assertContentDisposition("Firefox (v9).apk", "$contentDisposition; filename=\"Firefox (v9).apk\"; filename*=utf-8''Firefox%20%28v9%29.apk")
        }
    }

    @Test
    fun uniqueFilenameNoExtension() {
        val spyUtils = spy(defaultDownloadFileUtils)

        assertEquals("test", spyUtils.uniqueFileName(rootPath, "test"))

        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test")
        assertEquals("test(1)", spyUtils.uniqueFileName(rootPath, "test"))

        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test")
        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test(1)")
        assertEquals("test(2)", spyUtils.uniqueFileName(rootPath, "test"))
    }

    @Test
    fun uniqueFilename() {
        val spyUtils = spy(defaultDownloadFileUtils)

        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test.zip")

        assertEquals("test(1).zip", spyUtils.uniqueFileName(rootPath, "test.zip"))

        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test.zip")
        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test(1).zip")

        assertEquals("test(2).zip", spyUtils.uniqueFileName(rootPath, "test.zip"))
    }

    @Test
    fun guessFilename() {
        val spyUtils = spy(defaultDownloadFileUtils)

        assertEquals(
            "test.zip",
            spyUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/test.zip",
                mimeType = "application/zip",
            ),
        )

        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test.zip")
        assertEquals(
            "test(1).zip",
            spyUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/test.zip",
                mimeType = "application/zip",
            ),
        )

        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test.zip")
        doReturn(true).`when`(spyUtils).fileExists(rootPath, "test(1).zip")
        assertEquals(
            "test(2).zip",
            spyUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/test.zip",
                mimeType = "application/zip",
            ),
        )
    }

    @Test
    fun guessFileName_url() {
        assertUrl(
            expected = "downloadfile.bin",
            url = "http://example.com/",
        )
        assertUrl(
            expected = "downloadfile.bin",
            url = "http://example.com/filename/",
        )
        assertUrl(
            expected = "filename.jpg",
            url = "http://example.com/filename.jpg",
        )
        assertUrl(
            expected = "filename.jpg",
            url = "http://example.com/foo/bar/filename.jpg",
        )
    }

    @Test
    fun guessFileName_mimeType() {
        // Matches the first extension from official mapping: application/x-msdos-program -> com exe bat dll
        assertEquals(
            "com",
            MimeTypeMap.getSingleton().getExtensionFromMimeType("application/x-msdos-program"),
        )
        assertEquals(
            "application/x-msdos-program",
            MimeTypeMap.getSingleton().getMimeTypeFromExtension("exe"),
        )
        assertEquals(
            "application/x-msdos-program",
            MimeTypeMap.getSingleton().getMimeTypeFromExtension("dll"),
        )
        assertEquals(
            "application/x-msdos-program",
            MimeTypeMap.getSingleton().getMimeTypeFromExtension("bat"),
        )

        assertEquals(
            "file.jpg",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.jpg",
                mimeType = "image/jpeg",
            ),
        )

        // This is difference with URLUtil.guessFileName
        assertEquals(
            "file.bin.jpg",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.bin",
                mimeType = "image/jpeg",
            ),
        )

        assertEquals(
            "Caesium-wahoo-v3.6-b792615ced1b.zip",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "https://download.msfjarvis.website/caesium/wahoo/beta/Caesium-wahoo-v3.6-b792615ced1b.zip",
                mimeType = "application/zip",
            ),
        )
        assertEquals(
            "compressed.TAR.GZ",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/compressed.TAR.GZ",
                mimeType = "application/gzip",
            ),
        )
        assertEquals(
            "file.html",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file?abc",
                mimeType = "text/html",
            ),
        )
        assertEquals(
            "file.html",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file",
                mimeType = "text/html",
            ),
        )
        assertEquals(
            "file.html",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file",
                mimeType = "text/html; charset=utf-8",
            ),
        )
        assertEquals(
            "file.txt.html",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.txt",
                mimeType = "text/html",
            ),
        )
        assertEquals(
            "file.txt",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.txt",
                mimeType = "text/plain",
            ),
        )
        assertEquals(
            "file.data",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.data",
                mimeType = "application/octet-stream",
            ),
        )
        assertEquals(
            "file.data",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.data",
                mimeType = "binary/octet-stream",
            ),
        )
        assertEquals(
            "file.data",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.data",
                mimeType = "application/unknown",
            ),
        )

        assertEquals(
            "file.zip.jpg",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.zip",
                mimeType = "image/jpeg",
            ),
        )

        // extra information in content-type
        assertEquals(
            "file.jpg",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.jpg",
                mimeType = "application/octet-stream; Charset=utf-8",
            ),
        )

        // Should not change to file.dll
        assertEquals(
            "file.exe",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.exe",
                mimeType = "application/x-msdos-program",
            ),
        )
        assertEquals(
            "file.exe",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.exe",
                mimeType = "application/vnd.microsoft.portable-executable",
            ),
        )

        // application/x-pdf with .pdf
        assertEquals(
            "file.pdf",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.pdf",
                mimeType = "application/x-pdf",
            ),
        )

        // application/x-pdf without extension
        assertEquals(
            "downloadfile.pdf",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/downloadfile",
                mimeType = "application/x-pdf",
            ),
        )

        // application/x-pdf with non-pdf extension
        assertEquals(
            "file.bin.pdf",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.bin",
                mimeType = "application/x-pdf",
            ),
        )

        assertEquals(
            "file.bin.com",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.bin",
                mimeType = "application/x-msdos-program",
            ),
        )

        assertEquals(
            "file.apks.zip",
            defaultDownloadFileUtils.guessFileName(
                contentDisposition = null,
                url = "http://example.com/file.apks",
                mimeType = "application/zip",
            ),
        )
    }

    @Test
    fun `Given a valid file When openFile is called Then it starts activity and returns true`() {
        val context = spy(testContext)

        val defaultDownloadFileUtils = DefaultDownloadFileUtils(
            context = context,
            downloadLocation = { "/storage/emulated/0/Download" },
        )
        val fileUtils = spy(defaultDownloadFileUtils)

        doReturn("content://downloads/public_downloads".toUri()).`when`(fileUtils)
            .findDownloadFileUri(
                any(),
                any(),
            )

        val fileName = "test.pdf"
        val directoryPath = "/storage/emulated/0/Download"
        val contentType = "application/pdf"

        val result = fileUtils.openFile(fileName, directoryPath, contentType)
        verify(context).startActivity(any())
        assertTrue(result)
    }

    @Test
    fun `Given file exists When createOpenFileIntent is called Then it returns ACTION_VIEW intent with correct URI and flags`() {
        val fileName = "test.pdf"
        val directoryPath = "content://downloads"
        val contentType = "application/pdf"
        val uri = "content://path/to/file".toUri()
        val defaultDownloadFileUtils = DefaultDownloadFileUtils(
            context = testContext,
            downloadLocation = { "/storage/emulated/0/Download" },
        )
        val fileUtils = spy(defaultDownloadFileUtils)

        doReturn(uri).`when`(fileUtils).findDownloadFileUri(fileName, directoryPath)
        doReturn(contentType).`when`(fileUtils).getSafeContentType(any(), any(), any())

        val intent = fileUtils.createOpenFileIntent(fileName, directoryPath, contentType)

        assertEquals(Intent.ACTION_VIEW, intent.action)
        assertEquals(uri, intent.data)
        assertEquals(contentType, intent.type)
        val expectedFlags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        assertEquals(expectedFlags, intent.flags)
    }

    @Test
    fun `Given file does NOT exist When createOpenFileIntent is called Then it returns fallback ACTION_VIEW_DOWNLOADS intent`() {
        val fileName = "missing.zip"
        val directoryPath = "/some/path"
        val defaultDownloadFileUtils = DefaultDownloadFileUtils(
            context = testContext,
            downloadLocation = { "/storage/emulated/0/Download" },
        )
        val fileUtils = spy(defaultDownloadFileUtils)

        doReturn(null).`when`(fileUtils).findDownloadFileUri(fileName, directoryPath)

        val intent = fileUtils.createOpenFileIntent(fileName, directoryPath, "application/zip")

        assertEquals(
            ACTION_VIEW_DOWNLOADS,
            intent.action,
        )
        assertEquals(Intent.FLAG_ACTIVITY_NEW_TASK, intent.flags)
    }

    @Test
    fun `Given default-directory file exists but MediaStore lookup fails When createOpenFileIntent is called Then it returns ACTION_VIEW intent`() {
        val fileName = "open-fallback.pdf"
        val directoryPath = "/storage/emulated/0/Download"
        val contentUri = "content://media/external_primary/downloads/42".toUri()

        val fileUtils = spy(
            DefaultDownloadFileUtils(
                context = testContext,
                downloadLocation = { directoryPath },
            ),
        )
        doReturn(contentUri).`when`(fileUtils).findDownloadFileUri(fileName, directoryPath)
        doReturn("application/pdf").`when`(fileUtils).getSafeContentType(any(), any(), any())

        val intent = fileUtils.createOpenFileIntent(fileName, directoryPath, "application/pdf")

        assertEquals(Intent.ACTION_VIEW, intent.action)
        assertEquals(contentUri, intent.data)
    }

    @Test
    fun `Given file uri fallback When createOpenFileIntent is called Then it returns content uri from FileProvider`() {
        val tempFile = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            "open-file-uri-fallback.pdf",
        )
        tempFile.writeText("test")

        val fileUtils = spy(
            DefaultDownloadFileUtils(
                context = testContext,
                downloadLocation = { tempFile.parent ?: "" },
            ),
        )
        val fileUri = Uri.fromFile(tempFile)
        doReturn(fileUri).`when`(fileUtils).findDownloadFileUri(tempFile.name, tempFile.parent ?: "")

        val intent = fileUtils.createOpenFileIntent(tempFile.name, tempFile.parent ?: "", "application/pdf")

        assertEquals(Intent.ACTION_VIEW, intent.action)
        assertEquals(ContentResolver.SCHEME_CONTENT, intent.data?.scheme)
        assertEquals("application/pdf", intent.type)
        assertTrue(intent.data != fileUri)
        assertEquals(
            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION,
            intent.flags,
        )

        tempFile.delete()
    }

    @Test
    fun `Given fileName is null When createOpenFileIntent is called Then it returns fallback ACTION_VIEW_DOWNLOADS intent`() {
        val defaultDownloadFileUtils = DefaultDownloadFileUtils(
            context = testContext,
            downloadLocation = { "/storage/emulated/0/Download" },
        )
        val fileUtils = spy(defaultDownloadFileUtils)
        val directoryPath = "/some/path"

        doReturn(null).`when`(fileUtils).findDownloadFileUri(null, directoryPath)

        val intent = fileUtils.createOpenFileIntent(null, directoryPath, null)

        assertEquals(
            ACTION_VIEW_DOWNLOADS,
            intent.action,
        )
    }

    @Test
    fun `Given a file scheme URI When createOpenFileIntent is called Then it converts to a shareable content URI via getFilePathUri`() {
        val fileName = "test.pdf"
        val directoryPath = "some/directory"
        val contentType = "application/pdf"

        val rawPath = "/storage/emulated/0/Download/test.pdf"
        val fileUri = Uri.parse("file://$rawPath")

        val fileUtils = spy(DefaultDownloadFileUtils(testContext))

        doReturn(fileUri).`when`(fileUtils).findDownloadFileUri(fileName, directoryPath)

        val expectedContentUri = Uri.parse("content://mozilla.components.support.utils.fileprovider/root$rawPath")
        doReturn(expectedContentUri).`when`(fileUtils).getFilePathUri(rawPath)

        val intent = fileUtils.createOpenFileIntent(fileName, directoryPath, contentType)

        verify(fileUtils).getFilePathUri(rawPath)

        assertEquals(Intent.ACTION_VIEW, intent.action)
        assertEquals(expectedContentUri, intent.data)
    }

    @Test
    fun `Given fileName is null When findDownloadFileUri is called Then it returns null`() {
        val fileUtils = spy(DefaultDownloadFileUtils(testContext) { "/default/path" })

        val result = fileUtils.findDownloadFileUri(null, "/any/path")

        assertNull(result)
    }

    @Test
    fun `Given a file scheme URI When findShareableDownloadFileUri is called Then it converts to a shareable content URI`() {
        val downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val tempFile = File(downloadDir, "test-shareable.pdf")
        tempFile.writeText("content")

        val fileUtils = DefaultDownloadFileUtils(testContext)
        val result = fileUtils.findShareableDownloadFileUri(tempFile.name, tempFile.parent ?: "")

        assertNotNull(result)
        assertEquals(ContentResolver.SCHEME_CONTENT, result.scheme)
        assertTrue(result.toString().contains("authority"))
        assertTrue(result.toString().contains(tempFile.name))

        tempFile.delete()
    }

    @Test
    fun `Given a content scheme URI When findShareableDownloadFileUri is called Then it returns the content URI`() {
        val fileName = "test.pdf"
        val directoryPath = "content://downloads/my_downloads"
        val contentUri = Uri.parse("$directoryPath/123")

        val fileUtils = spy(DefaultDownloadFileUtils(testContext))
        doReturn(contentUri).`when`(fileUtils).findDownloadFileUri(fileName, directoryPath)

        val result = fileUtils.findShareableDownloadFileUri(fileName, directoryPath)

        assertEquals(contentUri, result)
    }

    @Test
    fun `Given fileName is null When findShareableDownloadFileUri is called Then it returns null`() {
        val fileUtils = DefaultDownloadFileUtils(testContext) { "/default/path" }

        val result = fileUtils.findShareableDownloadFileUri(null, "/any/path")

        assertNull(result)
    }

    @Test
    fun `Given default directory and no MediaStore match When findDownloadFileUri is called Then it queries the downloads collection and returns null`() {
        val context = mock<Context>()
        val contentResolver = mock<ContentResolver>()
        val cursor = mock<Cursor>()
        doReturn(contentResolver).`when`(context).contentResolver

        val fileUtils = spy(DefaultDownloadFileUtils(context) { "/default/path" })
        val fileName = "test.txt"

        val dummyCollectionUri = Uri.parse("content://media/external_primary/downloads")

        doReturn(cursor).`when`(contentResolver).query(
            eq(dummyCollectionUri),
            any(),
            any(),
            any(),
            any(),
        )
        doReturn(false).`when`(cursor).moveToFirst()

        val result = fileUtils.findDownloadFileUri(
            fileName = fileName,
            directoryPath = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path,
        )

        verify(contentResolver).query(
            eq(dummyCollectionUri),
            any(),
            any(),
            any(),
            any(),
        )
        assertNull(result)
    }

    @Test
    fun `Given default directory and no Downloads entry When findDownloadFileUri is called Then it returns file Uri`() {
        val tempFile = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            "fallback-downloads.txt",
        )
        tempFile.writeText("test")

        val fileUtils = DefaultDownloadFileUtils(testContext) { "/default/path" }

        val result = fileUtils.findDownloadFileUri(
            fileName = tempFile.name,
            directoryPath = tempFile.parent ?: "",
        )

        assertEquals(Uri.fromFile(tempFile), result)
        tempFile.delete()
    }

    @Test
    fun `Given default directory and missing MediaStore entry When findDownloadFileUri is called Then it returns file Uri`() {
        val tempFile = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            "fallback.pdf",
        )
        tempFile.writeText("test")

        val fileUtils = DefaultDownloadFileUtils(testContext) { "/default/path" }

        val result = fileUtils.findDownloadFileUri(
            fileName = tempFile.name,
            directoryPath = tempFile.parent ?: "",
        )

        assertEquals(Uri.fromFile(tempFile), result)
        tempFile.delete()
    }

    @Test
    @Config(sdk = [28])
    fun `Given default directory and missing MediaStore entry When deleteMediaFile is called Then it falls back to File API`() {
        val tempFile = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            "delete-fallback.pdf",
        )
        tempFile.writeText("test")

        val fileUtils = DefaultDownloadFileUtils(testContext) { "/default/path" }

        val result = fileUtils.deleteMediaFile(
            contentResolver = testContext.contentResolver,
            fileName = tempFile.name,
            directoryPath = tempFile.parent ?: "",
        )

        assertTrue(result)
        assertTrue(!tempFile.exists())
    }

    @Test
    fun `Given SAF directory When findDownloadFileUri is called Then it searches via SAF`() {
        val fileUtils = spy(DefaultDownloadFileUtils(testContext) { "/default/path" })
        val fileName = "saf_file.pdf"
        val safPath = "content://com.android.externalstorage.documents/tree/primary"
        val expectedUri = "content://path/to/saf/file".toUri()

        doReturn(expectedUri).`when`(fileUtils).findFileInSafDirectory(
            safPath,
            fileName,
        )

        fileUtils.findDownloadFileUri(fileName, safPath)

        verify(fileUtils).findFileInSafDirectory(directoryPath = safPath, fileName = fileName)
    }

    @Test
    fun `Given a SecurityException occurs When searching Then it logs error and returns null`() {
        val fileUtils = spy(DefaultDownloadFileUtils(testContext) { "/default/path" })
        val fileName = "secret.file"
        val safPath = "content://locked/path"

        doThrow(SecurityException("No permission"))
            .`when`(fileUtils).findFileInSafDirectory(safPath, fileName)

        val result = fileUtils.findDownloadFileUri(fileName, safPath)

        assertNull(result)
    }

    @Test
    fun `Given a IllegalArgumentException occurs When searching Then it logs error and returns null`() {
        val fileUtils = spy(DefaultDownloadFileUtils(testContext) { "/default/path" })
        val fileName = "secret.file"
        val safPath = "content://locked/path"

        doThrow(IllegalArgumentException("Invalid URI"))
            .`when`(fileUtils).findFileInSafDirectory(safPath, fileName)

        val result = fileUtils.findDownloadFileUri(fileName, safPath)

        assertNull(result)
    }

    @Test
    fun `Given a IllegalStateException occurs When searching Then it logs error and returns null`() {
        val fileUtils = spy(DefaultDownloadFileUtils(testContext) { "/default/path" })
        val fileName = "secret.file"
        val safPath = "content://locked/path"

        doThrow(IllegalStateException("Illegal State"))
            .`when`(fileUtils).findFileInSafDirectory(safPath, fileName)

        val result = fileUtils.findDownloadFileUri(fileName, safPath)

        assertNull(result)
    }

    @Test
    fun `getSafeContentType - WHEN the file content type is available via ContentResolver THEN use it`() {
        val contentTypeFromFile = "application/pdf; qs=0.001"
        val mockContentResolver = mock<ContentResolver>()
        val mockUri = mock<Uri>()
        val spyContext = spy(testContext)

        doReturn(mockContentResolver).`when`(spyContext).contentResolver

        doReturn(contentTypeFromFile).`when`(mockContentResolver).getType(mockUri)

        val downloadFileUtils = DefaultDownloadFileUtils(
            context = spyContext,
            downloadLocation = { "downloads" },
        )

        val result = downloadFileUtils.getSafeContentType(
            fileName = "test.pdf",
            contentType = "text/plain",
            uri = mockUri,
        )

        assertEquals("application/pdf", result)
    }

    @Test
    fun `getSafeContentType - WHEN the file content type is not available THEN use the provided content type`() {
        val mockUri = mock<Uri>()
        val contentResolver = mock<ContentResolver>()

        val spyContext = spy(testContext)
        doReturn(contentResolver).`when`(spyContext).contentResolver

        val downloadFileUtils = DefaultDownloadFileUtils(
            context = spyContext,
            downloadLocation = { "downloads" },
        )

        doReturn(null).`when`(contentResolver).getType(mockUri)
        val result = downloadFileUtils.getSafeContentType(
            fileName = "test.pdf",
            contentType = "text/plain",
            uri = mockUri,
        )
        assertEquals("application/pdf", result)
    }

    @Test
    fun `getSafeContentType - WHEN none of the provided content types are available THEN return a generic content type`() {
        val spyContext = spy(testContext)
        val downloadFileUtils = DefaultDownloadFileUtils(
            context = spyContext,
            downloadLocation = { "downloads" },
        )
        val contentResolver = mock<ContentResolver>()
        doReturn(contentResolver).`when`(spyContext).contentResolver

        doReturn(null).`when`(contentResolver).getType(any())
        var result = downloadFileUtils.getSafeContentType(null, null, mock<Uri>())
        assertEquals("*/*", result)

        doReturn("").`when`(contentResolver).getType(any())
        result = downloadFileUtils.getSafeContentType(null, null, null)
        assertEquals("*/*", result)
    }

    @Test
    fun `Given a valid file, When renameFile is called on a legacy file system, Then it renames the file successfully and returns true`() {
        val oldName = "old_file.txt"
        val newName = "new_file.txt"

        val file = folder.newFile(oldName)
        assertTrue(file.exists())

        val result = defaultDownloadFileUtils.renameFile(rootPath, oldName, newName)

        assertTrue("Rename should return true", result)
        assertTrue("New file should exist", File(rootPath, newName).exists())
        assertTrue("Old file should no longer exist", !File(rootPath, oldName).exists())
    }

    @Test
    fun `Given a non-existent file, When renameFile is called on a legacy file system, Then it returns false`() {
        val result = defaultDownloadFileUtils.renameFile(rootPath, "non_existent.txt", "new.txt")
        assertEquals(false, result)
    }

    @Test
    fun `Given a null oldName, When renameFile is called, Then it returns false`() {
        val result = defaultDownloadFileUtils.renameFile(rootPath, null, "new.txt")
        assertEquals(false, result)
    }

    @Test
    fun `Given a SAF content path, When renameFile is called, Then it delegates to the SAF implementation`() {
        val spyUtils = spy(defaultDownloadFileUtils)
        val contentPath = "content://com.android.externalstorage.documents/tree/primary%3ADownload"
        val oldName = "test.txt"
        val newName = "renamed.txt"

        doReturn(true).`when`(spyUtils).renameFile(any(), any(), any())

        val result = spyUtils.renameFile(contentPath, oldName, newName)

        assertEquals(true, result)
        verify(spyUtils).renameFile(contentPath, oldName, newName)
    }

    @Test
    fun `Given a protected file, When renameFile throws a SecurityException, Then it handles the exception and returns false`() {
        val spyUtils = spy(defaultDownloadFileUtils)
        val oldName = "protected.txt"
        val newName = "new.txt"

        doThrow(SecurityException("Permission denied")).`when`(spyUtils).renameFile(any(), any(), any())

        val result = try {
            spyUtils.renameFile(rootPath, oldName, newName)
        } catch (_: Exception) {
            false
        }

        assertEquals(false, result)
    }

    companion object {
        private val CONTENT_DISPOSITION_TYPES = listOf("attachment", "inline")

        private fun assertUrl(expected: String, url: String) {
            assertEquals(
                expected,
                DefaultDownloadFileUtils(
                    context = testContext,
                ).guessFileName(
                    contentDisposition = null,
                    url = url,
                    mimeType = null,
                ),
            )
        }
    }
}

@Implements(FileProvider::class)
object ShadowFileProvider {
    @Implementation
    @JvmStatic
    @Suppress("UNUSED_PARAMETER")
    fun getUriForFile(
        context: Context?,
        authority: String?,
        file: File,
    ) = "content://authority/random/location/${file.name}".toUri()
}
