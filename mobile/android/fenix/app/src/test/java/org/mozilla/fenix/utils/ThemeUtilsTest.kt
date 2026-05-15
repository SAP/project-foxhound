/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
import androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
import androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn

@RunWith(AndroidJUnit4::class)
class ThemeUtilsTest {

    @Test
    fun `getAppNightMode returns MODE_NIGHT_FOLLOW_SYSTEM when shouldFollowDeviceTheme is true`() {
        val settings = mock<Settings>()
        doReturn(true).`when`(settings).shouldFollowDeviceTheme
        assertEquals(MODE_NIGHT_FOLLOW_SYSTEM, settings.getAppNightMode())
    }

    @Test
    fun `getAppNightMode returns MODE_NIGHT_NO when shouldFollowDeviceTheme is false and shouldUseLightTheme is true`() {
        val settings = mock<Settings>()
        doReturn(false).`when`(settings).shouldFollowDeviceTheme
        doReturn(true).`when`(settings).shouldUseLightTheme
        assertEquals(MODE_NIGHT_NO, settings.getAppNightMode())
    }

    @Test
    fun `getAppNightMode returns MODE_NIGHT_YES when shouldFollowDeviceTheme is false and shouldUseLightTheme is false`() {
        val settings = mock<Settings>()
        doReturn(false).`when`(settings).shouldFollowDeviceTheme
        doReturn(false).`when`(settings).shouldUseLightTheme
        assertEquals(MODE_NIGHT_YES, settings.getAppNightMode())
    }
}
