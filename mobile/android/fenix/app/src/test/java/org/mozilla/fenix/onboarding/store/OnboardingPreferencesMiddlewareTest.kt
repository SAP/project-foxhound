/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.mock
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`
import org.mockito.MockitoAnnotations
import org.mozilla.fenix.onboarding.view.ThemeOptionType
import org.mozilla.fenix.onboarding.view.ToolbarOptionType

@RunWith(AndroidJUnit4::class)
class OnboardingPreferencesMiddlewareTest {

    @Mock
    private lateinit var repository: OnboardingPreferencesRepository

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
    }

    @Test
    fun `GIVEN init action WHEN middleware is invoked THEN the repo is initialized`() =
        runTest {
            val middleware = OnboardingPreferencesMiddleware(repository, this)

            `when`(repository.onboardingPreferenceUpdates).thenReturn(emptyFlow())
            middleware.invoke(store = mock(), next = {}, action = OnboardingAction.Init)
            testScheduler.advanceUntilIdle()

            verify(repository).init()
            verify(repository).onboardingPreferenceUpdates
            verifyNoMoreInteractions(repository)
        }

    @Test
    fun `GIVEN update selected theme action with WHEN middleware is invoked THEN the repo update function is called with the selected theme`() =
        runTest {
            val middleware = OnboardingPreferencesMiddleware(repository, this)

            middleware.invoke(
                store = mock(),
                next = {},
                action = OnboardingAction.OnboardingThemeAction.UpdateSelected(ThemeOptionType.THEME_DARK),
            )
            testScheduler.advanceUntilIdle()

            verify(repository).updateOnboardingPreference(
                OnboardingPreferencesRepository.OnboardingPreferenceUpdate(
                    OnboardingPreferencesRepository.OnboardingPreference.DarkTheme,
                ),
            )
            verifyNoMoreInteractions(repository)
        }

    @Test
    fun `GIVEN update selected toolbar action with WHEN middleware is invoked THEN the repo update function is called with the selected toolbar`() =
        runTest {
            val middleware = OnboardingPreferencesMiddleware(repository, this)

            middleware.invoke(
                store = mock(),
                next = {},
                action = OnboardingAction.OnboardingToolbarAction.UpdateSelected(ToolbarOptionType.TOOLBAR_BOTTOM),
            )
            testScheduler.advanceUntilIdle()

            verify(repository).updateOnboardingPreference(
                OnboardingPreferencesRepository.OnboardingPreferenceUpdate(
                    OnboardingPreferencesRepository.OnboardingPreference.BottomToolbar,
                ),
            )
            verifyNoMoreInteractions(repository)
        }
}
