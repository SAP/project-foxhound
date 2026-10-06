/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bookmarks

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.DialogFragment
import androidx.fragment.compose.content
import mozilla.appservices.places.BookmarkRoot
import mozilla.components.concept.bookmark.parser.BookmarksFileParser
import mozilla.components.concept.bookmarks.file.BookmarksFileImporter
import mozilla.components.feature.importer.BookmarkImporter
import mozilla.components.feature.importer.ImporterResult
import mozilla.components.lib.bookmark.parser.jsoup.jsoupParser
import mozilla.components.lib.bookmarks.file.htmlImporter
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.requireComponents

internal class ImportBookmarksDialogFragment : DialogFragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = content {
        BookmarkImporter(
            importer = BookmarksFileImporter.htmlImporter(
                context = requireContext(),
                parentGuid = BookmarkRoot.Mobile.id,
                parser = BookmarksFileParser.jsoupParser(
                    rootFolderName = requireContext().getString(R.string.bookmark_import_destination_default_name),
                ),
                inserter = requireComponents.core.bookmarksStorage,
            ),
            onFinished = { result ->
                parentFragmentManager.setFragmentResult(
                    REQUEST_KEY,
                    Bundle().apply { putString(KEY_RESULT, result.encode()) },
                )
                dismiss()
            },
        )
    }

    companion object {
        const val REQUEST_KEY = "import_bookmarks_request"
        const val KEY_RESULT = "result"
        internal const val RESULT_SUCCESS = "success"
        internal const val RESULT_FAILURE = "failure"
        internal const val RESULT_CANCELLED = "cancelled"
        const val TAG = "import_dialog"

        fun decodeResult(bundle: Bundle): ImporterResult? =
            when (bundle.getString(KEY_RESULT)) {
                RESULT_SUCCESS -> ImporterResult.Success(importCount = 0)
                RESULT_FAILURE -> ImporterResult.Failure
                RESULT_CANCELLED -> ImporterResult.Canceled
                else -> null
            }
    }
}

private fun ImporterResult.encode(): String = when (this) {
    is ImporterResult.Success -> ImportBookmarksDialogFragment.RESULT_SUCCESS
    ImporterResult.Failure -> ImportBookmarksDialogFragment.RESULT_FAILURE
    ImporterResult.Canceled -> ImportBookmarksDialogFragment.RESULT_CANCELLED
}
