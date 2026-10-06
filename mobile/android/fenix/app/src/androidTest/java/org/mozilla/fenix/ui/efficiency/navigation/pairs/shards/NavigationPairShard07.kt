package org.mozilla.fenix.ui.efficiency.navigation.pairs.shards

import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import org.mozilla.fenix.ui.efficiency.navigation.pairs.BaseNavigationPairShardTest
import org.mozilla.fenix.ui.efficiency.navigation.pairs.NavigationPairCase
import org.mozilla.fenix.ui.efficiency.navigation.pairs.NavigationPairShardData

@RunWith(Parameterized::class)
class NavigationPairShard07(
    private val case: NavigationPairCase,
) : BaseNavigationPairShardTest(case) {

    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{index}: {0}")
        fun data(): List<Array<Any>> = NavigationPairShardData.loadShard(
            shardIndex = 7,
            shardCount = 20,
        )
    }

    @Test
    fun verifyNavigationPairReachability() {
        runNavigationPairCase()
    }
}
