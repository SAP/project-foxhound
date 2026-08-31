/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import mozilla.components.support.base.android.ProcessInfoProvider
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.GleanMetrics.Metrics
import org.mozilla.fenix.android.DefaultActivityLifecycleCallbacks

private val logger = Logger("AppStartReasonProvider")

/**
 * Provides the reason this [Application] instance was started: see [StartReason] for options
 * and [reason] for details.
 *
 * [registerInAppOnCreate] must be called for this class to work correctly.
 *
 * This class relies on specific lifecycle method call orders and main thread Runnable scheduling
 * that could potentially change between OEMs and OS versions: **be careful when using it.** This
 * implementation was tested on the Moto G5 Android 8.1.0 and the Pixel 2 Android 11.
 *
 * @param processInfoProvider [ProcessInfoProvider] that we use to determine if the process start
 * is of foreground importance.
 */
class AppStartReasonProvider(
    private val processInfoProvider: ProcessInfoProvider,
) {

    enum class StartReason {
        /** We don't know yet what caused this [Application] instance to be started. */
        TO_BE_DETERMINED,

        /** This [Application] instance was started due to an Activity trying to start. */
        ACTIVITY,

        /**
         * This [Application] instance was started due to a component that is not an Activity:
         * this may include Services, BroadcastReceivers, and ContentProviders. It may be possible
         * to distinguish between these but it hasn't been necessary to do so yet.
         */
        NON_ACTIVITY,
    }

    /**
     * The reason this [Application] instance was started. This will not be set immediately
     * but is expected to be available by the time the first frame is drawn for the foreground Activity.
     */
    var reason = StartReason.TO_BE_DETERMINED
        private set

    /**
     * Registers the handlers needed by this class: this is expected to be called from
     * [Application.onCreate].
     */
    fun registerInAppOnCreate(application: Application) {
        ProcessLifecycleOwner.get().lifecycle.addObserver(ProcessLifecycleObserver())
        application.registerActivityLifecycleCallbacks(ActivityLifecycleCallbacks())
    }

    private inner class ProcessLifecycleObserver : DefaultLifecycleObserver {
        override fun onCreate(owner: LifecycleOwner) {
            Handler(Looper.getMainLooper()).post {
                // If the Application was started by an Activity, we expect the process to be of
                // foreground importance.
                //
                // if the process does not have foreground importance (e.g if the process was started
                // by a broadcast receiver or work manager, etc, then we immediately flag it as a
                // NON_ACTIVITY start reason.
                //
                // if however, the process has foreground importance, we flag it as TO_BE_DETERMINED
                // which is then mapped to ACTIVITY in the ActivityLifecycleCallbacks
                reason = when (reason) {
                    StartReason.TO_BE_DETERMINED -> {
                        if (processInfoProvider.isForegroundImportance()) {
                            StartReason.TO_BE_DETERMINED
                        } else {
                            StartReason.NON_ACTIVITY
                        }
                    }
                    StartReason.ACTIVITY -> reason // the start reason is already known: do nothing.
                    StartReason.NON_ACTIVITY -> {
                        Metrics.startReasonProcessError.set(true)
                        logger.error("AppStartReasonProvider.Process...onCreate unexpectedly called twice")
                        reason
                    }
                }
            }

            owner.lifecycle.removeObserver(this) // we don't update the state further.
        }
    }

    private inner class ActivityLifecycleCallbacks : DefaultActivityLifecycleCallbacks {
        override fun onActivityCreated(activity: Activity, bundle: Bundle?) {
            // See ProcessLifecycleObserver.onCreate for details.
            reason = when (reason) {
                StartReason.TO_BE_DETERMINED -> StartReason.ACTIVITY
                StartReason.NON_ACTIVITY -> reason // the start reason is already known: do nothing.
                StartReason.ACTIVITY -> {
                    Metrics.startReasonActivityError.set(true)
                    logger.error("AppStartReasonProvider.Activity...onCreate unexpectedly called twice")
                    reason
                }
            }

            activity.application.unregisterActivityLifecycleCallbacks(this) // we don't update the state further.
        }
    }
}
