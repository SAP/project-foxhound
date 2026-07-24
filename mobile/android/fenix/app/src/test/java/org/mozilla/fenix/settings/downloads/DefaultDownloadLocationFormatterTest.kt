/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import androidx.core.net.toUri
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DefaultDownloadLocationFormatterTest {

    @Test
    fun `GIVEN a URI with an unknown scheme, WHEN getFriendlyPath is called, THEN it should return the original path`() {
        val fakeAndroidFileUtils = FakeAndroidFileUtils()
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val unknownSchemePath = "ftp://example.com/some/file"
        val friendlyPath = formatter.getFriendlyPath(unknownSchemePath)
        assertEquals(unknownSchemePath, friendlyPath)
    }

    @Test
    fun `GIVEN a standard file path, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val fakeAndroidFileUtils = FakeAndroidFileUtils()
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val filePath = "/storage/emulated/0/Download/MyFolder"
        val friendlyPath = formatter.getFriendlyPath(filePath)
        assertEquals("~/MyFolder", friendlyPath)
    }

    @Test
    fun `GIVEN a file URI scheme, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val fakeAndroidFileUtils = FakeAndroidFileUtils()
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val fileUri = "file:///storage/emulated/0/Movies"
        val friendlyPath = formatter.getFriendlyPath(fileUri)
        assertEquals("~/Movies", friendlyPath)
    }

    @Test
    fun `GIVEN a file path outside primary storage, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val fakeAndroidFileUtils = FakeAndroidFileUtils()
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val otherPath = "/data/data/org.mozilla.fenix/files/internal.pdf"
        val friendlyPath = formatter.getFriendlyPath(otherPath)
        assertEquals("~/internal.pdf", friendlyPath)
    }

    @Test(expected = MissingUriPermission::class)
    fun `GIVEN a content URI without permission, WHEN getFriendlyPath is called, THEN it should throw PermissionLostException`() {
        val fakeAndroidFileUtils = FakeAndroidFileUtils(hasUriPermission = { false })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val contentUri =
            "content://com.android.externalstorage.documents/tree/primary%3ADownload".toUri()

        formatter.getFriendlyPath(contentUri.toString())
    }

    @Test
    fun `GIVEN an SAF tree URI inside Downloads, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val treeUri = "content://com.android.externalstorage.documents/tree/primary%3AMovies"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { treeUri })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Movies", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI at the root of Downloads, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val treeUri =
            "content://com.android.externalstorage.documents/tree/primary%3ADownload"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { treeUri })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Download", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI outside of Downloads, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val treeUri =
            "content://com.android.externalstorage.documents/tree/primary%3ADownload"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { treeUri })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Download", friendlyPath)
    }

    @Test
    fun `Given a non-tree content URI, When getFriendlyPath is called, Then it should use the last path segment`() {
        val contentUri = "content://media/external/downloads/123"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { contentUri })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(contentUri)

        assertEquals("~/123", friendlyPath)
    }
}
