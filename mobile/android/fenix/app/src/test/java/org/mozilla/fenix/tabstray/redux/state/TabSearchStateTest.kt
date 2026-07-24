/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.mockk
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TabSearchStateTest {

    @Test
    fun `WHEN TabSearchState is created with defaults THEN values are empty and not loading`() {
        val state = TabSearchState()

        assertEquals("", state.query)
        assertTrue(state.searchResults.isEmpty())
        assertFalse(state.showNoResults)
    }

    @Test
    fun `WHEN query is empty AND searchResults is empty THEN showNoResults is false`() {
        val state = TabSearchState(
            query = "",
            searchResults = emptyList(),
        )

        assertFalse(state.showNoResults)
    }

    @Test
    fun `WHEN query is not empty AND searchResults is empty THEN showNoResults is true`() {
        val state = TabSearchState(
            query = "Mozilla",
            searchResults = emptyList(),
        )

        assertTrue(state.showNoResults)
    }

    @Test
    fun `WHEN query is not empty AND searchResults is not empty THEN showNoResults is false`() {
        val state = TabSearchState(
            query = "Mozilla",
            searchResults = listOf(createTab("mozilla.org", id = "mozilla")),
        )

        assertFalse(state.showNoResults)
    }
}
