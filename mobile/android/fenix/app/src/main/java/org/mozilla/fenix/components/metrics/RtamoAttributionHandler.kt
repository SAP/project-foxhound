/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.content.Context
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import mozilla.components.feature.addons.AddonsProvider
import mozilla.components.feature.addons.ui.translateName
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.GleanMetrics.Addons
import org.mozilla.fenix.utils.Settings

private const val EXPECTED_UTM_SOURCE = "addons.mozilla.org"
private const val EXPECTED_UTM_CONTENT_PATTERN_PREFIX = "rta%3A"

/**
 * Detects RTAMO (Return to AMO) installs and extracts the addon's download URL.
 *
 * RTAMO URLs are expected to contain
 * - `utm_source=addons.mozilla.org` and
 * - `utm_content=rta%3A{<base64_addon_guid>}`.
 *
 * When detected, the addon's download URL is fetched from AMO and stored in [settings].
 *
 * @param context [Context] used for various system interactions.
 * @param settings The settings object used to persist RTAMO state.
 * @param addonsProvider The provider used to fetch addon download URLs from AMO.
 * @param ioDispatcher Coroutine dispatcher for IO operations.
 * @param scope Coroutine scope to launch IO work in.
 */
class RtamoAttributionHandler(
    private val context: Context,
    private val settings: Settings,
    private val addonsProvider: AddonsProvider,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val scope: CoroutineScope = CoroutineScope(ioDispatcher),
) {
    private val logger = Logger("RtamoAttributionHandler")

    /**
     * Checks [installReferrerResponse] for an RTAMO attribution and, if found, fetches the
     * corresponding addon download URL from AMO and stores it in [settings].
     */
    @Suppress("TooGenericExceptionCaught")
    fun handleReferrer(installReferrerResponse: String?) {
        if (installReferrerResponse.isNullOrBlank()) return

        scope.launch {
            try {
                fetchRtamoAddonDownloadUrl(installReferrerResponse)
            } catch (e: Exception) {
                logger.error("Failed to fetch RTAMO addon", e)
                Addons.rtamoFailed.record(Addons.RtamoFailedExtra(RTAMOFailReason.UNKNOWN_URL.value))
            }
        }
    }

    private suspend fun fetchRtamoAddonDownloadUrl(installReferrerResponse: String) {
        val utmParams = UTMParams.parseUTMParameters(installReferrerResponse)
        if (utmParams.source != EXPECTED_UTM_SOURCE) return

        if (!utmParams.content.startsWith(EXPECTED_UTM_CONTENT_PATTERN_PREFIX)) {
            Addons.rtamoFailed.record(Addons.RtamoFailedExtra(RTAMOFailReason.INVALID_ID.value))
            return
        }

        val addonDetails = addonsProvider.getAddonByID(utmParams.content)
        val downloadUrl = addonDetails?.downloadUrl
        if (downloadUrl.isNullOrBlank()) {
            logger.error("Failed to fetch RTAMO addon download URL")
            Addons.rtamoFailed.record(Addons.RtamoFailedExtra(RTAMOFailReason.UNKNOWN_URL.value))
        } else if (currentCoroutineContext().isActive) {
            settings.rtamoAddonDownloadUrl = downloadUrl
            settings.rtamoAddonImageUrl = addonDetails.iconUrl
            settings.rtamoAddonName = addonDetails.translateName(context)

            Addons.rtamoIdentified.record(Addons.RtamoIdentifiedExtra(downloadUrl))
        }
    }

    private companion object {
        private enum class RTAMOFailReason(val value: String) {
            UNKNOWN_URL("unknown_url"),
            INVALID_ID("invalid_id"),
        }
    }
}
