package org.mozilla.fenix.ui.efficiency.navigation.interaction

object InteractionShardData {

    fun loadShard(
        shardIndex: Int,
        shardCount: Int,
        runStateOverride: String? = null,
    ): List<Array<Any>> {
        val runState = runStateOverride
            ?: System.getProperty("testRunState")?.takeIf { it.isNotBlank() }
            ?: ""

        return InteractionCaseFactory
            .buildInteractionCasesForShard(
                runState = runState,
                shardIndex = shardIndex,
                shardCount = shardCount,
            )
            .map { arrayOf(it as Any) }
    }
}
