/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.sitepermissions

import mozilla.components.concept.engine.permission.Permission

/**
 * Provider to get the learn more url for a given permission.
 */
interface SitePermissionsLearnMoreUrlProvider {

    /**
     * Get the learn more url for a given permission.
     * @param permission the permission to get the learn more link for.
     *
     * @return the learn more url for the given permission, or null, if the permission is not
     * supported.
     */
    fun getUrl(permission: Permission): String?
}

/**
 * Default implementation of [SitePermissionsLearnMoreUrlProvider] to support the existing behavior for
 * [Permission.ContentCrossOriginStorageAccess] permission.
 */
internal class DefaultSitePermissionsLearnMoreUrlProvider : SitePermissionsLearnMoreUrlProvider {

    override fun getUrl(permission: Permission): String? {
        return when (permission) {
            is Permission.ContentCrossOriginStorageAccess -> STORAGE_ACCESS_DOCUMENTATION_URL
            else -> null
        }
    }

    private companion object {
        const val STORAGE_ACCESS_DOCUMENTATION_URL =
            "https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API"
    }
}
