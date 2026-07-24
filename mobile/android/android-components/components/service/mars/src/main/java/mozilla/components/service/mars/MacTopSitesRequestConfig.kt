/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

/**
 * Configuration for the top sites tile request.
 *
 * @property placements List of Ad Placement Ids to request.
 */
data class MacTopSitesRequestConfig(
    val placements: List<String>,
)
