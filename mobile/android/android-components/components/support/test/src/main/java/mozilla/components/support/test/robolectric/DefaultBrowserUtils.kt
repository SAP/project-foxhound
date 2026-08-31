/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.test.robolectric

import android.app.role.RoleManager
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ResolveInfo
import android.os.Build
import android.os.Process
import androidx.core.net.toUri
import org.robolectric.shadows.ShadowPackageManager
import org.robolectric.shadows.ShadowRoleManager

private const val SAMPLE_BROWSER_HTTP_URL = "http://www.mozilla.org/index.html"

/**
 * Helper methods related to the default browser functionalities from `support.utils`.
 */
object DefaultBrowserUtils {

    /**
     * Helper to configure the default browser in `Robolectric` tests.
     *
     * This is to support the [Browsers.isDefaultBrowser] functionality.
     *
     * @param defaultBrowserPackageName the package name of the default browser to set.
     */
    fun setAsDefaultBrowser(
        defaultBrowserPackageName: String,
    ) = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ShadowRoleManager.addRoleHolder(
            RoleManager.ROLE_BROWSER,
            defaultBrowserPackageName,
            Process.myUserHandle(),
        )
    } else {
        val intent = Intent(Intent.ACTION_VIEW, SAMPLE_BROWSER_HTTP_URL.toUri()).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
        }

        val info = ResolveInfo().apply {
            activityInfo = ActivityInfo().apply {
                packageName = defaultBrowserPackageName
            }
        }

        @Suppress("Deprecation")
        ShadowPackageManager().addResolveInfoForIntent(intent, info)
    }
}
