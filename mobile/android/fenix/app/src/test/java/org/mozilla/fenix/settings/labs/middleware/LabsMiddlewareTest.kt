/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.middleware

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.labs.LabsItem
import org.mozilla.fenix.settings.labs.LabsItemSlugs
import org.mozilla.fenix.settings.labs.store.DialogState
import org.mozilla.fenix.settings.labs.store.LabsAction
import org.mozilla.fenix.settings.labs.store.LabsState
import org.mozilla.fenix.settings.labs.store.LabsStore
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class LabsMiddlewareTest {

    private lateinit var settings: Settings
    private var onRestartCount = 0
    private val onRestart: () -> Unit = { onRestartCount++ }
    private val openedFeedbackUrls = mutableListOf<String>()
    private val onOpenFeedback: (String) -> Unit = { openedFeedbackUrls.add(it) }

    @Before
    fun setup() {
        settings = Settings(testContext)
        settings.enableHomepageAsNewTab = false
        openedFeedbackUrls.clear()
    }

    @Test
    fun `WHEN InitAction is dispatched THEN items are initialized from settings`() = runTest(UnconfinedTestDispatcher()) {
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        createStore(
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        // InitAction is dispatched on store creation.
        // The middleware then dispatches UpdateLabsItems.
        captureMiddleware.assertLastAction(LabsAction.UpdateLabsItems::class) { action ->
            assertEquals(1, action.items.size)
            val item = action.items.first()
            assertEquals(LabsItemSlugs.HOMEPAGE_AS_NEW_TAB, item.slug)
            assertEquals(settings.enableHomepageAsNewTab, item.enrolled)
        }
    }

    @Test
    fun `WHEN RestartApplication action is dispatched THEN onRestart is called`() = runTest(UnconfinedTestDispatcher()) {
        val store = createStore(scope = backgroundScope)

        store.dispatch(LabsAction.RestartApplication)

        assertEquals(1, onRestartCount)
    }

    @Test
    fun `WHEN RestoreDefaults is dispatched AND an enrolled item requires restart THEN items are unenrolled and app restart is requested`() = runTest(UnconfinedTestDispatcher()) {
        settings.enableHomepageAsNewTab = true
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        val store = createStore(
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        store.dispatch(LabsAction.RestoreDefaults)

        assertFalse(settings.enableHomepageAsNewTab)
        captureMiddleware.assertLastAction(LabsAction.RestartApplication::class)
    }

    @Test
    fun `WHEN RestoreDefaults is dispatched AND no enrolled item requires restart THEN items are unenrolled and no restart is requested`() = runTest(UnconfinedTestDispatcher()) {
        settings.enableHomepageAsNewTab = true
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        val store = createStore(
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        // Override the middleware's hardcoded item with one that does not require restart.
        store.dispatch(
            LabsAction.UpdateLabsItems(
                items = listOf(
                    LabsItem(
                        slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                        title = R.string.firefox_labs_homepage_as_a_new_tab,
                        description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                        enrolled = true,
                        requiresRestart = false,
                    ),
                ),
            ),
        )
        captureMiddleware.reset()

        store.dispatch(LabsAction.RestoreDefaults)

        assertFalse(settings.enableHomepageAsNewTab)
        assertEquals(0, onRestartCount)
        captureMiddleware.assertNotDispatched(LabsAction.RestartApplication::class)
    }

    @Test
    fun `WHEN ToggleLabsItem with requiresRestart=true is dispatched THEN item is toggled and app restart is requested`() = runTest(UnconfinedTestDispatcher()) {
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = true,
        )
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        val store = createStore(
            initialState = LabsState(
                labsItems = listOf(item),
                dialogState = DialogState.Closed,
            ),
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        assertFalse(settings.enableHomepageAsNewTab)

        store.dispatch(LabsAction.ToggleLabsItem(item))

        assertTrue(settings.enableHomepageAsNewTab)
        captureMiddleware.assertLastAction(LabsAction.RestartApplication::class)
    }

    @Test
    fun `WHEN ToggleLabsItem with requiresRestart=false is dispatched THEN item is toggled and no restart is requested`() = runTest(UnconfinedTestDispatcher()) {
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = false,
        )
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        val store = createStore(
            initialState = LabsState(
                labsItems = listOf(item),
                dialogState = DialogState.Closed,
            ),
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        assertFalse(settings.enableHomepageAsNewTab)

        store.dispatch(LabsAction.ToggleLabsItem(item))

        assertTrue(settings.enableHomepageAsNewTab)
        assertEquals(0, onRestartCount)
        captureMiddleware.assertNotDispatched(LabsAction.RestartApplication::class)
    }

    @Test
    fun `WHEN ShareFeedbackClicked is dispatched THEN onOpenFeedback is called with the item feedback URL`() = runTest(UnconfinedTestDispatcher()) {
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = true,
            feedbackUrl = "https://connect.mozilla.org/",
        )
        val store = createStore(scope = backgroundScope)

        store.dispatch(LabsAction.ShareFeedbackClicked(item))

        assertEquals(listOf("https://connect.mozilla.org/"), openedFeedbackUrls)
    }

    private fun createStore(
        initialState: LabsState = LabsState.INITIAL,
        captureMiddleware: CaptureActionsMiddleware<LabsState, LabsAction> = CaptureActionsMiddleware(),
        scope: CoroutineScope,
    ): LabsStore {
        val middleware = LabsMiddleware(
            settings = settings,
            onRestart = onRestart,
            onOpenFeedback = onOpenFeedback,
            scope = scope,
        )
        return LabsStore(
            initialState = initialState,
            middleware = listOf(captureMiddleware, middleware),
        )
    }
}
