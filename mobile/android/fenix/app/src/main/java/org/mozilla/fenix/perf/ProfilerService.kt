/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import androidx.annotation.VisibleForTesting
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.SupervisorJob
import mozilla.components.support.base.log.Log
import mozilla.components.support.utils.ext.stopForegroundCompat
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.gecko.GeckoJavaSampler.INTENT_PROFILER_STATE_CHANGED

@VisibleForTesting
internal const val PROFILING_CHANNEL_ID = "mozilla.perf.profiling"

@VisibleForTesting
internal const val PROFILING_NOTIFICATION_ID = 99

private const val REQUEST_CODE = 3

/**
 * A foreground service that manages profiling notifications in the Firefox Android app.
 * Now uses NotificationsDelegate to handle permission requests and notification display.
 *
 * This service displays a persistent notification when profiling is active and provides
 * a way for users to stop profiling through the notification. The service handles starting
 * and stopping profiling operations based on intents, with the NotificationsDelegate managing
 * all permission-related logic.
 */
class ProfilerService : Service() {

    /**
     * Companion object containing constants and static functionality for the ProfilerService.
     * This object defines the intent actions that can be sent to the service to control
     * profiling operations.
     */
    companion object {
        const val PROFILER_SERVICE_LOG = "ProfilerService"
        const val IS_PROFILER_ACTIVE = "isActive"
    }

    private val serviceJob = SupervisorJob()
    private val notificationsDelegate by lazy {
        components.notificationsDelegate
    }
    private var stateReceiver: BroadcastReceiver? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        stateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == INTENT_PROFILER_STATE_CHANGED) {
                    val active = intent.getBooleanExtra(IS_PROFILER_ACTIVE, false)
                    if (!active) {
                        disableProfilerProvider()
                        stopForegroundCompat(true)
                        stopSelf()
                    }
                }
            }
        }
        val filter = IntentFilter(INTENT_PROFILER_STATE_CHANGED)
        val permission = "${applicationContext.packageName}.permission.PROFILER_INTERNAL"
        ContextCompat.registerReceiver(
            applicationContext,
            stateReceiver!!,
            filter,
            permission,
            null,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    override fun onDestroy() {
        serviceJob.cancel()
        stateReceiver?.let { receiver ->
            applicationContext.unregisterReceiver(receiver)
            stateReceiver = null
        }
        super.onDestroy()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification()
        startForeground(PROFILING_NOTIFICATION_ID, notification)
        requestNotificationPermissionIfNeeded()
        enableProfilerProvider()
        return START_NOT_STICKY
    }

    /**
     * Request permission for notification using NotificationsDelegate and update if needed
     */
    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationsDelegate.requestNotificationPermission(
                onPermissionGranted = {
                    val updated = createNotification()
                    startForeground(PROFILING_NOTIFICATION_ID, updated)
                },
                showPermissionRationale = false,
            )
        }
    }

    /**
     * Creates the notification channel for profiler status notifications.
     */
    private fun createNotificationChannel() {
        val profilingChannel = NotificationChannel(
            PROFILING_CHANNEL_ID,
            getString(R.string.profiler_service_notification_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = getString(R.string.profiler_service_description)
            setShowBadge(false)
            enableLights(false)
            enableVibration(false)
        }
        val notificationManager: NotificationManager =
            getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(profilingChannel)
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, StopProfilerActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(
            this,
            REQUEST_CODE,
            notificationIntent,
            pendingIntentFlags,
        )

        val notificationBuilder = NotificationCompat.Builder(this, PROFILING_CHANNEL_ID)
            .setContentTitle(getString(R.string.profiler_active_notification))
            .setContentText(getString(R.string.profiler_notification_text))
            .setSmallIcon(R.drawable.ic_profiler)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            notificationBuilder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
        }

        return notificationBuilder.build()
    }

    override fun onBind(p0: Intent?): IBinder? {
        return null
    }

    /**
     * The Profiler Content Provider is set to false in the manifest to make sure it does not
     * initialize during startup. So, it has to  instantiated whenever the Service starts.
     */
    private fun enableProfilerProvider() {
        try {
            val componentName = ComponentName(this, ProfilerProvider::class.java)
            packageManager.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP,
            )
        } catch (e: IllegalArgumentException) {
            Log.log(Log.Priority.WARN, PROFILER_SERVICE_LOG, e, "Failed to enable ProfilerProvider")
        } catch (e: SecurityException) {
            Log.log(Log.Priority.WARN, PROFILER_SERVICE_LOG, e, "Permission denied to enable ProfilerProvider")
        }
    }

    /**
     * Since it the provider isn't managed by the manifest, it also has to be manually disabled.
     */
    private fun disableProfilerProvider() {
        try {
            val componentName = ComponentName(this, ProfilerProvider::class.java)
            packageManager.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP,
            )
            Log.log(Log.Priority.DEBUG, PROFILER_SERVICE_LOG, message = "ProfilerProvider disabled")
        } catch (e: IllegalArgumentException) {
            Log.log(Log.Priority.WARN, PROFILER_SERVICE_LOG, e, "Failed to disable ProfilerProvider")
        } catch (e: SecurityException) {
            Log.log(Log.Priority.WARN, PROFILER_SERVICE_LOG, e, "Permission denied to disable ProfilerProvider")
        }
    }
}
