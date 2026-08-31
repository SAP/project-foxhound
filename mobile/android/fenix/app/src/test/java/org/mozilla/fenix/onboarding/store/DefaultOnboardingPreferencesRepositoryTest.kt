/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import androidx.core.content.edit
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.utils.Settings

@RunWith(AndroidJUnit4::class)
class DefaultOnboardingPreferencesRepositoryTest {
    private val preferenceKeys = OnboardingPreferencesRepository.OnboardingPreference.entries

    private lateinit var settings: Settings

    @Before
    fun setup() {
        settings = Settings(testContext)
        every { testContext.components.settings } returns settings
    }

    @Test
    fun `test the preference enum keys map to the correct preference key`() {
        assertEquals(R.string.pref_key_toolbar_top, preferenceKeys[0].preferenceKey)
        assertEquals(R.string.pref_key_toolbar_bottom, preferenceKeys[1].preferenceKey)
    }

    @Test
    fun `WHEN the repository is initialized THEN the initial state of the preferences should be emitted`() =
        runTest {
            val repository = DefaultOnboardingPreferencesRepository(
                context = testContext,
                lifecycleOwner = mockk(relaxed = true),
                coroutineScope = this,
            )

            settings.preferences.edit {
                preferenceKeys.forEach {
                    putBoolean(testContext.getString(it.preferenceKey), false)
                }
            }

            repository.init()

            val actual =
                repository.onboardingPreferenceUpdates.take(preferenceKeys.size).toList()

            assertTrue(actual.isNotEmpty())
            assertFalse(actual.all { it.value })
        }

    @Test
    fun `WHEN a change is made to the preference values THEN the repository emits the change`() =
        runTest {
            val repository = DefaultOnboardingPreferencesRepository(
                context = testContext,
                lifecycleOwner = mockk(relaxed = true),
                coroutineScope = this,
            )

            OnboardingPreferencesRepository.OnboardingPreference.entries.forEach {
                val preferenceKey = testContext.getString(it.preferenceKey)

                settings.preferences.edit { putBoolean(preferenceKey, false) }
                repository.onPreferenceChange(
                    sharedPreferences = settings.preferences,
                    key = preferenceKey,
                )

                assertFalse(repository.onboardingPreferenceUpdates.first().value)
            }
        }

    @Test
    fun `GIVEN top toolbar preference update WHEN updateOnboardingPreference is called THEN the real preference is updated`() =
        runTest {
            val repository = DefaultOnboardingPreferencesRepository(
                context = testContext,
                lifecycleOwner = mockk(relaxed = true),
                coroutineScope = this,
            )

            settings.preferences.edit {
                preferenceKeys.forEach {
                    putBoolean(testContext.getString(it.preferenceKey), true)
                }
            }

            assertTrue(settings.shouldUseBottomToolbar)

            repository.updateOnboardingPreference(
                OnboardingPreferencesRepository.OnboardingPreferenceUpdate(
                    OnboardingPreferencesRepository.OnboardingPreference.TopToolbar,
                ),
            )

            assertFalse(settings.shouldUseBottomToolbar)
        }

    @Test
    fun `GIVEN bottom toolbar preference update WHEN updateOnboardingPreference is called THEN the real preference is updated`() =
        runTest {
            val repository = DefaultOnboardingPreferencesRepository(
                context = testContext,
                lifecycleOwner = mockk(relaxed = true),
                coroutineScope = this,
            )

            settings.preferences.edit {
                preferenceKeys.forEach {
                    putBoolean(testContext.getString(it.preferenceKey), false)
                }
            }

            assertFalse(settings.shouldUseBottomToolbar)

            repository.updateOnboardingPreference(
                OnboardingPreferencesRepository.OnboardingPreferenceUpdate(
                    OnboardingPreferencesRepository.OnboardingPreference.BottomToolbar,
                ),
            )

            assertTrue(settings.shouldUseBottomToolbar)
        }
}
