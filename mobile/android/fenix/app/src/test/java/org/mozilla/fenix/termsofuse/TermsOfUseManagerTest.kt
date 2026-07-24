/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse

import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import org.junit.Test

class TermsOfUseManagerTest {
    @Test
    fun `WHEN all conditions satisfied AND we ignore the first check THEN shouldShowTermsOfUsePrompt returns true`() {
        val repository = FakeTermsOfUsePromptRepository()

        val termsOfUseManager = TermsOfUseManager(repository)

        assertTrue(termsOfUseManager.shouldShowTermsOfUsePrompt(ignoreFirstCheckSinceAppStart = true))
    }

    @Test
    fun `GIVEN other conditions satisfied WHEN canShowTermsOfUsePrompt returns false THEN shouldShowTermsOfUsePrompt returns false`() {
        val repository = FakeTermsOfUsePromptRepository(canShowTermsOfUsePrompt = false)

        val termsOfUseManager = TermsOfUseManager(repository)

        assertFalse(termsOfUseManager.shouldShowTermsOfUsePrompt(ignoreFirstCheckSinceAppStart = true))
    }

    @Test
    fun `GIVEN other conditions satisfied WHEN userPostponedAndWithinCooldownPeriod returns true THEN shouldShowTermsOfUsePrompt returns false`() {
        val repository = FakeTermsOfUsePromptRepository(userPostponedAndWithinCooldownPeriod = true)

        val termsOfUseManager = TermsOfUseManager(repository)

        assertFalse(termsOfUseManager.shouldShowTermsOfUsePrompt(ignoreFirstCheckSinceAppStart = true))
    }

    @Test
    fun `GIVEN other conditions satisfied WHEN this is not first check of the session and don't ignore first check THEN shouldShowTermsOfUsePrompt returns false`() {
        val repository = FakeTermsOfUsePromptRepository()

        val termsOfUseManager = TermsOfUseManager(repository)

        assertFalse(termsOfUseManager.shouldShowTermsOfUsePrompt())
    }

    @Test
    fun `GIVEN other conditions satisfied WHEN this is first check of the session and don't ignore first check THEN shouldShowTermsOfUsePrompt returns true`() {
        val repository = FakeTermsOfUsePromptRepository()

        val termsOfUseManager = TermsOfUseManager(repository)
        termsOfUseManager.onStart()

        assertTrue(termsOfUseManager.shouldShowTermsOfUsePrompt())
    }

    @Test
    fun `GIVEN other conditions satisfied WHEN this is not the first check of the session and we ignore the first check THEN shouldShowTermsOfUsePrompt returns true`() {
        val repository = FakeTermsOfUsePromptRepository()

        val termsOfUseManager = TermsOfUseManager(repository)
        termsOfUseManager.shouldShowTermsOfUsePrompt()

        assertTrue(termsOfUseManager.shouldShowTermsOfUsePrompt(ignoreFirstCheckSinceAppStart = true))
    }

    @Test
    fun `GIVEN other conditions satisfied WHEN this is not the first check of the session and we don't ignore the first check THEN shouldShowTermsOfUsePrompt returns false`() {
        val repository = FakeTermsOfUsePromptRepository()

        val termsOfUseManager = TermsOfUseManager(repository)
        termsOfUseManager.shouldShowTermsOfUsePrompt()

        assertFalse(termsOfUseManager.shouldShowTermsOfUsePrompt())
    }
}
