/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.emailmasks

import mozilla.components.lib.state.Store
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.settings.emailmasks.EmailMasksAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction
import org.mozilla.fenix.settings.emailmasks.middleware.EmailMasksPreferencesMiddleware

class EmailMasksPreferencesMiddlewareTest {

    private fun createStore() = Store<EmailMasksState, EmailMasksAction>(
        initialState = EmailMasksState(),
        reducer = { state, _ -> state },
    )

    @Test
    fun `GIVEN SuggestEmailMasksDisabled action WHEN middleware invoked THEN persists toggle`() {
        val store = createStore()
        var persistCalled = false
        var persistedValue: Boolean? = null
        val middleware = EmailMasksPreferencesMiddleware(
            persistSuggestToggle = { value ->
                persistCalled = true
                persistedValue = value
            },
        )

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.SuggestEmailMasksDisabled)

        assertTrue(persistCalled)
        assertEquals(false, persistedValue)
    }

    @Test
    fun `GIVEN SuggestEmailMasksEnabled action WHEN middleware invoked THEN persists toggle`() {
        val store = createStore()
        var persistCalled = false
        var persistedValue: Boolean? = null
        val middleware = EmailMasksPreferencesMiddleware(
            persistSuggestToggle = { value ->
                persistCalled = true
                persistedValue = value
            },
        )

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.SuggestEmailMasksEnabled)

        assertTrue(persistCalled)
        assertEquals(true, persistedValue)
    }

    @Test
    fun `GIVEN non-toggle action WHEN middleware invoked THEN does not persist`() {
        val store = createStore()
        var persistCalled = false
        val middleware = EmailMasksPreferencesMiddleware(
            persistSuggestToggle = { _ -> persistCalled = true },
        )

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.ManageClicked)

        assertFalse(persistCalled)
    }
}
