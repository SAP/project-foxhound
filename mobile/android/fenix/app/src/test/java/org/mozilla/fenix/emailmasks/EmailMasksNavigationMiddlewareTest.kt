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
import org.mozilla.fenix.settings.emailmasks.middleware.EmailMasksNavigationMiddleware
import org.mozilla.fenix.settings.emailmasks.middleware.EmailMasksUrlProvider

class EmailMasksNavigationMiddlewareTest {

    companion object {
        private const val MANAGE_URL = "https://test/manage"
        private const val LEARN_MORE_URL = "https://test/learn"
    }

    private class FakeEmailMasksUrlProvider : EmailMasksUrlProvider {
        override fun manageUrl(): String = MANAGE_URL
        override fun learnMoreUrl(): String = LEARN_MORE_URL
    }

    private fun createStore() = Store<EmailMasksState, EmailMasksAction>(
        initialState = EmailMasksState(),
        reducer = { state, _ -> state },
    )

    @Test
    fun `GIVEN ManageClicked WHEN middleware invoked THEN opens manage url and forwards action`() {
        val urlProvider = FakeEmailMasksUrlProvider()
        val store = createStore()

        var openTabCalled = false
        var urlPassed: String? = null

        val middleware = EmailMasksNavigationMiddleware(
            openTab = { url ->
                openTabCalled = true
                urlPassed = url
            },
            urlProvider = urlProvider,
        )

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.ManageClicked)

        assertTrue(openTabCalled)
        assertEquals(urlProvider.manageUrl(), urlPassed)
    }

    @Test
    fun `GIVEN LearnMoreClicked WHEN middleware invoked THEN opens learn-more url and forwards action`() {
        val urlProvider = FakeEmailMasksUrlProvider()
        val store = createStore()

        var openTabCalled = false
        var urlPassed: String? = null

        val middleware = EmailMasksNavigationMiddleware(
            openTab = { url ->
                openTabCalled = true
                urlPassed = url
            },
            urlProvider = urlProvider,
        )
        middleware.invoke(store, next = {}, action = EmailMasksUserAction.LearnMoreClicked)

        assertTrue(openTabCalled)
        assertEquals(urlProvider.learnMoreUrl(), urlPassed)
    }

    @Test
    fun `GIVEN non-navigation action WHEN middleware invoked THEN does not open url and forwards action`() {
        val urlProvider = FakeEmailMasksUrlProvider()
        val store = createStore()

        var openTabCalled = false

        val middleware = EmailMasksNavigationMiddleware(
            openTab = { _ -> openTabCalled = true },
            urlProvider = urlProvider,
        )

        middleware.invoke(store, next = {}, action = EmailMasksUserAction.SuggestEmailMasksEnabled)

        assertFalse(openTabCalled)
    }
}
