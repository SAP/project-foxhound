/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.pocket

import mozilla.components.concept.fetch.Client
import mozilla.components.service.pocket.mars.api.MarsSpocsRequestConfig
import mozilla.components.support.base.worker.Frequency
import java.util.concurrent.TimeUnit

internal const val DEFAULT_REFRESH_INTERVAL = 4L
internal const val DEFAULT_SPONSORED_STORIES_REFRESH_INTERVAL = 4L
internal const val DEFAULT_CONTENT_RECOMMENDATIONS_REFRESH_INTERNAL = 4L

internal const val DEFAULT_CONTENT_RECOMMENDATIONS_COUNT = 100

@Suppress("TopLevelPropertyNaming")
internal val DEFAULT_REFRESH_TIMEUNIT = TimeUnit.HOURS

@Suppress("TopLevelPropertyNaming")
internal val DEFAULT_SPONSORED_STORIES_REFRESH_TIMEUNIT = TimeUnit.HOURS

@Suppress("TopLevelPropertyNaming")
internal val DEFAULT_CONTENT_RECOMMENDATIONS_REFRESH_TIMEUNIT = TimeUnit.HOURS

/**
 * Indicating all details for how the pocket stories should be refreshed.
 *
 * @param client [Client] implementation used for downloading the Pocket stories.
 * @param frequency Optional - The interval at which to try and refresh items. Defaults to 4 hours.
 * @param sponsoredStoriesRefreshFrequency Optional - The interval at which to try and refresh sponsored stories.
 * Defaults to 4 hours.
 * @param contentRecommendationsRefreshFrequency Optional - The interval at which to try and refresh
 * content recommendations. Defaults to 4 hours.
 * @param contentRecommendationsParams Optional - Configuration containing parameters used to fetch
 * the content recommendations.
 * @param marsSponsoredContentsParams Optional - configuration contain parameters used to fetch
 * the sponsored contents.
 */
class PocketStoriesConfig(
    val client: Client,
    val frequency: Frequency = Frequency(
        DEFAULT_REFRESH_INTERVAL,
        DEFAULT_REFRESH_TIMEUNIT,
    ),
    val sponsoredStoriesRefreshFrequency: Frequency = Frequency(
        DEFAULT_SPONSORED_STORIES_REFRESH_INTERVAL,
        DEFAULT_SPONSORED_STORIES_REFRESH_TIMEUNIT,
    ),
    val contentRecommendationsRefreshFrequency: Frequency = Frequency(
        DEFAULT_CONTENT_RECOMMENDATIONS_REFRESH_INTERNAL,
        DEFAULT_CONTENT_RECOMMENDATIONS_REFRESH_TIMEUNIT,
    ),
    val contentRecommendationsParams: ContentRecommendationsRequestConfig = ContentRecommendationsRequestConfig(),
    val marsSponsoredContentsParams: MarsSpocsRequestConfig = MarsSpocsRequestConfig(),
)

/**
 * Configuration for content recommendations request.
 *
 * @property locale Optional locale to specify the language of the recommendations to return.
 * @property region Optional country-level region to improve the recommendations to return.
 * @property count Optional number of recommendations to return.
 * @property topics Optional list to specify the preferred topics to return for the content
 * recommendations.
 */
data class ContentRecommendationsRequestConfig(
    val locale: String = "",
    val region: String = "",
    val count: Int = DEFAULT_CONTENT_RECOMMENDATIONS_COUNT,
    val topics: List<String> = listOf(),
)
