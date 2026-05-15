/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.reviewprompt

import mozilla.components.support.test.assertUnused
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.experiments.nimbus.NimbusMessagingHelperInterface
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.ReviewPromptAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.nimbus.FakeNimbusEventStore
import org.mozilla.fenix.reviewprompt.ReviewPromptState.Eligible.Type

class ReviewPromptMiddlewareTest {

    private val eventStore = FakeNimbusEventStore()

    private var shouldUseNewTriggerCriteria = true
    private var shouldShowCustomPrompt = true
    private lateinit var mainCriteria: Sequence<Boolean>
    private lateinit var subCriteria: Sequence<Boolean>
    private lateinit var legacyCriteria: Sequence<Boolean>

    private val store = AppStore(
        middlewares = listOf(
            ReviewPromptMiddleware(
                shouldUseNewTriggerCriteria = { shouldUseNewTriggerCriteria },
                shouldShowCustomPrompt = { shouldShowCustomPrompt },
                createJexlHelper = {
                    object : NimbusMessagingHelperInterface {
                        override fun evalJexl(expression: String) = assertUnused()
                        override fun evalJexlDebug(expression: String) = assertUnused()
                        override fun getUuid(template: String) = assertUnused()
                        override fun stringFormat(template: String, uuid: String?) = assertUnused()
                    }
                },
                buildTriggerMainCriteria = { mainCriteria },
                buildTriggerSubCriteria = { subCriteria },
                buildTriggerLegacyCriteria = { legacyCriteria },
                nimbusEventStore = eventStore,
            ),
        ),
    )

    @Test
    fun `GIVEN new criteria are enabled WHEN check requested THEN main and sub-criteria are checked`() {
        shouldUseNewTriggerCriteria = true

        var mainCriteriaChecked = false
        var subCriteriaChecked = false
        var legacyCriteriaChecked = false
        mainCriteria = sequence {
            mainCriteriaChecked = true
            yield(true)
        }
        subCriteria = sequence {
            subCriteriaChecked = true
            yield(true)
        }
        legacyCriteria = sequence {
            legacyCriteriaChecked = true
            yield(true)
        }

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertTrue(mainCriteriaChecked)
        assertTrue(subCriteriaChecked)
        assertFalse(legacyCriteriaChecked)
    }

    @Test
    fun `GIVEN new criteria are disabled WHEN check requested THEN legacy criteria are checked`() {
        shouldUseNewTriggerCriteria = false

        var mainCriteriaChecked = false
        var subCriteriaChecked = false
        var legacyCriteriaChecked = false
        mainCriteria = sequence {
            mainCriteriaChecked = true
            yield(true)
        }
        subCriteria = sequence {
            subCriteriaChecked = true
            yield(true)
        }
        legacyCriteria = sequence {
            legacyCriteriaChecked = true
            yield(true)
        }

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertFalse(mainCriteriaChecked)
        assertFalse(subCriteriaChecked)
        assertTrue(legacyCriteriaChecked)
    }

    @Test
    fun `GIVEN main criteria satisfied AND one of sub-criteria satisfied WHEN check requested THEN sets eligible`() {
        mainCriteria = sequenceOf(true)
        subCriteria = sequenceOf(false, true, false)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertTrue(store.state.reviewPrompt is ReviewPromptState.Eligible)
    }

    @Test
    fun `GIVEN main criteria satisfied AND first sub-criteria satisfied WHEN check requested THEN other sub-criteria are not checked`() {
        mainCriteria = sequenceOf(true)
        var continuedPastFirstSatisfied = false
        subCriteria = sequence {
            yield(true)
            continuedPastFirstSatisfied = true
            yield(true)
        }

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertFalse(continuedPastFirstSatisfied)
    }

    @Test
    fun `GIVEN no main criteria AND one of sub-criteria satisfied WHEN check requested THEN sets eligible`() {
        mainCriteria = emptySequence()
        subCriteria = sequenceOf(false, true, false)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertTrue(store.state.reviewPrompt is ReviewPromptState.Eligible)
    }

    @Test
    fun `GIVEN main criteria satisfied AND no sub-criteria satisfied WHEN check requested THEN sets not eligible`() {
        mainCriteria = sequenceOf(true)
        subCriteria = sequenceOf(false)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.NotEligible),
            store.state,
        )
    }

    @Test
    fun `GIVEN main criteria satisfied AND no sub-criteria WHEN check requested THEN sets not eligible`() {
        mainCriteria = sequenceOf(true)
        subCriteria = emptySequence()

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.NotEligible),
            store.state,
        )
    }

    @Test
    fun `GIVEN one of main criteria not satisfied AND sub-criteria satisfied WHEN check requested THEN sets not eligible`() {
        mainCriteria = sequenceOf(true, false, true)
        subCriteria = sequenceOf(true)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.NotEligible),
            store.state,
        )
    }

    @Test
    fun `GIVEN one of main criteria not satisfied WHEN check requested THEN other criteria not checked`() {
        var continuedPastFirstNotSatisfied = false
        mainCriteria = sequence {
            yield(false)
            continuedPastFirstNotSatisfied = true
            yield(false)
        }
        subCriteria = sequence {
            continuedPastFirstNotSatisfied = true
            yield(false)
        }

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertFalse(continuedPastFirstNotSatisfied)
    }

    @Test
    fun `GIVEN check ran WHEN check requested again THEN does nothing`() {
        mainCriteria = sequenceOf()
        subCriteria = sequenceOf()
        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)
        val expectedState = store.state

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(expectedState, store.state)
    }

    @Test
    fun `GIVEN review prompt shown WHEN check requested THEN does nothing`() {
        store.dispatch(ReviewPromptAction.ReviewPromptShown)
        val expectedState = store.state

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(expectedState, store.state)
    }

    @Test
    fun `WHEN review prompt shown THEN an event is recorded`() {
        store.dispatch(ReviewPromptAction.ReviewPromptShown)

        eventStore.assertSingleEventEquals("review_prompt_shown")
    }

    @Test
    fun `WHEN don't show review prompt THEN does nothing`() {
        assertNoOp(ReviewPromptAction.DoNotShowReviewPrompt)
    }

    @Test
    fun `WHEN show custom prompt THEN does nothing`() {
        assertNoOp(ReviewPromptAction.ShowCustomReviewPrompt)
    }

    @Test
    fun `WHEN show Play Store prompt THEN does nothing`() {
        assertNoOp(ReviewPromptAction.ShowPlayStorePrompt)
    }

    @Test
    fun `GIVEN custom prompt enabled AND criteria satisfied WHEN check requested THEN sets eligible for Custom prompt`() {
        shouldShowCustomPrompt = true
        mainCriteria = sequenceOf(true)
        subCriteria = sequenceOf(true)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.Eligible(Type.Custom)),
            store.state,
        )
    }

    @Test
    fun `GIVEN custom prompt disabled AND criteria satisfied WHEN check requested THEN sets eligible for Play Store prompt`() {
        shouldShowCustomPrompt = false
        mainCriteria = sequenceOf(true)
        subCriteria = sequenceOf(true)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.Eligible(Type.PlayStore)),
            store.state,
        )
    }

    @Test
    fun `GIVEN new criteria are disabled AND custom prompt enabled AND criteria satisfied WHEN check requested THEN sets eligible for Custom prompt`() {
        shouldUseNewTriggerCriteria = false
        shouldShowCustomPrompt = true
        legacyCriteria = sequenceOf(true)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.Eligible(Type.Custom)),
            store.state,
        )
    }

    @Test
    fun `GIVEN new criteria are disabled AND custom prompt disabled AND criteria satisfied WHEN check requested THEN sets eligible for Play Store prompt`() {
        shouldUseNewTriggerCriteria = false
        shouldShowCustomPrompt = false
        legacyCriteria = sequenceOf(true)

        store.dispatch(ReviewPromptAction.CheckIfEligibleForReviewPrompt)

        assertEquals(
            AppState(reviewPrompt = ReviewPromptState.Eligible(Type.PlayStore)),
            store.state,
        )
    }

    @Test
    fun `WHEN evalJexl returns false THEN createdAtLeastOneBookmark returns false`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = false)

        val result = createdAtLeastOneBookmark(jexlHelper)

        assertFalse(result)
    }

    @Test
    fun `WHEN evalJexl returns true THEN createdAtLeastOneBookmark returns true`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = true)

        val result = createdAtLeastOneBookmark(jexlHelper)

        assertTrue(result)
    }

    @Test
    fun `WHEN evalJexl returns false THEN isDefaultBrowser returns false`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = false)

        val result = isDefaultBrowser(jexlHelper)

        assertFalse(result)
    }

    @Test
    fun `WHEN evalJexl returns true THEN isDefaultBrowser returns true`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = true)

        val result = isDefaultBrowser(jexlHelper)

        assertTrue(result)
    }

    @Test
    fun `WHEN evalJexl returns false THEN usedAppOnAtLeastFourOfLastSevenDays returns false`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = false)

        val result = usedAppOnAtLeastFourOfLastSevenDays(jexlHelper)

        assertFalse(result)
    }

    @Test
    fun `WHEN evalJexl returns true THEN usedAppOnAtLeastFourOfLastSevenDays returns true`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = true)

        val result = usedAppOnAtLeastFourOfLastSevenDays(jexlHelper)

        assertTrue(result)
    }

    @Test
    fun `WHEN evalJexl returns false THEN hasNotBeenPromptedLastFourMonths returns false`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = false)

        val result = hasNotBeenPromptedLastFourMonths(jexlHelper)

        assertFalse(result)
    }

    @Test
    fun `WHEN evalJexl returns true THEN hasNotBeenPromptedLastFourMonths returns true`() {
        val jexlHelper = FakeNimbusMessagingHelperInterface(evalJexlValue = true)

        val result = hasNotBeenPromptedLastFourMonths(jexlHelper)

        assertTrue(result)
    }

    private fun assertNoOp(action: ReviewPromptAction) {
        val withoutMiddleware = AppStore()
        withoutMiddleware.dispatch(action)
        val expectedState = withoutMiddleware.state

        store.dispatch(action)

        assertEquals(
            expectedState,
            store.state,
        )
    }

    private class FakeNimbusMessagingHelperInterface(val evalJexlValue: Boolean) :
        NimbusMessagingHelperInterface {
        override fun evalJexl(expression: String): Boolean = evalJexlValue
        override fun evalJexlDebug(expression: String): String = ""
        override fun getUuid(template: String): String? = null
        override fun stringFormat(template: String, uuid: String?): String = ""
    }
}
