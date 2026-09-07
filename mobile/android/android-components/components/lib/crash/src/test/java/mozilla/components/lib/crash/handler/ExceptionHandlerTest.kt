/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.handler

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.CrashReporter
import mozilla.components.lib.crash.service.CrashReporterService
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertArrayEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.never
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class ExceptionHandlerTest {

    @Test
    fun `ExceptionHandler forwards crashes to CrashReporter`() = runTest {
        val service: CrashReporterService = mock()

        val crashReporter = spy(
            CrashReporter(
                context = testContext,
                shouldPrompt = CrashReporter.Prompt.NEVER,
                services = listOf(service),
                scope = this,
            ),
        )

        val handler = ExceptionHandler(
            testContext,
            crashReporter,
        )

        val exception = RuntimeException("Hello World")
        handler.uncaughtException(Thread.currentThread(), exception)

        verify(crashReporter).onCrash(eq(testContext), any())
        verify(crashReporter).sendCrashReport(eq(testContext), any())
    }

    @Test
    fun `ExceptionHandler invokes default exception handler`() = runTest {
        val defaultExceptionHandler: Thread.UncaughtExceptionHandler = mock()

        val crashReporter = CrashReporter(
            context = testContext,
            shouldPrompt = CrashReporter.Prompt.NEVER,
            services = listOf(
                object : CrashReporterService {
                    override val id: String = "test"

                    override val name: String = "TestReporter"

                    override fun createCrashReportUrl(identifier: String): String? = null

                    override fun report(crash: Crash.UncaughtExceptionCrash): String? = null

                    override fun report(crash: Crash.NativeCodeCrash): String? = null

                    override fun report(throwable: Throwable, breadcrumbs: ArrayList<Breadcrumb>): String? = null
                },
            ),
            scope = this,
        ).install(testContext)

        val handler = ExceptionHandler(
            testContext,
            crashReporter,
            defaultExceptionHandler,
        )

        verify(defaultExceptionHandler, never()).uncaughtException(any(), any())

        val exception = RuntimeException()
        handler.uncaughtException(Thread.currentThread(), exception)

        verify(defaultExceptionHandler).uncaughtException(Thread.currentThread(), exception)
    }

    @Test
    fun `exceptions in CrashReporter invoke default exception handler`() = runTest {
        val defaultExceptionHandler: Thread.UncaughtExceptionHandler = mock()

        val crashReporter = spy(
            CrashReporter(
            context = testContext,
            shouldPrompt = CrashReporter.Prompt.NEVER,
            services = listOf(
                object : CrashReporterService {
                    override val id: String = "test"

                    override val name: String = "TestReporter"

                    override fun createCrashReportUrl(identifier: String): String? = null

                    override fun report(crash: Crash.UncaughtExceptionCrash): String? = null

                    override fun report(crash: Crash.NativeCodeCrash): String? = null

                    override fun report(throwable: Throwable, breadcrumbs: ArrayList<Breadcrumb>): String? = null
                },
            ),
            scope = this,
        ),
        )
        val reporterException = RuntimeException("CrashReporterException")
        doThrow(reporterException).`when`(crashReporter).onCrash(any(), any())
        crashReporter.install(testContext)

        val handler = ExceptionHandler(
            testContext,
            crashReporter,
            defaultExceptionHandler,
        )

        verify(defaultExceptionHandler, never()).uncaughtException(any(), any())

        val exception = RuntimeException()
        handler.uncaughtException(Thread.currentThread(), exception)

        verify(defaultExceptionHandler).uncaughtException(Thread.currentThread(), reporterException)
        assertArrayEquals(arrayOf(exception), reporterException.suppressed)
    }
}
