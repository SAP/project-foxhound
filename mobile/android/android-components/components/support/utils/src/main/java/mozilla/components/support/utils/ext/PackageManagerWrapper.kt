/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build
import androidx.annotation.RequiresApi

/**
 * Wrapper for [PackageManager] APIs.
 *
 * See the linked documentation for full details of each API function.
 * This is not exhaustive of all available public APIs.
 */
interface PackageManagerWrapper {
    /**
     * @see [PackageManager.queryIntentActivities].
     */
    fun queryIntentActivities(
        intent: Intent,
        flags: PackageManager.ResolveInfoFlags,
    ): List<ResolveInfo>

    /**
     * @see [PackageManager.queryIntentActivities].
     */
    fun queryIntentActivities(intent: Intent, flags: Int): List<ResolveInfo>

    /**
     * @see [PackageManager.resolveActivity].
     */
    fun resolveActivity(intent: Intent, flags: PackageManager.ResolveInfoFlags): ResolveInfo?

    /**
     * @see [PackageManager.resolveActivity].
     */
    fun resolveActivity(intent: Intent, flags: Int): ResolveInfo?

    /**
     * @throws PackageManager.NameNotFoundException if the package for [packageName] is not installed.
     * @throws UnsupportedOperationException if [PackageManager.getPackageInfo] is not implemented
     * in subclass.
     *
     * @see [PackageManager.getPackageInfo].
     */
    fun getPackageInfo(packageName: String, flags: PackageManager.PackageInfoFlags): PackageInfo

    /**
     * @throws PackageManager.NameNotFoundException if the package for [packageName] is not installed.
     *
     * @see [PackageManager.getPackageInfo].
     */
    fun getPackageInfo(packageName: String, flags: Int): PackageInfo

    /**
     * @throws PackageManager.NameNotFoundException if the package for [packageName] is not installed.
     * @throws UnsupportedOperationException if [PackageManager.getApplicationInfo] is not
     * implemented in subclass.
     *
     * @see [PackageManager.getApplicationInfo].
     */
    fun getApplicationInfo(
        packageName: String,
        flags: PackageManager.ApplicationInfoFlags,
    ): ApplicationInfo

    /**
     * @throws PackageManager.NameNotFoundException if a package with the given name cannot be
     * found on the system.
     *
     * @see [PackageManager.getApplicationInfo].
     */
    fun getApplicationInfo(packageName: String, flags: Int): ApplicationInfo

    /**
     * Returns a list of all installed packages.
     *
     * @param flags Optional flags to modify the data returned.
     *
     * @return A list of [PackageInfo] objects, one for each installed package.
     */
    fun getInstalledPackages(flags: Int): List<PackageInfo>
}

/**
 * Default implementation of [PackageManagerWrapper].
 *
 * @param packageManager [PackageManager] to wrap.
 */
class DefaultPackageManagerWrapper(
    private val packageManager: PackageManager,
) : PackageManagerWrapper {

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    override fun queryIntentActivities(
        intent: Intent,
        flags: PackageManager.ResolveInfoFlags,
    ): List<ResolveInfo> = packageManager.queryIntentActivities(intent, flags)

    override fun queryIntentActivities(
        intent: Intent,
        flags: Int,
    ): List<ResolveInfo> = packageManager.queryIntentActivities(intent, flags)

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    override fun resolveActivity(
        intent: Intent,
        flags: PackageManager.ResolveInfoFlags,
    ): ResolveInfo? = packageManager.resolveActivity(intent, flags)

    override fun resolveActivity(
        intent: Intent,
        flags: Int,
    ): ResolveInfo? = packageManager.resolveActivity(intent, flags)

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    override fun getPackageInfo(
        packageName: String,
        flags: PackageManager.PackageInfoFlags,
    ): PackageInfo = packageManager.getPackageInfo(packageName, flags)

    override fun getPackageInfo(
        packageName: String,
        flags: Int,
    ): PackageInfo = packageManager.getPackageInfo(packageName, flags)

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    override fun getApplicationInfo(
        packageName: String,
        flags: PackageManager.ApplicationInfoFlags,
    ): ApplicationInfo = packageManager.getApplicationInfo(packageName, flags)

    override fun getApplicationInfo(
        packageName: String,
        flags: Int,
    ): ApplicationInfo = packageManager.getApplicationInfo(packageName, flags)

    override fun getInstalledPackages(flags: Int): List<PackageInfo> =
        packageManager.getInstalledPackages(flags)
}
