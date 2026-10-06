/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.browser.compose

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionMode
import org.mozilla.fenix.tabstray.browser.compose.interactable.InteractionState

class InteractionModeTest {
    @Test
    fun `GIVEN Grid None mode THEN source and target are both InteractionState Grid None`() {
        assertEquals(InteractionMode.Grid.None.target, InteractionState.Grid.None)
        assertEquals(InteractionMode.Grid.None.source, InteractionState.Grid.None)
    }

    @Test
    fun `GIVEN List None mode THEN source and target are both InteractionState List None`() {
        assertEquals(InteractionMode.List.None.target, InteractionState.List.None)
        assertEquals(InteractionMode.List.None.source, InteractionState.List.None)
    }

    @Test
    fun `GIVEN grid Reorder mode THEN placeAfter defaults to true`() {
        val mode = InteractionMode.Grid.Reordering(
            source = fakeGridActiveState(),
            target = fakeGridActiveState(),
        )
        assertEquals(mode.placeAfter, true)
    }

    @Test
    fun `GIVEN list Reorder mode THEN placeAfter defaults to true`() {
        val mode = InteractionMode.List.Reordering(
            source = fakeListActiveState(),
            target = fakeListActiveState(),
        )
        assertEquals(mode.placeAfter, true)
    }

    @Test
    fun `GIVEN Grid Reorder mode WHEN source is accessed THEN constructor argument is preserved`() {
        val source = fakeGridActiveState(key = "key1")
        val target = fakeGridActiveState(key = "key2")
        val mode = InteractionMode.Grid.Reordering(
            source = source,
            target = target,
        )
        assertEquals(source, mode.source)
    }

    @Test
    fun `GIVEN List Reorder mode WHEN source is accessed THEN constructor argument is preserved`() {
        val source = fakeListActiveState(key = "key1")
        val target = fakeListActiveState(key = "key2")
        val mode = InteractionMode.List.Reordering(
            source = source,
            target = target,
        )
        assertEquals(source, mode.source)
    }

    @Test
    fun `GIVEN Grid Reorder mode WHEN target is accessed THEN constructor argument is preserved`() {
        val source = fakeGridActiveState(key = "key1")
        val target = fakeGridActiveState(key = "key2")
        val mode = InteractionMode.Grid.Reordering(
            source = source,
            target = target,
        )
        assertEquals(target, mode.target)
    }

    @Test
    fun `GIVEN List Reorder mode WHEN target is accessed THEN constructor argument is preserved`() {
        val source = fakeListActiveState(key = "key1")
        val target = fakeListActiveState(key = "key2")
        val mode = InteractionMode.List.Reordering(
            source = source,
            target = target,
        )
        assertEquals(target, mode.target)
    }

    @Test
    fun `Given Grid Scroll mode THEN source and target are None`() {
        assertEquals(InteractionState.Grid.None, InteractionMode.Grid.Scroll(0f).source)
        assertEquals(InteractionState.Grid.None, InteractionMode.Grid.Scroll(0f).target)
    }

    @Test
    fun `Given List Scroll mode THEN source and target are None`() {
        assertEquals(InteractionState.List.None, InteractionMode.List.Scroll(0f).source)
        assertEquals(InteractionState.List.None, InteractionMode.List.Scroll(0f).target)
    }
}
