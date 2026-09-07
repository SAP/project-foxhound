/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.ContainerState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ContainerActionTest {
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        state = BrowserState()
    }

    @Test
    fun `AddContainerAction - Adds a container to the BrowserState containers`() {
        assertTrue(state.containers.isEmpty())

        val container = ContainerState(
            contextId = "contextId",
            name = "Personal",
            color = ContainerState.Color.GREEN,
            icon = ContainerState.Icon.CART,
        )
        val stateAfterAdd = BrowserStateReducer.reduce(state, ContainerAction.AddContainerAction(container))

        assertFalse(stateAfterAdd.containers.isEmpty())
        assertEquals(container, stateAfterAdd.containers.values.first())

        state = BrowserStateReducer.reduce(stateAfterAdd, ContainerAction.AddContainerAction(container))
        assertSame(stateAfterAdd, state)
    }

    @Test
    fun `AddContainersAction - Adds a list of containers to the BrowserState containers`() {
        assertTrue(state.containers.isEmpty())

        val container1 = ContainerState(
            contextId = "1",
            name = "Personal",
            color = ContainerState.Color.GREEN,
            icon = ContainerState.Icon.CART,
        )
        val container2 = ContainerState(
            contextId = "2",
            name = "Work",
            color = ContainerState.Color.RED,
            icon = ContainerState.Icon.FINGERPRINT,
        )
        val container3 = ContainerState(
            contextId = "3",
            name = "Shopping",
            color = ContainerState.Color.BLUE,
            icon = ContainerState.Icon.BRIEFCASE,
        )
        state = BrowserStateReducer.reduce(state, ContainerAction.AddContainersAction(listOf(container1, container2)))

        assertFalse(state.containers.isEmpty())
        assertEquals(container1, state.containers.values.first())
        assertEquals(container2, state.containers.values.last())

        // Assert that the state remains the same if the existing containers are re-added.
        val stateBeforeReAdd = state
        state = BrowserStateReducer.reduce(state, ContainerAction.AddContainersAction(listOf(container1, container2)))
        assertEquals(stateBeforeReAdd, state)

        // Assert that only non-existing containers are added.
        state = BrowserStateReducer.reduce(state, ContainerAction.AddContainersAction(listOf(container1, container2, container3)))
        assertEquals(3, state.containers.size)
        assertEquals(container1, state.containers.values.first())
        assertEquals(container2, state.containers.values.elementAt(1))
        assertEquals(container3, state.containers.values.last())
    }

    @Test
    fun `RemoveContainerAction - Removes a container from the BrowserState containers`() {
        assertTrue(state.containers.isEmpty())

        val container1 = ContainerState(
            contextId = "1",
            name = "Personal",
            color = ContainerState.Color.BLUE,
            icon = ContainerState.Icon.BRIEFCASE,
        )
        val container2 = ContainerState(
            contextId = "2",
            name = "Shopping",
            color = ContainerState.Color.GREEN,
            icon = ContainerState.Icon.CIRCLE,
        )
        state = BrowserStateReducer.reduce(state, ContainerAction.AddContainerAction(container1))
        state = BrowserStateReducer.reduce(state, ContainerAction.AddContainerAction(container2))

        assertFalse(state.containers.isEmpty())
        assertEquals(container1, state.containers.values.first())
        assertEquals(container2, state.containers.values.last())

        state = BrowserStateReducer.reduce(state, ContainerAction.RemoveContainerAction(container1.contextId))

        assertEquals(1, state.containers.size)
        assertEquals(container2, state.containers.values.first())
    }
}
