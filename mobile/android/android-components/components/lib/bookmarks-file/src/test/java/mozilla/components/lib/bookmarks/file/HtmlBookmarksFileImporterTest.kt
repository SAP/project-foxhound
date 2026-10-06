/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.bookmarks.file

import android.net.Uri
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.bookmark.parser.BookmarksFileParser
import mozilla.components.concept.storage.bookmarks.BookmarkInserter
import mozilla.components.concept.storage.bookmarks.InsertableBookmarkTreeRoot
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.ByteArrayInputStream
import java.io.IOException
import kotlin.test.assertIs
import kotlin.time.Duration.Companion.seconds

@OptIn(ExperimentalCoroutinesApi::class) // advanceTimeBy
@RunWith(RobolectricTestRunner::class)
class HtmlBookmarksFileImporterTest {
    private val testUri = Uri.EMPTY

    @Test
    fun `importBookmarksFromUri returns correct count`() = runTest {
        val importer = createImporter()

        val result = importer.importBookmarksFromUri(testUri).getOrThrow()

        assertEquals(3, result.count)
    }

    @Test
    fun `importBookmarksFromUri returns guid from inserter`() = runTest {
        val importer = createImporter(inserter = fakeInserter(guid = "root-guid"))

        val result = importer.importBookmarksFromUri(testUri).getOrThrow()

        assertEquals("root-guid", result.guid)
    }

    @Test
    fun `importBookmarksFromUri passes parsed tree to inserter`() = runTest {
        var insertedTree: InsertableBookmarkTreeRoot? = null
        val importer = createImporter(
            inserter = fakeInserter { insertedTree = it },
        )

        importer.importBookmarksFromUri(testUri).getOrThrow()

        assertEquals("parentGuid", insertedTree!!.parentGuid)
    }

    @Test
    fun `importBookmarksFromUri returns failure when uriOpener fails`() = runTest {
        val importer = createImporter(
            uriOpener = { Result.failure(IOException("cannot open")) },
        )

        val result = importer.importBookmarksFromUri(testUri)

        assertTrue(result.isFailure)
        assertIs<IOException>(result.exceptionOrNull())
    }

    @Test
    fun `importBookmarksFromUri returns failure when parser fails`() = runTest {
        val importer = createImporter(parser = BookmarksFileParser.fakeFailure())

        val result = importer.importBookmarksFromUri(testUri)

        assertTrue(result.isFailure)
    }

    @Test
    fun `importBookmarksFromUri returns failure when inserter fails`() = runTest {
        val importer = createImporter(
            inserter = fakeInserter(result = Result.failure(RuntimeException("insert failed"))),
        )

        val result = importer.importBookmarksFromUri(testUri)

        assertTrue(result.isFailure)
        assertIs<RuntimeException>(result.exceptionOrNull())
    }

    @Test
    fun `importBookmarksFromUri does not swallow cancellation when the job is cancelled before the result`() =
        runTest {
            // Given that the parsing takes 10 seconds
            val importer = createImporter(
                uriOpener = UriOpener {
                    Result.success(
                        """
                            <!DOCTYPE NETSCAPE-Bookmark-file-1>
                            <HTML>
                            <DL><p>
                              <DT><A HREF="https://example.com" ADD_DATE="1000" LAST_MODIFIED="2000">Example</A>
                            </DL>
                        """.trimIndent().byteInputStream(),
                    )
                },
                parser = BookmarksFileParser {
                    delay(10.seconds)
                    Result.failure(Throwable("Unable to parse"))
                },
                inserter = BookmarkInserter {
                    Result.failure(Throwable("Unable to insert"))
                },
            )
            var caughtException: Throwable? = null

            // When we import bookmarks
            val job = launch(UnconfinedTestDispatcher(testScheduler)) {
                try {
                    importer.importBookmarksFromUri(testUri)
                } catch (e: Throwable) {
                    caughtException = e
                }
            }

            // And the job is canceled 1 second into execution
            advanceTimeBy(1.seconds)
            job.cancel()
            advanceUntilIdle()

            // Then verify that expectedException is a cancellation exception
            assertIs<CancellationException>(caughtException)
        }

    private fun fakeInserter(
        guid: String = "guid",
        result: Result<String>? = null,
        onInsert: (InsertableBookmarkTreeRoot) -> Unit = {},
    ) = BookmarkInserter { tree ->
        onInsert(tree)
        result ?: Result.success(guid)
    }

    private fun createImporter(
        parentGuid: String = "parentGuid",
        uriOpener: UriOpener = UriOpener { Result.success(ByteArrayInputStream(ByteArray(0))) },
        parser: BookmarksFileParser = BookmarksFileParser.fakeSuccess(folder = null),
        inserter: BookmarkInserter = fakeInserter(),
    ) = HtmlBookmarksFileImporter(
        parentGuid = parentGuid,
        uriOpener = uriOpener,
        parser = parser,
        inserter = inserter,
    )
}
