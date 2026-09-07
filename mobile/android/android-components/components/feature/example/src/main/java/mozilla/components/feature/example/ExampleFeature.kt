/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.example

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import mozilla.components.support.base.feature.LifecycleAwareFeature
import kotlin.random.Random

/**
 * An example feature class that ties multiple gradle modules or individual pieces together to form a unified entry
 * point.
 *
 * The can extend [LifecycleAwareFeature] if it requires lifecycle-events to start/stop it.
 */
class ExampleFeature(
    private val onUpdate: (String) -> Unit,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : LifecycleAwareFeature {
    private var job: Job? = null
    private val scope = CoroutineScope(mainDispatcher)

    override fun start() {
        job = scope.launch {
            val result = processData("data-${Random.nextInt(0, 9)}")
            onUpdate("Example feature update: $result")
        }
    }

    override fun stop() {
        job?.cancel()
    }

    private fun processData(input: String): String {
        return "Processed: $input"
    }
}
