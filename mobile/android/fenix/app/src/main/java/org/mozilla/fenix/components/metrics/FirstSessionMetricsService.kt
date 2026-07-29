/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.content.Context
import android.content.SharedPreferences
import androidx.annotation.VisibleForTesting
import androidx.core.content.edit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.GleanMetrics.FirstSession
import org.mozilla.fenix.GleanMetrics.Pings
import org.mozilla.fenix.ext.application
import org.mozilla.fenix.ext.components

/**
 * A metrics service that handles sending the first session ping.
 *
 * @param context The application context.
 */
class FirstSessionMetricsService(private val context: Context) : MetricsService {
    override val type = MetricServiceType.Data

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(
            "${this.javaClass.canonicalName}.prefs",
            Context.MODE_PRIVATE,
        )
    }

    override fun start() {
        triggerPingIfNotSent()
    }

    override fun stop() = Unit
    override fun track(event: Event) = Unit
    override fun shouldTrack(event: Event): Boolean = false

    /**
     * Checks whether or not the installation ping was already
     * triggered by the application.
     *
     * Note that this only tells us that Fenix triggered the
     * ping and then delegated the transmission to Glean. We
     * have no way to tell if it was actually sent or not.
     *
     * @return true if it was already triggered, false otherwise.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal fun wasAlreadyTriggered(): Boolean {
        return prefs.getBoolean("ping_sent", false)
    }

    /**
     * Marks the "installation" ping as triggered by the application.
     * This ensures the ping is not triggered again at the next app
     * start.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal fun markAsTriggered() {
        prefs.edit { putBoolean("ping_sent", true) }
    }

    /**
     * Fills the metrics and triggers the 'installation' ping.
     * This is a separate function to simplify unit-testing.
     */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    internal fun triggerPingIfNotSent() {
        CoroutineScope(Dispatchers.IO).launch {
            if (wasAlreadyTriggered()) {
                Logger.debug("InstallationPing - already generated")
                return@launch
            }

            FirstSession.timestamp.set()
            FirstSession.installSource.set(
                installSourcePackage(
                    packageManager = context.application.packageManager,
                    packageName = context.application.packageName,
                ),
            )
            FirstSession.distributionId.set(context.components.distributionIdManager.getDistributionId())

            Pings.firstSession.submit()
            markAsTriggered()
        }
    }
}
