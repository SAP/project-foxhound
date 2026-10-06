/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import androidx.preference.Preference
import androidx.preference.PreferenceManager
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CustomEtpCookiesOptionsDropDownListPreferenceTest {
    @Test
    fun `WHEN this preference is created THEN all options are present before filtering`() {
        val preference = CustomEtpCookiesOptionsDropDownListPreference(testContext)

        assertArrayEquals(allEntries, preference.entries)
        assertArrayEquals(allValues, preference.entryValues)
        assertEquals(allValues[0], preference.getDefaultValue())
    }

    @Test
    fun `GIVEN a non-legacy cookie mode is selected WHEN attached THEN legacy modes are hidden`() {
        val preference = attachPreference(testContext.getString(R.string.total_protection))

        val expectedValues = arrayOf(
            testContext.getString(R.string.total_protection),
            testContext.getString(R.string.third_party),
            testContext.getString(R.string.all),
        )
        assertArrayEquals(expectedValues, preference.entryValues)
    }

    @Test
    fun `GIVEN social (mode 4) is selected WHEN attached THEN social is shown and unvisited is hidden`() {
        val preference = attachPreference(testContext.getString(R.string.social))

        val expectedValues = arrayOf(
            testContext.getString(R.string.total_protection),
            testContext.getString(R.string.social),
            testContext.getString(R.string.third_party),
            testContext.getString(R.string.all),
        )
        assertArrayEquals(expectedValues, preference.entryValues)
    }

    @Test
    fun `GIVEN unvisited (mode 3) is selected WHEN attached THEN unvisited is shown and social is hidden`() {
        val preference = attachPreference(testContext.getString(R.string.unvisited))

        val expectedValues = arrayOf(
            testContext.getString(R.string.total_protection),
            testContext.getString(R.string.unvisited),
            testContext.getString(R.string.third_party),
            testContext.getString(R.string.all),
        )
        assertArrayEquals(expectedValues, preference.entryValues)
    }

    private fun attachPreference(value: String): CustomEtpCookiesOptionsDropDownListPreference {
        val preference = CustomEtpCookiesOptionsDropDownListPreference(testContext)
        preference.key = "test_cookie_behavior"
        PreferenceManager.getDefaultSharedPreferences(testContext)
            .edit().putString("test_cookie_behavior", value).apply()
        PreferenceManager(testContext)
            .createPreferenceScreen(testContext)
            .addPreference(preference)
        return preference
    }

    /**
     * Use reflection to get the private member holding the default value set for this preference.
     */
    private fun CustomEtpCookiesOptionsDropDownListPreference.getDefaultValue(): String {
        return Preference::class.java
            .getDeclaredField("mDefaultValue").let { field ->
                field.isAccessible = true
                return@let field.get(this) as String
            }
    }

    private val allEntries = with(testContext) {
        arrayOf(
            getString(R.string.preference_enhanced_tracking_protection_custom_cookies_5),
            getString(R.string.preference_enhanced_tracking_protection_custom_cookies_1),
            getString(R.string.preference_enhanced_tracking_protection_custom_cookies_2),
            getString(R.string.preference_enhanced_tracking_protection_custom_cookies_3),
            getString(R.string.preference_enhanced_tracking_protection_custom_cookies_4),
        )
    }

    private val allValues = with(testContext) {
        arrayOf(
            getString(R.string.total_protection),
            getString(R.string.social),
            getString(R.string.unvisited),
            getString(R.string.third_party),
            getString(R.string.all),
        )
    }
}
