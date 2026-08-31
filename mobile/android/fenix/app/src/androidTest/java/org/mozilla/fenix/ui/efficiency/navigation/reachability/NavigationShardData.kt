package org.mozilla.fenix.ui.efficiency.navigation.reachability

import org.mozilla.fenix.ui.efficiency.navigation.reachability.NavigationCaseFactory

object NavigationShardData {

    fun loadShard(
        shardIndex: Int,
        shardCount: Int,
        runStateOverride: String? = null,
    ): List<Array<Any>> {
        val runState = runStateOverride
            ?: System.getProperty("testRunState")?.takeIf { it.isNotBlank() }
            ?: ""

        return NavigationCaseFactory
            .buildReachabilityCasesForShard(
                runState = runState,
                shardIndex = shardIndex,
                shardCount = shardCount,
            )
            .map { arrayOf(it as Any) }
    }
}
