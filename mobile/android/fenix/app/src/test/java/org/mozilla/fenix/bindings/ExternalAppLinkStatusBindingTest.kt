package org.mozilla.fenix.bindings

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.app.links.AppLinksUseCases
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.SupportedMenuNotifications
import org.mozilla.fenix.utils.Settings

class ExternalAppLinkStatusBindingTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var appStore: AppStore
    private lateinit var settings: Settings
    private lateinit var useCases: AppLinksUseCases

    private val urlExternal = "https://www.youtube.com"
    private val urlNonExternal = "https://www.mozilla.org"

    @Before
    fun setUp() {
        appStore = mockk(relaxed = true)
        settings = mockk {
            every { openInAppOpened } returns false
        }
        useCases = mockk {
            every { appLinkRedirect(urlExternal).hasExternalApp() } returns true
            every { appLinkRedirect(urlNonExternal).hasExternalApp() } returns false
        }
    }

    @Test
    fun `GIVEN the current url has no external app available WHEN a different url with an external app is selected THEN add open in app menu notification`() = runTest(testDispatcher) {
        val tabExternal = createTab(url = urlExternal, id = "external")
        val tabNonExternal = createTab(url = urlNonExternal, id = "nonExternal")
        val browserStore = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tabExternal, tabNonExternal),
                selectedTabId = "external",
            ),
        )
        val binding = ExternalAppLinkStatusBinding(
            settings = settings,
            appLinksUseCases = useCases,
            appStore = appStore,
            browserStore = browserStore,
            mainDispatcher = testDispatcher,
        )

        binding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        browserStore.dispatch(
            TabListAction.SelectTabAction(tabId = "nonExternal"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        verify {
            appStore.dispatch(
                AppAction.MenuNotification.AddMenuNotification(
                    SupportedMenuNotifications.OpenInApp,
                ),
            )
        }
    }

    @Test
    fun `GIVEN the current url has an external app available WHEN a different url without an external app is selected THEN remove open in app menu notification`() = runTest(testDispatcher) {
        val tabExternal = createTab(url = urlExternal, id = "external")
        val tabNonExternal = createTab(url = urlNonExternal, id = "nonExternal")
        val browserStore = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tabExternal, tabNonExternal),
                selectedTabId = "nonExternal",
            ),
        )
        val binding = ExternalAppLinkStatusBinding(
            settings = settings,
            appLinksUseCases = useCases,
            appStore = appStore,
            browserStore = browserStore,
            mainDispatcher = testDispatcher,
        )

        binding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        browserStore.dispatch(
            TabListAction.SelectTabAction(tabId = "external"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        verify {
            appStore.dispatch(
                AppAction.MenuNotification.RemoveMenuNotification(
                    SupportedMenuNotifications.OpenInApp,
                ),
            )
        }
    }
}
