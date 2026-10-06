/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.emailmasks

import mozilla.components.lib.state.Store
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.settings.emailmasks.EmailMasksAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction
import org.mozilla.fenix.settings.emailmasks.middleware.EmailMasksPreferencesMiddleware
import org.mozilla.fenix.settings.emailmasks.middleware.EmailMasksRepository

class EmailMasksPreferencesMiddlewareTest {

    private lateinit var repository: FakeEmailMasksRepository
    private lateinit var middleware: EmailMasksPreferencesMiddleware
    private val store = Store<EmailMasksState, EmailMasksAction>(
        initialState = EmailMasksState(),
        reducer = { state, _ -> state },
    )

    @Before
    fun setup() {
        repository = FakeEmailMasksRepository()
        middleware = EmailMasksPreferencesMiddleware(repository)
    }

    @Test
    fun `GIVEN SuggestEmailMasksDisabled action WHEN middleware invoked THEN persists toggle`() {
        repository.internalSuggestionEnabled = true

        val middleware = EmailMasksPreferencesMiddleware(repository)

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.SuggestEmailMasksDisabled)

        assertFalse(repository.internalSuggestionEnabled)
    }

    @Test
    fun `GIVEN SuggestEmailMasksEnabled action WHEN middleware invoked THEN persists toggle`() {
        repository.internalSuggestionEnabled = false

        val middleware = EmailMasksPreferencesMiddleware(repository)

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.SuggestEmailMasksEnabled)

        assertTrue(repository.internalSuggestionEnabled)
    }

    @Test
    fun `GIVEN non-toggle action WHEN middleware invoked THEN does not persist`() {
        repository.internalSuggestionEnabled = true
        val middleware = EmailMasksPreferencesMiddleware(repository)

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.ManageClicked)

        assertTrue(repository.internalSuggestionEnabled)
    }

    private class FakeEmailMasksRepository : EmailMasksRepository {
        var internalSuggestionEnabled: Boolean = false
        var internalCfrShown: Boolean = true
        var dismissCfrCalled: Boolean = false

        override fun isSuggestionEnabled() = internalSuggestionEnabled

        override fun setSuggestionEnabled(enabled: Boolean) {
            internalSuggestionEnabled = enabled
        }

        override fun shouldShowCfr() = internalCfrShown

        override fun dismissCfr() {
            dismissCfrCalled = true
        }
    }
}
