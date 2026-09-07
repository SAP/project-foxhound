/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings.permissions.permissionoptions

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner

/**
 * Feature that checks for hardware permissions (e.g., camera, microphone) when the site permission
 * options screen is started.
 */
class HardwarePermissionCheckFeature(
    val storage: SitePermissionOptionsStorage,
    val store: SitePermissionOptionsScreenStore,
    val sitePermission: SitePermission,
) : DefaultLifecycleObserver {

    override fun onStart(owner: LifecycleOwner) {
        super.onStart(owner)
        val isPermissionGranted = storage.isAndroidPermissionGranted(sitePermission)
        store.dispatch(SitePermissionOptionsScreenAction.AndroidPermission(isPermissionGranted))
    }
}
