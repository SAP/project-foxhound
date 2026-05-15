/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.PackageManager.PackageInfoFlags
import android.content.pm.PackageManager.ResolveInfoFlags
import android.content.pm.ResolveInfo
import android.os.Build

/**
 * Compatibility layer over [PackageManagerWrapper] APIs, providing safe access to common
 * package management operations across Android versions.
 */
interface PackageManagerCompatHelper {
    /**
     * Get [ResolveInfo] list for an [Intent] with the specified flag.
     *
     * @param intent the [intent] to resolve.
     *
     * @return a list of [ResolveInfo] objects containing one entry for each matching activity,
     * ordered from best to worst. If there are no matching activities, an empty list is returned.
     *
     * @see PackageManager.queryIntentActivities
     */
    fun queryIntentActivitiesCompat(intent: Intent, flag: Int): List<ResolveInfo>

    /**
     * Get [ResolveInfo] for an [Intent] with a specified flag
     *
     * @param intent the [intent] to resolve.
     *
     * @return a [ResolveInfo] object containing the final activity intent that was determined to be
     * the best action. Returns `null` if no matching activity was found.
     *
     * @see PackageManager.resolveActivity
     */
    fun resolveActivityCompat(intent: Intent, flag: Int): ResolveInfo?

    /**
     * Get a [PackageInfo] with a specified flag.
     *
     * @param packageName The name of the package to check for.
     *
     * @return a [PackageInfo] object containing information about the package.
     *
     * @throws PackageManager.NameNotFoundException if the package for [packageName] is not installed.
     * @throws UnsupportedOperationException if [PackageManager.getPackageInfo] is not implemented in subclass.
     *
     * @see PackageManager.getPackageInfo
     */
    @Throws(PackageManager.NameNotFoundException::class, UnsupportedOperationException::class)
    fun getPackageInfoCompat(packageName: String, flag: Int): PackageInfo

    /**
     * Get [ApplicationInfo] with the specified flag
     *
     * @param packageName The URI host.
     *
     * @return An [ApplicationInfo] containing information about the package.
     *
     * @throws PackageManager.NameNotFoundException if the package for [packageName] is not installed.
     * @throws UnsupportedOperationException if [PackageManager.getApplicationInfo] is not implemented in subclass.
     *
     * @see PackageManager.getApplicationInfo
     */
    @Throws(PackageManager.NameNotFoundException::class, UnsupportedOperationException::class)
    fun getApplicationInfoCompat(packageName: String, flag: Int): ApplicationInfo
}

/**
 * The default implementation of [PackageManagerCompatHelper].
 *
 * @param packageManagerWrapper the [PackageManagerWrapper] to use.
 */
class DefaultPackageManagerCompatHelper(
    val packageManagerWrapper: PackageManagerWrapper,
) : PackageManagerCompatHelper {
    override fun queryIntentActivitiesCompat(intent: Intent, flag: Int): List<ResolveInfo> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManagerWrapper.queryIntentActivities(
                intent,
                ResolveInfoFlags.of(flag.toLong()),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManagerWrapper.queryIntentActivities(intent, flag)
        }
    }

    override fun resolveActivityCompat(intent: Intent, flag: Int): ResolveInfo? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManagerWrapper.resolveActivity(
                intent,
                ResolveInfoFlags.of(flag.toLong()),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManagerWrapper.resolveActivity(intent, flag)
        }
    }

    override fun getPackageInfoCompat(packageName: String, flag: Int): PackageInfo {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManagerWrapper.getPackageInfo(
                packageName,
                PackageInfoFlags.of(flag.toLong()),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManagerWrapper.getPackageInfo(packageName, flag)
        }
    }

    override fun getApplicationInfoCompat(packageName: String, flag: Int): ApplicationInfo {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManagerWrapper.getApplicationInfo(
                packageName,
                PackageManager.ApplicationInfoFlags.of(flag.toLong()),
            )
        } else {
            @Suppress("DEPRECATION")
            packageManagerWrapper.getApplicationInfo(packageName, flag)
        }
    }
}
