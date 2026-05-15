/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.content.Context
import android.provider.Settings
import java.io.File

/**
 * Provides access to system properties.
 */
interface BootUtils {

    /**
     * Gets the device boot count.
     */
    fun getDeviceBootCount(context: Context): String

    val deviceBootId: String?

    val bootIdFileExists: Boolean

    companion object {
        /**
         * @return either the boot count or a boot id depending on the device Android version.
         */
        fun getBootIdentifier(context: Context, bootUtils: BootUtils = BootUtilsImpl()): String =
            bootUtils.getDeviceBootCount(context)
    }
}

/**
 * Implementation of [BootUtils].
 */
class BootUtilsImpl : BootUtils {
    private val bootIdFile by lazy { File("/proc/sys/kernel/random/boot_id") }

    override fun getDeviceBootCount(context: Context): String =
        Settings.Global.getString(context.contentResolver, Settings.Global.BOOT_COUNT)

    override val deviceBootId: String? by lazy { bootIdFile.readLines().firstOrNull()?.trim() }

    override val bootIdFileExists: Boolean by lazy { bootIdFile.exists() }
}
