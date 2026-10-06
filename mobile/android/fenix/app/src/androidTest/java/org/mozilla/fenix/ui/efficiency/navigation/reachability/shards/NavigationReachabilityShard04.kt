package org.mozilla.fenix.ui.efficiency.navigation.reachability.shards

import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import org.mozilla.fenix.ui.efficiency.navigation.reachability.BaseNavigationShardTest
import org.mozilla.fenix.ui.efficiency.navigation.reachability.NavigationCase
import org.mozilla.fenix.ui.efficiency.navigation.reachability.NavigationShardData

@RunWith(Parameterized::class)
class NavigationReachabilityShard04(
    private val case: NavigationCase,
) : BaseNavigationShardTest(case) {

    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{index}: {0}")
        fun data(): List<Array<Any>> = NavigationShardData.loadShard(
            shardIndex = 4,
            shardCount = 20,
        )
    }

    @Test
    fun verifyNavigationReachability() {
        runNavigationCase()
    }
}
