/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SwitchWithCaptionPreferenceTest {

    @Test
    fun `WHEN the preference is created THEN it uses the caption layout`() {
        val preference = SwitchWithCaptionPreference(testContext)

        assertEquals(R.layout.preference_switch_with_caption, preference.layoutResource)
    }

    @Test
    fun `WHEN the caption is set THEN it returns the same value`() {
        val preference = SwitchWithCaptionPreference(testContext)

        preference.caption = "Available only when Google is enabled"

        assertEquals("Available only when Google is enabled", preference.caption)
    }

    @Test
    fun `GIVEN the preference is not bound WHEN the caption is set THEN it does not throw`() {
        val preference = SwitchWithCaptionPreference(testContext)

        preference.caption = "A caption"
        preference.caption = null

        assertNull(preference.caption)
    }
}
