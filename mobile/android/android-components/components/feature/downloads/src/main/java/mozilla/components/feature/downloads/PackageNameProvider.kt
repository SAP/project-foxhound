/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads

import android.content.Context

/**
 * Provides the package name of the application.
 */
interface PackageNameProvider {
    val packageName: String
}

/**
 * Default implementation of [PackageNameProvider] that retrieves the package name from the application context.
 *
 * @param context The application context used to retrieve the package name.
 */
class DefaultPackageNameProvider(private val context: Context) : PackageNameProvider {
    override val packageName: String
        get() = context.packageName
}
