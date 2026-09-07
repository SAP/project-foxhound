/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.bookmark.parser

import mozilla.components.concept.storage.bookmarks.InsertableBookmarkTreeNode
import java.io.InputStream

/**
 * An error type to be returned when we encounter an error while parsing bookmarks
 */
sealed class BookmarksParserError(
    override val message: String,
    override val cause: Throwable? = null,
) : RuntimeException(message, cause) {

    /**
     * Error encountered when we did not find the expected Netscape bookmark HTML content.
     */
    class UnsupportedContentType : BookmarksParserError(
        message = "Expected an HTML file with Netscape doctype but found something else",
    )

    /**
     * Error encountered when there is an issue with the format of the file. This would
     * typically apply when the content was detected to be HTML and Netscape doctype, but
     * an expected value was missing - e.g a bookmark without a link.
     */
    class InvalidFormatError(
        override val message: String,
    ) : BookmarksParserError(message = message)

    /**
     * Error returned when other parsing-related error - I/O errors, or problems with the
     * parsing code, etc., happen.
     */
    class UnexpectedError(message: String, cause: Throwable?) : BookmarksParserError(message, cause)
}

/**
 * Result of the parsing
 *
 * @property foldersCount The number of folders encountered during parsing
 * @property bookmarksCount The number of bookmarks encountered during parsing
 * @property folder The folder containing the imported bookmarks
 */
data class BookmarksParseResult(
    val foldersCount: Int,
    val bookmarksCount: Int,
    val folder: InsertableBookmarkTreeNode.Folder,
)

/**
 * An abstract definition of a component that parses bookmark files into a tree of
 * [InsertableBookmarkTreeNode]s.
 */
fun interface BookmarksFileParser {

    /**
     * Parses the content in an [inputStream] and returns a [BookmarksParseResult] that contains
     * the parsed tree, and some meta-information about the parsing.
     *
     * @param inputStream [InputStream] representing the Netscape bookmark file content
     * @return A [Result] containing the root BookmarksParseResult] that contains
     * the parsed tree, and some meta-information about the parsing or a failure if the file
     * could not be parsed.
     */
    suspend fun parse(inputStream: InputStream): Result<BookmarksParseResult>

    companion object {

        /**
         * Returns a [BookmarksFileParser] that always succeeds, returning [folder] if provided
         * or a default tree otherwise.
         */
        fun fakeSuccess(folder: InsertableBookmarkTreeNode.Folder?): BookmarksFileParser =
            FakeSuccessParser(folder)

        /**
         * Returns a [BookmarksFileParser] that always fails with a [BookmarksFileParser].
         */
        fun fakeFailure() = BookmarksFileParser {
            Result.failure(RuntimeException("couldn't parse it"))
        }
    }
}

private class FakeSuccessParser(val returnedFolder: InsertableBookmarkTreeNode.Folder?) :
    BookmarksFileParser {
    override suspend fun parse(inputStream: InputStream): Result<BookmarksParseResult> =
        Result.success(
            BookmarksParseResult(
                bookmarksCount = 3,
                foldersCount = 1,
                folder = returnedFolder ?: defaultFakeSuccessFolder,
            ),
        )

    private val defaultFakeSuccessFolder: InsertableBookmarkTreeNode.Folder =
        InsertableBookmarkTreeNode.Folder(
            title = "Bookmarks",
            position = 0u,
            dateAddedTimestamp = 0L,
            lastModifiedTimestamp = 0L,
            children = listOf(
                InsertableBookmarkTreeNode.Folder(
                    title = "Subfolder",
                    position = 0u,
                    dateAddedTimestamp = 0L,
                    lastModifiedTimestamp = 0L,
                    children = listOf(
                        InsertableBookmarkTreeNode.Item(
                            title = "Example",
                            url = "https://example.com",
                            position = 1u,
                            dateAddedTimestamp = 0L,
                            lastModifiedTimestamp = 0L,
                        ),
                        InsertableBookmarkTreeNode.Separator(
                            position = 2u,
                            dateAddedTimestamp = 0L,
                            lastModifiedTimestamp = 0L,
                        ),
                        InsertableBookmarkTreeNode.Item(
                            title = "Wikipedia",
                            url = "https://wikipedia.org",
                            position = 2u,
                            dateAddedTimestamp = 0L,
                            lastModifiedTimestamp = 0L,
                        ),
                    ),
                ),
                InsertableBookmarkTreeNode.Item(
                    title = "Mozilla",
                    url = "https://www.mozilla.org",
                    position = 1u,
                    dateAddedTimestamp = 0L,
                    lastModifiedTimestamp = 0L,
                ),
            ),
        )
}
