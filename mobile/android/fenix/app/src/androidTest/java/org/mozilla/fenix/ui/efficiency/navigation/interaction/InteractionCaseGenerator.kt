package org.mozilla.fenix.ui.efficiency.navigation.interaction

import android.util.Log

object InteractionCaseGenerator {

    private const val TAG = "InteractionGenerator"

    fun logInteractionCaseBoilerplate() {
        val cases = InteractionTestPlanner.buildInteractionCases()

        Log.i(TAG, "Generated ${cases.size} interaction case templates:")
        Log.i(TAG, "--------------------------------------------------")

        cases.forEach { case ->
            Log.i(
                TAG,
                """
                // pageName=${case.pageName}, property=${case.pagePropertyName}, paths=${case.pathCount}
                // interaction=${case.interactionSelectorName}
                // description=${case.interactionDescription}
                // expectedGroup=${case.expectedGroup}
                // expectedSelectors=${case.expectedSelectorNames}

                InteractionCase(
                    label = "${case.pageName} - ${case.interactionSelectorName}",
                    testRailId = "TBD",
                    page = { ${case.pagePropertyName} },
                    interactionSelectorName = "${case.interactionSelectorName}",
                    expectedSelectorNames = listOf(
                        ${case.expectedSelectorNames.joinToString { "\"$it\"" }}
                    ),
                    state = runState.ifBlank { "Interaction Factory" },
                ),
                """.trimIndent(),
            )
        }

        Log.i(TAG, "--------------------------------------------------")
    }
}
