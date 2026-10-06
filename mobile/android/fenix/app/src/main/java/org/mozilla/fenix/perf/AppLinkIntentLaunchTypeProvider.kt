/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.app.Activity
import android.app.Application
import android.os.Bundle
import androidx.annotation.VisibleForTesting
import mozilla.components.concept.engine.EngineSession
import org.mozilla.fenix.android.DefaultActivityLifecycleCallbacks
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Tracks and provides the type of the [Application] instance's launch.
 * See [EngineSession.LoadUrlFlags] for more details about the types.
 *
 * [registerInAppOnCreate] must be called for this object to work correctly.
 *
 * This class relies on specific lifecycle method call orders for the app process and the activities.
 */
class AppLinkIntentLaunchTypeProvider(
    private val startReasonProvider: AppStartReasonProvider,
) {
    private val hasAnyActivityBeenCreated = AtomicBoolean(false)
    private val liveActivityCounts = ConcurrentHashMap<Class<out Activity>, AtomicInteger>()

    /**
     * Registers the handlers needed by this object: this is expected to be called from
     * [Application.onCreate].
     */
    fun registerInAppOnCreate(app: Application) {
        app.registerActivityLifecycleCallbacks(
            object : DefaultActivityLifecycleCallbacks {
                override fun onActivityCreated(activity: Activity, bundle: Bundle?) {
                    hasAnyActivityBeenCreated.compareAndSet(false, true)
                    liveActivityCounts.getOrPut(activity.javaClass) { AtomicInteger(0) }.incrementAndGet()
                }

                override fun onActivityDestroyed(activity: Activity) {
                    super.onActivityDestroyed(activity)
                    liveActivityCounts[activity.javaClass]?.updateAndGet { count -> maxOf(0, count - 1) }
                }
            },
        )
    }

    /**
     * Classifies an external intent’s launch type at the moment it arrives.
     *
     * - COLD: The process and the first activity are created from scratch
     *   (no activity has ever been created in this process).
     *
     * - WARM: The process is alive but the target activity will be created fresh.
     *   Example: a WorkManager job started the process (NON_ACTIVITY) without
     *   creating any activity; later an app-link arrives. At this point,
     *   GeckoRuntime may already be initialized via
     * [mozilla.components.concept.engine.Engine.warmUp]
     *   in [org.mozilla.fenix.FenixApplication.onCreate] and Gecko libraries may
     *   have begun loading.
     *
     * - HOT: The process is alive and an existing instance of the target activity
     *   is reused (no new activity instance is created).
     */
    fun getExternalIntentLaunchType(target: Class<out Activity>?): Int {
        val headless = isHeadlessLaunch()
        val anyActivityCreated = hasAnyActivityBeenCreated.get()
        val targetLive = hasLiveTargetActivity(target)

        return when {
            // Target instance already exists -> HOT
            targetLive ->
                EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_HOT

            // Headless (NON_ACTIVITY) start and we won't reuse the target -> WARM
            headless ->
                EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_WARM

            // No activity has ever been created in this process -> COLD
            !anyActivityCreated ->
                EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_COLD

            // Process alive, target not live -> WARM
            else ->
                EngineSession.LoadUrlFlags.APP_LINK_LAUNCH_TYPE_WARM
        }
    }

    private fun isHeadlessLaunch() =
        startReasonProvider.reason == AppStartReasonProvider.StartReason.NON_ACTIVITY

    private fun hasLiveTargetActivity(target: Class<out Activity>?) =
        (liveActivityCounts[target]?.get() ?: 0) > 0

    @VisibleForTesting
    internal fun resetForTests() {
        hasAnyActivityBeenCreated.set(false)
        liveActivityCounts.clear()
    }
}
