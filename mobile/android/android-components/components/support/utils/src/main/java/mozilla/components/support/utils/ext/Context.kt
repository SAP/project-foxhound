/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Window
import androidx.core.content.ContextCompat
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.utils.BuildManufacturerChecker

const val SETTINGS_SELECT_OPTION_KEY = ":settings:fragment_args_key"
const val SETTINGS_SHOW_FRAGMENT_ARGS = ":settings:show_fragment_args"
const val DEFAULT_BROWSER_APP_OPTION = "default_browser"
const val ACTION_MANAGE_DEFAULT_APPS_SETTINGS_HUAWEI = "com.android.settings.PREFERRED_SETTINGS"
private val logger = Logger("navigateToDefaultBrowserAppsSettings")

val Context.packageManagerWrapper: PackageManagerWrapper
    get() = DefaultPackageManagerWrapper(packageManager)

/**
 * The default [PackageManagerCompatHelper] for this [Context].
 *
 * @returns a [DefaultPackageManagerCompatHelper] created with the context's [PackageManager].
 */
val Context.packageManagerCompatHelper: PackageManagerCompatHelper
    get() = DefaultPackageManagerCompatHelper(
        DefaultPackageManagerWrapper(packageManager),
    )

/**
 * Open OS settings for default browser.
 */
fun Context.navigateToDefaultBrowserAppsSettings(buildManufacturerChecker: BuildManufacturerChecker) {
    val intent = when {
        buildManufacturerChecker.isHuawei() -> Intent(ACTION_MANAGE_DEFAULT_APPS_SETTINGS_HUAWEI)
        else -> Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS).apply {
            putExtra(
                SETTINGS_SELECT_OPTION_KEY,
                DEFAULT_BROWSER_APP_OPTION,
            )
            putExtra(
                SETTINGS_SHOW_FRAGMENT_ARGS,
                Bundle().apply { putString(SETTINGS_SELECT_OPTION_KEY, DEFAULT_BROWSER_APP_OPTION) },
            )
        }
    }

    try {
        startActivity(intent)
    } catch (e: ActivityNotFoundException) {
        logger.error("ActivityNotFoundException " + e.message.toString())
    }
}

/**
 * Context  Context to retrieve service from.
 * @param broadcastReceiver The BroadcastReceiver to handle the broadcast.
 * @param filter   Selects the Intent broadcasts to be received.
 * @param exportedFlag [ContextCompat.RECEIVER_EXPORTED], if the receiver
 * should be able to receiver broadcasts from other applications, or
 * [ContextCompat.RECEIVER_NOT_EXPORTED] if the receiver should be able
 * to receive broadcasts only from the system or from within the app.
 *
 * @return The first sticky intent found that matches [filter],
 * or null if there are none.
 */
@SuppressLint("UnspecifiedRegisterReceiverFlag")
fun Context.registerReceiverCompat(
    broadcastReceiver: BroadcastReceiver?,
    filter: IntentFilter,
    exportedFlag: Int,
): Intent? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        ContextCompat.registerReceiver(
            this,
            broadcastReceiver,
            filter,
            exportedFlag,
        )
    } else {
        registerReceiver(broadcastReceiver, filter)
    }
}

/**
 * @return True if the orientation is landscape,or false if it's not.
 */
fun Context.isLandscape(): Boolean {
    return resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
}

/**
 * Try getting the activity window from the current context.
 *
 * @return The current [Activity]'s [Window] or null if it cannot be found.
 */
fun Context.getActivityWindow(): Window? {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) {
            return context.window
        }
        context = context.baseContext
    }
    return null
}
