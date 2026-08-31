package org.mozilla.fenix.reviewprompt

import androidx.test.core.app.ApplicationProvider.getApplicationContext
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.service.nimbus.Nimbus
import org.json.JSONObject
import org.junit.runner.RunWith
import org.mozilla.experiments.nimbus.NimbusAppInfo
import java.time.Duration
import java.time.temporal.ChronoUnit.WEEKS
import java.time.temporal.ChronoUnit.YEARS
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private const val REVIEW_PROMPT_SHOWN_NIMBUS_EVENT_ID = "review_prompt_shown"

/**
 * Tests for trigger criteria functions used in [ReviewPromptMiddleware].
 *
 * Note: At the time of writing [Nimbus] doesn't work in tests on Apple Silicon machines
 * without building application-services locally and doing a local substitution build.
 */
@RunWith(AndroidJUnit4::class)
class ReviewPromptMiddlewareTriggerCriteriaTest {

    private val nimbus = Nimbus(
        context = getApplicationContext(),
        appInfo = NimbusAppInfo(
            appName = ReviewPromptMiddlewareTriggerCriteriaTest::javaClass.name,
            channel = "test",
        ),
        server = null,
        recordedContext = null,
    )

    private val jexlHelper = nimbus.createMessageHelper()

    @Test
    fun `WHEN we've never shown the prompt THEN hasNotBeenPromptedLastFourMonths returns true`() {
        assertTrue(hasNotBeenPromptedLastFourMonths(jexlHelper))
    }

    @Test
    fun `WHEN we showed the prompt 17 weeks ago last THEN hasNotBeenPromptedLastFourMonths returns true`() {
        nimbus.events.recordPastEvent(
            eventId = REVIEW_PROMPT_SHOWN_NIMBUS_EVENT_ID,
            durationAgo = WEEKS.duration.multipliedBy(17),
        )

        assertTrue(hasNotBeenPromptedLastFourMonths(jexlHelper))
    }

    @Test
    fun `WHEN we showed the prompt 15 weeks ago last THEN hasNotBeenPromptedLastFourMonths returns false`() {
        nimbus.events.recordPastEvent(
            eventId = REVIEW_PROMPT_SHOWN_NIMBUS_EVENT_ID,
            durationAgo = WEEKS.duration.multipliedBy(15),
        )

        assertFalse(hasNotBeenPromptedLastFourMonths(jexlHelper))
    }

    @Test
    fun `WHEN we just showed the prompt THEN hasNotBeenPromptedLastFourMonths returns false`() {
        nimbus.events.recordEventSync(eventId = REVIEW_PROMPT_SHOWN_NIMBUS_EVENT_ID)

        assertFalse(hasNotBeenPromptedLastFourMonths(jexlHelper))
    }

    @Test
    fun `WHEN user has never created a bookmark THEN createdAtLeastOneBookmark returns false`() {
        assertFalse(createdAtLeastOneBookmark(jexlHelper))
    }

    @Test
    fun `WHEN user has created a bookmark THEN createdAtLeastOneBookmark returns true`() {
        nimbus.events.recordEventSync(eventId = "bookmark_added")

        assertTrue(createdAtLeastOneBookmark(jexlHelper))
    }

    @Test
    fun `WHEN user has created multiple bookmarks THEN createdAtLeastOneBookmark returns true`() {
        nimbus.events.recordEventSync(count = 100, eventId = "bookmark_added")

        assertTrue(createdAtLeastOneBookmark(jexlHelper))
    }

    @Test
    fun `WHEN user created a bookmark over 4 years ago last THEN createdAtLeastOneBookmark returns false`() {
        nimbus.events.recordPastEvent(eventId = "bookmark_added", durationAgo = YEARS.duration.multipliedBy(5))

        assertFalse(createdAtLeastOneBookmark(jexlHelper))
    }

    @Test
    fun `WHEN is default browser THEN isDefaultBrowser returns true`() {
        val customAttributes = JSONObject(mapOf("is_default_browser" to true))
        val jexlHelper = nimbus.createMessageHelper(customAttributes)

        assertTrue(isDefaultBrowser(jexlHelper))
    }

    @Test
    fun `WHEN is not default browser THEN isDefaultBrowser returns false`() {
        val customAttributes = JSONObject(mapOf("is_default_browser" to false))
        val jexlHelper = nimbus.createMessageHelper(customAttributes)

        assertFalse(isDefaultBrowser(jexlHelper))
    }

    @Test
    fun `WHEN app opened for the first time THEN usedAppOnAtLeastFourOfLastSevenDays returns false`() {
        nimbus.events.recordEventSync(eventId = "app_opened")

        assertFalse(usedAppOnAtLeastFourOfLastSevenDays(jexlHelper))
    }

    @Test
    fun `WHEN app opened 4 times on 1 day THEN usedAppOnAtLeastFourOfLastSevenDays returns false`() {
        nimbus.events.recordEventSync(count = 4, eventId = "app_opened")

        assertFalse(usedAppOnAtLeastFourOfLastSevenDays(jexlHelper))
    }

    @Test
    fun `WHEN app opened on 4 out of last 7 days THEN usedAppOnAtLeastFourOfLastSevenDays returns true`() {
        nimbus.events.recordEventSync(eventId = "app_opened")
        nimbus.events.recordPastEvent(eventId = "app_opened", durationAgo = Duration.ofDays(2))
        nimbus.events.recordPastEvent(eventId = "app_opened", durationAgo = Duration.ofDays(4))
        nimbus.events.recordPastEvent(eventId = "app_opened", durationAgo = Duration.ofDays(6))

        assertTrue(usedAppOnAtLeastFourOfLastSevenDays(jexlHelper))
    }

    @Test
    fun `WHEN app has never been opened THEN hasBeenOpenedSeveralTimes returns false`() {
        assertFalse(hasBeenOpenedSeveralTimes(jexlHelper))
    }

    @Test
    fun `WHEN app opened 4 times or less THEN hasBeenOpenedSeveralTimes returns false`() {
        repeat(4) { count ->
            nimbus.events.recordEventSync(eventId = "app_opened")

            assertFalse(
                hasBeenOpenedSeveralTimes(jexlHelper),
                "Expected false for app opens < 5, but returned true for $count app opens.",
            )
        }
    }

    @Test
    fun `WHEN app opened 5 times THEN hasBeenOpenedSeveralTimes returns true`() {
        nimbus.events.recordEventSync(count = 5, eventId = "app_opened")

        assertTrue(hasBeenOpenedSeveralTimes(jexlHelper))
    }
}
