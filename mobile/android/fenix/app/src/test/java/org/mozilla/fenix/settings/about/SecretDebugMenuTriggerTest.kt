/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.about

import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SecretDebugMenuTriggerTest {

    private lateinit var logoClicks: MutableList<Int>
    private var debugMenuWasActivated: Boolean = false
    private lateinit var trigger: SecretDebugMenuTrigger

    @Before
    fun setup() {
        logoClicks = mutableListOf()
        debugMenuWasActivated = false

        trigger = SecretDebugMenuTrigger(
            onLogoClicked = { remaining -> logoClicks.add(remaining) },
            onDebugMenuActivated = { debugMenuWasActivated = true },
        )
    }

    @Test
    fun `first click does not do anything`() {
        trigger.onClick() // 1 click

        assertTrue(logoClicks.isEmpty())
        assertEquals(false, debugMenuWasActivated)
    }

    @Test
    fun `clicking less than 5 times should call onLogoClicked with remaining clicks`() {
        trigger.onClick() // 1 click
        trigger.onClick() // 2 clicks
        trigger.onClick() // 3 clicks
        trigger.onClick() // 4 clicks

        assertEquals(listOf(3, 2, 1), logoClicks)
        assertEquals(false, debugMenuWasActivated)
    }

    @Test
    fun `clicking 5 times should call onDebugMenuActivated`() {
        trigger.onClick() // 1 click
        trigger.onClick() // 2 clicks
        trigger.onClick() // 3 clicks
        trigger.onClick() // 4 clicks
        trigger.onClick() // 5 clicks

        assertEquals(listOf(3, 2, 1), logoClicks)
        assertEquals(true, debugMenuWasActivated)
    }

    @Test
    fun `clicking more than 5 times should call onDebugMenuActivated`() {
        trigger.onClick() // 1 click
        trigger.onClick() // 2 clicks
        trigger.onClick() // 3 clicks
        trigger.onClick() // 4 clicks
        trigger.onClick() // 5 clicks
        trigger.onClick() // 6 clicks
        trigger.onClick() // 7 clicks

        assertEquals(listOf(3, 2, 1), logoClicks)
        assertEquals(true, debugMenuWasActivated)
    }

    @Test
    fun `onResume should reset the counter`() {
        trigger.onClick() // 1 click
        trigger.onClick() // 2 clicks
        trigger.onClick() // 3 clicks

        assertEquals(2, logoClicks.size)

        trigger.onResume(mockk()) // Reset the counter

        logoClicks.clear()
        debugMenuWasActivated = false

        // First click after reset should not trigger anything
        trigger.onClick()
        assertTrue(logoClicks.isEmpty())
        assertEquals(false, debugMenuWasActivated)

        repeat(4) { trigger.onClick() }
        assertEquals(listOf(3, 2, 1), logoClicks)
        assertEquals(true, debugMenuWasActivated)
    }
}
