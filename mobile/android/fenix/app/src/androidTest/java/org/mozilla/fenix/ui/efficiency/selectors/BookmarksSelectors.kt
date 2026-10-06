/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.bookmarks.BookmarksTestTag
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object BookmarksSelectors {
    val TOOLBAR_TITLE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = "Bookmarks",
        description = "Bookmarks Toolbar Title",
        groups = listOf("requiredForPage"),
    )

    val OPEN_IN_NEW_TAB_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.bookmark_menu_open_in_new_tab_button),
        description = "Open in new tab bookmarks three dot menu button",
        groups = listOf("bookmarksThreeDotMenu"),
    )

    val NAVIGATE_UP_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = getStringResource(R.string.bookmark_navigate_back_button_content_description),
        description = "Bookmark edit navigate up button",
        groups = listOf("editBookmarksView"),
    )

    val EDIT_BOOKMARKS_TOOLBAR_TITLE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.edit_bookmark_fragment_title),
        description = "Bookmark edit toolbar title",
        groups = listOf("editBookmarksView"),
    )

    val EDIT_BOOKMARK_ITEM_TITLE_TEXT_FIELD = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = BookmarksTestTag.EDIT_BOOKMARK_ITEM_TITLE_TEXT_FIELD,
        description = "Bookmark edit title field",
        groups = listOf("editBookmarksView"),
    )

    val EDIT_BOOKMARK_ITEM_URL_TEXT_FIELD = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TAG,
        value = BookmarksTestTag.EDIT_BOOKMARK_ITEM_URL_TEXT_FIELD,
        description = "Bookmark edit URL field",
        groups = listOf("editBookmarksView"),
    )

    val DELETE_BOOKMARK_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION,
        value = getStringResource(R.string.bookmark_delete_bookmark_content_description),
        description = "Delete bookmark button",
        groups = listOf("editBookmarksView"),
    )

    val DEFAULT_BOOKMARKS_FOLDER_TITLE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = "Bookmarks",
        description = "Default bookmarks folder title",
        groups = listOf("editBookmarksView"),
    )

    val BOOKMARK_TITLE_TEXT = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = "Bookmark title",
        description = "Bookmark title text",
        groups = listOf(),
    )

    val SIGN_IN_TO_SYNC_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = "Sign in to sync",
        description = "Sign in to sync button",
        groups = listOf(),
        name = "SIGN_IN_TO_SYNC_BUTTON",
    )

    val SIGN_IN_WITH_CAMERA_TEXT = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Sign in with your camera",
        description = "Sign in with your camera text",
        groups = listOf("resultOf:SIGN_IN_TO_SYNC_BUTTON"),
    )

    val all = listOf(
        TOOLBAR_TITLE,
        OPEN_IN_NEW_TAB_BUTTON,
        NAVIGATE_UP_BUTTON,
        EDIT_BOOKMARKS_TOOLBAR_TITLE,
        EDIT_BOOKMARK_ITEM_TITLE_TEXT_FIELD,
        EDIT_BOOKMARK_ITEM_URL_TEXT_FIELD,
        DELETE_BOOKMARK_BUTTON,
        DEFAULT_BOOKMARKS_FOLDER_TITLE,
        BOOKMARK_TITLE_TEXT,
        SIGN_IN_TO_SYNC_BUTTON,
        SIGN_IN_WITH_CAMERA_TEXT,
    )
}
