/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.os.Environment
import android.webkit.MimeTypeMap
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy

@RunWith(AndroidJUnit4::class)
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

    companion object {
        private val CONTENT_DISPOSITION_TYPES = listOf("attachment", "inline")

        private fun assertUrl(expected: String, url: String) {
            assertEquals(
                expected,
                DefaultDownloadFileUtils(
                    context = testContext,
                    downloadLocation = {
                        Environment.getExternalStoragePublicDirectory(
                            Environment.DIRECTORY_DOWNLOADS,
                        ).path
                    },
                ).guessFileName(
                    contentDisposition = null,
                    url = url,
                    mimeType = null,
                ),
            )
        }
    }
}
