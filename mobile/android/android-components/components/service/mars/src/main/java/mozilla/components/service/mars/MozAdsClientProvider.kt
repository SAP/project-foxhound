/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

import android.content.Context
import androidx.annotation.VisibleForTesting
import mozilla.appservices.adsclient.AdsClientTelemetry
import mozilla.appservices.adsclient.MozAdsCacheConfig
import mozilla.appservices.adsclient.MozAdsClient
import mozilla.appservices.adsclient.MozAdsClientBuilder
import mozilla.appservices.adsclient.MozAdsEnvironment

/**
 * Provides access to the Mozilla Ads Client.
 */
object MozAdsClientProvider {

    private const val ADS_CLIENT_MAX_CACHE_AGE = 1800L // 30 minutes
    private const val DB_NAME = "moz_ads.sqlite"

    private var client: MozAdsClient? = null

    internal val requireInstance: MozAdsClient
        get() = client ?: throw IllegalStateException(
            "MozAdsClientProvider.client is not set. " +
                "Need to call MozAdsClientProvider.initialize().",
        )

    /**
     * Initializes the [MozAdsClient] instance.
     */
    fun initialize(context: Context) {
        this.client = MozAdsClientBuilder()
            .environment(MozAdsEnvironment.PROD)
            .cacheConfig(
                MozAdsCacheConfig(
                    dbPath = context.getDatabasePath(DB_NAME).absolutePath,
                    defaultCacheTtlSeconds = ADS_CLIENT_MAX_CACHE_AGE.toULong(),
                    maxSizeMib = null,
                ),
            )
            .telemetry(AdsClientTelemetry())
            .build()
    }

    /**
     * Resets the [MozAdsClient] instance.
     */
    @VisibleForTesting
    internal fun reset() {
        this.client = null
    }
}
