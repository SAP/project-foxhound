/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentSender
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.home.intent.StartSearchIntentProcessor
import org.mozilla.fenix.utils.IntentUtils
import java.util.UUID

/**
 * A wrapper for ShortcutManagerCompat to simplify testing.
 *
 * This interface abstracts the static methods of ShortcutManagerCompat,
 * allowing for easier mocking and verification in unit tests.
 */
interface ShortcutManagerCompatWrapper {
    /**
     * Checks if the system supports pinning shortcuts.
     *
     * @param context The application context.
     * @return `true` if pinning shortcuts is supported, `false` otherwise.
     */
    fun isRequestPinShortcutSupported(context: Context): Boolean

    /**
     * Requests the system to pin a shortcut to the home screen.
     *
     * @param context The application context.
     * @param shortcut The [ShortcutInfoCompat] object representing the shortcut to be pinned.
     * @param intentSender An optional [IntentSender] to be notified when the shortcut is pinned or canceled.
     * @return `true` if the request was successfully sent, `false` otherwise.
     *         Note that this does not guarantee the shortcut will be pinned, as the user can cancel the request.
     */
    fun requestPinShortcut(context: Context, shortcut: ShortcutInfoCompat, intentSender: IntentSender?): Boolean
}

/**
 * A wrapper for [ShortcutManagerCompat] to allow for easier testing.
 */
class DefaultShortcutManagerCompatWrapper : ShortcutManagerCompatWrapper {
    override fun isRequestPinShortcutSupported(context: Context): Boolean {
        return ShortcutManagerCompat.isRequestPinShortcutSupported(context)
    }

    override fun requestPinShortcut(
        context: Context,
        shortcut: ShortcutInfoCompat,
        intentSender: IntentSender?,
    ): Boolean {
        return ShortcutManagerCompat.requestPinShortcut(context, shortcut, intentSender)
    }
}

/**
 * Interface for creating [PendingIntent]s.
 * This interface is used to abstract the creation of PendingIntents,
 * allowing for easier testing and dependency injection.
 */
interface PendingIntentFactory {
    /**
     * Creates a [PendingIntent] with the specified parameters.
     *
     * @param context The Context in which this PendingIntent should start the activity.
     * @param requestCode Private request code for the sender.
     * @param intent Intent of the activity to be launched.
     * @param flags May be [PendingIntent.FLAG_ONE_SHOT], [PendingIntent.FLAG_NO_CREATE],
     *              [PendingIntent.FLAG_CANCEL_CURRENT], [PendingIntent.FLAG_UPDATE_CURRENT],
     *              [PendingIntent.FLAG_IMMUTABLE], or any of the flags as supported by
     *              [Intent.fillIn] to control which parts of the intent that is updated.
     * @return Returns an existing or new PendingIntent matching the given parameters.
     *         May return null if the activity target is not found.
     */
    fun createPendingIntent(context: Context, requestCode: Int, intent: Intent, flags: Int): PendingIntent?
}

/**
 * A default implementation of [PendingIntentFactory] that uses [PendingIntent.getActivity]
 * to create a [PendingIntent].
 */
class DefaultPendingIntentFactory : PendingIntentFactory {
    override fun createPendingIntent(
        context: Context,
        requestCode: Int,
        intent: Intent,
        flags: Int,
    ): PendingIntent? {
        return PendingIntent.getActivity(context, requestCode, intent, flags)
    }
}

/**
 * Manages the creation of pinned shortcuts for private browsing mode.
 *
 * This class provides functionality to create a shortcut on the device's home screen
 * that directly opens the app in private browsing mode with the search bar focused.
 *
 * @param shortcutManagerWrapper A wrapper around [ShortcutManagerCompat] used for interacting
 *                               with the system's shortcut manager.
 * @param pendingIntentFactory A utility to create [PendingIntent] instances.
 */
class PrivateShortcutCreateManager(
    private val shortcutManagerWrapper: ShortcutManagerCompatWrapper,
    private val pendingIntentFactory: PendingIntentFactory,
) {
    /**
     * Creates a pinned shortcut for private browsing.
     *
     * This function checks if pinning shortcuts is supported by the system.
     * If supported, it creates a [ShortcutInfoCompat] object with the following properties:
     * - A unique ID generated using [UUID.randomUUID].
     * - Short and long labels derived from string resources.
     * - An icon loaded from a mipmap resource.
     * - An intent that launches [HomeActivity] in private browsing mode and opens the search bar.
     *
     * After creating the shortcut, it requests the system to pin it.
     * The `intentSender` for the pin request is configured to open the home screen.
     *
     * @param context The application context.
     */
    fun createPrivateShortcut(context: Context) {
        if (!shortcutManagerWrapper.isRequestPinShortcutSupported(context)) return

        val icon = IconCompat.createWithResource(context, R.mipmap.ic_launcher_private_round)
        val appName = context.getString(R.string.app_name)
        val privateShortcutLabel = context.getString(R.string.app_name_private_5, appName)

        val shortcut = ShortcutInfoCompat.Builder(context, UUID.randomUUID().toString())
            .setShortLabel(privateShortcutLabel)
            .setLongLabel(privateShortcutLabel)
            .setIcon(icon)
            .setIntent(createPrivateHomeActivityIntent(context))
            .build()

        val createPrivateShortcutIntentFlags = IntentUtils.DEFAULT_PENDING_INTENT_FLAGS or
            PendingIntent.FLAG_UPDATE_CURRENT

        val homeScreenIntent = Intent(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_HOME)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        val intentSender = pendingIntentFactory.createPendingIntent(
            context,
            0,
            homeScreenIntent,
            createPrivateShortcutIntentFlags,
        )?.intentSender

        shortcutManagerWrapper.requestPinShortcut(context, shortcut, intentSender)
    }

    /**
     * Creates an [Intent] to launch [HomeActivity] in private browsing mode with the search bar focused.
     *
     * The intent is configured with the following properties:
     * - `action`: [Intent.ACTION_VIEW]
     * - `flags`: [Intent.FLAG_ACTIVITY_NEW_TASK] or [Intent.FLAG_ACTIVITY_CLEAR_TASK]
     * - `putExtra(HomeActivity.PRIVATE_BROWSING_MODE, true)`: Enables private browsing mode.
     * - `putExtra(HomeActivity.OPEN_TO_SEARCH, StartSearchIntentProcessor.PRIVATE_BROWSING_PINNED_SHORTCUT)`:
     *   Focuses the search bar upon launching.
     *
     * @param context The application context.
     * @return An [Intent] configured to launch [HomeActivity] in private browsing mode with search.
     */
    fun createPrivateHomeActivityIntent(context: Context): Intent {
        return Intent(context, HomeActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra(HomeActivity.PRIVATE_BROWSING_MODE, true)
            putExtra(
                HomeActivity.OPEN_TO_SEARCH,
                StartSearchIntentProcessor.PRIVATE_BROWSING_PINNED_SHORTCUT,
            )
        }
    }
}
