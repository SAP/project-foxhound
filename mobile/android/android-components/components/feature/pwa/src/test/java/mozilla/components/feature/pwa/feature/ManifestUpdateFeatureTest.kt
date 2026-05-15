/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.pwa.feature

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.manifest.WebAppManifest
import mozilla.components.feature.pwa.ManifestStorage
import mozilla.components.feature.pwa.WebAppShortcutManager
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class ManifestUpdateFeatureTest {

    private lateinit var shortcutManager: WebAppShortcutManager
    private lateinit var storage: ManifestStorage
    private lateinit var store: BrowserStore

    private val sessionId = "external-app-session-id"
    private val baseManifest = WebAppManifest(
        name = "Mozilla",
        startUrl = "https://mozilla.org",
        scope = "https://mozilla.org",
    )

    private val testDispatcher = StandardTestDispatcher()
    private val testScope = TestScope(testDispatcher)

    @Before
    fun setUp() {
        storage = mock()
        shortcutManager = mock()

        store = BrowserStore(
            BrowserState(
                customTabs = listOf(
                    createCustomTab("https://mozilla.org", id = sessionId),
                ),
            ),
        )
    }

    @Test
    fun `start and stop handle null session`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(
            testContext,
            store,
            shortcutManager,
            storage,
            "not existing",
            baseManifest,
            mainScope = testScope,
        )

        feature.start()
        testScheduler.advanceUntilIdle()

        feature.stop()

        verify(storage).updateManifestUsedAt(baseManifest)
        verify(storage, never()).updateManifest(any())
    }

    @Test
    fun `Last usage is updated when feature is started`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(
            testContext,
            store,
            shortcutManager,
            storage,
            sessionId,
            baseManifest,
            mainScope = testScope,
        )

        // Insert base manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                baseManifest,
            ),
        )

        feature.start()
        testScheduler.advanceUntilIdle()

        feature.updateUsageJob!!

        verify(storage).updateManifestUsedAt(baseManifest)
    }

    @Test
    fun `updateStoredManifest is called when the manifest changes`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(
            testContext,
            store,
            shortcutManager,
            storage,
            sessionId,
            baseManifest,
            testScope,
        )

        // Insert base manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                baseManifest,
            ),
        )

        feature.start()
        testScheduler.advanceUntilIdle()

        val newManifest = baseManifest.copy(shortName = "Moz")

        // Update manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                newManifest,
            ),
        )
        testScheduler.advanceUntilIdle()

        feature.updateJob!!

        verify(storage).updateManifest(newManifest)
    }

    @Test
    fun `updateStoredManifest is not called when the manifest is the same`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(
            testContext,
            store,
            shortcutManager,
            storage,
            sessionId,
            baseManifest,
            testScope,
        )

        feature.start()
        testScheduler.advanceUntilIdle()

        // Update manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                baseManifest,
            ),
        )

        feature.updateJob

        verify(storage, never()).updateManifest(any())
    }

    @Test
    fun `updateStoredManifest is not called when the manifest is removed`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(
            testContext,
            store,
            shortcutManager,
            storage,
            sessionId,
            baseManifest,
            testScope,
        )

        // Insert base manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                baseManifest,
            ),
        )

        feature.start()
        testScheduler.advanceUntilIdle()

        // Update manifest
        store.dispatch(
            ContentAction.RemoveWebAppManifestAction(
                sessionId,
            ),
        )

        feature.updateJob

        verify(storage, never()).updateManifest(any())
    }

    @Test
    fun `updateStoredManifest is not called when the manifest has a different start URL`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(
            testContext,
            store,
            shortcutManager,
            storage,
            sessionId,
            baseManifest,
            testScope,
        )

        // Insert base manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                baseManifest,
            ),
        )

        feature.start()
        testScheduler.advanceUntilIdle()

        // Update manifest
        store.dispatch(
            ContentAction.UpdateWebAppManifestAction(
                sessionId,
                WebAppManifest(name = "Mozilla", startUrl = "https://netscape.com"),
            ),
        )

        feature.updateJob

        verify(storage, never()).updateManifest(any())
    }

    @Test
    fun `updateStoredManifest updates storage and shortcut`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(testContext, store, shortcutManager, storage, sessionId, baseManifest, testScope)

        val manifest = baseManifest.copy(shortName = "Moz")
        feature.updateStoredManifest(manifest)

        verify(storage).updateManifest(manifest)
        verify(shortcutManager).updateShortcuts(testContext, listOf(manifest))
    }

    @Test
    fun `start updates last web app usage`() = runTest(testDispatcher) {
        val feature = ManifestUpdateFeature(testContext, store, shortcutManager, storage, sessionId, baseManifest, testScope)

        feature.start()
        testScheduler.advanceUntilIdle()

        verify(storage).updateManifestUsedAt(baseManifest)
    }
}
