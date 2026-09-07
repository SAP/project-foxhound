/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.WebExtensionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.webextension.WebExtensionBrowserAction
import mozilla.components.concept.engine.webextension.WebExtensionPageAction
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.menu.store.MenuAction
import org.mozilla.fenix.components.menu.store.MenuState
import org.mozilla.fenix.components.menu.store.MenuStore

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

            val captureActionsMiddleware = CaptureActionsMiddleware<MenuState, MenuAction>()
            menuStore = MenuStore(
                initialState = MenuState(),
                middleware = listOf(captureActionsMiddleware),
            )
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
                iconSize = 24,
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            captureActionsMiddleware.assertLastAction(MenuAction.UpdateWebExtensionBrowserMenuItems::class) {
                assertEquals(
                    it.webExtensionBrowserMenuItem[0].label,
                    "overridden_browser_action_title",
                )
                assertTrue(it.webExtensionBrowserMenuItem[0].enabled == true)
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeText, "")
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeTextColor, 0)
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeBackgroundColor, 0)
            }
        }

    @Test
    fun `GIVEN a web extension is updated WHEN its action has an empty name THEN update browser web extension menu items with the extension name`() =
        runTest {
            val extensionName = "extensionName"

            val defaultBrowserAction =
                createWebExtensionBrowserAction("default_browser_action_title")

            val overriddenBrowserAction =
                createWebExtensionBrowserAction("")

            val extensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = extensionName,
                    enabled = true,
                    browserAction = defaultBrowserAction,
                ),
            )
            val overriddenExtensions: Map<String, WebExtensionState> = mapOf(
                "id" to WebExtensionState(
                    id = "id",
                    url = "url",
                    name = extensionName,
                    enabled = true,
                    browserAction = overriddenBrowserAction,
                ),
            )

            val captureActionsMiddleware = CaptureActionsMiddleware<MenuState, MenuAction>()
            menuStore = MenuStore(
                initialState = MenuState(),
                middleware = listOf(captureActionsMiddleware),
            )
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
                iconSize = 24,
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            captureActionsMiddleware.assertLastAction(MenuAction.UpdateWebExtensionBrowserMenuItems::class) {
                assertEquals(
                    extensionName,
                    it.webExtensionBrowserMenuItem[0].label,
                )
                assertTrue(it.webExtensionBrowserMenuItem[0].enabled == true)
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeText, "")
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeTextColor, 0)
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeBackgroundColor, 0)
            }
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

            val captureActionsMiddleware = CaptureActionsMiddleware<MenuState, MenuAction>()
            menuStore = MenuStore(
                initialState = MenuState(),
                middleware = listOf(captureActionsMiddleware),
            )
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
                iconSize = 24,
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            captureActionsMiddleware.assertLastAction(MenuAction.UpdateWebExtensionBrowserMenuItems::class) {
                assertEquals(
                    it.webExtensionBrowserMenuItem[0].label,
                    "overridden_page_action_title",
                )
                assertTrue(it.webExtensionBrowserMenuItem[0].enabled == true)
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeText, "")
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeTextColor, 0)
                assertEquals(it.webExtensionBrowserMenuItem[0].badgeBackgroundColor, 0)
            }
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

            val captureActionsMiddleware = CaptureActionsMiddleware<MenuState, MenuAction>()
            menuStore = MenuStore(
                initialState = MenuState(),
                middleware = listOf(captureActionsMiddleware),
            )
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
                iconSize = 24,
                onDismiss = {},
                mainDispatcher = testDispatcher,
            )
            binding.start()
            testDispatcher.scheduler.advanceUntilIdle()

            captureActionsMiddleware.assertLastAction(MenuAction.UpdateWebExtensionBrowserMenuItems::class) {
                assertTrue(it.webExtensionBrowserMenuItem.isEmpty())
            }
        }

    private fun createWebExtensionPageAction(title: String, enabled: Boolean = true) =
        WebExtensionPageAction(
            title = title,
            enabled = enabled,
            loadIcon = { null },
            badgeText = "",
            badgeTextColor = 0,
            badgeBackgroundColor = 0,
            onClick = {},
        )

    private fun createWebExtensionBrowserAction(title: String) = WebExtensionBrowserAction(
        title,
        enabled = true,
        loadIcon = { null },
        badgeText = "",
        badgeTextColor = 0,
        badgeBackgroundColor = 0,
        onClick = {},
    )
}
