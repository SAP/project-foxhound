/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.contextmenu

import android.view.HapticFeedbackConstants
import android.view.View
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineView
import mozilla.components.concept.engine.HitResult
import mozilla.components.support.base.Component
import mozilla.components.support.base.facts.Action
import mozilla.components.support.base.facts.processor.CollectionProcessor
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

@RunWith(AndroidJUnit4::class)
class ContextMenuFeatureTest {
    private val testDispatcher = StandardTestDispatcher()

    private lateinit var store: BrowserStore

    @Before
    fun setUp() {
        store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "test-tab"),
                ),
                selectedTabId = "test-tab",
            ),
        )
    }

    @Test
    fun `New HitResult for selected session will cause fragment transaction`() = runTest(testDispatcher) {
        val fragmentManager = mockFragmentManager()

        val (engineView, view) = mockEngineView()

        val feature = ContextMenuFeature(
            fragmentManager,
            store,
            ContextMenuCandidate.defaultCandidates(testContext, mock(), mock(), mock()),
            engineView,
            mock(),
            mainDispatcher = testDispatcher,
        )

        feature.start()

        store.dispatch(
            ContentAction.UpdateHitResultAction(
                "test-tab",
                HitResult.UNKNOWN("https://www.mozilla.org"),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        verify(fragmentManager).beginTransaction()
        verify(view).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    @Test
    fun `New HitResult for selected session will not cause fragment transaction if feature is stopped`() = runTest(testDispatcher) {
        val fragmentManager = mockFragmentManager()

        val (engineView, view) = mockEngineView()

        val feature = ContextMenuFeature(
            fragmentManager,
            store,
            ContextMenuCandidate.defaultCandidates(testContext, mock(), mock(), mock()),
            engineView,
            mock(),
            mainDispatcher = testDispatcher,
        )

        feature.start()
        feature.stop()

        store.dispatch(
            ContentAction.UpdateHitResultAction(
                "test-tab",
                HitResult.UNKNOWN("https://www.mozilla.org"),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        verify(fragmentManager, never()).beginTransaction()
        verify(view, never()).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    @Test
    fun `Feature will re-attach to already existing fragment`() = runTest(testDispatcher) {
        val fragment: ContextMenuFragment = mock()
        doReturn("test-tab").`when`(fragment).sessionId

        val fragmentManager: FragmentManager = mock()
        doReturn(fragment).`when`(fragmentManager).findFragmentByTag(any())

        val (engineView, view) = mockEngineView()

        store.dispatch(
            ContentAction.UpdateHitResultAction(
                "test-tab",
                HitResult.UNKNOWN("https://www.mozilla.org"),
            ),
        )

        val feature = ContextMenuFeature(
            fragmentManager,
            store,
            ContextMenuCandidate.defaultCandidates(testContext, mock(), mock(), mock()),
            engineView,
            mock(),
            mainDispatcher = testDispatcher,
        )

        feature.start()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(fragment).feature = feature
        verify(view, never()).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    @Test
    fun `Already existing fragment will be removed if session has no HitResult set anymore`() = runTest(testDispatcher) {
        val fragment: ContextMenuFragment = mock()
        doReturn("test-tab").`when`(fragment).sessionId

        val transaction: FragmentTransaction = mock()

        val fragmentManager: FragmentManager = mock()
        doReturn(fragment).`when`(fragmentManager).findFragmentByTag(any())
        doReturn(transaction).`when`(fragmentManager).beginTransaction()
        doReturn(transaction).`when`(transaction).remove(fragment)

        val (engineView, view) = mockEngineView()

        val feature = ContextMenuFeature(
            fragmentManager,
            store,
            ContextMenuCandidate.defaultCandidates(testContext, mock(), mock(), mock()),
            engineView,
            mock(),
            mainDispatcher = testDispatcher,
        )

        feature.start()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(fragmentManager).beginTransaction()
        verify(transaction).remove(fragment)

        verify(view, never()).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    fun `Already existing fragment will be removed if session does not exist anymore`() = runTest(testDispatcher) {
        val fragment: ContextMenuFragment = mock()
        doReturn("test-tab").`when`(fragment).sessionId

        val transaction: FragmentTransaction = mock()

        val fragmentManager: FragmentManager = mock()
        doReturn(fragment).`when`(fragmentManager).findFragmentByTag(any())
        doReturn(transaction).`when`(fragmentManager).beginTransaction()
        doReturn(transaction).`when`(transaction).remove(fragment)

        val (engineView, view) = mockEngineView()

        val feature = ContextMenuFeature(
            fragmentManager,
            store,
            ContextMenuCandidate.defaultCandidates(testContext, mock(), mock(), mock()),
            engineView,
            mock(),
            mainDispatcher = testDispatcher,
        )

        store.dispatch(TabListAction.RemoveTabAction("test-tab"))

        feature.start()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(fragmentManager).beginTransaction()
        verify(transaction).remove(fragment)

        verify(view, never()).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    @Test
    fun `No dialog will be shown if no item wants to be shown`() = runTest(testDispatcher) {
        val fragmentManager = mockFragmentManager()

        val candidate = ContextMenuCandidate(
            id = "test-id",
            label = "Test Item",
            showFor = { _, _ -> false },
            action = { _, _ -> Unit },
        )

        val (engineView, view) = mockEngineView()

        val feature = ContextMenuFeature(
            fragmentManager,
            store,
            listOf(candidate),
            engineView,
            ContextMenuUseCases(store),
            mainDispatcher = testDispatcher,
        )

        feature.showContextMenu(
            createTab("https://www.mozilla.org"),
            HitResult.UNKNOWN("https://www.mozilla.org"),
        )

        verify(fragmentManager, never()).beginTransaction()
        verify(view, never()).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    @Test
    fun `Cancelling context menu item will consume HitResult`() = runTest(testDispatcher) {
        store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "test-tab"),
                ),
            ),
        )

        store.dispatch(
            ContentAction.UpdateHitResultAction(
                "test-tab",
                HitResult.UNKNOWN("https://www.mozilla.org"),
            ),
        )

        val (engineView, _) = mockEngineView()

        val feature = ContextMenuFeature(
            mockFragmentManager(),
            store,
            ContextMenuCandidate.defaultCandidates(testContext, mock(), mock(), mock()),
            engineView,
            ContextMenuUseCases(store),
            mainDispatcher = testDispatcher,
        )

        assertNotNull(store.state.findTab("test-tab")!!.content.hitResult)

        feature.onMenuCancelled("test-tab")

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.findTab("test-tab")!!.content.hitResult)
    }

    @Test
    fun `Selecting context menu item will invoke action of candidate and consume HitResult`() = runTest(testDispatcher) {
        store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "test-tab"),
                ),
            ),
        )

        store.dispatch(
            ContentAction.UpdateHitResultAction(
                "test-tab",
                HitResult.UNKNOWN("https://www.mozilla.org"),
            ),
        )

        val (engineView, view) = mockEngineView()
        var actionInvoked = false

        val candidate = ContextMenuCandidate(
            id = "test-id",
            label = "Test Item",
            showFor = { _, _ -> true },
            action = { _, _ -> actionInvoked = true },
        )

        val feature = ContextMenuFeature(
            mockFragmentManager(),
            store,
            listOf(candidate),
            engineView,
            ContextMenuUseCases(store),
            mainDispatcher = testDispatcher,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(store.state.findTab("test-tab")!!.content.hitResult)
        assertFalse(actionInvoked)

        feature.onMenuItemSelected("test-tab", "test-id")

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.findTab("test-tab")!!.content.hitResult)
        assertTrue(actionInvoked)
        verify(view, never()).performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    @Test
    fun `Selecting context menu item will emit a click fact`() = runTest(testDispatcher) {
        store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "test-tab"),
                ),
            ),
        )

        store.dispatch(
            ContentAction.UpdateHitResultAction(
                "test-tab",
                HitResult.UNKNOWN("https://www.mozilla.org"),
            ),
        )

        val (engineView, _) = mockEngineView()
        val candidate = ContextMenuCandidate(
            id = "test-id",
            label = "Test Item",
            showFor = { _, _ -> true },
            action = { _, _ -> }, // noop
        )

        val feature = ContextMenuFeature(
            mockFragmentManager(),
            store,
            listOf(candidate),
            engineView,
            ContextMenuUseCases(store),
        )

        CollectionProcessor.withFactCollection { facts ->
            feature.onMenuItemSelected("test-tab", candidate.id)

            assertEquals(1, facts.size)

            val fact = facts[0]
            assertEquals(Component.FEATURE_CONTEXTMENU, fact.component)
            assertEquals(Action.CLICK, fact.action)
            assertEquals("item", fact.item)
            assertEquals("test-id", fact.metadata?.get("item"))
        }
    }

    private fun mockFragmentManager(): FragmentManager {
        val fragmentManager: FragmentManager = mock()

        val transaction: FragmentTransaction = mock()
        doReturn(transaction).`when`(fragmentManager).beginTransaction()

        return fragmentManager
    }

    private fun mockEngineView(): Pair<EngineView, View> {
        val actualView: View = mock()

        val engineView = mock<EngineView>().also {
            `when`(it.asView()).thenReturn(actualView)
        }

        return Pair(engineView, actualView)
    }
}
