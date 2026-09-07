/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

import androidx.annotation.VisibleForTesting
import mozilla.appservices.adsclient.MozAdsClient
import mozilla.appservices.adsclient.MozAdsClientApiException
import mozilla.appservices.adsclient.MozAdsPlacementRequest
import mozilla.appservices.adsclient.MozAdsTile
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.feature.top.sites.TopSite
import mozilla.components.feature.top.sites.TopSitesProvider
import mozilla.components.support.base.log.logger.Logger

/**
 * Provides access to the Mozilla Ads Client for fetching top sites tile.
 *
 * @property adsClientProvider [MozAdsClientProvider] used to get an instance of [MozAdsClient] for
 * making HTTP API calls.
 * @property requestConfig Configuration for the top sites tile request.
 * @property crashReporter [CrashReporting] instance used for recording caught exceptions.
 */
class MacTopSitesProvider(
    private val adsClientProvider: Lazy<MozAdsClientProvider>,
    private val requestConfig: MacTopSitesRequestConfig,
    private val crashReporter: CrashReporting? = null,
) : TopSitesProvider {

    private val logger = Logger("MacTopSitesProvider")

    override suspend fun getTopSites(allowCache: Boolean): List<TopSite.Provided> {
        return try {
            val mozAdRequests = requestConfig.placements.map { placementId ->
                MozAdsPlacementRequest(
                    placementId = placementId,
                    iabContent = null,
                )
            }
            val tiles = adsClientProvider.value.requireInstance.requestTileAds(
                mozAdRequests = mozAdRequests,
                options = null,
            )

            requestConfig.placements.mapNotNull { placementId ->
                tiles[placementId]?.toTopSite()
            }
        } catch (e: MozAdsClientApiException) {
            val message = "MacTopSitesProvider - Failed to request ads from Mozilla Ads client"
            logger.error(message = message, throwable = e)
            crashReporter?.recordCrashBreadcrumb(
                Breadcrumb(message = message),
            )
            crashReporter?.submitCaughtException(e)

            emptyList()
        }
    }
}

@VisibleForTesting
internal fun MozAdsTile.toTopSite() = TopSite.Provided(
    id = null,
    title = name,
    url = url,
    clickUrl = callbacks.click,
    imageUrl = imageUrl,
    impressionUrl = callbacks.impression,
    createdAt = null,
)
