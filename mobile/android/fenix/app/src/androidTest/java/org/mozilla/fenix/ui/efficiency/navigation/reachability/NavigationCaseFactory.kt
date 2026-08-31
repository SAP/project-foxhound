package org.mozilla.fenix.ui.efficiency.navigation.reachability

import android.util.Log
import org.mozilla.fenix.ui.efficiency.navigation.planning.NavigationTestPlanner
import org.mozilla.fenix.ui.efficiency.navigation.planning.ShardUtils

object NavigationCaseFactory {

    private const val TAG = "NavigationCaseFactory"

    fun buildReachabilityCases(
        runState: String,
    ): List<NavigationCase> {
        val generatedCases = NavigationTestPlanner.buildReachabilityCases()

        val cases = generatedCases.map { generated ->
            NavigationCase(
                label = generated.propertyName.toDisplayLabel(),
                testRailId = "TBD",
                page = generated.page,
                state = runState.ifBlank { "Navigation Reachability" },
            )
        }

        Log.i(TAG, "Built ${cases.size} navigation reachability cases.")
        return cases
    }

    fun buildReachabilityCasesForShard(
        runState: String,
        shardIndex: Int,
        shardCount: Int,
    ): List<NavigationCase> {
        val allCases = buildReachabilityCases(runState)
        val shardCases = ShardUtils.filterForShard(
            items = allCases,
            shardIndex = shardIndex,
            shardCount = shardCount,
        )

        Log.i(
            TAG,
            "Shard $shardIndex/$shardCount contains ${shardCases.size} " +
                "of ${allCases.size} total navigation reachability cases.",
        )

        return shardCases
    }

    private fun String.toDisplayLabel(): String {
        val name = replaceFirstChar { char ->
            if (char.isLowerCase()) char.titlecase() else char.toString()
        }

        return if (name.endsWith("Page") || name.endsWith("Component")) {
            name
        } else {
            "${name}Page"
        }
    }
}
