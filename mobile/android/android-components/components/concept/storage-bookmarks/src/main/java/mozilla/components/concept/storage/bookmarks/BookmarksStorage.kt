/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.storage.bookmarks

/**
 * Inserts bookmarks into storage.
 */
fun interface BookmarkInserter {
    /**
     * Inserts the given bookmark folder (including its children) into storage.
     *
     * @param tree The [InsertableBookmarkTreeRoot] to insert.
     * @return The guid of the head of the inserted bookmark tree.
     */
    suspend fun insertTree(tree: InsertableBookmarkTreeRoot): Result<String>
}

/**
 * Represents the root of a bookmark tree to be inserted into storage.
 *
 * @property parentGuid The guid of the existing parent folder to insert the tree under.
 * @property rootFolder The root folder of the tree to insert.
 */
data class InsertableBookmarkTreeRoot(val parentGuid: String, val rootFolder: InsertableBookmarkTreeNode.Folder)

/**
 * Represents a bookmark node that can be inserted into storage.
 */
sealed interface InsertableBookmarkTreeNode {
    val position: UInt?
    val dateAddedTimestamp: Long
    val lastModifiedTimestamp: Long

    /**
     * A bookmark item (e.g. a page).
     *
     * @property title The title of the bookmark.
     * @property url The URL of the bookmark.
     * @property dateAddedTimestamp The date added timestamp of the bookmark.
     * @property lastModifiedTimestamp The last modified timestamp of the bookmark.
     * @property position The ordinal position within the parent.
     */
    data class Item(
        val title: String?,
        val url: String,
        override val dateAddedTimestamp: Long,
        override val lastModifiedTimestamp: Long,
        override val position: UInt?,
    ) : InsertableBookmarkTreeNode

    /**
     * A bookmark folder that can contain other [InsertableBookmarkTreeNode]s.
     *
     * @property title The title of the folder.
     * @property dateAddedTimestamp The date added timestamp of the folder.
     * @property lastModifiedTimestamp The last modified timestamp of the folder.
     * @property position The ordinal position within the parent.
     * @property children The child nodes contained in this folder.
     */
    data class Folder(
        val title: String?,
        override val dateAddedTimestamp: Long,
        override val lastModifiedTimestamp: Long,
        override val position: UInt?,
        val children: List<InsertableBookmarkTreeNode>,
    ) : InsertableBookmarkTreeNode

    /**
     * A bookmark separator.
     *
     * @property dateAddedTimestamp The date added timestamp of the folder.
     * @property lastModifiedTimestamp The last modified timestamp of the folder.
     * @property position The ordinal position within the parent.
     */
    data class Separator(
        override val dateAddedTimestamp: Long,
        override val lastModifiedTimestamp: Long,
        override val position: UInt?,
    ) : InsertableBookmarkTreeNode
}
