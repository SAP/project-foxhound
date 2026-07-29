/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.merino.manifest

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Top-level structure of the Merino manifest, which provides metadata for websites.
 *
 * @property domains List of website entries with metadata such as icons and categories.
 */
@Serializable
data class MerinoManifest(
    @SerialName("domains") val domains: List<ManifestEntry>,
)

/**
 * Metadata for a website entry in the Merino manifest.
 *
 * @property rank Ranking of the site.
 * @property domain Bare domain name without TLD (e.g. `"google"`, `"wikipedia"`).
 * @property categories Content categories for the site.
 * @property serpCategories Numeric SERP (search engine results page) category identifiers.
 * @property url URL of the site (e.g. `"https://www.wikipedia.org/"`).
 * @property title Display name of the site.
 * @property icon CDN URL of the site's icon or empty string if unavailable.
 */
@Serializable
data class ManifestEntry(
    @SerialName("rank") val rank: Int,
    @SerialName("domain") val domain: String,
    @SerialName("categories") val categories: List<String>,
    @SerialName("serp_categories") val serpCategories: List<Int>,
    @SerialName("url") val url: String,
    @SerialName("title") val title: String,
    @SerialName("icon") val icon: String = "",
)
