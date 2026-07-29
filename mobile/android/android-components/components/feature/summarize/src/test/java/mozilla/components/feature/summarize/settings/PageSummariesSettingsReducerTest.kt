/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.settings

import org.junit.Assert.assertEquals
import org.junit.Test

class PageSummariesSettingsReducerTest {

    @Test
    fun `WHEN summarize pages is toggled on THEN it is enabled in the state`() {
        val state = SummarizeSettingsState(
            isFeatureEnabled = false,
            isGestureEnabled = false,
        )
        val result = summarizeSettingsReducer(state, SummarizePagesPreferenceToggled)

        assertEquals(state.copy(isFeatureEnabled = true), result)
    }

    @Test
    fun `WHEN summarize pages is toggled off THEN it is disabled in the state`() {
        val state = SummarizeSettingsState(
            isFeatureEnabled = true,
            isGestureEnabled = true,
        )
        val result = summarizeSettingsReducer(state, SummarizePagesPreferenceToggled)

        assertEquals(state.copy(isFeatureEnabled = false), result)
    }

    @Test
    fun `WHEN shake to summarize is toggled on THEN it is enabled in the state`() {
        val state = SummarizeSettingsState(
            isFeatureEnabled = true,
            isGestureEnabled = false,
        )
        val result = summarizeSettingsReducer(state, ShakeToSummarizePreferenceToggled)

        assertEquals(state.copy(isGestureEnabled = true), result)
    }

    @Test
    fun `WHEN shake to summarize is toggled off THEN it is disabled in the state`() {
        val state = SummarizeSettingsState(
            isFeatureEnabled = true,
            isGestureEnabled = true,
        )
        val result = summarizeSettingsReducer(state, ShakeToSummarizePreferenceToggled)

        assertEquals(state.copy(isGestureEnabled = false), result)
    }

    @Test
    fun `WHEN learn more is clicked THEN state is unchanged`() {
        val state = SummarizeSettingsState(
            isFeatureEnabled = true,
            isGestureEnabled = true,
        )
        val result = summarizeSettingsReducer(state, LearnMoreClicked)

        assertEquals(state, result)
    }
}
