/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.emailmasks

import mozilla.components.support.test.robolectric.testContext
import mozilla.telemetry.glean.private.RecordedEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.EmailMask
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.settings.emailmasks.EmailMasksState
import org.mozilla.fenix.settings.emailmasks.EmailMasksStore
import org.mozilla.fenix.settings.emailmasks.EmailMasksSystemAction
import org.mozilla.fenix.settings.emailmasks.EmailMasksUserAction
import org.mozilla.fenix.settings.emailmasks.middleware.EmailMasksTelemetryMiddleware
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class) // For gleanTestRule
class EmailMasksTelemetryMiddlewareTest {
    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    @Test
    fun `WHEN SuggestEmailMasksEnabled is dispatched THEN settingChanged event is recorded with enabled=true`() {
        assertNull(EmailMask.settingChanged.testGetValue())

        val store = createStore()
        store.dispatch(EmailMasksUserAction.SuggestEmailMasksEnabled)

        assertEventRecorded(
            expectedName = "setting_changed",
            expectedExtras = mapOf(
                "setting" to "email_mask_suggestions",
                "enabled" to "true",
            ),
        ) {
            EmailMask.settingChanged.testGetValue()
        }
    }

    @Test
    fun `WHEN SuggestEmailMasksDisabled is dispatched THEN settingChanged event is recorded with enabled=false`() {
        assertNull(EmailMask.settingChanged.testGetValue())

        val store = createStore()
        store.dispatch(EmailMasksUserAction.SuggestEmailMasksDisabled)

        assertEventRecorded(
            expectedName = "setting_changed",
            expectedExtras = mapOf(
                "setting" to "email_mask_suggestions",
                "enabled" to "false",
            ),
        ) {
            EmailMask.settingChanged.testGetValue()
        }
    }

    @Test
    fun `WHEN LearnMoreClicked is dispatched THEN learnMoreTapped event is recorded`() {
        assertNull(EmailMask.learnMoreTapped.testGetValue())

        val store = createStore()
        store.dispatch(EmailMasksUserAction.LearnMoreClicked)

        assertEventRecorded("learn_more_tapped") {
            EmailMask.learnMoreTapped.testGetValue()
        }
    }

    @Test
    fun `WHEN ManageClicked is dispatched THEN manageTapped event is recorded`() {
        assertNull(EmailMask.manageTapped.testGetValue())

        val store = createStore()
        store.dispatch(EmailMasksUserAction.ManageClicked)

        assertEventRecorded("manage_tapped") {
            EmailMask.manageTapped.testGetValue()
        }
    }

    @Test
    fun `WHEN system actions are dispatched THEN no telemetry is recorded`() {
        val store = createStore()

        store.dispatch(EmailMasksSystemAction.ManageTabOpened)
        store.dispatch(EmailMasksSystemAction.LearnMoreTabOpened)

        assertNull(EmailMask.manageTapped.testGetValue())
        assertNull(EmailMask.learnMoreTapped.testGetValue())
        assertNull(EmailMask.settingChanged.testGetValue())
    }

    private fun createStore(
        initialState: EmailMasksState = EmailMasksState(),
    ): EmailMasksStore {
        return EmailMasksStore(
            initialState = initialState,
            middleware = listOf(
                EmailMasksTelemetryMiddleware(),
            ),
        )
    }

    private fun assertEventRecorded(
        expectedName: String,
        expectedExtras: Map<String, String>? = null,
        snapshotProvider: () -> List<RecordedEvent>?,
    ) {
        val snapshot = snapshotProvider()
        assertNotNull(snapshot)
        assertEquals(1, snapshot!!.size)

        val event = snapshot.single()
        assertEquals(expectedName, event.name)

        expectedExtras?.let { extrasExpected ->
            val extras = event.extra
            assertNotNull(extras)

            extrasExpected.forEach { (key, value) ->
                assertEquals(value, extras!![key])
            }
        }
    }
}
