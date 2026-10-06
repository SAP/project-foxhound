/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.rusterrors

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.Job
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.concept.base.crash.RustCrashReport
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertIs

@RunWith(AndroidJUnit4::class)
class RustErrorsTest {
    @Test
    fun `AppServicesErrorReport preserves the original exception as cause`() {
        val originalException = RuntimeException("original error")
        val report = AppServicesErrorReport("test-error", originalException)

        assertSame(originalException, report.cause)
    }

    @Test
    fun `AppServicesErrorReport has correct typeName`() {
        val originalException = RuntimeException("original error")
        val report = AppServicesErrorReport("test-error-type", originalException)

        assertEquals("test-error-type", report.typeName)
    }

    @Test
    fun `AppServicesErrorReport message matches cause message`() {
        val originalException = RuntimeException("the error message")
        val report = AppServicesErrorReport("test-error", originalException)

        assertEquals("the error message", report.message)
    }

    @Test
    fun `AppServicesErrorReport implements RustCrashReport`() {
        val report: Any = AppServicesErrorReport("test-error", RuntimeException("error"))

        assertIs<RustCrashReport>(report)
    }

    @Test
    fun `AppServicesErrorReport stacktrace includes cause stacktrace`() {
        val originalException = RuntimeException("original error")
        val report = AppServicesErrorReport("test-error", originalException)

        val reportStackTrace = report.stackTrace
        val causeStackTrace = originalException.stackTrace

        assertTrue(causeStackTrace.isNotEmpty())
        assertSame(originalException, report.cause)
    }

    @Test
    fun `reportRustError submits exception to crash reporter`() {
        val crashReporter = TestCrashReporter()
        initializeRustErrors(crashReporter)

        val originalException = RuntimeException("test error")
        reportRustError("places-internal-error", originalException)

        assertEquals(1, crashReporter.exceptions.size)
        val submitted = crashReporter.exceptions[0]
        assertIs<AppServicesErrorReport>(submitted)

        assertEquals("places-internal-error", submitted.typeName)
        assertSame(originalException, submitted.cause)
    }

    private class TestCrashReporter : CrashReporting {
        val exceptions: MutableList<Throwable> = mutableListOf()
        val breadcrumbs: MutableList<Breadcrumb> = mutableListOf()

        override fun submitCaughtException(throwable: Throwable): Job {
            exceptions.add(throwable)
            return mock()
        }

        override fun recordCrashBreadcrumb(breadcrumb: Breadcrumb) {
            breadcrumbs.add(breadcrumb)
        }
    }
}
