/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.appservices.adsclient.MozAdsClient
import mozilla.appservices.adsclient.MozAdsClientApiException
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.support.base.log.logger.Logger

/**
 * Use cases for handling the Mozilla Ads Client API click and impression callbacks.
 * The use cases performs a request for the provided click or impression callback URL.
 *
 * @param adsClientProvider [MozAdsClientProvider] used to get an instance of [MozAdsClient] for
 * making HTTP API calls.
 * @param crashReporter [CrashReporter] used for recording caught exceptions.
 */
class MozAdsUseCases(
    private val adsClientProvider: Lazy<MozAdsClientProvider>,
    private val crashReporter: CrashReporting,
    private val backgroundDispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    private val logger = Logger("MozAdsUseCases")

    /**
     * Records a click using the provided callback [url] for an Ad.
     *
     * @param clickUrl The click callback URL for the Ad.
     * @return Whether the response is successful or not.
     */
    suspend fun recordClickInteraction(clickUrl: String): Boolean =
        recordInteraction("MozAdsUseCases - Failed to record click interaction") {
            adsClientProvider.value.requireInstance.recordClick(clickUrl = clickUrl)
        }

    /**
     * Records an impression using the provided callback [url] for an Ad.
     *
     * @param impressionUrl The impression callback URL for the Ad.
     * @return Whether the response is successful or not.
     */
    suspend fun recordImpressionInteraction(impressionUrl: String): Boolean =
        recordInteraction("MozAdsUseCases - Failed to record impression interaction") {
            adsClientProvider.value.requireInstance.recordImpression(impressionUrl = impressionUrl)
        }

    private suspend fun recordInteraction(
        failMessage: String,
        block: () -> Unit,
    ): Boolean = withContext(backgroundDispatcher) {
        try {
            block()
            true
        } catch (e: MozAdsClientApiException) {
            logger.error(message = failMessage)
            crashReporter.recordCrashBreadcrumb(
                Breadcrumb(message = failMessage),
            )
            crashReporter.submitCaughtException(e)
            false
        }
    }
}
