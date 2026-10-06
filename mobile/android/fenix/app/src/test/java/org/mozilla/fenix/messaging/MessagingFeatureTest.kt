/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.messaging

import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import mozilla.components.support.utils.RunWhenReadyQueue
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.MessagingAction

class MessagingFeatureTest {

    @Test
    fun `WHEN start is called and queue is not ready THEN do nothing`() = runTest {
        val appStore: AppStore = spyk(AppStore())
        val queue = RunWhenReadyQueue(this)
        val binding = MessagingFeature(
            appStore = appStore,
            surface = FenixMessageSurfaceId.HOMESCREEN,
            runWhenReadyQueue = queue,
        )

        binding.start()
        testScheduler.advanceUntilIdle()

        verify(exactly = 0) { appStore.dispatch(MessagingAction.Evaluate(FenixMessageSurfaceId.HOMESCREEN)) }
    }

    @Test
    fun `WHEN start is called and queue is ready THEN evaluate message`() = runTest {
        val appStore: AppStore = spyk(AppStore())
        val queue = RunWhenReadyQueue(this)
        val binding = MessagingFeature(
            appStore = appStore,
            surface = FenixMessageSurfaceId.HOMESCREEN,
            runWhenReadyQueue = queue,
        )

        binding.start()
        queue.ready()
        testScheduler.advanceUntilIdle()

        verify { appStore.dispatch(MessagingAction.Evaluate(FenixMessageSurfaceId.HOMESCREEN)) }
    }
}
