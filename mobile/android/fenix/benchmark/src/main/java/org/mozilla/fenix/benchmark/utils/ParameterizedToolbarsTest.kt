/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.benchmark.utils

import org.junit.runners.Parameterized

/**
 * Base class for parameterized tests that use both the toolbar View and the composable toolbar.
 */
open class ParameterizedToolbarsTest {
    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "composableToolbar={0}")
        fun data(): Collection<Array<Any>> {
            return listOf(
                arrayOf(false),
                arrayOf(true),
            )
        }
    }
}
