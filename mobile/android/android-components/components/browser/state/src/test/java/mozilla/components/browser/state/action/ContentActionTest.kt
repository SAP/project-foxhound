/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import android.graphics.Bitmap
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.AutoPlayAudibleBlockingAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.AutoPlayAudibleChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.AutoPlayInAudibleBlockingAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.AutoPlayInAudibleChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.CameraChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.LocalDeviceAccessChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.LocalNetworkAccessChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.LocationChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.MediaKeySystemAccesChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.MicrophoneChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.NotificationChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.PersistentStorageChangedAction
import mozilla.components.browser.state.action.ContentAction.UpdatePermissionHighlightsStateAction.Reset
import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.findCustomTab
import mozilla.components.browser.state.state.AppIntentState
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.LoadRequestState
import mozilla.components.browser.state.state.SecurityInfo
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.browser.state.state.content.FindResultState
import mozilla.components.browser.state.state.content.HistoryState
import mozilla.components.browser.state.state.content.PermissionHighlightsState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.concept.engine.HitResult
import mozilla.components.concept.engine.history.HistoryItem
import mozilla.components.concept.engine.manifest.WebAppManifest
import mozilla.components.concept.engine.permission.Permission.AppLocationCoarse
import mozilla.components.concept.engine.permission.Permission.ContentGeoLocation
import mozilla.components.concept.engine.permission.PermissionRequest
import mozilla.components.concept.engine.prompt.PromptRequest
import mozilla.components.concept.engine.window.WindowRequest
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class ContentActionTest {
    private lateinit var state: BrowserState

    private lateinit var tabId: String
    private lateinit var otherTabId: String

    private val tab: TabSessionState
        get() = state.tabs.find { it.id == tabId }!!

    private val otherTab: TabSessionState
        get() = state.tabs.find { it.id == otherTabId }!!

    @Before
    fun setUp() {
        state = BrowserState(
            tabs = listOf(
                createTab(url = "https://www.mozilla.org").also {
                    tabId = it.id
                },
                createTab(url = "https://www.firefox.com").also {
                    otherTabId = it.id
                },
            ),
        )
    }

    @Test
    fun `UpdateUrlAction updates URL`() {
        val newUrl = "https://www.example.org"

        assertNotEquals(newUrl, tab.content.url)
        assertNotEquals(newUrl, otherTab.content.url)

        state = BrowserStateReducer.reduce(state, ContentAction.UpdateUrlAction(tab.id, newUrl))

        assertEquals(newUrl, tab.content.url)
        assertNotEquals(newUrl, otherTab.content.url)
    }

    @Test
    fun `UpdateUrlAction clears icon`() {
        val icon = spy(Bitmap::class.java)

        assertNotEquals(icon, tab.content.icon)
        assertNotEquals(icon, otherTab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateIconAction(tab.id, tab.content.url, icon),
        )

        assertEquals(icon, tab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateUrlAction(tab.id, "https://www.example.org"),
        )

        assertNull(tab.content.icon)
    }

    @Test
    fun `UpdateUrlAction does not clear icon if host is the same`() {
        val icon = spy(Bitmap::class.java)

        assertNotEquals(icon, tab.content.icon)
        assertNotEquals(icon, otherTab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateIconAction(tab.id, tab.content.url, icon),
        )

        assertEquals(icon, tab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateUrlAction(tab.id, "https://www.mozilla.org/firefox"),
        )

        assertEquals(icon, tab.content.icon)
    }

    @Test
    fun `WHEN UpdateUrlAction is dispatched by user gesture THEN the search terms are cleared`() {
        val searchTerms = "Firefox"
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateSearchTermsAction(tab.id, searchTerms),
        )

        assertEquals(searchTerms, tab.content.searchTerms)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateUrlAction(tab.id, "https://www.mozilla.org", false),
        )

        assertEquals(searchTerms, tab.content.searchTerms)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateUrlAction(tab.id, "https://www.mozilla.org/firefox", true),
        )

        assertEquals("", tab.content.searchTerms)
    }

    @Test
    fun `UpdateLoadingStateAction updates loading state`() {
        assertFalse(tab.content.loading)
        assertFalse(otherTab.content.loading)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateLoadingStateAction(tab.id, true),
        )

        assertTrue(tab.content.loading)
        assertFalse(otherTab.content.loading)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateLoadingStateAction(tab.id, false),
        )

        assertFalse(tab.content.loading)
        assertFalse(otherTab.content.loading)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateLoadingStateAction(tab.id, true),
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateLoadingStateAction(otherTab.id, true),
        )

        assertTrue(tab.content.loading)
        assertTrue(otherTab.content.loading)
    }

    @Test
    fun `UpdateRefreshCanceledStateAction updates refreshCanceled state`() {
        assertFalse(tab.content.refreshCanceled)
        assertFalse(otherTab.content.refreshCanceled)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateRefreshCanceledStateAction(tab.id, true),
        )

        assertTrue(tab.content.refreshCanceled)
        assertFalse(otherTab.content.refreshCanceled)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateRefreshCanceledStateAction(tab.id, false),
        )

        assertFalse(tab.content.refreshCanceled)
        assertFalse(otherTab.content.refreshCanceled)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateRefreshCanceledStateAction(tab.id, true),
        )
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateRefreshCanceledStateAction(otherTab.id, true),
        )

        assertTrue(tab.content.refreshCanceled)
        assertTrue(otherTab.content.refreshCanceled)
    }

    @Test
    fun `UpdateTitleAction updates title`() {
        val newTitle = "This is a title"

        assertNotEquals(newTitle, tab.content.title)
        assertNotEquals(newTitle, otherTab.content.title)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateTitleAction(tab.id, newTitle),
        )

        assertEquals(newTitle, tab.content.title)
        assertNotEquals(newTitle, otherTab.content.title)
    }

    @Test
    fun `UpdatePreviewImageAction updates previewImageUrl state`() {
        val newPreviewImageUrl = "https://test.com/og-image-url"

        assertNotEquals(newPreviewImageUrl, tab.content.previewImageUrl)
        assertNotEquals(newPreviewImageUrl, otherTab.content.previewImageUrl)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdatePreviewImageAction(tab.id, newPreviewImageUrl),
        )

        assertEquals(newPreviewImageUrl, tab.content.previewImageUrl)
        assertNotEquals(newPreviewImageUrl, otherTab.content.previewImageUrl)
    }

    @Test
    fun `UpdateProgressAction updates progress`() {
        assertEquals(0, tab.content.progress)
        assertEquals(0, otherTab.content.progress)

        state = BrowserStateReducer.reduce(state, ContentAction.UpdateProgressAction(tab.id, 75))

        assertEquals(75, tab.content.progress)
        assertEquals(0, otherTab.content.progress)

        state =
            BrowserStateReducer.reduce(state, ContentAction.UpdateProgressAction(otherTab.id, 25))
        state = BrowserStateReducer.reduce(state, ContentAction.UpdateProgressAction(tab.id, 85))

        assertEquals(85, tab.content.progress)
        assertEquals(25, otherTab.content.progress)
    }

    @Test
    fun `UpdateSearchTermsAction updates URL`() {
        val searchTerms = "Hello World"

        assertNotEquals(searchTerms, tab.content.searchTerms)
        assertNotEquals(searchTerms, otherTab.content.searchTerms)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateSearchTermsAction(tab.id, searchTerms),
        )

        assertEquals(searchTerms, tab.content.searchTerms)
        assertNotEquals(searchTerms, otherTab.content.searchTerms)
    }

    @Test
    fun `UpdateSecurityInfo updates securityInfo`() {
        val newSecurityInfo = SecurityInfo.from(true, "mozilla.org", "The Mozilla Team")

        assertNotEquals(newSecurityInfo, tab.content.securityInfo)
        assertNotEquals(newSecurityInfo, otherTab.content.securityInfo)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateSecurityInfoAction(tab.id, newSecurityInfo),
        )

        assertEquals(newSecurityInfo, tab.content.securityInfo)
        assertNotEquals(newSecurityInfo, otherTab.content.securityInfo)

        val tabSecurityInfo = (tab.content.securityInfo as SecurityInfo.Secure)
        assertEquals("mozilla.org", tabSecurityInfo.host)
        assertEquals("The Mozilla Team", tabSecurityInfo.issuer)
        assertNull(tabSecurityInfo.certificate)
    }

    @Test
    fun `UpdateIconAction updates icon`() {
        val icon = spy(Bitmap::class.java)

        assertNotEquals(icon, tab.content.icon)
        assertNotEquals(icon, otherTab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateIconAction(tab.id, tab.content.url, icon),
        )

        assertEquals(icon, tab.content.icon)
        assertNotEquals(icon, otherTab.content.icon)
    }

    @Test
    fun `UpdateIconAction does not update icon if page URL is different`() {
        val icon = spy(Bitmap::class.java)

        assertNotEquals(icon, tab.content.icon)
        assertNotEquals(icon, otherTab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateIconAction(tab.id, "https://different.example.org", icon),
        )

        assertNull(tab.content.icon)
    }

    @Test
    fun `RemoveIconAction removes icon`() {
        val icon = spy(Bitmap::class.java)

        assertNotEquals(icon, tab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateIconAction(tab.id, tab.content.url, icon),
        )

        assertEquals(icon, tab.content.icon)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.RemoveIconAction(tab.id),
        )

        assertNull(tab.content.icon)
    }

    @Test
    fun `Updating custom tab`() {
        val customTab = createCustomTab("https://getpocket.com")
        val otherCustomTab = createCustomTab("https://www.google.com")

        state =
            BrowserStateReducer.reduce(state, CustomTabListAction.AddCustomTabAction(customTab))
        state = BrowserStateReducer.reduce(
            state,
            CustomTabListAction.AddCustomTabAction(otherCustomTab),
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateUrlAction(customTab.id, "https://www.example.org"),
        )
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateTitleAction(customTab.id, "I am a custom tab"),
        )

        val updatedCustomTab = state.findCustomTab(customTab.id)!!
        val updatedOtherCustomTab = state.findCustomTab(otherCustomTab.id)!!

        assertEquals("https://www.example.org", updatedCustomTab.content.url)
        assertNotEquals("https://www.example.org", updatedOtherCustomTab.content.url)
        assertNotEquals("https://www.example.org", tab.content.url)
        assertNotEquals("https://www.example.org", otherTab.content.url)

        assertEquals("I am a custom tab", updatedCustomTab.content.title)
        assertNotEquals("I am a custom tab", updatedOtherCustomTab.content.title)
        assertNotEquals("I am a custom tab", tab.content.title)
        assertNotEquals("I am a custom tab", otherTab.content.title)
    }

    @Test
    fun `UpdateDownloadAction updates download`() {
        assertNull(tab.content.download)

        val download1 = DownloadState(
            url = "https://www.mozilla.org",
            sessionId = tab.id,
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateDownloadAction(tab.id, download1),
        )

        assertEquals(download1.url, tab.content.download?.url)
        assertEquals(download1.sessionId, tab.content.download?.sessionId)

        val download2 = DownloadState(
            url = "https://www.wikipedia.org",
            sessionId = tab.id,
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateDownloadAction(tab.id, download2),
        )

        assertEquals(download2.url, tab.content.download?.url)
        assertEquals(download2.sessionId, tab.content.download?.sessionId)
    }

    @Test
    fun `ConsumeDownloadAction removes download`() {
        val download = DownloadState(
            id = "1337",
            url = "https://www.mozilla.org",
            sessionId = tab.id,
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateDownloadAction(tab.id, download),
        )

        assertEquals(download, tab.content.download)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ConsumeDownloadAction(tab.id, downloadId = "1337"),
        )

        assertNull(tab.content.download)
    }

    @Test
    fun `CancelDownloadAction removes download`() {
        val download = DownloadState(
            id = "1337",
            url = "https://www.mozilla.org",
            sessionId = tab.id,
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateDownloadAction(tab.id, download),
        )

        assertEquals(download, tab.content.download)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.CancelDownloadAction(tab.id, downloadId = "1337"),
        )

        assertNull(tab.content.download)
    }

    @Test
    fun `ConsumeDownloadAction does not remove download with different id`() {
        val download = DownloadState(
            id = "1337",
            url = "https://www.mozilla.org",
            sessionId = tab.id,
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateDownloadAction(tab.id, download),
        )

        assertEquals(download, tab.content.download)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ConsumeDownloadAction(tab.id, downloadId = "4223"),
        )

        assertNotNull(tab.content.download)
    }

    @Test
    fun `UpdateHitResultAction updates hit result`() {
        assertNull(tab.content.hitResult)

        val hitResult1: HitResult = HitResult.UNKNOWN("file://foo")

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateHitResultAction(tab.id, hitResult1),
        )

        assertEquals(hitResult1, tab.content.hitResult)

        val hitResult2: HitResult = HitResult.UNKNOWN("file://bar")

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateHitResultAction(tab.id, hitResult2),
        )

        assertEquals(hitResult2, tab.content.hitResult)
    }

    @Test
    fun `ConsumeHitResultAction removes hit result`() {
        val hitResult: HitResult = HitResult.UNKNOWN("file://foo")

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateHitResultAction(tab.id, hitResult),
        )

        assertEquals(hitResult, tab.content.hitResult)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ConsumeHitResultAction(tab.id),
        )

        assertNull(tab.content.hitResult)
    }

    @Test
    fun `UpdatePromptRequestAction updates requests`() {
        assertTrue(tab.content.promptRequests.isEmpty())

        val promptRequest1: PromptRequest = mock<PromptRequest.SingleChoice>()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdatePromptRequestAction(tab.id, promptRequest1),
        )

        assertEquals(1, tab.content.promptRequests.size)
        assertEquals(promptRequest1, tab.content.promptRequests[0])

        val promptRequest2: PromptRequest = mock<PromptRequest.MultipleChoice>()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdatePromptRequestAction(tab.id, promptRequest2),
        )

        assertEquals(2, tab.content.promptRequests.size)
        assertEquals(promptRequest1, tab.content.promptRequests[0])
        assertEquals(promptRequest2, tab.content.promptRequests[1])
    }

    @Test
    fun `ConsumePromptRequestAction removes request`() {
        val promptRequest: PromptRequest = mock<PromptRequest.SingleChoice>()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdatePromptRequestAction(tab.id, promptRequest),
        )

        assertEquals(1, tab.content.promptRequests.size)
        assertEquals(promptRequest, tab.content.promptRequests[0])

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ConsumePromptRequestAction(tab.id, promptRequest),
        )

        assertTrue(tab.content.promptRequests.isEmpty())
    }

    @Test
    fun `AddFindResultAction adds result`() {
        assertTrue(tab.content.findResults.isEmpty())

        val result: FindResultState = mock()
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.AddFindResultAction(tab.id, result),
        )

        assertEquals(1, tab.content.findResults.size)
        assertEquals(result, tab.content.findResults.last())

        val result2: FindResultState = mock()
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.AddFindResultAction(tab.id, result2),
        )

        assertEquals(2, tab.content.findResults.size)
        assertEquals(result2, tab.content.findResults.last())
    }

    @Test
    fun `ClearFindResultsAction removes all results`() {
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.AddFindResultAction(tab.id, mock()),
        )

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.AddFindResultAction(tab.id, mock()),
        )

        assertEquals(2, tab.content.findResults.size)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ClearFindResultsAction(tab.id),
        )

        assertTrue(tab.content.findResults.isEmpty())
    }

    @Test
    fun `UpdateWindowRequestAction updates request`() {
        assertNull(tab.content.windowRequest)

        val windowRequest1: WindowRequest = mock()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateWindowRequestAction(tab.id, windowRequest1),
        )

        assertEquals(windowRequest1, tab.content.windowRequest)

        val windowRequest2: WindowRequest = mock()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateWindowRequestAction(tab.id, windowRequest2),
        )

        assertEquals(windowRequest2, tab.content.windowRequest)
    }

    @Test
    fun `ConsumeWindowRequestAction removes request`() {
        val windowRequest: WindowRequest = mock()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateWindowRequestAction(tab.id, windowRequest),
        )

        assertEquals(windowRequest, tab.content.windowRequest)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ConsumeWindowRequestAction(tab.id),
        )

        assertNull(tab.content.windowRequest)
    }

    @Test
    fun `UpdateBackNavigationStateAction updates canGoBack`() {
        assertFalse(tab.content.canGoBack)
        assertFalse(otherTab.content.canGoBack)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateBackNavigationStateAction(tab.id, true),
        )

        assertTrue(tab.content.canGoBack)
        assertFalse(otherTab.content.canGoBack)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateBackNavigationStateAction(tab.id, false),
        )

        assertFalse(tab.content.canGoBack)
        assertFalse(otherTab.content.canGoBack)
    }

    @Test
    fun `UpdateForwardNavigationStateAction updates canGoForward`() {
        assertFalse(tab.content.canGoForward)
        assertFalse(otherTab.content.canGoForward)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateForwardNavigationStateAction(tab.id, true),
        )

        assertTrue(tab.content.canGoForward)
        assertFalse(otherTab.content.canGoForward)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateForwardNavigationStateAction(tab.id, false),
        )

        assertFalse(tab.content.canGoForward)
        assertFalse(otherTab.content.canGoForward)
    }

    @Test
    fun `UpdateWebAppManifestAction updates web app manifest`() {
        val manifest = WebAppManifest(
            name = "Mozilla",
            startUrl = "https://mozilla.org",
        )

        assertNotEquals(manifest, tab.content.webAppManifest)
        assertNotEquals(manifest, otherTab.content.webAppManifest)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateWebAppManifestAction(tab.id, manifest),
        )

        assertEquals(manifest, tab.content.webAppManifest)
        assertNotEquals(manifest, otherTab.content.webAppManifest)
    }

    @Test
    fun `RemoveWebAppManifestAction removes web app manifest`() {
        val manifest = WebAppManifest(
            name = "Mozilla",
            startUrl = "https://mozilla.org",
        )

        assertNotEquals(manifest, tab.content.webAppManifest)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateWebAppManifestAction(tab.id, manifest),
        )

        assertEquals(manifest, tab.content.webAppManifest)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.RemoveWebAppManifestAction(tab.id),
        )

        assertNull(tab.content.webAppManifest)
    }

    @Test
    fun `UpdateHistoryStateAction updates history state`() {
        val historyState = HistoryState(
            items = listOf(
                HistoryItem("Mozilla", "https://mozilla.org"),
                HistoryItem("Firefox", "https://firefox.com"),
            ),
            currentIndex = 1,
        )

        assertNotEquals(historyState, tab.content.history)
        assertNotEquals(historyState, otherTab.content.history)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateHistoryStateAction(
                tab.id,
                historyState.items,
                historyState.currentIndex,
            ),
        )

        assertEquals(historyState, tab.content.history)
        assertNotEquals(historyState, otherTab.content.history)
    }

    @Test
    fun `UpdateLoadRequestAction updates load request state`() {
        val loadRequestUrl = "https://mozilla.org"

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateLoadRequestAction(
                tab.id,
                LoadRequestState(loadRequestUrl, true, false),
            ),
        )

        assertNotNull(tab.content.loadRequest)
        assertEquals(loadRequestUrl, tab.content.loadRequest!!.url)
        assertTrue(tab.content.loadRequest!!.triggeredByRedirect)
        assertFalse(tab.content.loadRequest!!.triggeredByUser)
    }

    @Test
    fun `UpdateDesktopModeEnabledAction updates desktopModeEnabled`() {
        assertFalse(tab.content.desktopMode)
        assertFalse(otherTab.content.desktopMode)

        state = BrowserStateReducer.reduce(state, ContentAction.UpdateTabDesktopMode(tab.id, true))

        assertTrue(tab.content.desktopMode)
        assertFalse(otherTab.content.desktopMode)

        state =
            BrowserStateReducer.reduce(state, ContentAction.UpdateTabDesktopMode(tab.id, false))

        assertFalse(tab.content.desktopMode)
        assertFalse(otherTab.content.desktopMode)
    }

    @Test
    fun `WHEN dispatching NotificationChangedAction THEN notificationChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.notificationChanged)

        state = BrowserStateReducer.reduce(state, NotificationChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.notificationChanged)
    }

    @Test
    fun `WHEN dispatching CameraChangedAction THEN cameraChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.cameraChanged)

        state = BrowserStateReducer.reduce(state, CameraChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.cameraChanged)
    }

    @Test
    fun `WHEN dispatching LocationChangedAction THEN locationChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.locationChanged)

        state = BrowserStateReducer.reduce(state, LocationChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.locationChanged)
    }

    @Test
    fun `WHEN dispatching MicrophoneChangedAction THEN locationChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.microphoneChanged)

        state = BrowserStateReducer.reduce(state, MicrophoneChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.microphoneChanged)
    }

    @Test
    fun `WHEN dispatching PersistentStorageChangedAction THEN persistentStorageChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.persistentStorageChanged)

        state = BrowserStateReducer.reduce(state, PersistentStorageChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.persistentStorageChanged)
    }

    @Test
    fun `WHEN dispatching MediaKeySystemAccesChangedAction THEN mediaKeySystemAccessChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.mediaKeySystemAccessChanged)

        state = BrowserStateReducer.reduce(state, MediaKeySystemAccesChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.mediaKeySystemAccessChanged)
    }

    @Test
    fun `WHEN dispatching LocalDeviceAccessChangedAction THEN localDeviceAccessChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.localDeviceAccessChanged)

        state = BrowserStateReducer.reduce(state, LocalDeviceAccessChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.localDeviceAccessChanged)
    }

    @Test
    fun `WHEN dispatching LocalNetworkAccessChangedAction THEN localNetworkAccessChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.localNetworkAccessChanged)

        state = BrowserStateReducer.reduce(state, LocalNetworkAccessChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.localNetworkAccessChanged)
    }

    @Test
    fun `WHEN dispatching AutoPlayAudibleChangedAction THEN autoPlayAudibleChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.autoPlayAudibleChanged)

        state = BrowserStateReducer.reduce(state, AutoPlayAudibleChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.autoPlayAudibleChanged)
    }

    @Test
    fun `WHEN dispatching AutoPlayInAudibleChangedAction THEN autoPlayAudibleChanged state will be updated`() {
        assertFalse(tab.content.permissionHighlights.autoPlayInaudibleChanged)

        state = BrowserStateReducer.reduce(state, AutoPlayInAudibleChangedAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.autoPlayInaudibleChanged)
    }

    @Test
    fun `WHEN dispatching AutoPlayAudibleBlockingAction THEN autoPlayAudibleBlocking state will be updated`() {
        assertFalse(tab.content.permissionHighlights.autoPlayAudibleBlocking)

        state = BrowserStateReducer.reduce(state, AutoPlayAudibleBlockingAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.autoPlayAudibleBlocking)
    }

    @Test
    fun `WHEN dispatching AutoPlayInAudibleBlockingAction THEN autoPlayInaudibleBlocking state will be updated`() {
        assertFalse(tab.content.permissionHighlights.autoPlayInaudibleBlocking)

        state = BrowserStateReducer.reduce(state, AutoPlayInAudibleBlockingAction(tab.id, true))

        assertTrue(tab.content.permissionHighlights.autoPlayInaudibleBlocking)
    }

    @Test
    fun `WHEN dispatching Reset THEN permissionHighlights state will be update to its default value`() {
        state = BrowserStateReducer.reduce(state, AutoPlayInAudibleBlockingAction(tab.id, true))

        assertEquals(
            PermissionHighlightsState(autoPlayInaudibleBlocking = true),
            tab.content.permissionHighlights,
        )

        state = BrowserStateReducer.reduce(state, Reset(tab.id))

        assertEquals(PermissionHighlightsState(), tab.content.permissionHighlights)
    }

    @Test
    fun `UpdateAppIntentAction updates request`() {
        assertTrue(tab.content.promptRequests.isEmpty())

        val appIntent1: AppIntentState = mock()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateAppIntentAction(tab.id, appIntent1),
        )

        assertEquals(appIntent1, tab.content.appIntent)

        val appIntent2: AppIntentState = mock()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateAppIntentAction(tab.id, appIntent2),
        )

        assertEquals(appIntent2, tab.content.appIntent)
    }

    @Test
    fun `ConsumeAppIntentAction removes request`() {
        val appIntent: AppIntentState = mock()

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateAppIntentAction(tab.id, appIntent),
        )

        assertEquals(appIntent, tab.content.appIntent)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.ConsumeAppIntentAction(tab.id),
        )

        assertNull(tab.content.appIntent)
    }

    @Test
    fun `CheckForFormDataAction updates hasFormData`() {
        assertFalse(tab.content.hasFormData)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateHasFormDataAction(tab.id, true),
        )

        assertTrue(tab.content.hasFormData)

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateHasFormDataAction(tab.id, false),
        )

        assertFalse(tab.content.hasFormData)
    }

    @Test
    fun `merge permission request if same request`() {
        val url = "https://www.mozilla.org"

        val request1: PermissionRequest = mock {
            whenever(permissions).thenReturn(listOf(ContentGeoLocation(id = "permission")))
            whenever(uri).thenReturn(url)
        }
        val request2: PermissionRequest = mock {
            whenever(permissions).thenReturn(listOf(ContentGeoLocation(id = "permission")))
            whenever(uri).thenReturn(url)
        }

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdatePermissionsRequest(tab.id, request1),
        )
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdatePermissionsRequest(tab.id, request2),
        )

        verify(request1).merge(request2)
    }

    @Test
    fun `merge app permission request if same request`() {
        val request1: PermissionRequest = mock {
            whenever(permissions).thenReturn(listOf(AppLocationCoarse(id = "permission")))
        }
        val request2: PermissionRequest = mock {
            whenever(permissions).thenReturn(listOf(AppLocationCoarse(id = "permission")))
        }

        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateAppPermissionsRequest(tab.id, request1),
        )
        state = BrowserStateReducer.reduce(
            state,
            ContentAction.UpdateAppPermissionsRequest(tab.id, request2),
        )

        verify(request1).merge(request2)
    }
}
