/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.navigation.planning

import android.util.Log
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.PageContext
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry

// TODO (Jackie J. 3/23/2026): fix all of these horrible names, they're temporary.
object NavigationTestPlannerLogger {

    private const val TAG = "NavigationPlanner"

    fun logReachabilityPlan(context: PageContext) {
        val cases = NavigationTestPlanner.buildReachabilityCases()

        Log.i(TAG, "Built ${cases.size} reachability cases")

        cases.forEachIndexed { index, case ->
            val page: BasePage = case.page(context)
            val pageName = page.pageName
            val pathCount = NavigationRegistry.findAllPaths("AppEntry", pageName).size

            Log.i(
                TAG,
                " ${index + 1}. $pageName (property=${case.propertyName}, paths=$pathCount)",
            )
        }
    }
}
