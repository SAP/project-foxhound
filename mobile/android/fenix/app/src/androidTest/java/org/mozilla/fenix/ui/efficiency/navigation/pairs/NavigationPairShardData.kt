package org.mozilla.fenix.ui.efficiency.navigation.pairs

object NavigationPairShardData {

    fun loadShard(
        shardIndex: Int,
        shardCount: Int,
        runStateOverride: String? = null,
    ): List<Array<Any>> {
        NavigationPairGraphBootstrap.ensureInitialized()

        val runState = runStateOverride
            ?: System.getProperty("testRunState")?.takeIf { it.isNotBlank() }
            ?: ""

        return NavigationPairCaseFactory
            .buildPairCasesForShard(
                runState = runState,
                shardIndex = shardIndex,
                shardCount = shardCount,
            )
            .map { arrayOf(it as Any) }
    }
}
