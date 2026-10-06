/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.example

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class ExampleFeatureTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var feature: ExampleFeature
    private var updateMessages = mutableListOf<String>()

    @Before
    fun setup() {
        updateMessages.clear()
        feature = ExampleFeature(
            onUpdate = { message -> updateMessages.add(message) },
            mainDispatcher = testDispatcher,
        )
    }

    @Test
    fun `start triggers onUpdate callback`() = runTest(testDispatcher) {
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(1, updateMessages.size)
        assert(updateMessages[0].startsWith("Example feature update: Processed: data-"))
    }

    @Test
    fun `stop cancels running job`() = runTest(testDispatcher) {
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()
        feature.stop()
        testDispatcher.scheduler.advanceUntilIdle()
    }
}
