/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.service

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.GleanMetrics.CrashMetrics
import mozilla.components.support.test.whenever
import mozilla.telemetry.glean.Glean
import mozilla.telemetry.glean.config.Configuration
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.spy
import java.io.File

@RunWith(AndroidJUnit4::class)
class GleanCrashReporterServiceTest {
    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @Before
    fun setUp() {
        // We're using the WorkManager in a bunch of places, and Glean will crash
        // in tests without this line. Let's simply put it here.
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        Glean.resetGlean(
            context = context,
            config = Configuration(),
            clearStores = true,
        )
    }

    @After
    fun tearDown() {
        // This closes the database to help prevent leaking it during tests.
        // See Bug1719905 for more info.
        WorkManagerTestInitHelper.closeWorkDatabase()
    }

    private fun crashCountJson(key: String): String = """{"type":"count","label":"$key"}"""

    @Test
    fun `GleanCrashReporterService records all crash types`() {
        val crashTypes = hashMapOf(
            GleanCrashReporterService.MAIN_PROCESS_NATIVE_CODE_CRASH_KEY to Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_MAIN,
                processType = "main",
                breadcrumbs = arrayListOf(),
                remoteType = null,
            ),
            GleanCrashReporterService.FOREGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY to Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_FOREGROUND_CHILD,
                processType = "content",
                breadcrumbs = arrayListOf(),
                remoteType = "web",
            ),
            GleanCrashReporterService.BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY to Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_BACKGROUND_CHILD,
                processType = "utility",
                breadcrumbs = arrayListOf(),
                remoteType = null,
            ),
            GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY to Crash.UncaughtExceptionCrash(
                0,
                RuntimeException("Test"),
                arrayListOf(),
            ),
            GleanCrashReporterService.CAUGHT_EXCEPTION_KEY to RuntimeException("Test"),
        )

        for ((type, crash) in crashTypes) {
            // Because of how Glean is implemented, it can potentially persist information between
            // tests or even between test classes, so we compensate by capturing the initial value
            // to compare to.
            val initialValue = try {
                CrashMetrics.crashCount[type].testGetValue()!!
            } catch (e: NullPointerException) {
                0
            }

            run {
                val service = spy(GleanCrashReporterService(context))

                assertFalse("No previous persisted crashes must exist", service.file.exists())

                when (crash) {
                    is Crash.NativeCodeCrash -> service.record(crash)
                    is Crash.UncaughtExceptionCrash -> service.record(crash)
                    is Throwable -> service.record(crash)
                }

                assertTrue("Persistence file must exist", service.file.exists())
                val lines = service.file.readLines()
                assertEquals(
                    "Must be $type",
                    crashCountJson(type),
                    lines.first(),
                )
            }

            // Initialize a fresh GleanCrashReporterService and ensure metrics are recorded in Glean
            run {
                GleanCrashReporterService(context)

                assertEquals(
                    "Glean must record correct value",
                    1,
                    CrashMetrics.crashCount[type].testGetValue()!! - initialValue,
                )
            }
        }
    }

    @Test
    fun `GleanCrashReporterService correctly handles multiple crashes in a single file`() {
        val initialExceptionValue = try {
            CrashMetrics.crashCount[GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY].testGetValue()!!
        } catch (e: NullPointerException) {
            0
        }
        val initialMainProcessNativeCrashValue = try {
            CrashMetrics.crashCount[GleanCrashReporterService.MAIN_PROCESS_NATIVE_CODE_CRASH_KEY].testGetValue()!!
        } catch (e: NullPointerException) {
            0
        }

        val initialForegroundChildProcessNativeCrashValue = try {
            CrashMetrics.crashCount[GleanCrashReporterService.FOREGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY].testGetValue()!!
        } catch (e: NullPointerException) {
            0
        }

        val initialBackgroundChildProcessNativeCrashValue = try {
            CrashMetrics.crashCount[GleanCrashReporterService.BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY].testGetValue()!!
        } catch (e: NullPointerException) {
            0
        }

        run {
            val service = spy(GleanCrashReporterService(context))

            assertFalse("No previous persisted crashes must exist", service.file.exists())

            val uncaughtExceptionCrash =
                Crash.UncaughtExceptionCrash(0, RuntimeException("Test"), arrayListOf())
            val mainProcessNativeCodeCrash = Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_MAIN,
                processType = "main",
                breadcrumbs = arrayListOf(),
                remoteType = null,
            )
            val foregroundChildProcessNativeCodeCrash = Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_FOREGROUND_CHILD,
                processType = "content",
                breadcrumbs = arrayListOf(),
                remoteType = "web",
            )
            val backgroundChildProcessNativeCodeCrash = Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_BACKGROUND_CHILD,
                processType = "utility",
                breadcrumbs = arrayListOf(),
                remoteType = null,
            )
            val extensionProcessNativeCodeCrash = Crash.NativeCodeCrash(
                0,
                "",
                "",
                Crash.NativeCodeCrash.PROCESS_VISIBILITY_BACKGROUND_CHILD,
                processType = "content",
                breadcrumbs = arrayListOf(),
                remoteType = "extension",
            )

            // Record some crashes
            service.record(uncaughtExceptionCrash)
            service.record(mainProcessNativeCodeCrash)
            service.record(uncaughtExceptionCrash)
            service.record(foregroundChildProcessNativeCodeCrash)
            service.record(backgroundChildProcessNativeCodeCrash)
            service.record(extensionProcessNativeCodeCrash)

            // Make sure the file exists
            assertTrue("Persistence file must exist", service.file.exists())

            // Get the file lines
            val lines = service.file.readLines().iterator()
            assertEquals(
                "element must be uncaught exception",
                crashCountJson(GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY),
                lines.next(),
            )
            assertEquals(
                "element must be main process native code crash",
                crashCountJson(GleanCrashReporterService.MAIN_PROCESS_NATIVE_CODE_CRASH_KEY),
                lines.next(),
            )
            assertEquals(
                "element must be uncaught exception",
                crashCountJson(GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY),
                lines.next(), // skip crash ping line in this test
            )
            assertEquals(
                "element must be foreground child process native code crash",
                crashCountJson(GleanCrashReporterService.FOREGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY),
                lines.next(),
            )
            assertEquals(
                "element must be background child process native code crash",
                crashCountJson(GleanCrashReporterService.BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY),
                lines.next(), // skip crash ping line
            )
            assertEquals(
                "element must be background child process native code crash",
                crashCountJson(GleanCrashReporterService.BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY),
                lines.next(),
            )
            assertFalse(lines.hasNext())
        }

        // Initialize a fresh GleanCrashReporterService and ensure metrics are recorded in Glean
        run {
            GleanCrashReporterService(context)

            assertEquals(
                "Glean must record correct value",
                2,
                CrashMetrics.crashCount[GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY].testGetValue()!! - initialExceptionValue,
            )
            assertEquals(
                "Glean must record correct value",
                1,
                CrashMetrics.crashCount[GleanCrashReporterService.MAIN_PROCESS_NATIVE_CODE_CRASH_KEY].testGetValue()!! - initialMainProcessNativeCrashValue,
            )
            assertEquals(
                "Glean must record correct value",
                1,
                CrashMetrics.crashCount[GleanCrashReporterService.FOREGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY].testGetValue()!! - initialForegroundChildProcessNativeCrashValue,
            )
            assertEquals(
                "Glean must record correct value",
                2,
                CrashMetrics.crashCount[GleanCrashReporterService.BACKGROUND_CHILD_PROCESS_NATIVE_CODE_CRASH_KEY].testGetValue()!! - initialBackgroundChildProcessNativeCrashValue,
            )
        }
    }

    @Test
    fun `GleanCrashReporterService does not crash if it can't write to it's file`() {
        val file =
            spy(File(context.applicationInfo.dataDir, GleanCrashReporterService.CRASH_FILE_NAME))
        whenever(file.canWrite()).thenReturn(false)
        val service = spy(GleanCrashReporterService(context, file))

        assertFalse("No previous persisted crashes must exist", service.file.exists())

        val crash = Crash.UncaughtExceptionCrash(0, RuntimeException("Test"), arrayListOf())
        service.record(crash)

        assertTrue("Persistence file must exist", service.file.exists())
        val lines = service.file.readLines()
        assertEquals("Must be empty due to mocked write error", 0, lines.count())
    }

    @Test
    fun `GleanCrashReporterService does not crash if the persistent file is corrupted`() {
        // Because of how Glean is implemented, it can potentially persist information between
        // tests or even between test classes, so we compensate by capturing the initial value
        // to compare to.
        val initialValue = try {
            CrashMetrics.crashCount[GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY].testGetValue()!!
        } catch (e: NullPointerException) {
            0
        }

        run {
            val service = spy(GleanCrashReporterService(context))

            assertFalse("No previous persisted crashes must exist", service.file.exists())

            val crash = Crash.UncaughtExceptionCrash(
                0,
                RuntimeException("Test"),
                arrayListOf(),
            )
            service.record(crash)

            assertTrue("Persistence file must exist", service.file.exists())

            // Add bad data
            service.file.appendText("bad data in here\n")

            val lines = service.file.readLines()
            assertEquals(
                "must be native code crash",
                "{\"type\":\"count\",\"label\":\"${GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY}\"}",
                lines.first(),
            )
            assertEquals("bad data in here", lines[1])
        }

        run {
            GleanCrashReporterService(context)

            assertEquals(
                "Glean must record correct value",
                1,
                CrashMetrics.crashCount[GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY].testGetValue()!! - initialValue,
            )
        }
    }
}
