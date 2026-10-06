/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import androidx.core.content.edit
import androidx.preference.PreferenceCategory
import androidx.preference.PreferenceManager
import androidx.preference.SwitchPreferenceCompat
import io.mockk.every
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.ext.components
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SecretSettingsPrefDefaultsTest {

    private lateinit var settings: Settings

    @After
    fun tearDown() {
        settings.preferences.edit { clear() }
    }

    @Before
    fun setUp() {
        settings = Settings(testContext)
        every { testContext.components.settings } returns settings
    }

    @Test
    fun `resetAll removes top-level preference keys`() {
        val prefKey1 = "pref_1"
        val prefKey2 = "pref_2"

        val screen = PreferenceManager(testContext).createPreferenceScreen(testContext)
        screen.addPreference(SwitchPreferenceCompat(testContext).apply { key = prefKey1 })
        screen.addPreference(SwitchPreferenceCompat(testContext).apply { key = prefKey2 })
        settings.preferences.edit {
            putBoolean(prefKey1, true)
            putBoolean(prefKey2, true)
        }

        SecretSettingsPrefDefaults(settings).resetAll(screen)

        assertFalse(settings.preferences.contains(prefKey1))
        assertFalse(settings.preferences.contains(prefKey2))
    }

    @Test
    fun `resetAll removes preference keys nested inside a PreferenceCategory`() {
        val nestedPrefKey1 = "nested_pref_1"
        val nestedPrefKey2 = "nested_pref_2"

        val screen = PreferenceManager(testContext).createPreferenceScreen(testContext)
        val category = PreferenceCategory(testContext)
        screen.addPreference(category)
        category.addPreference(SwitchPreferenceCompat(testContext).apply { key = nestedPrefKey1 })
        category.addPreference(SwitchPreferenceCompat(testContext).apply { key = nestedPrefKey2 })
        settings.preferences.edit {
            putBoolean(nestedPrefKey1, true)
            putBoolean(nestedPrefKey2, true)
        }

        SecretSettingsPrefDefaults(settings).resetAll(screen)

        assertFalse(settings.preferences.contains(nestedPrefKey1))
        assertFalse(settings.preferences.contains(nestedPrefKey2))
    }

    @Test
    fun `resetAll does not remove unrelated preference keys`() {
        val secretSettingsPrefKey = "pref_1"
        val unrelatedPrefKey = "pref_2"

        val screen = PreferenceManager(testContext).createPreferenceScreen(testContext)
        screen.addPreference(SwitchPreferenceCompat(testContext).apply { key = secretSettingsPrefKey })
        settings.preferences.edit {
            putBoolean(secretSettingsPrefKey, true)
            putBoolean(unrelatedPrefKey, true)
        }

        SecretSettingsPrefDefaults(settings).resetAll(screen)

        assertFalse(settings.preferences.contains(secretSettingsPrefKey))
        assertTrue(settings.preferences.contains(unrelatedPrefKey))
    }

    @Test
    fun `resetAll handles preferences without keys`() {
        val settingsPrefKey = "pref_1"

        val screen = PreferenceManager(testContext).createPreferenceScreen(testContext)
        screen.addPreference(SwitchPreferenceCompat(testContext))
        screen.addPreference(SwitchPreferenceCompat(testContext).apply { key = settingsPrefKey })
        settings.preferences.edit { putBoolean(settingsPrefKey, true) }

        SecretSettingsPrefDefaults(settings).resetAll(screen)

        assertFalse(settings.preferences.contains(settingsPrefKey))
    }
}
