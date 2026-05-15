package org.mozilla.fenix.termsofuse.store

import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mozilla.fenix.GleanMetrics.TermsOfUse
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.robolectric.RobolectricTestRunner

private const val TOU_VERSION = 5

@RunWith(RobolectricTestRunner::class)
class TermsOfUsePromptTelemetryMiddlewareTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    @Test
    fun `WHEN the OnAcceptClicked action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.accepted.testGetValue())
        assertNull(TermsOfUse.version.testGetValue())
        assertNull(TermsOfUse.date.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnAcceptClicked(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.accepted.testGetValue())
        assertEventExtraData(TermsOfUse.accepted.testGetValue()!!.last().extra!!)
        assertNotNull(TermsOfUse.version.testGetValue())
        assertEquals(5L, TermsOfUse.version.testGetValue())
        // Glean SDK generates the date value so we can't compare date value directly.
        assertNotNull(TermsOfUse.date.testGetValue())
    }

    @Test
    fun `WHEN the OnRemindLaterClicked action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.remindMeLaterCount.testGetValue())
        assertNull(TermsOfUse.remindMeLaterClick.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnRemindMeLaterClicked(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.remindMeLaterCount.testGetValue())
        assertEquals(1, TermsOfUse.remindMeLaterCount.testGetValue())
        assertNotNull(TermsOfUse.remindMeLaterClick.testGetValue())
        assertEventExtraData(TermsOfUse.remindMeLaterClick.testGetValue()!!.last().extra!!)
    }

    @Test
    fun `WHEN the OnPromptManuallyDismissed action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.dismissCount.testGetValue())
        assertNull(TermsOfUse.dismiss.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnPromptManuallyDismissed(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.dismissCount.testGetValue())
        assertEquals(1, TermsOfUse.dismissCount.testGetValue())
        assertNotNull(TermsOfUse.dismiss.testGetValue())
        assertEventExtraData(TermsOfUse.dismiss.testGetValue()!!.last().extra!!)
    }

    @Test
    fun `WHEN the OnImpression action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.impressionCount.testGetValue())
        assertNull(TermsOfUse.impression.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnImpression(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.impressionCount.testGetValue())
        assertEquals(1, TermsOfUse.impressionCount.testGetValue())
        assertNotNull(TermsOfUse.impression.testGetValue())
        assertEventExtraData(TermsOfUse.impression.testGetValue()!!.last().extra!!)
    }

    @Test
    fun `WHEN the OnLearnMoreClicked action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.learnMoreClick.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnLearnMoreClicked(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.learnMoreClick.testGetValue())
        assertEventExtraData(TermsOfUse.learnMoreClick.testGetValue()!!.last().extra!!)
    }

    @Test
    fun `WHEN the OnPrivacyNoticeClicked action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.privacyNoticeClick.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnPrivacyNoticeClicked(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.privacyNoticeClick.testGetValue())
        assertEventExtraData(TermsOfUse.privacyNoticeClick.testGetValue()!!.last().extra!!)
    }

    @Test
    fun `WHEN the OnTermsOfUseClicked action THEN the expected telemetry is recorded`() {
        assertNull(TermsOfUse.termsOfUseClick.testGetValue())

        invokeMiddlewareWith(TermsOfUsePromptAction.OnTermsOfUseClicked(Surface.HOMEPAGE_NEW_TAB))

        assertNotNull(TermsOfUse.termsOfUseClick.testGetValue())
        assertEventExtraData(TermsOfUse.termsOfUseClick.testGetValue()!!.last().extra!!)
    }

    private fun invokeMiddlewareWith(action: TermsOfUsePromptAction) {
        TermsOfUsePromptTelemetryMiddleware()(
            store = mock(),
            next = {},
            action = action,
        )
    }

    private fun assertEventExtraData(eventExtraData: Map<String, String>) {
        assertEquals(TOU_VERSION, eventExtraData["tou_version"]!!.toInt())
        assertEquals(Surface.HOMEPAGE_NEW_TAB.metricLabel, eventExtraData["surface"]!!)
    }
}
