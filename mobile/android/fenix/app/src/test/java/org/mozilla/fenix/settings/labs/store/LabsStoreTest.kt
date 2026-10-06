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
import org.mozilla.fenix.settings.labs.LabsItem
import org.mozilla.fenix.settings.labs.LabsItemSlugs

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
    fun `WHEN UpdateLabsItems action is dispatched THEN labsItems are updated`() = runTest {
        val store = LabsStore(initialState = LabsState.INITIAL)

        assertTrue(store.state.labsItems.isEmpty())

        val items = listOf(
            LabsItem(
                slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                title = R.string.firefox_labs_homepage_as_a_new_tab,
                description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                enrolled = false,
                requiresRestart = true,
            ),
        )
        store.dispatch(LabsAction.UpdateLabsItems(items))

        assertEquals(items, store.state.labsItems)
    }

    @Test
    fun `WHEN RestoreDefaults action is dispatched THEN all labs items are unenrolled`() = runTest {
        val items = listOf(
            LabsItem(
                slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
                title = R.string.firefox_labs_homepage_as_a_new_tab,
                description = R.string.firefox_labs_homepage_as_a_new_tab_description,
                enrolled = true,
                requiresRestart = true,
            ),
        )
        val store = LabsStore(
            initialState = LabsState(
                labsItems = items,
                dialogState = DialogState.RestoreDefaults,
            ),
        )

        store.dispatch(LabsAction.RestoreDefaults)

        store.state.labsItems.forEach {
            assertFalse(it.enrolled)
        }
        assertEquals(DialogState.Closed, store.state.dialogState)
    }

    @Test
    fun `WHEN ToggleLabsItem action is dispatched THEN labs item is toggled`() = runTest {
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = true,
        )
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(item),
                dialogState = DialogState.ToggleLabsItem(item),
            ),
        )

        assertFalse(store.state.labsItems.first().enrolled)

        store.dispatch(LabsAction.ToggleLabsItem(item))

        assertTrue(store.state.labsItems.first().enrolled)
        assertEquals(DialogState.Closed, store.state.dialogState)

        store.dispatch(LabsAction.ToggleLabsItem(item))

        assertFalse(store.state.labsItems.first().enrolled)
        assertEquals(DialogState.Closed, store.state.dialogState)
    }

    @Test
    fun `WHEN ShowToggleLabsItemDialog action is dispatched THEN dialogState is updated`() = runTest {
        val store = LabsStore(initialState = LabsState.INITIAL)
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = true,
        )

        assertEquals(DialogState.Closed, store.state.dialogState)

        store.dispatch(LabsAction.ShowToggleLabsItemDialog(item))

        assertEquals(DialogState.ToggleLabsItem(item), store.state.dialogState)
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
        val item = LabsItem(
            slug = LabsItemSlugs.HOMEPAGE_AS_NEW_TAB,
            title = R.string.firefox_labs_homepage_as_a_new_tab,
            description = R.string.firefox_labs_homepage_as_a_new_tab_description,
            enrolled = false,
            requiresRestart = true,
        )
        val store = LabsStore(
            initialState = LabsState(
                labsItems = listOf(item),
                dialogState = DialogState.RestoreDefaults,
            ),
        )
        assertEquals(DialogState.RestoreDefaults, store.state.dialogState)

        store.dispatch(LabsAction.CloseDialog)

        assertEquals(DialogState.Closed, store.state.dialogState)
    }
}
