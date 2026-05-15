/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.WebExtensionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.webextension.WebExtensionBrowserAction
import mozilla.components.concept.engine.webextension.WebExtensionPageAction
import mozilla.components.support.ktx.android.util.dpToPx
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.mozilla.fenix.components.menu.store.MenuAction
import org.mozilla.fenix.components.menu.store.MenuState
import org.mozilla.fenix.components.menu.store.MenuStore

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class WebExtensionsMenuBindingTest {
    private val testDispatcher = StandardTestDispatcher()

    lateinit var browserStore: BrowserStore
    private lateinit var menuStore: MenuStore

    @Test
    fun `WHEN browser web extension state get updated in the browserStore THEN invoke action update browser web extension menu items`() =
        runTest {
            val defaultBrowserAction =
                createWebExtensionBrowserAction("default_browser_action_title")

            val overriddenBrowserAction =
                createWebExtensionBrowserAction("overridden_browser_action_title")

            val extensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = "name",
                    enabled = true,
                    browserAction = defaultBrowserAction,
                ),
            )
            val overriddenExtensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = "name",
                    enabled = true,
                    browserAction = overriddenBrowserAction,
                ),
            )

            menuStore = spy(MenuStore(MenuState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://www.example.org",
                            id = "tab1",
                            extensions = overriddenExtensions,
                        ),
                    ),
                    selectedTabId = "tab1",
                    extensions = extensions,
                ),
            )

            val binding = WebExtensionsMenuBinding(
                browserStore = browserStore,
                customTabId = null,
                menuStore = menuStore,
                iconSize = 24.dpToPx(testContext.resources.displayMetrics),
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            val browserItemsUpdateCaptor = argumentCaptor<MenuAction.UpdateWebExtensionBrowserMenuItems>()

            verify(menuStore).dispatch(browserItemsUpdateCaptor.capture())
            assertEquals(
                browserItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].label,
                "overridden_browser_action_title",
            )
            assertTrue(browserItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].enabled == true)
            assertEquals(browserItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].badgeText, "")
            assertEquals(browserItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].badgeTextColor, 0)
            assertEquals(browserItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].badgeBackgroundColor, 0)
        }

    @Test
    fun `WHEN page web extension state get updated in the browserStore THEN invoke action update page web extension menu items`() =
        runTest {
            val defaultPageAction = createWebExtensionPageAction("default_page_action_title")

            val overriddenPageAction = createWebExtensionPageAction("overridden_page_action_title")

            val extensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = "name",
                    enabled = true,
                    pageAction = defaultPageAction,
                ),
            )
            val overriddenExtensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = "name",
                    enabled = true,
                    pageAction = overriddenPageAction,
                ),
            )

            menuStore = spy(MenuStore(MenuState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://www.example.org",
                            id = "tab1",
                            extensions = overriddenExtensions,
                        ),
                    ),
                    selectedTabId = "tab1",
                    extensions = extensions,
                ),
            )

            val binding = WebExtensionsMenuBinding(
                browserStore = browserStore,
                customTabId = null,
                menuStore = menuStore,
                iconSize = 24.dpToPx(testContext.resources.displayMetrics),
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            val pageItemsUpdateCaptor = argumentCaptor<MenuAction.UpdateWebExtensionBrowserMenuItems>()

            verify(menuStore).dispatch(pageItemsUpdateCaptor.capture())
            assertEquals(
                pageItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].label,
                "overridden_page_action_title",
            )
            assertTrue(pageItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].enabled == true)
            assertEquals(pageItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].badgeText, "")
            assertEquals(pageItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].badgeTextColor, 0)
            assertEquals(pageItemsUpdateCaptor.value.webExtensionBrowserMenuItem[0].badgeBackgroundColor, 0)
        }

    @Test
    fun `WHEN page web extension state disabled get updated in the browserStore THEN not invoke action update page web extension menu items`() =
        runTest {
            val defaultPageAction =
                createWebExtensionPageAction("default_page_action_title", enabled = false)

            val extensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = "name",
                    enabled = true,
                    pageAction = defaultPageAction,
                ),
            )

            menuStore = spy(MenuStore(MenuState()))
            browserStore = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab(
                            url = "https://www.example.org",
                            id = "tab1",
                            extensions = extensions,
                        ),
                    ),
                    selectedTabId = "tab1",
                    extensions = extensions,
                ),
            )

            val binding = WebExtensionsMenuBinding(
                browserStore = browserStore,
                customTabId = null,
                menuStore = menuStore,
                iconSize = 24.dpToPx(testContext.resources.displayMetrics),
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            val pageItemsUpdateCaptor =
                argumentCaptor<MenuAction.UpdateWebExtensionBrowserMenuItems>()

            verify(menuStore).dispatch(pageItemsUpdateCaptor.capture())

            assertTrue(
                pageItemsUpdateCaptor.value.webExtensionBrowserMenuItem.isEmpty(),
            )
        }

    private fun createWebExtensionPageAction(title: String, enabled: Boolean = true) =
        WebExtensionPageAction(
            title = title,
            enabled = enabled,
            loadIcon = mock(),
            badgeText = "",
            badgeTextColor = 0,
            badgeBackgroundColor = 0,
            onClick = {},
        )

    private fun createWebExtensionBrowserAction(title: String) = WebExtensionBrowserAction(
        title,
        enabled = true,
        loadIcon = mock(),
        badgeText = "",
        badgeTextColor = 0,
        badgeBackgroundColor = 0,
        onClick = {},
    )
}
