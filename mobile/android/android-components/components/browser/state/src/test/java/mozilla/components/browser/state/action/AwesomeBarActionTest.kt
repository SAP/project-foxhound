/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.state.AwesomeBarState
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.concept.awesomebar.AwesomeBar
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AwesomeBarActionTest {
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        state = BrowserState()
    }

    @Test
    fun `VisibilityStateUpdated - Stores updated visibility state`() {
        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isEmpty())
        assertNull(state.awesomeBarState.clickedSuggestion)

        val provider: AwesomeBar.SuggestionProvider = mock()
        val providerGroup = AwesomeBar.SuggestionProviderGroup(listOf(provider))
        val providerGroupSuggestions = listOf(AwesomeBar.Suggestion(provider))

        state = BrowserStateReducer.reduce(
            state,
            AwesomeBarAction.VisibilityStateUpdated(
                AwesomeBar.VisibilityState(
                    visibleProviderGroups = mapOf(providerGroup to providerGroupSuggestions),
                ),
            ),
        )

        assertEquals(1, state.awesomeBarState.visibilityState.visibleProviderGroups.size)
        assertEquals(providerGroupSuggestions, state.awesomeBarState.visibilityState.visibleProviderGroups[providerGroup])
        assertNull(state.awesomeBarState.clickedSuggestion)
    }

    @Test
    fun `SuggestionClicked - Stores clicked suggestion`() {
        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isEmpty())
        assertNull(state.awesomeBarState.clickedSuggestion)

        val provider: AwesomeBar.SuggestionProvider = mock()
        val suggestion = AwesomeBar.Suggestion(provider)

        state = BrowserStateReducer.reduce(state, AwesomeBarAction.SuggestionClicked(suggestion))

        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isEmpty())
        assertEquals(suggestion, state.awesomeBarState.clickedSuggestion)
    }

    @Test
    fun `EngagementFinished - Completed engagement resets state`() {
        val provider: AwesomeBar.SuggestionProvider = mock()
        val suggestion = AwesomeBar.Suggestion(provider)
        val providerGroup = AwesomeBar.SuggestionProviderGroup(listOf(provider))
        val providerGroupSuggestions = listOf(suggestion)
        state = BrowserState(
            awesomeBarState = AwesomeBarState(
                visibilityState = AwesomeBar.VisibilityState(
                    visibleProviderGroups = mapOf(providerGroup to providerGroupSuggestions),
                ),
                clickedSuggestion = suggestion,
            ),
        )

        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isNotEmpty())
        assertNotNull(state.awesomeBarState.clickedSuggestion)

        state = BrowserStateReducer.reduce(state, AwesomeBarAction.EngagementFinished(abandoned = false))

        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isEmpty())
        assertNull(state.awesomeBarState.clickedSuggestion)
    }

    @Test
    fun `EngagementFinished - Abandoned engagement resets state`() {
        val provider: AwesomeBar.SuggestionProvider = mock()
        val suggestion = AwesomeBar.Suggestion(provider)
        val providerGroup = AwesomeBar.SuggestionProviderGroup(listOf(provider))
        val providerGroupSuggestions = listOf(suggestion)
        state = BrowserState(
            awesomeBarState = AwesomeBarState(
                visibilityState = AwesomeBar.VisibilityState(
                    visibleProviderGroups = mapOf(providerGroup to providerGroupSuggestions),
                ),
                clickedSuggestion = suggestion,
            ),
        )

        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isNotEmpty())
        assertNotNull(state.awesomeBarState.clickedSuggestion)

        state = BrowserStateReducer.reduce(state, AwesomeBarAction.EngagementFinished(abandoned = true))

        assertTrue(state.awesomeBarState.visibilityState.visibleProviderGroups.isEmpty())
        assertNull(state.awesomeBarState.clickedSuggestion)
    }
}
