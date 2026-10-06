/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.bookmarks.file

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.components.concept.bookmark.parser.BookmarksFileParser
import mozilla.components.concept.bookmarks.file.BookmarksFileImporter
import mozilla.components.concept.bookmarks.file.BookmarksFileImporter.ImportResult
import mozilla.components.concept.storage.bookmarks.BookmarkInserter
import mozilla.components.concept.storage.bookmarks.InsertableBookmarkTreeRoot
import java.io.InputStream

/**
 * Creates a [BookmarksFileImporter] that imports bookmarks from Netscape HTML bookmark files.
 *
 * @param context Used to open an [InputStream] from the provided [Uri] via [Context.getContentResolver].
 * @param parser Parses the [InputStream] into a bookmark tree.
 * @param inserter Inserts the parsed bookmark tree into storage.
 */
fun BookmarksFileImporter.Companion.htmlImporter(
    context: Context,
    parentGuid: String,
    parser: BookmarksFileParser,
    inserter: BookmarkInserter,
    ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
): BookmarksFileImporter = HtmlBookmarksFileImporter(
    parentGuid = parentGuid,
    uriOpener = UriOpener.make(context, ioDispatcher),
    parser = parser,
    inserter = inserter,
)

/**
 * Opens an [InputStream] from a [Uri].
 */
internal fun interface UriOpener {
    /**
     * @param uri The [Uri] to open.
     * @return A [Result] containing the opened [InputStream], or a failure if the stream could not be opened.
     */
    suspend fun open(uri: Uri): Result<InputStream>

    companion object {
        /**
         * Creates a [UriOpener] that uses the [Context.getContentResolver] to open the [Uri].
         */
        fun make(context: Context, ioDispatcher: CoroutineDispatcher) =
            UriOpener { uri ->
                withContext(ioDispatcher) {
                    runCatching {
                        requireNotNull(context.contentResolver.openInputStream(uri))
                    }
                }
            }
    }
}

internal class HtmlBookmarksFileImporter(
    private val parentGuid: String,
    private val uriOpener: UriOpener,
    private val parser: BookmarksFileParser,
    private val inserter: BookmarkInserter,
) : BookmarksFileImporter {

    override suspend fun importBookmarksFromUri(uri: Uri) = runCatching {
            val inputStream = uriOpener.open(uri).getOrThrow()
            val parseResult = inputStream.use { parser.parse(it) }.getOrThrow()
            val tree = InsertableBookmarkTreeRoot(parentGuid = parentGuid, rootFolder = parseResult.folder)
            val guid = inserter.insertTree(tree).getOrThrow()

            ImportResult(guid, parseResult.bookmarksCount)
    }.onFailure {
        if (it is CancellationException) throw it
    }
}
