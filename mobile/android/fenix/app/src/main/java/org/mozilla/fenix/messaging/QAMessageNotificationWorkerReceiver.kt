/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.messaging

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import mozilla.components.support.base.log.logger.Logger

private val LOGGER = Logger("QaMessageWorkerReceiver")

/**
 * Testing receiver to trigger [MessageNotificationWorker] on demand via adb.
 *
 * Usage:
 * ```
 *   adb shell am broadcast -a org.mozilla.fenix.TRIGGER_MESSAGE_WORKER \
 *       -p org.mozilla.fenix
 * ```
 * `-p org.mozilla.fenix` is the package name, so adjust that value for release/nightly/debug.
 */
class QAMessageNotificationWorkerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_TRIGGER_MESSAGE_WORKER) return

        LOGGER.info("Enqueueing MessageNotificationWorker via debug trigger")

        val request = OneTimeWorkRequestBuilder<MessageNotificationWorker>().build()
        WorkManager.getInstance(context.applicationContext).enqueue(request)

        LOGGER.info("Enqueued work request: ${request.id}")
    }

    companion object {
        const val ACTION_TRIGGER_MESSAGE_WORKER = "org.mozilla.fenix.TRIGGER_MESSAGE_WORKER"
    }
}
