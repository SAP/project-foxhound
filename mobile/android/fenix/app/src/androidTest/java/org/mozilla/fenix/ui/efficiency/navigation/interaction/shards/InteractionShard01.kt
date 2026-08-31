package org.mozilla.fenix.ui.efficiency.navigation.interaction.shards

import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import org.mozilla.fenix.ui.efficiency.navigation.interaction.BaseInteractionShardTest
import org.mozilla.fenix.ui.efficiency.navigation.interaction.InteractionCase
import org.mozilla.fenix.ui.efficiency.navigation.interaction.InteractionShardData

@RunWith(Parameterized::class)
class InteractionShard01(
    private val case: InteractionCase,
) : BaseInteractionShardTest(case) {

    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{index}: {0}")
        fun data(): List<Array<Any>> = InteractionShardData.loadShard(
            shardIndex = 1,
            shardCount = 1,
        )
    }

    @Test
    fun verifyInteractionCase() {
        runInteractionCase()
    }
}
