/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.app.Application
import androidx.annotation.VisibleForTesting
import com.adjust.sdk.Adjust
import com.adjust.sdk.AdjustConfig
import com.adjust.sdk.AdjustEvent
import com.adjust.sdk.Constants.ADJUST_PREINSTALL_SYSTEM_PROPERTY_PATH
import com.adjust.sdk.LogLevel
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.lib.crash.CrashReporter
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.BuildConfig
import org.mozilla.fenix.Config
import org.mozilla.fenix.GleanMetrics.AdjustAttribution
import org.mozilla.fenix.GleanMetrics.Pings
import org.mozilla.fenix.components.metrics.AdjustThirdPartySharingController.Companion.AURA_PARTNER_ID
import org.mozilla.fenix.components.metrics.AdjustThirdPartySharingController.Companion.GOOGLE_PARTNER_ID
import org.mozilla.fenix.components.metrics.AdjustThirdPartySharingController.Companion.META_PARTNER_ID
import org.mozilla.fenix.components.metrics.AdjustThirdPartySharingController.Companion.REDDIT_PARTNER_ID
import org.mozilla.fenix.components.metrics.AdjustThirdPartySharingController.Companion.TIKTOK_PARTNER_ID
import org.mozilla.fenix.components.metrics.AdjustThirdPartySharingController.Companion.X_TWITTER_PARTNER_ID
import org.mozilla.fenix.distributions.DistributionAdjustStartupStrategy
import org.mozilla.fenix.distributions.DistributionIdManager
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.utils.Settings

class AdjustMetricsService(
    private val application: Application,
    private val storage: MetricsStorage,
    private val crashReporter: CrashReporter,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : MetricsService {
    override val type = MetricServiceType.Marketing
    private val logger = Logger("AdjustMetricsService")

    @Suppress("CognitiveComplexMethod")
    override fun start() {
        logger.info("Started")

        CoroutineScope(Dispatchers.IO).launch {
            val settings = application.components.settings

            if ((BuildConfig.ADJUST_TOKEN.isNullOrBlank())) {
                logger.info("No adjust token defined")

                if (Config.channel.isReleased) {
                    throw IllegalStateException("No adjust token defined for release build")
                }

                return@launch
            }

            System.setProperty(ADJUST_PREINSTALL_SYSTEM_PROPERTY_PATH, "/preload/etc/adjust.preinstall")

            val config = AdjustConfig(
                application,
                BuildConfig.ADJUST_TOKEN,
                AdjustConfig.ENVIRONMENT_PRODUCTION,
                true,
            )
            config.enablePreinstallTracking()

            val distributionIdManager = application.components.distributionIdManager

            // If we skipped the marketing consent screen, enable COPPA compliance to prevent
            // personal identifiers from being shared with Adjust.
            when (distributionIdManager.getDistributionAdjustStartupStrategy()) {
                DistributionAdjustStartupStrategy.IMMEDIATE_WITH_COPPA ->
                    config.enableCoppaCompliance()

                DistributionAdjustStartupStrategy.IMMEDIATE_WITH_PLAY_STORE_KIDS ->
                    config.enablePlayStoreKidsCompliance()

                else -> {}
            }

            if (!alreadyKnown(settings)) {
                val timerId = AdjustAttribution.adjustAttributionTime.start()

                config.setOnAttributionChangedListener {
                    AdjustAttribution.adjustAttributionTime.stopAndAccumulate(timerId)

                    if (!it.network.isNullOrEmpty()) {
                        settings.adjustNetwork = it.network
                        AdjustAttribution.network.set(it.network)
                    }
                    if (!it.adgroup.isNullOrEmpty()) {
                        settings.adjustAdGroup = it.adgroup
                        AdjustAttribution.adgroup.set(it.adgroup)
                    }
                    if (!it.creative.isNullOrEmpty()) {
                        settings.adjustCreative = it.creative
                        AdjustAttribution.creative.set(it.creative)
                    }
                    if (!it.campaign.isNullOrEmpty()) {
                        settings.adjustCampaignId = it.campaign
                        AdjustAttribution.campaign.set(it.campaign)
                    }

                    triggerPing()
                    logger.info("Trigger ping")
                }
            }

            config.setLogLevel(LogLevel.SUPPRESS)

            config.disableFbIdReading()
            applyThirdPartySharingSettings(
                distribution = distributionIdManager.getDistribution(),
                isUserMetaAttributed = settings.isUserMetaAttributed,
                isUserTikTokAttributed = settings.isUserTikTokAttributed,
                isUserRedditAttributed = settings.isUserRedditAttributed,
                isUserXTwitterAttributed = settings.isUserXTwitterAttributed,
            )

            // All configuration have to be done before this.
            Adjust.initSdk(config)
            Adjust.enable()
            logger.info("Adjust SDK enabled")

            // This is a temporary race condition workaround until
            // https://bugzilla.mozilla.org/show_bug.cgi?id=2016858 is fixed
            track(Event.GrowthData.ConversionEvent6)
        }
    }

    override fun stop() {
        logger.info("Stopped")

        Adjust.disable()
        Adjust.gdprForgetMe(application.applicationContext)
    }

    @Suppress("TooGenericExceptionCaught")
    override fun track(event: Event) {
        logger.info("Track")

        CoroutineScope(dispatcher).launch {
            try {
                val tokenName = when (event) {
                    is Event.GrowthData -> event.tokenName
                    is Event.FirstWeekPostInstall -> event.tokenName
                }

                if (
                    (event is Event.GrowthData || event is Event.FirstWeekPostInstall) &&
                    storage.shouldTrack(event)
                ) {
                    Adjust.trackEvent(AdjustEvent(tokenName))
                    storage.updateSentState(event)
                    sendGleanEventAndPing(event)
                    logger.info("Update sent state $event")
                }
            } catch (e: Exception) {
                crashReporter.submitCaughtException(e)
                logger.info("Track threw an exception for $event")
            }
        }
    }

    override fun shouldTrack(event: Event): Boolean =
        event is Event.GrowthData || event is Event.FirstWeekPostInstall

    companion object {
        const val CONVERSION_EVENT_1 = 1
        const val CONVERSION_EVENT_2 = 2
        const val CONVERSION_EVENT_3 = 3
        const val CONVERSION_EVENT_4 = 4
        const val CONVERSION_EVENT_5 = 5
        const val CONVERSION_EVENT_6 = 6
        const val CONVERSION_EVENT_7 = 7
        const val CONVERSION_EVENT_8 = 8
        const val CONVERSION_EVENT_9 = 9
        const val CONVERSION_EVENT_10 = 10

        /**
         * Records a glean event matching the Adjust conversion event, and sends the Adjust attribution ping.
         */
        @VisibleForTesting
        internal fun sendGleanEventAndPing(
            event: Event,
            conversionEventRecorder: ConversionEventRecorder = GleanConversionEventRecorder(),
        ) {
            when (event) {
                is Event.GrowthData.ConversionEvent1 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_1)
                is Event.GrowthData.ConversionEvent2 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_2)
                is Event.GrowthData.ConversionEvent3 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_3)
                is Event.GrowthData.ConversionEvent4 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_4)
                is Event.GrowthData.ConversionEvent5 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_5)
                is Event.GrowthData.ConversionEvent6 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_6)
                is Event.GrowthData.ConversionEvent7 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_7)
                is Event.FirstWeekPostInstall.ConversionEvent8 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_8)
                is Event.FirstWeekPostInstall.ConversionEvent9 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_9)
                is Event.FirstWeekPostInstall.ConversionEvent10 ->
                    conversionEventRecorder.recordConversionEvent(CONVERSION_EVENT_10)
            }
        }

        /**
         * Sets third party sharing settings based on distribution and attribution.
         */
        @VisibleForTesting
        internal fun applyThirdPartySharingSettings(
            distribution: DistributionIdManager.Distribution,
            isUserMetaAttributed: Boolean,
            isUserTikTokAttributed: Boolean,
            isUserRedditAttributed: Boolean,
            isUserXTwitterAttributed: Boolean,
            controller: ThirdPartySharingController = AdjustThirdPartySharingController(),
        ) {
            when (distribution) {
                DistributionIdManager.Distribution.DEFAULT -> {
                    controller.disableAllThirdPartySharing()
                    // Listed in priority order. Multiple flags can be true at once, so the order
                    // is load-bearing. Insert new partners at the position matching their priority.
                    when {
                        isUserMetaAttributed ->
                            controller.enableThirdPartySharingForPartner(META_PARTNER_ID)
                        isUserTikTokAttributed ->
                            controller.enableThirdPartySharingForPartner(TIKTOK_PARTNER_ID)
                        isUserRedditAttributed ->
                            controller.enableThirdPartySharingForPartner(REDDIT_PARTNER_ID)
                        isUserXTwitterAttributed ->
                            controller.enableThirdPartySharingForPartner(X_TWITTER_PARTNER_ID)
                        else ->
                            controller.enableThirdPartySharingForPartner(GOOGLE_PARTNER_ID)
                    }
                }

                DistributionIdManager.Distribution.AURA_001 -> {
                    controller.enableThirdPartySharingForPartner(AURA_PARTNER_ID)
                }

                DistributionIdManager.Distribution.VIVO_001,
                DistributionIdManager.Distribution.DT_001,
                DistributionIdManager.Distribution.DT_002,
                DistributionIdManager.Distribution.DT_003,
                DistributionIdManager.Distribution.XIAOMI_001,
                    -> {
                    controller.disableAllThirdPartySharing()
                }
                // Do not add an else branch here. All distributions should be handled deliberately.
            }
        }

        @VisibleForTesting
        internal fun alreadyKnown(settings: Settings): Boolean {
            return settings.adjustCampaignId.isNotEmpty() || settings.adjustNetwork.isNotEmpty() ||
                settings.adjustCreative.isNotEmpty() || settings.adjustAdGroup.isNotEmpty()
        }

        private fun triggerPing() {
            CoroutineScope(Dispatchers.IO).launch {
                Pings.adjustAttribution.submit()
            }
        }
    }
}
