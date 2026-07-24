/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.state.Middleware
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.labs.FeatureKey
import org.mozilla.fenix.settings.labs.LabsFeature

@RunWith(AndroidJUnit4::class)
class LabsStoreTest {

    @Test
    fun `WHEN store is created THEN init action is dispatched`() {
        var initActionObserved = false
        val testMiddleware: Middleware<LabsState, LabsAction> = { _, next, action ->
            if (action == LabsAction.InitAction) {
                initActionObserved = true
            }

            next(action)
        }

        LabsStore(
            initialState = LabsState.INITIAL,
            middleware = listOf(testMiddleware),
        )

        assertTrue(initActionObserved)
    }

    @Test
    fun `WHEN UpdateFeatures action is dispatched THEN labsFeatures are updated`() = runTest {
        val store = LabsStore(initialState = LabsState.INITIAL)

        assertTrue(store.state.labsFeatures.isEmpty())

        val features = listOf(
            LabsFeature(
                key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
                name = R.string.firefox_labs_homepage_as_a_new_tab,
                description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                enabled = false,
            ),
        )
        store.dispatch(LabsAction.UpdateFeatures(features))

        assertEquals(features, store.state.labsFeatures)
    }

    @Test
    fun `WHEN RestoreDefaults action is dispatched THEN all features are disabled`() = runTest {
        val features = listOf(
            LabsFeature(
                key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
                name = R.string.firefox_labs_homepage_as_a_new_tab,
                description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                enabled = true,
            ),
        )
        val store = LabsStore(
            initialState = LabsState(
                labsFeatures = features,
                dialogState = DialogState.RestoreDefaults,
            ),
        )

        store.dispatch(LabsAction.RestoreDefaults)

        store.state.labsFeatures.forEach {
            assertFalse(it.enabled)
        }
        assertEquals(DialogState.Closed, store.state.dialogState)
    }

    @Test
    fun `WHEN ToggleFeature action is dispatched THEN feature is toggled`() = runTest {
        val feature = LabsFeature(
            key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
            name = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enabled = false,
        )
        val store = LabsStore(
            initialState = LabsState(
                labsFeatures = listOf(feature),
                dialogState = DialogState.ToggleFeature(feature),
            ),
        )

        assertFalse(store.state.labsFeatures.first().enabled)

        store.dispatch(LabsAction.ToggleFeature(feature))

        assertTrue(store.state.labsFeatures.first().enabled)
        assertEquals(DialogState.Closed, store.state.dialogState)

        store.dispatch(LabsAction.ToggleFeature(feature))

        assertFalse(store.state.labsFeatures.first().enabled)
        assertEquals(DialogState.Closed, store.state.dialogState)
    }

    @Test
    fun `WHEN ShowToggleFeatureDialog action is dispatched THEN dialogState is updated`() = runTest {
        val store = LabsStore(initialState = LabsState.INITIAL)
        val feature = LabsFeature(
            key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
            name = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enabled = false,
        )

        assertEquals(DialogState.Closed, store.state.dialogState)

        store.dispatch(LabsAction.ShowToggleFeatureDialog(feature))

        assertEquals(DialogState.ToggleFeature(feature), store.state.dialogState)
    }

    @Test
    fun `WHEN ShowRestoreDefaultsDialog action is dispatched THEN dialogState is updated`() = runTest {
        val store = LabsStore(initialState = LabsState.INITIAL)
        assertEquals(DialogState.Closed, store.state.dialogState)

        store.dispatch(LabsAction.ShowRestoreDefaultsDialog)

        assertEquals(DialogState.RestoreDefaults, store.state.dialogState)
    }

    @Test
    fun `WHEN CloseDialog action is dispatched THEN dialogState is updated to Closed`() = runTest {
        val feature = LabsFeature(
            key = FeatureKey.HOMEPAGE_AS_A_NEW_TAB,
            name = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enabled = false,
        )
        val store = LabsStore(
            initialState = LabsState(
                labsFeatures = listOf(feature),
                dialogState = DialogState.RestoreDefaults,
            ),
        )
        assertEquals(DialogState.RestoreDefaults, store.state.dialogState)

        store.dispatch(LabsAction.CloseDialog)

        assertEquals(DialogState.Closed, store.state.dialogState)
    }
}
