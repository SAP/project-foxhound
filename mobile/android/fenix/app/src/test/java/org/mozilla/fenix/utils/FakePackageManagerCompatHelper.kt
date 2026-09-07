/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.ResolveInfo
import mozilla.components.support.utils.ext.PackageManagerCompatHelper
import java.util.Collections.emptyList

class FakePackageManagerCompatHelper(
    val packageInfo: PackageInfo = PackageInfo(),
    val getPackageInfoThrowable: Throwable? = null,
    val applicationInfo: ApplicationInfo = ApplicationInfo(),
) : PackageManagerCompatHelper {
    override fun queryIntentActivitiesCompat(intent: Intent, flag: Int): MutableList<ResolveInfo> =
        emptyList()

    override fun resolveActivityCompat(intent: Intent, flag: Int): ResolveInfo? = null

    override fun getPackageInfoCompat(packageName: String, flag: Int): PackageInfo {
        getPackageInfoThrowable?.let { throw it }

        return packageInfo
    }

    override fun getApplicationInfoCompat(packageName: String, flag: Int) = applicationInfo
}
