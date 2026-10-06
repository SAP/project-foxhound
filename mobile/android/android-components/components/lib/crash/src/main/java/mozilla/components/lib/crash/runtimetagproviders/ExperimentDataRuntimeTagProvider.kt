/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.runtimetagproviders

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import mozilla.components.lib.crash.RuntimeTag
import mozilla.components.lib.crash.RuntimeTagProvider

/**
 * Helper class that contains experiment data.
 *
 * @property data a map of variable names and their values.
 */
@Serializable
data class ExperimentData(val data: Map<String, String>) {
    /**
     * Encodes the experiment data as a JSON string.
     */
    fun asJsonString(): String = Json.encodeToString(this)

    /**
    * Companion object for building [ExperimentData].
    */
    companion object {
        /**
         * Initializes an [ExperimentData] object from a JSON string.
         *
         * @param json experiment data as a JSON string.
         * @return [ExperimentData] if valid json or null.
         */
        fun fromJsonString(json: String): ExperimentData? = Result.runCatching {
            Json.decodeFromString<ExperimentData>(json)
        }.getOrNull()
    }
}

/**
 * Interface to provide experiment data.
 */
fun interface ExperimentDataProvider {
    /**
     * Retrieve the current [ExperimentData].
     *
     * @return [ExperimentData] containing the current experiment state for the session.
     */
    fun getExperimentData(): ExperimentData
}

/**
 * Includes the current release version with the crash so that it can be persisted.
 *
 * @param experimentDataProvider a [ExperimentDataProvider] used to get the sessions experiment data.
 */
class ExperimentDataRuntimeTagProvider(
    private val experimentDataProvider: ExperimentDataProvider,
) : RuntimeTagProvider {
    override fun invoke(): Map<String, String> {
        return mapOf(
             RuntimeTag.EXPERIMENT_DATA to experimentDataProvider.getExperimentData().asJsonString(),
        )
    }
}
