/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.content

/**
 * An interface to conform to do deliver page metadata.
 */
fun interface PageMetadataExtractor {
    /**
     * Retrieve the page metadata.
     */
    suspend fun getPageMetadata(): Result<PageMetadata>
}

/**
 * Page metadata required for logical choices.
 */
data class PageMetadata(
    val structuredDataTypes: List<String> = listOf(),
    val wordCount: Int = 0,
    val language: String = "en",
    val isReaderable: Boolean = false,
    val pageTitle: String = "",
)
