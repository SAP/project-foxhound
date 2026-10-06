/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TabGroupFormStateTest {

    @Test
    fun `WHEN tabGroupId is null THEN inEditState is false`() {
        val formState = TabGroupFormState(
            tabGroupId = null,
            name = "",
            nextTabGroupNumber = 1,
            edited = false,
        )

        assertFalse(formState.inEditState)
    }

    @Test
    fun `WHEN tabGroupId is not null THEN inEditState is true`() {
        val formState = TabGroupFormState(
            tabGroupId = "1",
            name = "Group",
            edited = false,
        )

        assertTrue(formState.inEditState)
    }
}
