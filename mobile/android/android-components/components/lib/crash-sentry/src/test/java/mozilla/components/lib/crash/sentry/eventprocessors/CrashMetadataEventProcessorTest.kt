/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.sentry.eventprocessors

import io.sentry.SentryEvent
import mozilla.components.lib.crash.Crash
import mozilla.components.lib.crash.RuntimeTag
import mozilla.components.lib.crash.runtimetagproviders.ExperimentData
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Test

class CrashMetadataEventProcessorTest {
    @Test
    fun `GIVEN no crash attached to processor WHEN processed THEN event unchanged`() {
        val event = SentryEvent()
        val processor = CrashMetadataEventProcessor()

        val result = processor.process(event, mock())

        assertEquals(event, result)
    }

    @Test
    fun `GIVEN crash with no metadata attached to processor WHEN processed THEN event unchanged and crash unattached`() {
        val event = SentryEvent()
        val processor = CrashMetadataEventProcessor()

        processor.crashToProcess = Crash.NativeCodeCrash(
            timestamp = System.currentTimeMillis(),
            minidumpPath = null,
            extrasPath = null,
            processVisibility = null,
            processType = null,
            remoteType = null,
            breadcrumbs = arrayListOf(),
        )
        val result = processor.process(event, mock())

        assertEquals(event, result)
    }

    @Test
    fun `GIVEN a crash with metadata is currently being reported WHEN processed THEN metadata is attached and crash unattached`() {
        val event = SentryEvent()
        event.release = "a fake release"
        event.setTag("geckoview", "canary")
        event.setTag("fenix.git", "canary")
        event.setTag("ac.version", "canary")
        event.setTag("ac.git", "canary")
        event.setTag("ac.as.build_version", "canary")
        event.setTag("ac.glean.build_version", "canary")
        event.setTag("user.locale", "canary")

        val actualRelease = "136.0.1"
        val processor = CrashMetadataEventProcessor()

        val experimentData = ExperimentData(
            mapOf(
                "use-unit-test" to "branch-test",
            ),
        )

        processor.crashToProcess = Crash.NativeCodeCrash(
            timestamp = System.currentTimeMillis(),
            minidumpPath = null,
            extrasPath = null,
            processVisibility = null,
            processType = null,
            remoteType = null,
            breadcrumbs = arrayListOf(),
            runtimeTags = mapOf(
                RuntimeTag.RELEASE to actualRelease,
                RuntimeTag.GIT to "git_hash",
                RuntimeTag.AC_VERSION to "ac_version",
                RuntimeTag.AS_VERSION to "as_version",
                RuntimeTag.GLEAN_VERSION to "glean_version",
                RuntimeTag.LOCALE to "locale",
                RuntimeTag.BUILD_ID to "build_id",
                RuntimeTag.VERSION_CODE to "version_code",
                RuntimeTag.VERSION_NAME to "version_name",
                RuntimeTag.GECKOVIEW_VERSION to "geckoview_version",
                RuntimeTag.EXPERIMENT_DATA to experimentData.asJsonString(),
            ),
        )
        val result = processor.process(event, mock())

        event.release = actualRelease
        assertEquals(event, result)
        assertEquals("geckoview_version-build_id", event.getTag("geckoview"))
        assertEquals("git_hash", event.getTag("fenix.git"))
        assertEquals("ac_version", event.getTag("ac.version"))
        assertEquals("git_hash", event.getTag("ac.git"))
        assertEquals("as_version", event.getTag("ac.as.build_version"))
        assertEquals("glean_version", event.getTag("ac.glean.build_version"))
        assertEquals("locale", event.getTag("user.locale"))
        assertEquals("branch-test", event.getTag("experiment.use-unit-test"))
    }
}
