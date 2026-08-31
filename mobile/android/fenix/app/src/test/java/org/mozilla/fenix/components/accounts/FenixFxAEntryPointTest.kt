/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.accounts

import org.junit.Assert.assertEquals
import org.junit.Test

class FenixFxAEntryPointTest {

    @Test
    fun `GIVEN all entry points WHEN checking entry names THEN all entry names are unique`() {
        val entryNames = FenixFxAEntryPoint.entries.map { it.entryName }
        assertEquals(
            "Duplicate entryName values found: ${entryNames.groupBy { it }.filter { it.value.size > 1 }.keys}",
            entryNames.distinct().size,
            entryNames.size,
        )
    }
}
