/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings.permissions.permissionoptions

import org.mozilla.focus.settings.permissions.SitePermissionOption

/**
 * Default implementation of the interactor for the site permission options screen.
 */
class DefaultSitePermissionOptionsScreenInteractor(
    private val sitePermissionOptionsScreenStore: SitePermissionOptionsScreenStore,
) {
    /**
     * Handles the selection of a [sitePermissionOption] on the site permission options screen.
     */
    fun handleSitePermissionOptionSelected(sitePermissionOption: SitePermissionOption) {
        if (sitePermissionOptionsScreenStore.state.selectedSitePermissionOption == sitePermissionOption) {
            return
        }
        sitePermissionOptionsScreenStore.dispatch(
            SitePermissionOptionsScreenAction.Select(
                selectedSitePermissionOption = sitePermissionOption,
            ),
        )
    }
}
