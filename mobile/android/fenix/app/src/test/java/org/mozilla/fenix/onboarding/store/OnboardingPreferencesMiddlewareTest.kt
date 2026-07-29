/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.MockKAnnotations
import io.mockk.Runs
import io.mockk.confirmVerified
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.onboarding.view.ToolbarOptionType

@RunWith(AndroidJUnit4::class)
class OnboardingPreferencesMiddlewareTest {

    @MockK
    private lateinit var repository: OnboardingPreferencesRepository

    @Before
    fun setup() {
        MockKAnnotations.init(this)
    }

    @Test
    fun `GIVEN init action WHEN middleware is invoked THEN the repo is initialized`() =
        runTest {
            val middleware = OnboardingPreferencesMiddleware(repository, this)

            every { repository.onboardingPreferenceUpdates } returns emptyFlow()
            every { repository.init() } just Runs
            middleware.invoke(store = mockk(), next = {}, action = OnboardingAction.Init)
            testScheduler.advanceUntilIdle()

            verify { repository.init() }
            verify { repository.onboardingPreferenceUpdates }
            confirmVerified(repository)
        }

    @Test
    fun `GIVEN update selected toolbar action with WHEN middleware is invoked THEN the repo update function is called with the selected toolbar`() =
        runTest {
            val middleware = OnboardingPreferencesMiddleware(repository, this)

            every { repository.updateOnboardingPreference(any()) } just Runs
            middleware.invoke(
                store = mockk(),
                next = {},
                action = OnboardingAction.OnboardingToolbarAction.UpdateSelected(ToolbarOptionType.TOOLBAR_BOTTOM),
            )
            testScheduler.advanceUntilIdle()

            verify {
                repository.updateOnboardingPreference(
                    OnboardingPreferencesRepository.OnboardingPreferenceUpdate(
                        OnboardingPreferencesRepository.OnboardingPreference.BottomToolbar,
                    ),
                )
            }
            confirmVerified(repository)
        }
}
