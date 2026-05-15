/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import io.mockk.mockk
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import mozilla.components.support.test.robolectric.testContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TermsOfUsePromptPreferencesMiddlewareTest {

    private lateinit var settings: Settings

    private lateinit var repository: DefaultTermsOfUsePromptRepository

    private lateinit var middleware: TermsOfUsePromptPreferencesMiddleware

    @Before
    fun setup() {
        settings = Settings(testContext)
        repository = DefaultTermsOfUsePromptRepository(settings)
        middleware = TermsOfUsePromptPreferencesMiddleware(repository)
    }

    @Test
    fun `WHEN the OnAcceptClicked action is received THEN the expected preference is updated`() {
        assertAllPrefsDefault()

        middleware.invoke(
            store = mockk(),
            next = {},
            action = TermsOfUsePromptAction.OnAcceptClicked(Surface.HOMEPAGE_NEW_TAB),
        )

        assertTrue(settings.hasAcceptedTermsOfService)
        assertFalse(settings.hasPostponedAcceptingTermsOfUse)
        assertFalse(settings.lastTermsOfUsePromptTimeInMillis > 0)
        assertEquals(0, settings.termsOfUsePromptDisplayedCount)
    }

    @Test
    fun `WHEN the OnRemindMeLaterClicked action is received THEN the expected preferences are updated`() {
        assertAllPrefsDefault()

        middleware.invoke(
            store = mockk(),
            next = {},
            action = TermsOfUsePromptAction.OnRemindMeLaterClicked(Surface.HOMEPAGE_NEW_TAB),
        )

        assertFalse(settings.hasAcceptedTermsOfService)
        assertTrue(settings.hasPostponedAcceptingTermsOfUse)
        assertFalse(settings.lastTermsOfUsePromptTimeInMillis > 0)
        assertEquals(0, settings.termsOfUsePromptDisplayedCount)
    }

    @Test
    fun `WHEN the OnPromptSheetManuallyDismissed action is received THEN the expected preference is updated`() {
        assertAllPrefsDefault()

        middleware.invoke(
            store = mockk(),
            next = {},
            action = TermsOfUsePromptAction.OnPromptManuallyDismissed(Surface.HOMEPAGE_NEW_TAB),
        )

        assertFalse(settings.hasAcceptedTermsOfService)
        assertTrue(settings.hasPostponedAcceptingTermsOfUse)
        assertFalse(settings.lastTermsOfUsePromptTimeInMillis > 0)
        assertEquals(0, settings.termsOfUsePromptDisplayedCount)
    }

    @Test
    fun `WHEN the OnPromptDismissed action is received THEN the expected preference is updated`() {
        assertAllPrefsDefault()

        repository.isShowingPrompt = true

        middleware.invoke(
            store = mockk(),
            next = {},
            action = TermsOfUsePromptAction.OnPromptDismissed,
        )

        assertFalse(settings.hasAcceptedTermsOfService)
        assertFalse(settings.hasPostponedAcceptingTermsOfUse)
        assertTrue(settings.lastTermsOfUsePromptTimeInMillis > 0)
        assertEquals(0, settings.termsOfUsePromptDisplayedCount)
        assertFalse(repository.isShowingPrompt)
    }

    @Test
    fun `WHEN the OnImpression action is received THEN the expected preference is updated`() {
        assertAllPrefsDefault()

        middleware.invoke(
            store = mockk(),
            next = {},
            action = TermsOfUsePromptAction.OnImpression(Surface.HOMEPAGE_NEW_TAB),
        )

        assertFalse(settings.hasAcceptedTermsOfService)
        assertFalse(settings.hasPostponedAcceptingTermsOfUse)
        assertFalse(settings.lastTermsOfUsePromptTimeInMillis > 0)
        assertEquals(1, settings.termsOfUsePromptDisplayedCount)
    }

    @Test
    fun `WHEN the OnPromptCreated action is received THEN the repository knows the prompt is showing`() {
        middleware.invoke(
            store = mockk(),
            next = {},
            action = TermsOfUsePromptAction.OnPromptCreated,
        )

        assertTrue(repository.isShowingPrompt)
    }

    @Test
    fun `WHEN action is noop THEN the repository settings are not updated`() {
        assertNoOpAction(TermsOfUsePromptAction.OnLearnMoreClicked(Surface.HOMEPAGE_NEW_TAB))
        assertNoOpAction(TermsOfUsePromptAction.OnPrivacyNoticeClicked(Surface.HOMEPAGE_NEW_TAB))
        assertNoOpAction(TermsOfUsePromptAction.OnTermsOfUseClicked(Surface.HOMEPAGE_NEW_TAB))
    }

    private fun assertAllPrefsDefault() {
        assertFalse(settings.hasAcceptedTermsOfService)
        assertFalse(settings.hasPostponedAcceptingTermsOfUse)
        assertFalse(settings.lastTermsOfUsePromptTimeInMillis > 0)
        assertEquals(0, settings.termsOfUsePromptDisplayedCount)
    }

    private fun assertNoOpAction(action: TermsOfUsePromptAction) {
        assertAllPrefsDefault()

        middleware.invoke(
            store = mockk(),
            next = {},
            action = action,
        )

        assertAllPrefsDefault()
    }
}
