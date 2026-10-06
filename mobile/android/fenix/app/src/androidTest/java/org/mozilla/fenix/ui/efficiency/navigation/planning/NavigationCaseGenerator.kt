/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.navigation.planning

import android.util.Log
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.PageContext
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry

// TODO (Jackie J. 3/23/2026): fix all of these horrible names, they're temporary.
object NavigationCaseGenerator {

    private const val TAG = "NavCaseGenerator"

    fun logNavigationCaseBoilerplate(context: PageContext) {
        val cases = NavigationTestPlanner.buildReachabilityCases()

        Log.i(TAG, "Generated ${cases.size} reachability case templates:")
        Log.i(TAG, "--------------------------------------------------")

        cases.forEach { case ->
            val pageObj: BasePage = case.page(context)
            val pageName = pageObj.pageName
            val pathCount = NavigationRegistry.findAllPaths("AppEntry", pageName).size

            Log.i(
                TAG,
                """
                // pageName=$pageName, property=${case.propertyName}, paths=$pathCount
                Case(
                    label = "$pageName",
                    testRailId = "TBD",
                    page = { ${case.propertyName} },
                    state = runState.ifBlank { "Navigation Reachability" },
                ),
                """.trimIndent(),
            )
        }

        Log.i(TAG, "--------------------------------------------------")
    }
}
