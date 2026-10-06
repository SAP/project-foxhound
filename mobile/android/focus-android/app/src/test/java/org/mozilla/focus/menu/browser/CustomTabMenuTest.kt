/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.menu.browser

import android.content.Context
import android.content.res.Resources
import android.util.TypedValue
import mozilla.components.browser.menu.item.BrowserMenuCategory
import mozilla.components.browser.menu.item.BrowserMenuDivider
import mozilla.components.browser.menu.item.BrowserMenuImageSwitch
import mozilla.components.browser.menu.item.BrowserMenuImageText
import mozilla.components.browser.menu.item.BrowserMenuItemToolbar
import mozilla.components.browser.menu.item.SimpleBrowserMenuItem
import mozilla.components.browser.menu.item.WebExtensionPlaceholderMenuItem
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.any
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.anyInt
import org.mockito.Mockito.eq
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import kotlin.test.assertIs

class CustomTabMenuTest {

    private lateinit var context: Context
    private lateinit var mockTheme: Resources.Theme

    @Before
    fun setup() {
        context = mock()
        mockTheme = mock()

        `when`(context.getString(anyInt())).thenReturn("string")
        `when`(context.getString(anyInt(), anyString())).thenReturn("Powered by Focus")

        `when`(context.theme).thenReturn(mockTheme)

        `when`(mockTheme.resolveAttribute(anyInt(), any(), eq(true)))
            .thenAnswer { invocation ->
                val typedValueArg = invocation.arguments[1] as TypedValue
                typedValueArg.resourceId = 1
                true
            }
    }

    @Test
    fun `WHEN is onboarding tab is false THEN menu items contains all menu items`() {
        val customTabMenu = CustomTabMenu(
            context = context,
            store = BrowserStore(),
            currentTabId = "",
            isOnboardingTab = false,
        ) {}

        val expectedSize = 10
        val menuItems = customTabMenu.menuBuilder.items
        assertEquals(expectedSize, customTabMenu.menuBuilder.items.size)

        // Browser menu
        assertIs<BrowserMenuItemToolbar>(menuItems[0])
        // Browser menu divider
        assertIs<BrowserMenuDivider>(menuItems[1])
        // Find in page
        assertIs<BrowserMenuImageText>(menuItems[2])
        // Desktop mode
        assertIs<BrowserMenuImageSwitch>(menuItems[3])
        // Report site issue
        assertIs<WebExtensionPlaceholderMenuItem>(menuItems[4])
        // Browser menu divider
        assertIs<BrowserMenuDivider>(menuItems[5])
        // Add to homescreen
        assertIs<BrowserMenuImageText>(menuItems[6])
        // Open in Focus
        assertIs<SimpleBrowserMenuItem>(menuItems[7])
        // Open in...
        assertIs<SimpleBrowserMenuItem>(menuItems[8])
        // Powered by
        assertIs<BrowserMenuCategory>(menuItems[9])
    }

    @Test
    fun `WHEN is onboarding tab is true THEN menu items contains only sandboxed menu items`() {
        val customTabMenu = CustomTabMenu(
            context = context,
            store = BrowserStore(),
            currentTabId = "",
            isOnboardingTab = true,
        ) {}

        val expectedSize = 8
        val menuItems = customTabMenu.menuBuilder.items
        assertEquals(expectedSize, customTabMenu.menuBuilder.items.size)

        // Browser menu
        assertIs<BrowserMenuItemToolbar>(menuItems[0])
        // Browser menu divider
        assertIs<BrowserMenuDivider>(menuItems[1])
        // Find in page
        assertIs<BrowserMenuImageText>(menuItems[2])
        // Desktop mode
        assertIs<BrowserMenuImageSwitch>(menuItems[3])
        // Report site issue
        assertIs<WebExtensionPlaceholderMenuItem>(menuItems[4])
        // Browser menu divider
        assertIs<BrowserMenuDivider>(menuItems[5])
        // Add to homescreen
        assertIs<BrowserMenuImageText>(menuItems[6])
        // Powered by
        assertIs<BrowserMenuCategory>(menuItems[7])
    }
}
