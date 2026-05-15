/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Build.VERSION.SDK_INT
import androidx.annotation.RequiresApi
import mozilla.components.support.base.log.logger.Logger

/**
 * Gets the install source package
 *
 * @param packageManager the package manager.
 * @param packageName the package name.
 * @param sdk the current SDK int
 * @return the install source package name
 */
@SuppressLint("NewApi") // Lint cannot resolve 'sdk' as 'SDK_INT' as it's not referenced directly.
fun installSourcePackage(
    packageManager: PackageManager,
    packageName: String,
    sdk: Int = SDK_INT,
): String = if (sdk >= Build.VERSION_CODES.R) {
    installSourcePackageForBuildMinR(packageManager, packageName)
} else {
    installSourcePackageForBuildMaxQ(packageManager, packageName)
}

@RequiresApi(Build.VERSION_CODES.R)
private fun installSourcePackageForBuildMinR(
    packageManager: PackageManager,
    packageName: String,
): String = try {
    packageManager.getInstallSourceInfo(packageName).installingPackageName
} catch (e: PackageManager.NameNotFoundException) {
    Logger.debug("$packageName is not available to the caller")
    null
}.orEmpty()

private fun installSourcePackageForBuildMaxQ(
    packageManager: PackageManager,
    packageName: String,
): String = try {
    @Suppress("DEPRECATION")
    packageManager.getInstallerPackageName(packageName)
} catch (e: IllegalArgumentException) {
    Logger.debug("$packageName is not installed")
    null
}.orEmpty()
