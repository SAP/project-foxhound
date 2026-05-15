/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import kotlinx.coroutines.test.runTest
import mozilla.components.lib.state.Action
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.test.mock
import org.junit.Test
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

class LogMiddlewareTest {

    data object SState : State
    data class AAction(val arg: String = "") : Action

    @Test
    fun `WHEN including detailed data THEN middleware logs actions and their properties that are dispatched to store`() = runTest {
        val logger = mock<Logger>()
        val store = Store<SState, AAction>(
            initialState = SState,
            reducer = { state, _ -> state },
            middleware = listOf(LogMiddleware(logger = logger, shouldIncludeDetailedData = { true })),
        )

        val actionMessages = listOf("one!", "two!", "buckle my shoe!")
        actionMessages.forEach { message ->
            val action = AAction(message)
            store.dispatch(action)
            verify(logger).info(action.toString())
        }
    }

    @Test
    fun `WHEN excluding detailed data THEN middleware only logs actions that are dispatched to store`() = runTest {
        val logger = mock<Logger>()
        val store = Store<SState, AAction>(
            initialState = SState,
            reducer = { state, _ -> state },
            middleware = listOf(LogMiddleware(logger = logger, shouldIncludeDetailedData = { false })),
        )

        val actionMessages = listOf("one!", "two!", "buckle my shoe!")
        actionMessages.forEach { message ->
            store.dispatch(AAction(message))
        }

        verify(logger, times(3)).info(AAction::class.java.name)
    }
}
