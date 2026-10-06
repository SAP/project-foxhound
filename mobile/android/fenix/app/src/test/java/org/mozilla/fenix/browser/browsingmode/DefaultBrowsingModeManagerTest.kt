/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.browsingmode

import android.content.Intent
import io.mockk.MockKAnnotations
import io.mockk.Runs
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.just
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.HomeActivity.Companion.PRIVATE_BROWSING_MODE
import org.mozilla.fenix.helpers.MockkRetryTestRule
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DefaultBrowsingModeManagerTest {

    @MockK lateinit var settings: Settings

    @RelaxedMockK
    lateinit var onModeChange: (BrowsingMode) -> Unit

    @get:Rule
    val mockkRule = MockkRetryTestRule()

    @Before
    fun before() {
        MockKAnnotations.init(this)

        every { settings.lastKnownMode = any() } just Runs
        every { settings.lastKnownMode } returns BrowsingMode.Normal
    }

    @Test
    fun `WHEN mode is set THEN onModeChange callback is invoked and last known browsing mode setting is set`() {
        val manager = buildBrowsingModeManager()

        verify {
            onModeChange.invoke(BrowsingMode.Normal)
            settings.lastKnownMode = BrowsingMode.Normal
        }

        manager.mode = BrowsingMode.Private

        verify {
            onModeChange(BrowsingMode.Private)
            settings.lastKnownMode = BrowsingMode.Private
        }

        manager.mode = BrowsingMode.Normal

        verify {
            onModeChange(BrowsingMode.Normal)
            settings.lastKnownMode = BrowsingMode.Normal
        }
    }

    @Test
    fun `WHEN mode is set THEN it should be returned from get`() {
        val manager = buildBrowsingModeManager()

        assertEquals(BrowsingMode.Normal, manager.mode)

        manager.mode = BrowsingMode.Private

        assertEquals(BrowsingMode.Private, manager.mode)
        verify { settings.lastKnownMode = BrowsingMode.Private }

        manager.mode = BrowsingMode.Normal

        assertEquals(BrowsingMode.Normal, manager.mode)
        verify { settings.lastKnownMode = BrowsingMode.Normal }
    }

    @Test
    fun `GIVEN last known mode is private mode WHEN browsing mode manager is initialized THEN set browsing mode to private`() {
        every { settings.lastKnownMode } returns BrowsingMode.Private

        val manager = buildBrowsingModeManager()

        assertEquals(BrowsingMode.Private, manager.mode)

        verify {
            onModeChange.invoke(BrowsingMode.Private)
            settings.lastKnownMode = BrowsingMode.Private
        }
    }

    @Test
    fun `GIVEN last known mode is normal mode WHEN browsing mode manager is initialized THEN set browsing mode to normal`() {
        every { settings.lastKnownMode } returns BrowsingMode.Normal

        val manager = buildBrowsingModeManager()

        assertEquals(BrowsingMode.Normal, manager.mode)

        verify {
            onModeChange.invoke(BrowsingMode.Normal)
            settings.lastKnownMode = BrowsingMode.Normal
        }
    }

    @Test
    fun `GIVEN private browsing mode intent WHEN browsing mode manager is initialized THEN set browsing mode to private`() {
        val intent = Intent()
        intent.putExtra(PRIVATE_BROWSING_MODE, true)

        val manager = buildBrowsingModeManager(intent = intent)

        assertEquals(BrowsingMode.Private, manager.mode)

        verify {
            onModeChange.invoke(BrowsingMode.Private)
            settings.lastKnownMode = BrowsingMode.Private
        }
    }

    @Test
    fun `GIVEN private browsing mode intent WHEN update mode is called THEN set browsing mode to private`() {
        val intent = Intent()
        intent.putExtra(PRIVATE_BROWSING_MODE, true)

        val manager = buildBrowsingModeManager()

        assertEquals(BrowsingMode.Normal, manager.mode)

        manager.updateMode(intent)

        assertEquals(BrowsingMode.Private, manager.mode)
    }

    @Test
    fun `GIVEN browsing mode is not set by intent and last known mode is private mode WHEN update mode is called THEN set browsing mode to private`() {
        every { settings.lastKnownMode } returns BrowsingMode.Private

        val manager = buildBrowsingModeManager()

        assertEquals(BrowsingMode.Private, manager.mode)

        manager.updateMode()

        assertEquals(BrowsingMode.Private, manager.mode)
    }

    @Test
    fun `GIVEN last known mode is normal mode WHEN update mode is called THEN set browsing mode to normal`() {
        every { settings.lastKnownMode } returns BrowsingMode.Normal

        val manager = buildBrowsingModeManager()

        assertEquals(BrowsingMode.Normal, manager.mode)

        manager.updateMode()

        assertEquals(BrowsingMode.Normal, manager.mode)
    }

    private fun buildBrowsingModeManager(
        intent: Intent? = null,
    ): BrowsingModeManager {
        return DefaultBrowsingModeManager(
            intent = intent,
            settings = settings,
            onModeChange = onModeChange,
        )
    }
}
