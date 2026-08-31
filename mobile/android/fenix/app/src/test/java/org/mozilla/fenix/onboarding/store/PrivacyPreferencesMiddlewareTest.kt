/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.MockKAnnotations
import io.mockk.confirmVerified
import io.mockk.impl.annotations.MockK
import io.mockk.mockk
import junit.framework.TestCase.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PrivacyPreferencesMiddlewareTest {

    @MockK
    private lateinit var repository: PrivacyPreferencesRepository

    private lateinit var middleware: PrivacyPreferencesMiddleware

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        repository = mockk()
        middleware = PrivacyPreferencesMiddleware(repository)
    }

    @Test
    fun `WHEN data usage update action is invoked THEN new value is set in repository`() {
        var dataUsageEnabled = true
        val middleware = PrivacyPreferencesMiddleware(
            repository = object : PrivacyPreferencesRepository {
                override fun getPreference(type: PreferenceType) = false

                override fun setPreference(type: PreferenceType, enabled: Boolean) {
                    dataUsageEnabled = enabled
                }
            },
        )

        val updatedDataUsageEnabled = !dataUsageEnabled
        middleware.invoke(store = mockk(), {}, PrivacyPreferencesAction.UsageDataPreferenceUpdatedTo(enabled = updatedDataUsageEnabled))

        assertEquals(updatedDataUsageEnabled, dataUsageEnabled)
    }

    @Test
    fun `WHEN crash reporting update action is invoked THEN new value is set in repository`() {
        var crashReportEnabled = true
        val middleware = PrivacyPreferencesMiddleware(
            repository = object : PrivacyPreferencesRepository {
                override fun getPreference(type: PreferenceType) = false

                override fun setPreference(type: PreferenceType, enabled: Boolean) {
                    crashReportEnabled = enabled
                }
            },
        )

        val updatedCrashReportEnabled = !crashReportEnabled
        middleware.invoke(store = mockk(), {}, PrivacyPreferencesAction.UsageDataPreferenceUpdatedTo(enabled = updatedCrashReportEnabled))

        assertEquals(updatedCrashReportEnabled, crashReportEnabled)
    }

    @Test
    fun `GIVEN usage data learn more called WHEN middleware is invoked THEN the repo is unchanged`() {
        val action = PrivacyPreferencesAction.UsageDataUserLearnMore
        middleware.invoke(store = mockk(), {}, action)

        confirmVerified(repository)
    }

    @Test
    fun `GIVEN crash reporting learn more called WHEN middleware is invoked THEN the repo is unchanged`() {
        val action = PrivacyPreferencesAction.CrashReportingLearnMore
        middleware.invoke(store = mockk(), {}, action)

        confirmVerified(repository)
    }
}
