/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.any
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.BootUtils.Companion.getBootIdentifier
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.Mockito.`when`
import org.mockito.MockitoAnnotations
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
class BootUtilsTest {

    @Mock private lateinit var bootUtils: BootUtils

    @Before
    fun setUp() {
        MockitoAnnotations.openMocks(this)
    }

    @Test
    @Config(sdk = [Build.VERSION_CODES.O])
    fun `WHEN Android version is more than O(26) THEN getBootIdentifier returns the boot count`() {
        val bootCount = "9"
        `when`(bootUtils.getDeviceBootCount(any())).thenReturn(bootCount)
        assertEquals(bootCount, getBootIdentifier(testContext, bootUtils))
    }
}
