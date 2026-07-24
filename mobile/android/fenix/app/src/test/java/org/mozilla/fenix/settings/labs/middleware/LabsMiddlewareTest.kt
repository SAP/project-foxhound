/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.middleware

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.verify
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.labs.FeatureKey
import org.mozilla.fenix.settings.labs.LabsFeature
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
    private val onRestart: () -> Unit = mock()

    @Before
    fun setup() {
        settings = Settings(testContext)
        settings.enableHomepageAsNewTab = false
    }

    @Test
    fun `WHEN InitAction is dispatched THEN features are initialized from settings`() = runTest(UnconfinedTestDispatcher()) {
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        createStore(
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        // InitAction is dispatched on store creation.
        // The middleware then dispatches UpdateFeatures.
        captureMiddleware.assertLastAction(LabsAction.UpdateFeatures::class) { action ->
            assertEquals(1, action.features.size)
            val feature = action.features.first()
            assertEquals(FeatureKey.HOMEPAGE_AS_A_NEW_TAB, feature.key)
            assertEquals(settings.enableHomepageAsNewTab, feature.enabled)
        }
    }

    @Test
    fun `WHEN RestartApplication action is dispatched THEN onRestart is called`() = runTest(UnconfinedTestDispatcher()) {
        val store = createStore(scope = backgroundScope)

        store.dispatch(LabsAction.RestartApplication)

        verify(onRestart).invoke()
    }

    @Test
    fun `WHEN RestoreDefaults action is dispatched THEN all features are disabled and app restart is requested`() = runTest(UnconfinedTestDispatcher()) {
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
    fun `WHEN ToggleFeature action is dispatched THEN feature is toggled and app restart is requested`() = runTest(UnconfinedTestDispatcher()) {
        val feature = LabsFeature(
            key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
            name = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enabled = false,
        )
        val captureMiddleware = CaptureActionsMiddleware<LabsState, LabsAction>()
        val store = createStore(
            initialState = LabsState(
                labsFeatures = listOf(feature),
                dialogState = DialogState.Closed,
            ),
            captureMiddleware = captureMiddleware,
            scope = backgroundScope,
        )

        assertFalse(settings.enableHomepageAsNewTab)

        store.dispatch(LabsAction.ToggleFeature(feature))

        assertTrue(settings.enableHomepageAsNewTab)
        captureMiddleware.assertLastAction(LabsAction.RestartApplication::class)
    }

    private fun createStore(
        initialState: LabsState = LabsState.INITIAL,
        captureMiddleware: CaptureActionsMiddleware<LabsState, LabsAction> = CaptureActionsMiddleware(),
        scope: CoroutineScope,
    ): LabsStore {
        val middleware = LabsMiddleware(
            settings = settings,
            onRestart = onRestart,
            scope = scope,
        )
        return LabsStore(
            initialState = initialState,
            middleware = listOf(captureMiddleware, middleware),
        )
    }
}
