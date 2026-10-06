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
        val documentId = "primary:Movies"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { documentId })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Movies", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI at the root of Downloads, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val treeUri =
            "content://com.android.externalstorage.documents/tree/primary%3ADownload"
        val documentId = "primary:Download"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { documentId })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Download", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI outside of Downloads, WHEN getFriendlyPath is called, THEN it should be formatted correctly`() {
        val treeUri =
            "content://com.android.externalstorage.documents/tree/primary%3ADownload"
        val documentId = "primary:Download"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(getTreeDocumentId = { documentId })
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Download", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI on SD card, WHEN getFriendlyPath is called, THEN it should include SD card label`() {
        val treeUri = "content://com.android.externalstorage.documents/tree/4077-1317%3AFenix"
        val documentId = "4077-1317:Fenix"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeDocumentId = { documentId },
            getExternalStorageVolumeName = { "SD card" },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("/SD card/Fenix", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI at SD card root, WHEN getFriendlyPath is called, THEN it should include only SD card label`() {
        val treeUri =
            "content://com.android.externalstorage.documents/tree/4077-1317%3A"
        val documentId = "4077-1317:"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeDocumentId = { documentId },
            getExternalStorageVolumeName = { "SD card" },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("/SD card/", friendlyPath)
    }

    @Test
    fun `GIVEN an SAF tree URI with unknown volume label, WHEN getFriendlyPath is called, THEN it should fallback to path only`() {
        val treeUri =
            "content://com.android.externalstorage.documents/tree/4077-1317%3AFenix"
        val documentId = "4077-1317:Fenix"
        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeDocumentId = { documentId },
            getExternalStorageVolumeName = { null },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(treeUri)

        assertEquals("~/Fenix", friendlyPath)
    }

    @Test
    fun `GIVEN a cloud provider URI with a generic name, WHEN getFriendlyPath is called, THEN it should format with the provider name`() {
        val cloudUri = "content://org.nextcloud.documents/tree/004803b794aac0ea1813c190f2191c54%2F1"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeUriName = { "/" },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(cloudUri)

        assertEquals("/Nextcloud", friendlyPath)
    }

    @Test
    fun `GIVEN a cloud URI with a specific folder name, WHEN getFriendlyPath is called, THEN it should use that folder name`() {
        val cloudUri = "content://org.nextcloud.documents/tree/folder_id"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeUriName = { "Invoices" },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(cloudUri)

        assertEquals("/Nextcloud/Invoices", friendlyPath)
    }

    @Test
    fun `GIVEN a cloud URI returning a numeric ID, WHEN getFriendlyPath is called, THEN it should fallback to provider name`() {
        val cloudUri = "content://com.microsoft.skydrive.content.external/tree/12345"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeUriName = { "12345" },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(cloudUri)

        assertEquals("/OneDrive", friendlyPath)
    }

    @Test
    fun `GIVEN an unknown cloud provider, WHEN getFriendlyPath is called, THEN it should extract name from authority`() {
        val unknownProviderUri = "content://com.unknown.provider/tree/root"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeUriName = { "/" },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(unknownProviderUri)

        assertEquals("/com.unknown.provider", friendlyPath)
    }

    @Test
    fun `GIVEN a content URI that returns null name and has no authority, WHEN getFriendlyPath is called, THEN it should return Cloud fallback`() {
        val weirdUri = "content://invalid-authority"

        val fakeAndroidFileUtils = FakeAndroidFileUtils(
            getTreeUriName = { null },
        )
        val formatter = DefaultDownloadLocationFormatter(fakeAndroidFileUtils)

        val friendlyPath = formatter.getFriendlyPath(weirdUri)

        assertEquals("/invalid-authority", friendlyPath)
    }
}
