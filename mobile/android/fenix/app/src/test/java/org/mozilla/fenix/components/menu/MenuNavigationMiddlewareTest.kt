/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu

import androidx.navigation.NavController
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import mozilla.appservices.places.BookmarkRoot
import mozilla.components.browser.state.action.ShareResourceAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.state.CustomTabConfig
import mozilla.components.browser.state.state.CustomTabSessionState
import mozilla.components.browser.state.state.ReaderState
import mozilla.components.browser.state.state.content.ShareResourceState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineSession.LoadUrlFlags
import mozilla.components.concept.engine.prompt.ShareData
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.pwa.WebAppUseCases
import mozilla.components.feature.session.SessionUseCases
import mozilla.components.service.fxa.manager.AccountState.Authenticated
import mozilla.components.service.fxa.manager.AccountState.AuthenticationProblem
import mozilla.components.service.fxa.manager.AccountState.NotAuthenticated
import mozilla.components.support.test.rule.MainCoroutineRule
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.collections.SaveCollectionStep
import org.mozilla.fenix.components.accounts.FenixFxAEntryPoint
import org.mozilla.fenix.components.menu.middleware.MenuNavigationMiddleware
import org.mozilla.fenix.components.menu.store.BookmarkState
import org.mozilla.fenix.components.menu.store.BrowserMenuState
import org.mozilla.fenix.components.menu.store.MenuAction
import org.mozilla.fenix.components.menu.store.MenuState
import org.mozilla.fenix.components.menu.store.MenuStore
import org.mozilla.fenix.settings.SupportUtils.AMO_HOMEPAGE_FOR_ANDROID
import org.mozilla.fenix.utils.Settings
import org.mozilla.fenix.webcompat.WEB_COMPAT_REPORTER_URL
import org.mozilla.fenix.webcompat.WebCompatReporterMoreInfoSender
import org.mozilla.fenix.webcompat.fake.FakeWebCompatReporterMoreInfoSender
import org.mozilla.fenix.webcompat.store.WebCompatReporterState
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MenuNavigationMiddlewareTest {

    @get:Rule
    val coroutinesTestRule = MainCoroutineRule()
    private val scope = coroutinesTestRule.scope

    private val navController: NavController = mockk(relaxed = true) {
        every { currentDestination?.id } returns R.id.menuDialogFragment
        every { navigate(any<NavDirections>(), any<NavOptions>()) } just runs
    }

    private val sessionUseCases: SessionUseCases = mockk(relaxed = true)
    private val webAppUseCases: WebAppUseCases = mockk(relaxed = true)
    private val settings: Settings = mockk(relaxed = true)

    @Test
    fun `GIVEN account state is authenticated WHEN navigate to Mozilla account action is dispatched THEN dispatch navigate action to Mozilla account settings`() = runTest {
        val store = createStore()
        val accountState = Authenticated
        val accessPoint = MenuAccessPoint.Home

        store.dispatch(
            MenuAction.Navigate.MozillaAccount(
                accountState = accountState,
                accesspoint = accessPoint,
            ),
        )

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalAccountSettingsFragment(),
                null,
            )
        }
    }

    @Test
    fun `GIVEN account state is authentication problem WHEN navigate to Mozilla account action is dispatched THEN dispatch navigate action to Mozilla account problem`() = runTest {
        val store = createStore()
        val accountState = AuthenticationProblem
        val accesspoint = MenuAccessPoint.Home
        val directionsSlot = slot<NavDirections>()

        store.dispatch(
            MenuAction.Navigate.MozillaAccount(
                accountState = accountState,
                accesspoint = accesspoint,
            ),
        )

        verify {
            navController.navigate(
                capture(directionsSlot),
                null,
            )
        }

        val directions = directionsSlot.captured
        val directionsBundle = directions.arguments

        assertEquals(R.id.action_global_accountProblemFragment, directions.actionId)
        assertEquals(
            FenixFxAEntryPoint.HomeMenu,
            directionsBundle.getParcelable("entrypoint", FenixFxAEntryPoint::class.java),
        )
    }

    @Test
    fun `GIVEN account state is not authenticated WHEN navigate to Mozilla account action is dispatched THEN dispatch navigate action to turn on sync`() = runTest {
        val store = createStore()
        val accountState = NotAuthenticated
        val accesspoint = MenuAccessPoint.Home

        store.dispatch(
            MenuAction.Navigate.MozillaAccount(
                accountState = accountState,
                accesspoint = accesspoint,
            ),
        )

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalTurnOnSync(
                    entrypoint = FenixFxAEntryPoint.HomeMenu,
                ),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to settings action is dispatched THEN navigate to settings`() = runTest {
        val store = createStore()
        store.dispatch(MenuAction.Navigate.Settings)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalSettingsFragment(),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to bookmarks action is dispatched THEN navigate to bookmarks`() = runTest {
        val store = createStore()
        store.dispatch(MenuAction.Navigate.Bookmarks)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalBookmarkFragment(BookmarkRoot.Mobile.id),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to installed addons action is dispatched THEN navigate to installed addons fragment`() = runTest {
        val store = createStore()
        val addon = Addon(id = "ext1")

        store.dispatch(
            MenuAction.Navigate.InstalledAddonDetails(
                addon = addon,
            ),
        )

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmentToInstalledAddonDetailsFragment(addon),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to history action is dispatched THEN navigate to history`() = runTest {
        val store = createStore()
        store.dispatch(MenuAction.Navigate.History)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalHistoryFragment(),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to downloads action is dispatched THEN navigate to downloads`() = runTest {
        val store = createStore()
        store.dispatch(MenuAction.Navigate.Downloads)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalDownloadsFragment(),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to passwords action is dispatched THEN navigate to passwords`() = runTest {
        val store = createStore()
        store.dispatch(MenuAction.Navigate.Passwords)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmentToLoginsListFragment(),
                null,
            )
        }
    }

    @Test
    fun `GIVEN current site is installable WHEN navigate to add to home screen is dispatched THEN invoke add to home screen use case`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
            onDismiss = { dismissWasCalled = true },
        )

        every { webAppUseCases.isInstallable() } returns true

        store.dispatch(MenuAction.Navigate.AddToHomeScreen)

        coVerify(exactly = 1) { webAppUseCases.addToHomescreen() }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN current site is not installable WHEN navigate to add to home screen is dispatched THEN navigate to create home screen shortcut fragment`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
        )

        every { webAppUseCases.isInstallable() } returns false

        store.dispatch(MenuAction.Navigate.AddToHomeScreen)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmentToCreateShortcutFragment(),
                navOptions = NavOptions.Builder()
                    .setPopUpTo(R.id.browserFragment, false)
                    .build(),
            )
        }
    }

    @Test
    fun `GIVEN there are existing tab collections WHEN navigate to save to collection action is dispatched THEN navigate to select collection creation`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
        )

        val directionsSlot = slot<NavDirections>()
        val optionsSlot = slot<NavOptions>()
        store.dispatch(MenuAction.Navigate.SaveToCollection(hasCollection = true))

        verify {
            navController.navigate(
                capture(directionsSlot),
                capture(optionsSlot),
            )
        }

        val directions = directionsSlot.captured
        val directionsBundle = directions.arguments

        assertEquals(R.id.action_global_collectionCreationFragment, directions.actionId)
        assertNotNull(directionsBundle)
        assertArrayEquals(arrayOf(tab.id), directionsBundle.getStringArray("tabIds"))
        assertArrayEquals(arrayOf(tab.id), directionsBundle.getStringArray("selectedTabIds"))
        assertEquals(
            SaveCollectionStep.SelectCollection,
            directionsBundle.getParcelable("saveCollectionStep", SaveCollectionStep::class.java),
        )

        assertEquals(R.id.browserFragment, optionsSlot.captured.popUpToId)
        assertFalse(optionsSlot.captured.isPopUpToInclusive())
    }

    @Test
    fun `GIVEN there are no existing tab collections WHEN navigate to save to collection action is dispatched THEN navigate to new collection creation`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
        )

        val directionsSlot = slot<NavDirections>()
        val optionsSlot = slot<NavOptions>()

        store.dispatch(MenuAction.Navigate.SaveToCollection(hasCollection = false))

        verify {
            navController.navigate(
                capture(directionsSlot),
                capture(optionsSlot),
            )
        }

        val directions = directionsSlot.captured
        val directionsBundle = directions.arguments

        assertEquals(R.id.action_global_collectionCreationFragment, directions.actionId)
        assertNotNull(directionsBundle)
        assertArrayEquals(arrayOf(tab.id), directionsBundle.getStringArray("tabIds"))
        assertArrayEquals(arrayOf(tab.id), directionsBundle.getStringArray("selectedTabIds"))
        assertEquals(
            SaveCollectionStep.NameCollection,
            directionsBundle.getParcelable("saveCollectionStep", SaveCollectionStep::class.java),
        )

        assertEquals(R.id.browserFragment, optionsSlot.captured.popUpToId)
        assertFalse(optionsSlot.captured.isPopUpToInclusive())

       /* verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalCollectionCreationFragment(
                    tabIds = arrayOf(tab.id),
                    selectedTabIds = arrayOf(tab.id),
                    saveCollectionStep = SaveCollectionStep.NameCollection,
                ),
                null,
            )
        }*/
    }

    @Test
    fun `WHEN navigate to edit bookmark action is dispatched THEN navigate to bookmark edit fragment`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                    bookmarkState = BookmarkState(
                        guid = BookmarkRoot.Mobile.id,
                        isBookmarked = true,
                    ),
                ),
            ),
        )

        store.dispatch(MenuAction.Navigate.EditBookmark)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalBookmarkEditFragment(
                    guidToEdit = BookmarkRoot.Mobile.id,
                    requiresSnackbarPaddingForToolbar = true,
                ),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to translate action is dispatched THEN navigate to translation dialog`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
        )

        store.dispatch(MenuAction.Navigate.Translate)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmentToTranslationsDialogFragment(),
                navOptions = NavOptions.Builder()
                    .setPopUpTo(R.id.browserFragment, false)
                    .build(),
            )
        }
    }

    @Test
    fun `GIVEN reader view is active WHEN navigate to share action is dispatched THEN navigate to share sheet`() = runTest {
        val title = "Mozilla"
        val readerUrl = "moz-extension://1234"
        val activeUrl = "https://mozilla.org"
        val readerTab = createTab(
            url = readerUrl,
            readerState = ReaderState(active = true, activeUrl = activeUrl),
            title = title,
        )
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = readerTab,
                ),
            ),
        )

        val directionsSlot = slot<NavDirections>()
        val optionsSlot = slot<NavOptions>()
        store.dispatch(MenuAction.Navigate.Share)

        verify {
            navController.navigate(
                capture(directionsSlot),
                capture(optionsSlot),
            )
        }

        val directions = directionsSlot.captured
        val directionsBundle = directions.arguments
        val shareData = directionsBundle.getParcelableArray("data", ShareData::class.java)?.firstOrNull()

        assertEquals(R.id.action_global_shareFragment, directions.actionId)
        assertNotNull(directionsBundle)
        assertEquals(readerTab.id, directionsBundle.getString("sessionId"))
        assertTrue(directionsBundle.getBoolean("showPage"))
        assertNotNull(shareData)
        assertEquals(activeUrl, shareData?.url)
        assertEquals(title, shareData?.title)

        assertEquals(R.id.browserFragment, optionsSlot.captured.popUpToId)
        assertFalse(optionsSlot.captured.isPopUpToInclusive())
    }

    @Test
    fun `GIVEN reader view is inactive WHEN navigate to share action is dispatched THEN navigate to share sheet`() = runTest {
        val url = "https://www.mozilla.org"
        val title = "Mozilla"
        val tab = createTab(
            url = url,
            title = title,
        )
        val store = createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
        )

        val directionsSlot = slot<NavDirections>()
        val optionsSlot = slot<NavOptions>()

        store.dispatch(MenuAction.Navigate.Share)

        verify {
            navController.navigate(
                capture(directionsSlot),
                capture(optionsSlot),
            )
        }

        val directions = directionsSlot.captured
        val directionsBundle = directions.arguments
        val shareData = directionsBundle.getParcelableArray("data", ShareData::class.java)?.firstOrNull()

        assertEquals(R.id.action_global_shareFragment, directions.actionId)
        assertNotNull(directionsBundle)
        assertEquals(tab.id, directionsBundle.getString("sessionId"))
        assertTrue(directionsBundle.getBoolean("showPage"))
        assertNotNull(shareData)
        assertEquals(url, shareData?.url)
        assertEquals(title, shareData?.title)

        assertEquals(R.id.browserFragment, optionsSlot.captured.popUpToId)
        assertFalse(optionsSlot.captured.isPopUpToInclusive())
    }

    @Test
    fun `GIVEN the current tab is a local PDF WHEN share menu item is pressed THEN trigger ShareResourceAction`() = runTest {
        val id = "1"
        val url = "content://pdf.pdf"
        val tab = createTab(
            url = url,
            id = id,
        )
        val browserStore = spyk(BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = id)))
        val store = createStore(
            browserStore = browserStore,
            customTab = null,
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
        )

        store.dispatch(MenuAction.Navigate.Share)

        verify {
            browserStore.dispatch(
                ShareResourceAction.AddShareAction(
                    id,
                    ShareResourceState.LocalResource(url),
                ),
            )
        }
    }

    @Test
    fun `GIVEN the current tab is a custom tab WHEN navigate to share action is dispatched THEN navigate to share sheet`() = runTest {
        val url = "https://www.mozilla.org"
        val title = "Mozilla"
        val customTab = CustomTabSessionState(
            content = ContentState(
                url = url,
                title = title,
            ),
            config = CustomTabConfig(),
        )
        val store = createStore(
            customTab = customTab,
            menuState = MenuState(),
        )

        val directionsSlot = slot<NavDirections>()
        val optionsSlot = slot<NavOptions>()
        store.dispatch(MenuAction.Navigate.Share)

        verify {
            navController.navigate(
                capture(directionsSlot),
                capture(optionsSlot),
            )
        }

        val directions = directionsSlot.captured
        val directionsBundle = directions.arguments
        val shareData = directionsBundle.getParcelableArray("data", ShareData::class.java)?.firstOrNull()

        assertEquals(R.id.action_global_shareFragment, directions.actionId)
        assertNotNull(directionsBundle)
        assertEquals(customTab.id, directionsBundle.getString("sessionId"))
        assertTrue(directionsBundle.getBoolean("showPage"))
        assertNotNull(shareData)
        assertEquals(url, shareData?.url)
        assertEquals(title, shareData?.title)

        assertEquals(R.id.externalAppBrowserFragment, optionsSlot.captured.popUpToId)
        assertFalse(optionsSlot.captured.isPopUpToInclusive())
    }

    @Test
    fun `WHEN navigate to manage extensions action is dispatched THEN navigate to the extensions management`() = runTest {
        val store = createStore()
        store.dispatch(MenuAction.Navigate.ManageExtensions)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionGlobalAddonsManagementFragment(),
                null,
            )
        }
    }

    @Test
    fun `WHEN navigate to discover more extensions action is dispatched THEN navigate to the AMO page`() = runTest {
        var params: BrowserNavigationParams? = null
        val store = createStore(
            openToBrowser = {
                params = it
            },
        )

        store.dispatch(MenuAction.Navigate.DiscoverMoreExtensions)

        assertEquals(AMO_HOMEPAGE_FOR_ANDROID, params?.url)
    }

    @Test
    fun `WHEN navigate to addon details is dispatched THEN navigate to the addon details`() = runTest {
        val addon = Addon(id = "ext1")
        val store = createStore()
        store.dispatch(MenuAction.Navigate.AddonDetails(addon = addon))

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmenToAddonDetailsFragment(addon = addon),
                null,
            )
        }
    }

    @Test
    fun `GIVEN the user is on a tab and telemetry is enabled WHEN the user clicks on the web compat button THEN navigate to the web compat reporter feature`() = runTest {
        every { settings.isTelemetryEnabled } returns true
        val expectedTabUrl = "www.mozilla.org"
        createStore(
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = createTab(
                        url = expectedTabUrl,
                    ),
                ),
            ),
        ).dispatch(MenuAction.Navigate.WebCompatReporter)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmentToWebCompatReporterFragment(tabUrl = expectedTabUrl),
                null,
            )
        }
    }

    @Test
    fun `GIVEN the user is on a tab and telemetry is disabled WHEN the user clicks on the web compat button THEN send WebCompat info and open browser`() = runTest {
        every { settings.isTelemetryEnabled } returns false
        var params: BrowserNavigationParams? = null
        val expectedTabUrl = "www.mozilla.org"

        var sendMoreWebCompatInfoCalled = false

        val webCompatReporterMoreInfoSender = object : WebCompatReporterMoreInfoSender {
            override suspend fun sendMoreWebCompatInfo(
                reason: WebCompatReporterState.BrokenSiteReason?,
                problemDescription: String?,
                enteredUrl: String?,
                tabUrl: String?,
                engineSession: EngineSession?,
            ) {
                sendMoreWebCompatInfoCalled = true
            }
        }

        val store = createStore(
            customTab = createCustomTab(
                url = expectedTabUrl,
            ),
            webCompatReporterMoreInfoSender = webCompatReporterMoreInfoSender,
            openToBrowser = {
                params = it
            },
        )

        store.dispatch(MenuAction.Navigate.WebCompatReporter)

        assertTrue(sendMoreWebCompatInfoCalled)

        assertEquals("$WEB_COMPAT_REPORTER_URL$expectedTabUrl", params?.url)
    }

    @Test
    fun `GIVEN the user is on a custom tab WHEN the user clicks on the web compat button THEN navigate to the web compat reporter feature`() = runTest {
        every { settings.isTelemetryEnabled } returns true
        val expectedTabUrl = "www.mozilla.org"
        createStore(
            customTab = createCustomTab(
                url = expectedTabUrl,
            ),
        ).dispatch(MenuAction.Navigate.WebCompatReporter)

        verify {
            navController.navigate(
                MenuDialogFragmentDirections.actionMenuDialogFragmentToWebCompatReporterFragment(tabUrl = expectedTabUrl),
                null,
            )
        }
    }

    @Test
    fun `GIVEN view history is true WHEN navigate back action is dispatched THEN navigate to tab history dialog fragment`() = runTest {
        val store = createStore(
            menuState = MenuState(
                customTabSessionId = "0",
            ),
        )

        store.dispatch(MenuAction.Navigate.Back(viewHistory = true))

        verify {
            navController.navigate(
                directions = MenuDialogFragmentDirections.actionGlobalTabHistoryDialogFragment(
                    activeSessionId = store.state.customTabSessionId,
                ),
                navOptions = NavOptions.Builder()
                    .setPopUpTo(R.id.browserFragment, false)
                    .build(),
            )
        }
    }

    @Test
    fun `GIVEN user is on a tab and view history is false WHEN navigate back action is dispatched THEN navigate back`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = null,
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Back(viewHistory = false))

        verify {
            sessionUseCases.goBack.invoke(tab.id)
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN user is on a custom tab and view history is false WHEN navigate back action is dispatched THEN navigate back`() = runTest {
        val customTab = createCustomTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = customTab,
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Back(viewHistory = false))

        verify {
            sessionUseCases.goBack.invoke(customTab.id)
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN view history is true WHEN navigate forward action is dispatched THEN navigate to tab history dialog fragment`() = runTest {
        val store = createStore(
            menuState = MenuState(
                customTabSessionId = "0",
            ),
        )

        store.dispatch(MenuAction.Navigate.Forward(viewHistory = true))

        verify {
            navController.navigate(
                directions = MenuDialogFragmentDirections.actionGlobalTabHistoryDialogFragment(
                    activeSessionId = store.state.customTabSessionId,
                ),
                navOptions = NavOptions.Builder()
                    .setPopUpTo(R.id.browserFragment, false)
                    .build(),
            )
        }
    }

    @Test
    fun `GIVEN user is on a tab and view history is false WHEN navigate forward action is dispatched THEN navigate forward`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = null,
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Forward(viewHistory = false))

        verify {
            sessionUseCases.goForward.invoke(tab.id)
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN user is on a custom tab and view history is false WHEN navigate forward action is dispatched THEN navigate forward`() = runTest {
        val customTab = createCustomTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = customTab,
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Forward(viewHistory = false))

        verify {
            sessionUseCases.goForward.invoke(customTab.id)
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN bypass cache is true WHEN navigate reload action is dispatched THEN reload with bypass cache flag`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = null,
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Reload(bypassCache = true))

        verify {
            sessionUseCases.reload.invoke(
                tabId = tab.id,
                flags = LoadUrlFlags.select(LoadUrlFlags.BYPASS_CACHE),
            )
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN user is on a tab and bypass cache is false WHEN navigate reload action is dispatched THEN reload with no flags`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = null,
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Reload(bypassCache = false))

        verify {
            sessionUseCases.reload.invoke(
                tabId = tab.id,
                flags = LoadUrlFlags.none(),
            )
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN user is on a custom tab and bypass cache is false WHEN navigate reload action is dispatched THEN reload with no flags`() = runTest {
        val customTab = createCustomTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = customTab,
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Reload(bypassCache = false))

        verify {
            sessionUseCases.reload.invoke(
                tabId = customTab.id,
                flags = LoadUrlFlags.none(),
            )
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN user is on a tab WHEN navigate stop action is dispatched THEN stop loading the page`() = runTest {
        val tab = createTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = null,
            menuState = MenuState(
                browserMenuState = BrowserMenuState(
                    selectedTab = tab,
                ),
            ),
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Stop)

        verify {
            sessionUseCases.stopLoading.invoke(tab.id)
        }
        assertTrue(dismissWasCalled)
    }

    @Test
    fun `GIVEN user is on a custom tab WHEN navigate stop action is dispatched THEN stop loading the page`() = runTest {
        val customTab = createCustomTab(url = "https://www.mozilla.org")
        var dismissWasCalled = false
        val store = createStore(
            customTab = customTab,
            onDismiss = { dismissWasCalled = true },
        )

        store.dispatch(MenuAction.Navigate.Stop)

        verify {
            sessionUseCases.stopLoading.invoke(customTab.id)
        }
        assertTrue(dismissWasCalled)
    }

    private fun createStore(
        browserStore: BrowserStore = createBrowserStore(),
        customTab: CustomTabSessionState? = null,
        menuState: MenuState = MenuState(),
        webCompatReporterMoreInfoSender: WebCompatReporterMoreInfoSender = FakeWebCompatReporterMoreInfoSender(),
        openToBrowser: (params: BrowserNavigationParams) -> Unit = {},
        onDismiss: suspend () -> Unit = {},
    ) = MenuStore(
        initialState = menuState,
        middleware = listOf(
            MenuNavigationMiddleware(
                browserStore = browserStore,
                navController = navController,
                openToBrowser = openToBrowser,
                sessionUseCases = sessionUseCases,
                webAppUseCases = webAppUseCases,
                settings = settings,
                onDismiss = onDismiss,
                scope = scope,
                customTab = customTab,
                webCompatReporterMoreInfoSender = webCompatReporterMoreInfoSender,
            ),
        ),
    )

    private fun createBrowserStore(): BrowserStore {
        val tab = createTab(
            url = "https://www.mozilla.org",
            id = "test-tab",
        )

        return BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tab.id,
            ),
        )
    }
}
