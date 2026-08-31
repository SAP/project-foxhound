package org.mozilla.fenix.reviewprompt

import mozilla.components.support.test.assertUnused
import mozilla.components.support.test.robolectric.testContext
import mozilla.telemetry.glean.private.EventMetricType
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.CustomReviewPrompt
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.ReviewPromptAction
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.nimbus.FakeNimbusEventStore
import org.mozilla.fenix.nimbus.RecordEventMode.Cancel
import org.mozilla.fenix.nimbus.RecordEventMode.CompleteSuccessfully
import org.mozilla.fenix.nimbus.RecordEventMode.ThrowException
import org.robolectric.RobolectricTestRunner
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/**
 * [ReviewPromptMiddleware] tests that use [FenixGleanTestRule].
 */
@RunWith(RobolectricTestRunner::class)
class ReviewPromptMiddlewareGleanTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val eventStore = FakeNimbusEventStore()

    private val store = AppStore(
        middlewares = listOf(
            ReviewPromptMiddleware(
                shouldUseNewTriggerCriteria = { assertUnused() },
                shouldShowCustomPrompt = { assertUnused() },
                disableCustomPrompt = {
                    // This is called, but there's nothing to do in these tests.
                    // [ReviewPromptMiddlewareTest] verifies this behaves as expected.
                },
                createJexlHelper = { assertUnused() },
                buildTriggerMainCriteria = { assertUnused() },
                buildTriggerSubCriteria = { assertUnused() },
                buildTriggerLegacyCriteria = { assertUnused() },
                nimbusEventStore = eventStore,
            ),
        ),
    )

    @Test
    fun `WHEN recordEvent succeeds THEN it is recorded`() {
        assertNull(CustomReviewPrompt.nimbusEventRecorded.testGetValue())
        eventStore.recordEventMode = CompleteSuccessfully

        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        assertEventRecorded(
            type = CustomReviewPrompt.nimbusEventRecorded,
            expectedResult = "success",
        )
    }

    @Test
    fun `WHEN recordEvent is cancelled THEN it is recorded`() {
        assertNull(CustomReviewPrompt.nimbusEventRecorded.testGetValue())
        eventStore.recordEventMode = Cancel

        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        assertEventRecorded(
            type = CustomReviewPrompt.nimbusEventRecorded,
            expectedResult = "cancelled",
        )
    }

    @Test
    fun `WHEN recordEvent fails THEN it is recorded`() {
        assertNull(CustomReviewPrompt.nimbusEventRecorded.testGetValue())
        eventStore.recordEventMode = ThrowException

        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        assertEventRecorded(
            type = CustomReviewPrompt.nimbusEventRecorded,
            expectedResult = "error",
        )
    }

    @Test
    fun `WHEN recordEvent succeeds THEN counter is incremented`() {
        val counter = CustomReviewPrompt.recordNimbusEventAttempts["success"]
        assertNull(counter.testGetValue())
        eventStore.recordEventMode = CompleteSuccessfully

        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        assertEquals(1, counter.testGetValue())
    }

    @Test
    fun `WHEN recordEvent is cancelled THEN counter is incremented`() {
        val counter = CustomReviewPrompt.recordNimbusEventAttempts["cancelled"]
        assertNull(counter.testGetValue())
        eventStore.recordEventMode = Cancel

        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        assertEquals(1, counter.testGetValue())
    }

    @Test
    fun `WHEN recordEvent fails THEN counter is incremented`() {
        val counter = CustomReviewPrompt.recordNimbusEventAttempts["error"]
        assertNull(counter.testGetValue())
        eventStore.recordEventMode = ThrowException

        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        assertEquals(1, counter.testGetValue())
    }

    private fun assertEventRecorded(type: EventMetricType<*>, expectedResult: String) {
        type.testGetValue().let { snapshot ->
            assertNotNull(snapshot)
            assertEquals(1, snapshot.size)

            snapshot.single().extra.let { extras ->
                assertNotNull(extras)
                assertEquals(expectedResult, extras["result"])
            }
        }
    }
}
