/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.runtimetagproviders

import android.content.pm.PackageInfo
import androidx.core.content.pm.PackageInfoCompat
import mozilla.components.Build
import mozilla.components.lib.crash.RuntimeTag
import mozilla.components.lib.crash.RuntimeTagProvider
import mozilla.components.support.base.log.logger.Logger

internal const val DEFAULT_VERSION_CODE = "N/A"
internal const val DEFAULT_VERSION_NAME = "N/A"

/**
 * Interface to provide information about the current version of the application
 */
interface VersionInfoProvider {
    val versionCode: String
    val versionName: String

    /**
     * Builders [VersionInfoProvider]
     */
    companion object {
        /**
         * Creates a [VersionInfoProvider] from the [PackageInfo] of an application.
         *
         * @param packageInfo the applications [PackageInfo].
         */
        fun fromPackageInfo(packageInfo: PackageInfo): VersionInfoProvider {
            return PackageInfoVersionInfoProvider(packageInfo)
        }
    }
}

private class PackageInfoVersionInfoProvider(
    private val packageInfo: PackageInfo,
) : VersionInfoProvider {
    private val logger = Logger("mozac/MozillaSocorroCrashHelperService")

    override val versionCode: String
        get() = Result.runCatching { PackageInfoCompat.getLongVersionCode(packageInfo).toString() }
            .onFailure { logger.error("failed to get application version code") }
            .getOrElse { DEFAULT_VERSION_CODE }

    override val versionName: String
        get() = Result.runCatching { requireNotNull(packageInfo.versionName) }
            .onFailure { logger.error("failed to get application version") }
            .getOrElse { DEFAULT_VERSION_NAME }
}

/**
 * Includes the current release version with the crash so that it can be persisted.
 *
 * @param versionInfoProvider a [VersionInfoProvider] used to query information about the current version.
 */
class BuildRuntimeTagProvider(
    private val versionInfoProvider: VersionInfoProvider,
) : RuntimeTagProvider {
    override fun invoke(): Map<String, String> {
        return mapOf(
             RuntimeTag.GIT to Build.GIT_HASH,
             RuntimeTag.AC_VERSION to Build.VERSION,
             RuntimeTag.AS_VERSION to Build.APPLICATION_SERVICES_VERSION,
             RuntimeTag.GLEAN_VERSION to Build.GLEAN_SDK_VERSION,
             RuntimeTag.VERSION_NAME to versionInfoProvider.versionName,
             RuntimeTag.VERSION_CODE to versionInfoProvider.versionCode,
        )
    }
}
