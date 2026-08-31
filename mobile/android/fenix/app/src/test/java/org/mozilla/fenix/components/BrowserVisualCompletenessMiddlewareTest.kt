package org.mozilla.fenix.components

import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.support.utils.RunWhenReadyQueue
import org.junit.Assert.assertTrue
import org.junit.Test

class BrowserVisualCompletenessMiddlewareTest {
    @Test
    fun `WHEN first contentful paint occurs THEN queue is marked as ready`() = runTest {
        val queue = RunWhenReadyQueue(this)
        val middleware = BrowserVisualCompletenessMiddleware(queue)

        middleware.invoke(
            mockk(),
            {},
            ContentAction.UpdateFirstContentfulPaintStateAction("id", true),
        )

        assertTrue(queue.isReady())
    }
}
