/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.pwa.feature

import androidx.browser.customtabs.CustomTabsService.RELATION_HANDLE_ALL_URLS
import androidx.browser.customtabs.CustomTabsSessionToken
import androidx.core.net.toUri
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.state.CustomTabConfig
import mozilla.components.browser.state.state.CustomTabSessionState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.manifest.WebAppManifest
import mozilla.components.feature.customtabs.store.CustomTabState
import mozilla.components.feature.customtabs.store.CustomTabsServiceState
import mozilla.components.feature.customtabs.store.CustomTabsServiceStore
import mozilla.components.feature.customtabs.store.OriginRelationPair
import mozilla.components.feature.customtabs.store.ValidateRelationshipAction
import mozilla.components.feature.customtabs.store.VerificationStatus
import mozilla.components.support.test.mock
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WebAppHideToolbarFeatureTest {

    private val customTabId = "custom-id"
    private var toolbarVisible = false
    private val testDispatcher = StandardTestDispatcher()
    private val testScope = TestScope(testDispatcher)

    @Before
    fun setup() {
        toolbarVisible = false
    }

    @Test
    fun `hides toolbar immediately based on PWA manifest`() = runTest(testDispatcher) {
        val tab = CustomTabSessionState(
            id = customTabId,
            content = ContentState("https://mozilla.org"),
            config = CustomTabConfig(),
        )
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))

        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            tabId = tab.id,
            manifest = mockManifest("https://mozilla.org"),
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `hides toolbar immediately based on trusted origins`() = runTest(testDispatcher) {
        val token = mock<CustomTabsSessionToken>()
        val tab = CustomTabSessionState(
            id = customTabId,
            content = ContentState("https://mozilla.org"),
            config = CustomTabConfig(sessionToken = token),
        )
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))
        val customTabsStore = CustomTabsServiceStore(
            CustomTabsServiceState(
                tabs = mapOf(token to mockCustomTabState("https://firefox.com", "https://mozilla.org")),
            ),
        )

        val feature = WebAppHideToolbarFeature(
            store,
            customTabsStore,
            tabId = tab.id,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `does not hide toolbar for a normal tab`() = runTest(testDispatcher) {
        val tab = createTab("https://mozilla.org")
        val store = BrowserStore(BrowserState(tabs = listOf(tab)))

        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            tabId = tab.id,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)
    }

    @Test
    fun `does not hide toolbar for an invalid tab`() = runTest(testDispatcher) {
        val store = BrowserStore()

        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)
    }

    @Test
    fun `does hide toolbar for a normal tab in fullscreen`() = runTest(testDispatcher) {
        val tab = TabSessionState(
            content = ContentState(
                url = "https://mozilla.org",
                fullScreen = true,
            ),
        )
        val store = BrowserStore(BrowserState(tabs = listOf(tab)))

        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            tabId = tab.id,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `does hide toolbar for a normal tab in PIP`() = runTest(testDispatcher) {
        val tab = TabSessionState(
            content = ContentState(
                url = "https://mozilla.org",
                pictureInPictureEnabled = true,
            ),
        )
        val store = BrowserStore(BrowserState(tabs = listOf(tab)))

        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            tabId = tab.id,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `does not hide toolbar if origin is not trusted`() = runTest(testDispatcher) {
        val token = mock<CustomTabsSessionToken>()
        val tab = createCustomTab(
            id = customTabId,
            url = "https://firefox.com",
            config = CustomTabConfig(sessionToken = token),
        )
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))
        val customTabsStore = CustomTabsServiceStore(
            CustomTabsServiceState(
                tabs = mapOf(token to mockCustomTabState("https://mozilla.org")),
            ),
        )

        val feature = WebAppHideToolbarFeature(
            store,
            customTabsStore,
            tabId = tab.id,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)
    }

    @Test
    fun `onUrlChanged hides toolbar if URL is in origin`() = runTest(testDispatcher) {
        val token = mock<CustomTabsSessionToken>()
        val tab = createCustomTab(
            id = customTabId,
            url = "https://mozilla.org",
            config = CustomTabConfig(sessionToken = token),
        )
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))
        val customTabsStore = CustomTabsServiceStore(
            CustomTabsServiceState(
                tabs = mapOf(token to mockCustomTabState("https://mozilla.com", "https://m.mozilla.com")),
            ),
        )
        val feature = WebAppHideToolbarFeature(
            store,
            customTabsStore,
            tabId = customTabId,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.com/example-page"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://firefox.com/out-of-scope"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.com/back-in-scope"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://m.mozilla.com/second-origin"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `onUrlChanged hides toolbar if URL is in scope`() = runTest(testDispatcher) {
        val tab = createCustomTab(id = customTabId, url = "https://mozilla.org")
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))
        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            tabId = customTabId,
            manifest = mockManifest("https://mozilla.github.io/my-app/"),
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.github.io/my-app/"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://firefox.com/out-of-scope"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.github.io/my-app-almost-in-scope"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.github.io/my-app/sub-page"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `onUrlChanged hides toolbar if URL is in ambiguous scope`() = runTest(testDispatcher) {
        val tab = createCustomTab(id = customTabId, url = "https://mozilla.org")
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))
        val feature = WebAppHideToolbarFeature(
            store,
            CustomTabsServiceStore(),
            tabId = customTabId,
            manifest = mockManifest("https://mozilla.github.io/prefix"),
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.github.io/prefix/"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)

        store.dispatch(
            ContentAction.UpdateUrlAction(customTabId, "https://mozilla.github.io/prefix-of/resource.html"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    @Test
    fun `onTrustedScopesChange hides toolbar if URL is in origin`() = runTest(testDispatcher) {
        val token = mock<CustomTabsSessionToken>()
        val tab = createCustomTab(
            id = customTabId,
            url = "https://mozilla.com/example-page",
            config = CustomTabConfig(sessionToken = token),
        )
        val store = BrowserStore(BrowserState(customTabs = listOf(tab)))
        val customTabsStore = CustomTabsServiceStore(
            CustomTabsServiceState(
                tabs = mapOf(token to mockCustomTabState()),
            ),
        )
        val feature = WebAppHideToolbarFeature(
            store,
            customTabsStore,
            tabId = customTabId,
            scope = testScope,
        ) {
            toolbarVisible = it
        }
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        customTabsStore.dispatch(
            ValidateRelationshipAction(
                token,
                RELATION_HANDLE_ALL_URLS,
                "https://m.mozilla.com".toUri(),
                VerificationStatus.PENDING,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(toolbarVisible)

        customTabsStore.dispatch(
            ValidateRelationshipAction(
                token,
                RELATION_HANDLE_ALL_URLS,
                "https://mozilla.com".toUri(),
                VerificationStatus.PENDING,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(toolbarVisible)
    }

    private fun mockCustomTabState(vararg origins: String) = CustomTabState(
        relationships = origins.map { origin ->
            OriginRelationPair(origin.toUri(), RELATION_HANDLE_ALL_URLS) to VerificationStatus.PENDING
        }.toMap(),
    )

    private fun mockManifest(scope: String) = WebAppManifest(
        name = "Mock",
        startUrl = scope,
        scope = scope,
        display = WebAppManifest.DisplayMode.STANDALONE,
    )
}
