/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

import org.junit.Assert.assertFalse
import org.junit.Test

class TabsTrayConfigTest {
    @Test
    fun `WHEN config is created THEN tab groups drag and drop flag defaults to false`() {
        assertFalse(TabsTrayState.TabsTrayConfig().tabGroupsDragAndDropEnabled)
    }

    @Test
    fun `WHEN config is created THEN tab groups onboarding flag defaults to false`() {
        assertFalse(TabsTrayState.TabsTrayConfig().tabGroupsOnboardingEnabled)
    }
}
