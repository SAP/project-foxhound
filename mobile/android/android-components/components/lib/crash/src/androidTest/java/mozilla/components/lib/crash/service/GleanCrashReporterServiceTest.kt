/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// We allow wildcard imports as a convenience for the many json extension
// methods used.
@file:Suppress("ktlint:standard:no-wildcard-imports")

package mozilla.components.lib.crash.service

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.serialization.json.*
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.lib.crash.BuildConfig
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.NativeCrashTools
import mozilla.components.lib.crash.RuntimeTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import java.io.IOException
import java.util.Date

@RunWith(AndroidJUnit4::class)
class GleanCrashReporterServiceTest {
    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @get:Rule
    val tempFolder = TemporaryFolder()

    private fun crashCountJson(key: String): String = """{"type":"count","label":"$key"}"""

    private fun getNativeCrashTools() = NativeCrashTools.load(context, null, null)

    @Before
    fun needsCrashreporterEnabled() {
        assumeTrue("Tests are only relevant when the crashreporter is enabled.", BuildConfig.MOZ_CRASHREPORTER)
    }

    @Test
    fun loadsNativeCrashTools() {
        assertNotNull(getNativeCrashTools())
    }

    @Test
    fun gleanCrashReporterServiceSendsCrashPings() {
        val service = GleanCrashReporterService(context)

        val crash = Crash.NativeCodeCrash(
            12340000,
            null,
            null,
            Crash.NativeCodeCrash.PROCESS_VISIBILITY_MAIN,
            processType = "main",
            breadcrumbs = arrayListOf(),
            remoteType = null,
        )

        var pingSent = false
        getNativeCrashTools()?.testMetricValuesBeforeNextSend {
            assertEquals("1970-01-01 3:25:40.0 +00:00:00", get("crash.time")?.jsonPrimitive?.content)
            assertEquals("main", get("crash.process_type")?.jsonPrimitive?.content)
            assertEquals("fatal native crash", get("crash.crash_type")?.jsonPrimitive?.content)
            assertNull(get("crash.remote_type"))
            pingSent = true
        }

        service.record(crash)

        assertTrue("Persistence file must exist", service.file.exists())

        val lines = service.file.readLines()
        assertEquals(
            "First element must be main process native code crash",
            crashCountJson(GleanCrashReporterService.MAIN_PROCESS_NATIVE_CODE_CRASH_KEY),
            lines[0],
        )

        assertTrue("Expected ping to be sent", pingSent)
    }

    @Test
    @Ignore("breadcrumbs not sent right now")
    fun gleanCrashReporterServiceSendsBreadcrumbs() {
        val service = GleanCrashReporterService(context)

        val crash = Crash.NativeCodeCrash(
            12340000,
            null,
            null,
            Crash.NativeCodeCrash.PROCESS_VISIBILITY_MAIN,
            processType = "main",
            breadcrumbs = arrayListOf(
                Breadcrumb(
                    message = "Breadcrumb-1",
                    category = "bread",
                    level = Breadcrumb.Level.WARNING,
                    type = Breadcrumb.Type.USER,
                    date = Date(12340000),
                    data = mapOf("foo" to "bar"),
                ),
            ),
            remoteType = null,
        )

        service.record(crash)

        assertTrue("Persistence file must exist", service.file.exists())

        val lines = service.file.readLines()
        assertEquals(
            "First element must be main process native code crash",
            crashCountJson(GleanCrashReporterService.MAIN_PROCESS_NATIVE_CODE_CRASH_KEY),
            lines[0],
        )

        run {
            var pingSent = false
            getNativeCrashTools()?.testMetricValuesBeforeNextSend {
                assertEquals("1970-01-01 3:25:40.0 +00:00:00", get("crash.time")?.jsonPrimitive?.content)
                assertEquals("main", get("crash.process_type")?.jsonPrimitive?.content)
                assertEquals("fatal native crash", get("crash.crash_type")?.jsonPrimitive?.content)
                assertNull(get("crash.remote_type"))
                assertEquals(
                    JsonArray(
                    listOf(
                        JsonObject(
                            mapOf(
                                "timestamp" to JsonPrimitive("1970-01-01T03:25:40"),
                                "message" to JsonPrimitive("Breadcrumb-1"),
                                "category" to JsonPrimitive("bread"),
                                "level" to JsonPrimitive("Warning"),
                                "type" to JsonPrimitive("User"),
                                "data" to JsonArray(
                                    listOf(
                                        JsonObject(
                                            mapOf(
                                                "key" to JsonPrimitive("foo"),
                                                "value" to JsonPrimitive("bar"),
                                            ),
                                        ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
                    get("crash.breadcrumbs"),
                )
                pingSent = true
            }

            GleanCrashReporterService(context)

            assertTrue("Expected ping to be sent", pingSent)
        }
    }

    @Test
    fun gleanCrashReporterServiceReadsExtras() {
        val service = GleanCrashReporterService(context)
        val stackTracesAnnotation = """
        {
            "status": "OK",
            "crash_info": {
                "type": "main",
                "address": "0xf001ba11",
                "crashing_thread": 1
            },
            "main_module": 0,
            "modules": [
            {
                "base_addr": "0x00000000",
                "end_addr": "0x00004000",
                "code_id": "8675309",
                "debug_file": "",
                "debug_id": "18675309",
                "filename": "foo.exe",
                "version": "1.0.0"
            },
            {
                "base_addr": "0x00004000",
                "end_addr": "0x00008000",
                "code_id": "42",
                "debug_file": "foo.pdb",
                "debug_id": "43",
                "filename": "foo.dll",
                "version": "1.1.0"
            }
            ],
            "some_unused_key": 0,
            "threads": [
            {
                "frames": [
                { "module_index": 0, "ip": "0x10", "trust": "context" },
                { "module_index": 0, "ip": "0x20", "trust": "cfi" }
                ]
            },
            {
                "frames": [
                { "module_index": 1, "ip": "0x4010", "trust": "context" },
                { "module_index": 0, "ip": "0x30", "trust": "cfi" }
                ]
            }
            ]
        }
        """

        val stackTracesGlean = """
        {
            "crash_type": "main",
            "crash_address": "0xf001ba11",
            "crash_thread": 1,
            "main_module": 0,
            "modules": [
            {
                "base_address": "0x00000000",
                "end_address": "0x00004000",
                "code_id": "8675309",
                "debug_file": "",
                "debug_id": "18675309",
                "filename": "foo.exe",
                "version": "1.0.0"
            },
            {
                "base_address": "0x00004000",
                "end_address": "0x00008000",
                "code_id": "42",
                "debug_file": "foo.pdb",
                "debug_id": "43",
                "filename": "foo.dll",
                "version": "1.1.0"
            }
            ],
            "threads": [
            {
                "frames": [
                { "module_index": 0, "ip": "0x10", "trust": "context" },
                { "module_index": 0, "ip": "0x20", "trust": "cfi" }
                ]
            },
            {
                "frames": [
                { "module_index": 1, "ip": "0x4010", "trust": "context" },
                { "module_index": 0, "ip": "0x30", "trust": "cfi" }
                ]
            }
            ]
        }
        """

        val extrasFile = tempFolder.newFile()
        extrasFile.writeText(
            """
            {
                "ReleaseChannel": "beta",
                "Version": "123.0.0",
                "StartupCrash": "1",
                "TotalPhysicalMemory": "100",
                "AsyncShutdownTimeout": "{\"phase\":\"abcd\",\"conditions\":[{\"foo\":\"bar\"}],\"brokenAddBlockers\":[\"foo\"]}",
                "QuotaManagerShutdownTimeout": "line1\nline2\nline3",
                "StackTraces": $stackTracesAnnotation,
                "JSLargeAllocationFailure": "reporting",
                "JSOutOfMemory": "recovered"
            }
            """.trimIndent(),
        )

        val crash = Crash.NativeCodeCrash(
            12340000,
            "",
            extrasFile.path,
            Crash.NativeCodeCrash.PROCESS_VISIBILITY_MAIN,
            processType = "main",
            breadcrumbs = arrayListOf(),
            remoteType = null,
        )

        var pingSent = false
        getNativeCrashTools()?.testMetricValuesBeforeNextSend {
            assertEquals(
                "1970-01-01 3:25:40.0 +00:00:00",
                get("crash.time")?.jsonPrimitive?.content,
            )
            assertEquals("main", get("crash.process_type")?.jsonPrimitive?.content)
            assertEquals(
                "fatal native crash",
                get("crash.crash_type")?.jsonPrimitive?.content,
            )
            assertNull(get("crash.remote_type"))
            assertEquals("beta", get("crash.app_channel")?.jsonPrimitive?.content)
            assertEquals("123.0.0", get("crash.app_display_version")?.jsonPrimitive?.content)
            assertEquals(100L, get("memory.total_physical")?.jsonPrimitive?.long)
            assertEquals("reporting", get("memory.js_large_allocation_failure")?.jsonPrimitive?.content)
            assertEquals("recovered", get("memory.js_out_of_memory")?.jsonPrimitive?.content)
            assertEquals(
                JsonObject(
                mapOf(
                    "phase" to JsonPrimitive("abcd"),
                    "conditions" to JsonPrimitive("[{\"foo\":\"bar\"}]"),
                    "broken_add_blockers" to JsonArray(listOf(JsonPrimitive("foo"))),
                ),
            ),
                get("crash.async_shutdown_timeout"),
            )
            assertEquals(
                JsonArray(
                listOf(
                    "line1",
                    "line2",
                    "line3",
                ).map { e -> JsonPrimitive(e) },
            ),
                get("crash.quota_manager_shutdown_timeout"),
            )
            assertEquals(Json.decodeFromString<JsonObject>(stackTracesGlean), get("crash.stack_traces"))
            pingSent = true
        }

        service.record(crash)

        assertTrue("Persistence file must exist", service.file.exists())
        assertTrue("Expected ping to be sent", pingSent)
    }

    @Test
    fun gleanCrashReporterServiceSendsExceptionCrashPings() {
        val service = GleanCrashReporterService(context)

        val crash = Crash.UncaughtExceptionCrash(
            12340000,
            RuntimeException("Test", IOException("IO")),
            arrayListOf(),
            runtimeTags = mapOf(
                RuntimeTag.VERSION_NAME to "142.0.0",
                RuntimeTag.BUILD_ID to "1337",
            ),
        )

        var pingSent = false
        getNativeCrashTools()?.testMetricValuesBeforeNextSend {
            assertEquals(
                "1970-01-01 3:25:40.0 +00:00:00",
                get("crash.time")?.jsonPrimitive?.content,
            )
            assertEquals("main", get("crash.process_type")?.jsonPrimitive?.content)
            assertEquals(
                "uncaught exception",
                get("crash.crash_type")?.jsonPrimitive?.content,
            )
            assertNull(get("crash.remote_type"))
            assertEquals("1337", get("crash.app_build")?.jsonPrimitive?.content)
            assertEquals("142.0.0", get("crash.app_display_version")?.jsonPrimitive?.content)
            val exc = get("crash.java_exception")
            assertNotNull(exc)
            val throwables = exc?.jsonObject?.get("throwables")
            assertNotNull(throwables)
            throwables?.jsonArray?.let { arr ->
                assertEquals(2, arr.size)
                val first = arr.get(0).jsonObject.toMutableMap()
                val second = arr.get(1).jsonObject.toMutableMap()
                assertNotNull(first.remove("stack"))
                assertEquals(
                    JsonObject(
                        mapOf(
                            "type_name" to JsonPrimitive("java.lang.RuntimeException"),
                            "message" to JsonPrimitive("Test"),
                        ),
                    ),
                    first,
                )
                assertNotNull(second.remove("stack"))
                assertEquals(
                    JsonObject(
                        mapOf(
                            "type_name" to JsonPrimitive("java.io.IOException"),
                            "message" to JsonPrimitive("IO"),
                        ),
                    ),
                        second,
                )
            }
            pingSent = true
        }

        service.record(crash)

        assertTrue("Persistence file must exist", service.file.exists())

        val lines = service.file.readLines()
        assertEquals(
            "First element must be uncaught exception",
            crashCountJson(GleanCrashReporterService.UNCAUGHT_EXCEPTION_KEY),
            lines[0],
        )

        assertTrue("Expected ping to be sent", pingSent)
    }

    @Test
    fun gleanCrashReporterServiceExceptionCrashPingsHaveCrashTimeAppInformationMetrics() {
        val service = GleanCrashReporterService(
            context,
            appChannel = "channel",
            appVersion = "version",
            appBuildId = "buildid",
        )

        val crash = Crash.UncaughtExceptionCrash(
            12340000,
            RuntimeException("Test", IOException("IO")),
            arrayListOf(),
        )

        var pingSent = false
        getNativeCrashTools()?.testMetricValuesBeforeNextSend {
            assertEquals("channel", get("crash.app_channel")?.jsonPrimitive?.content)
            assertEquals("version", get("crash.app_display_version")?.jsonPrimitive?.content)
            assertEquals("buildid", get("crash.app_build")?.jsonPrimitive?.content)
            pingSent = true
        }

        service.record(crash)

        assertTrue("Expected ping to be sent", pingSent)
    }
}
