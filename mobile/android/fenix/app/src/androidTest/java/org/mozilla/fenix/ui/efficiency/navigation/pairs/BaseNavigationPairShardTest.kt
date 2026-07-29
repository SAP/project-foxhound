package org.mozilla.fenix.ui.efficiency.navigation.pairs

import android.util.Log
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.navigation.pairs.NavigationPairCase

abstract class BaseNavigationPairShardTest(
    private val case: NavigationPairCase,
) : BaseTest() {

    protected fun runNavigationPairCase() {
        Log.i(
            "NavigationPairTest",
            "TestRail=${case.testRailId} Pair=${case.label} State=${case.state}",
        )
        println("TestRail=${case.testRailId} Pair=${case.label} State=${case.state}")

        val firstPageObj: BasePage = case.firstPage(on)
        firstPageObj.navigateToPage()

        val secondPageObj: BasePage = case.secondPage(on)
        secondPageObj.navigateToPage()
    }
}
