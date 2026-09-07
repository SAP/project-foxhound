/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.emailmasks

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksStore
import org.mozilla.fenix.settings.emailmasks.EmailMasksSystemAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction

class EmailMasksStoreTest {

    @Test
    fun `GIVEN SuggestEmailMasksDisabled WHEN dispatched THEN updates isSuggestMasksEnabled to false`() {
        val initial = EmailMasksState(isSuggestMasksEnabled = true)
        val store = EmailMasksStore(
            initialState = initial,
            middleware = emptyList(),
        )

        store.dispatch(EmailMasksUserAction.SuggestEmailMasksDisabled)

        assertFalse(store.state.isSuggestMasksEnabled)
    }

    @Test
    fun `GIVEN SuggestEmailMasksEnabled WHEN dispatched THEN updates isSuggestMasksEnabled to true`() {
        val initial = EmailMasksState(isSuggestMasksEnabled = false)
        val store = EmailMasksStore(
            initialState = initial,
            middleware = emptyList(),
        )

        store.dispatch(EmailMasksUserAction.SuggestEmailMasksEnabled)

        assertTrue(store.state.isSuggestMasksEnabled)
    }

    @Test
    fun `GIVEN navigation-related actions WHEN dispatched THEN state remains unchanged`() {
        val initial = EmailMasksState(isSuggestMasksEnabled = true)
        val store = EmailMasksStore(
            initialState = initial,
            middleware = emptyList(),
        )

        val actions = listOf(
            EmailMasksUserAction.ManageClicked,
            EmailMasksUserAction.LearnMoreClicked,
            EmailMasksSystemAction.ManageTabOpened,
            EmailMasksSystemAction.LearnMoreTabOpened,
        )

        actions.forEach { action ->
            store.dispatch(action)
            assertTrue("State should not change for $action", store.state.isSuggestMasksEnabled)
        }
    }
}
