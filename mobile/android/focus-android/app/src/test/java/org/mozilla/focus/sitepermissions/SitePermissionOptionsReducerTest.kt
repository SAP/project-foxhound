/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.focus.sitepermissions

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.focus.settings.permissions.AutoplayOption
import org.mozilla.focus.settings.permissions.SitePermissionOption
import org.mozilla.focus.settings.permissions.permissionoptions.SitePermissionOptionsScreenAction
import org.mozilla.focus.settings.permissions.permissionoptions.SitePermissionOptionsScreenReducer
import org.mozilla.focus.settings.permissions.permissionoptions.SitePermissionOptionsScreenState

class SitePermissionOptionsReducerTest {
    @Test
    fun `GIVEN site permission screen store WHEN android permission action is dispatched THEN site permission options screen state is updated`() {
        val initialState = SitePermissionOptionsScreenState()

        val finalState = SitePermissionOptionsScreenReducer.reduce(initialState, SitePermissionOptionsScreenAction.AndroidPermission(true))

        assertTrue(finalState.isAndroidPermissionGranted)
    }

    @Test
    fun `GIVEN site permission screen store WHEN select permission action is dispatched THEN site permission options screen state is updated`() {
        val initialState = SitePermissionOptionsScreenState()

        val finalState = SitePermissionOptionsScreenReducer.reduce(initialState, SitePermissionOptionsScreenAction.Select(SitePermissionOption.Blocked()))

        assertEquals(SitePermissionOption.Blocked(), finalState.selectedSitePermissionOption)
    }

    @Test
    fun `GIVEN site permission screen store WHEN update site permission options is dispatched THEN site permission options screen state is updated`() {
        val initialState = SitePermissionOptionsScreenState()
        val sitePermissionLabel = "Autoplay"

        val finalState = SitePermissionOptionsScreenReducer.reduce(
            initialState,
            SitePermissionOptionsScreenAction.UpdateSitePermissionOptions(
                listOf(
                    AutoplayOption.BlockAudioOnly(),
                    AutoplayOption.AllowAudioVideo(),
                    AutoplayOption.BlockAudioVideo(),
                ),
                AutoplayOption.AllowAudioVideo(),
                sitePermissionLabel,
                true,
            ),
        )

        assertEquals(AutoplayOption.AllowAudioVideo(), finalState.selectedSitePermissionOption)
        assertTrue(finalState.isAndroidPermissionGranted)
        assertEquals(
            listOf(
                AutoplayOption.BlockAudioOnly(),
                AutoplayOption.AllowAudioVideo(),
                AutoplayOption.BlockAudioVideo(),
            ),
            finalState.sitePermissionOptionList,
        )
        assertEquals(sitePermissionLabel, finalState.sitePermissionLabel)
    }
}
