/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.CrashReporter
import mozilla.components.lib.crash.service.CrashReporterService
import mozilla.components.lib.crash.service.CrashTelemetryService
import mozilla.components.lib.crash.store.CrashReportOption
import mozilla.components.support.test.assertUnused
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.nimbus.TestNimbusApi
import org.mozilla.fenix.utils.Settings

@RunWith(AndroidJUnit4::class)
class DefaultPrivacyPreferencesRepositoryTest {

    @Test
    fun `GIVEN crash reporting flag is updated in settings WHEN getPreference is called THEN updated value is returned `() {
        runTest {
            val settings = Settings(testContext)
            val repository = DefaultPrivacyPreferencesRepository(settings, FakeNimbusApi(), createCrashReporter())
            assertTrue(CrashReportOption.fromLabel(settings.crashReportChoice) == CrashReportOption.Ask)
            assertFalse(repository.getPreference(PreferenceType.CrashReporting))

            settings.crashReportChoice = CrashReportOption.Auto.label
            assertTrue(repository.getPreference(PreferenceType.CrashReporting))

            settings.crashReportChoice = CrashReportOption.Never.label
            assertFalse(repository.getPreference(PreferenceType.CrashReporting))
        }
    }

    @Test
    fun `WHEN setPreference is enabled for crash reporting THEN settings is updated to Auto`() = runTest {
        val settings = Settings(testContext)
        val repository = DefaultPrivacyPreferencesRepository(settings, FakeNimbusApi(), createCrashReporter())
        assertTrue(CrashReportOption.fromLabel(settings.crashReportChoice) == CrashReportOption.Ask)
        assertFalse(repository.getPreference(PreferenceType.CrashReporting))

        repository.setPreference(PreferenceType.CrashReporting, true)
        assertEquals(CrashReportOption.Auto.label, settings.crashReportChoice)
    }

    @Test
    fun `WHEN setPreference is disabled for crash reporting THEN settings is updated to Ask`() = runTest {
        val settings = Settings(testContext)
        val repository = DefaultPrivacyPreferencesRepository(settings, FakeNimbusApi(), createCrashReporter())
        settings.crashReportChoice = CrashReportOption.Auto.label
        assertTrue(CrashReportOption.fromLabel(settings.crashReportChoice) == CrashReportOption.Auto)
        assertTrue(repository.getPreference(PreferenceType.CrashReporting))

        repository.setPreference(PreferenceType.CrashReporting, false)
        assertEquals(CrashReportOption.Ask.label, settings.crashReportChoice)
    }

    @Test
    fun `GIVEN telemetry flag is updated in settings WHEN getPreference is called THEN updated value is returned `() {
        runTest {
            val settings = Settings(testContext)
            val repository = DefaultPrivacyPreferencesRepository(settings, FakeNimbusApi(), createCrashReporter())
            assertTrue(settings.isTelemetryEnabled)
            assertTrue(repository.getPreference(PreferenceType.UsageData))

            settings.isTelemetryEnabled = false
            assertFalse(repository.getPreference(PreferenceType.UsageData))

            settings.isTelemetryEnabled = true
            assertTrue(repository.getPreference(PreferenceType.UsageData))
        }
    }

    @Test
    fun `WHEN setPreference is called for telemetry setting THEN the preference value is updated`() = runTest {
        val settings = Settings(testContext)
        val nimbusSdk = FakeNimbusApi()
        val crashTelemetryService = FakeCrashTelemetryService(settings.isTelemetryEnabled)
        val repository = DefaultPrivacyPreferencesRepository(
            settings = settings,
            nimbusSdk = nimbusSdk,
            crashReporter = createCrashReporter(listOf(crashTelemetryService)),
        )
        assertTrue(settings.isTelemetryEnabled)
        assertTrue(settings.isExperimentationEnabled)
        assertTrue(crashTelemetryService.isTelemetryOn)
        assertTrue(nimbusSdk.experimentParticipation)

        nimbusSdk.isTelemetryIdReset = false
        repository.setPreference(PreferenceType.UsageData, false)

        assertFalse(settings.isTelemetryEnabled)
        assertFalse(settings.isExperimentationEnabled)
        assertFalse(crashTelemetryService.isTelemetryOn)
        assertFalse(nimbusSdk.experimentParticipation)
        assertTrue(nimbusSdk.isTelemetryIdReset)

        nimbusSdk.isTelemetryIdReset = false
        repository.setPreference(PreferenceType.UsageData, true)

        assertTrue(settings.isTelemetryEnabled)
        assertTrue(settings.isExperimentationEnabled)
        assertTrue(crashTelemetryService.isTelemetryOn)
        assertTrue(nimbusSdk.experimentParticipation)
        assertTrue(nimbusSdk.isTelemetryIdReset)
    }
}

private class FakeNimbusApi : TestNimbusApi(testContext) {
    var isTelemetryIdReset = false
    override fun resetTelemetryIdentifiers() {
        isTelemetryIdReset = true
    }
}

private fun TestScope.createCrashReporter(telemetryServices: List<CrashTelemetryService> = emptyList()) = CrashReporter(
    context = testContext,
    services = listOf(FakeCrashReporterService()),
    telemetryServices = telemetryServices,
    mainDispatcher = StandardTestDispatcher(testScheduler),
    scope = backgroundScope,
)

private class FakeCrashReporterService : CrashReporterService {
    override val id = "test"
    override val name = "TestReporter"

    override fun createCrashReportUrl(identifier: String) = assertUnused()
    override fun report(crash: Crash.UncaughtExceptionCrash) = assertUnused()
    override fun report(crash: Crash.NativeCodeCrash) = assertUnused()
    override fun report(throwable: Throwable, breadcrumbs: ArrayList<Breadcrumb>) = assertUnused()
}

private class FakeCrashTelemetryService(var isTelemetryOn: Boolean) : CrashTelemetryService {
    override fun setTelemetryEnabled(enabled: Boolean) {
        isTelemetryOn = enabled
    }

    override fun record(crash: Crash.UncaughtExceptionCrash) = assertUnused()
    override fun record(crash: Crash.NativeCodeCrash) = assertUnused()
    override fun record(throwable: Throwable) = assertUnused()
}
