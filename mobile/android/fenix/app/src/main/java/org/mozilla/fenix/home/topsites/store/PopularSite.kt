/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.store

import mozilla.components.service.merino.manifest.ManifestEntry

/**
 * A popular site suggested to the user when adding a new shortcut.
 *
 * @property title The display title of the site.
 * @property url The URL of the site.
 * @property iconUrl The URL of the site's icon or null if not available.
 */
data class PopularSite(
    val title: String,
    val url: String,
    val iconUrl: String?,
)

/**
 * Converts a [ManifestEntry] to a [PopularSite].
 */
fun ManifestEntry.toPopularSite(): PopularSite = PopularSite(
    title = title,
    url = url,
    iconUrl = icon.ifEmpty { null },
)
