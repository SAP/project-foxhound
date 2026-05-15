/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import groovy.json.JsonSlurper
import org.gradle.tooling.events.task.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.mockito.Mockito.*
import java.io.File

class BuildMetricsServiceTest {
    @TempDir
    lateinit var tempDir: File

    @Test
    fun `service records different task statuses correctly`() {
        val suffix = "task-status"
        val service = createService(tempDir, suffix)

        service.onFinish(createTaskEvent(":app:compileJava", upToDate = true))
        service.onFinish(createTaskEvent(":lib:test", fromCache = true))
        service.onFinish(createTaskEvent(":app:build"))
        service.onFinish(createTaskEvent(":app:failedTask", failed = true))
        service.onFinish(createTaskEvent(":app:skippedTask", skipped = true))

        service.close()

        val metricsFile = File(tempDir, "gradle/build/metrics/build-metrics-$suffix.json")
        assertTrue(metricsFile.exists())

        val metrics = JsonSlurper().parseText(metricsFile.readText()) as Map<*, *>
        val tasks = metrics["tasks"] as List<*>
        assertEquals(5, tasks.size)

        val taskMap = tasks.associate { task ->
            val t = task as Map<*, *>
            t["path"] to t["status"]
        }

        assertEquals("UP-TO-DATE", taskMap[":app:compileJava"])
        assertEquals("FROM-CACHE", taskMap[":lib:test"])
        assertEquals("EXECUTED", taskMap[":app:build"])
        assertEquals("FAILED", taskMap[":app:failedTask"])
        assertEquals("SKIPPED", taskMap[":app:skippedTask"])
    }

    @Test
    fun `service creates metrics file with correct structure`() {
        val suffix = "structure"
        val service = createService(tempDir, suffix)

        service.onFinish(createTaskEvent(":task1"))
        service.onFinish(createTaskEvent(":task2", upToDate = true))

        service.close()

        val metricsFile = File(tempDir, "gradle/build/metrics/build-metrics-$suffix.json")
        val metrics = JsonSlurper().parseText(metricsFile.readText()) as Map<*, *>

        assertNotNull(metrics["invocation"])
        assertNotNull(metrics["configPhase"])
        assertNotNull(metrics["tasks"])

        val tasks = metrics["tasks"] as List<*>
        assertEquals(2, tasks.size)
    }

    @Test
    fun `service uses custom file suffix`() {
        val suffix = "custom-suffix"
        val service = createService(tempDir, suffix)

        service.onFinish(createTaskEvent(":task1"))
        service.close()

        val metricsFile = File(tempDir, "gradle/build/metrics/build-metrics-$suffix.json")
        assertTrue(metricsFile.exists())
    }

    @Test
    fun `tasks appear in execution order`() {
        val suffix = "order"
        val service = createService(tempDir, suffix)

        service.onFinish(createTaskEvent(":first"))
        service.onFinish(createTaskEvent(":second"))
        service.onFinish(createTaskEvent(":third"))

        service.close()

        val metricsFile = File(tempDir, "gradle/build/metrics/build-metrics-$suffix.json")
        val metrics = JsonSlurper().parseText(metricsFile.readText()) as Map<*, *>
        val tasks = metrics["tasks"] as List<*>

        assertEquals(":first", (tasks[0] as Map<*, *>)["path"])
        assertEquals(":second", (tasks[1] as Map<*, *>)["path"])
        assertEquals(":third", (tasks[2] as Map<*, *>)["path"])
    }

    @Test
    fun `task timing fields are present in JSON`() {
        val suffix = "timing"
        val service = createService(tempDir, suffix)

        service.onFinish(createTaskEvent(":testTask"))
        service.close()

        val metricsFile = File(tempDir, "gradle/build/metrics/build-metrics-$suffix.json")
        val metrics = JsonSlurper().parseText(metricsFile.readText()) as Map<*, *>
        val tasks = metrics["tasks"] as List<*>
        val task = tasks[0] as Map<*, *>

        assertNotNull(task["start"])
        assertNotNull(task["stop"])
        assertNotNull(task["duration"])
    }

    @Test
    fun `service handles different task path formats`() {
        val suffix = "paths"
        val service = createService(tempDir, suffix)

        service.onFinish(createTaskEvent(":rootTask"))
        service.onFinish(createTaskEvent(":project:subTask"))
        service.onFinish(createTaskEvent(":deep:nested:project:deepTask"))

        service.close()

        val metricsFile = File(tempDir, "gradle/build/metrics/build-metrics-$suffix.json")
        val metrics = JsonSlurper().parseText(metricsFile.readText()) as Map<*, *>
        val tasks = metrics["tasks"] as List<*>

        val taskPaths = tasks.map { (it as Map<*, *>)["path"] }
        assertTrue(taskPaths.contains(":rootTask"))
        assertTrue(taskPaths.contains(":project:subTask"))
        assertTrue(taskPaths.contains(":deep:nested:project:deepTask"))
    }

    @Test
    fun `service creates metrics directory if it does not exist`() {
        val suffix = "newdir"
        val newTempDir = File(tempDir, "nonexistent")
        val service = createService(newTempDir, suffix)

        service.onFinish(createTaskEvent(":task"))
        service.close()

        val metricsDir = File(newTempDir, "gradle/build/metrics")
        assertTrue(metricsDir.exists())
        assertTrue(metricsDir.isDirectory)

        val metricsFile = File(metricsDir, "build-metrics-$suffix.json")
        assertTrue(metricsFile.exists())
    }

    @Suppress("UNCHECKED_CAST")
    private fun createService(topobjdir: File, fileSuffix: String): BuildMetricsService {
        val topojdirProperty = mock(org.gradle.api.provider.Property::class.java) as org.gradle.api.provider.Property<String>
        `when`(topojdirProperty.get()).thenReturn(topobjdir.absolutePath)

        val fileSuffixProperty = mock(org.gradle.api.provider.Property::class.java) as org.gradle.api.provider.Property<String>
        `when`(fileSuffixProperty.get()).thenReturn(fileSuffix)

        val parameters = object : BuildMetricsServiceParameters {
            override val topobjdir = topojdirProperty
            override val fileSuffix = fileSuffixProperty
        }
        return TestBuildMetricsService(parameters).apply {
            invocationStart = System.currentTimeMillis()
            configStart = invocationStart + 100
            configEnd = configStart + 200
        }
    }

    private fun createTaskEvent(taskPath: String, upToDate: Boolean = false, fromCache: Boolean = false, failed: Boolean = false, skipped: Boolean = false): TaskFinishEvent {
        val result = if (failed) mockFailedResult() else if (skipped) mockSkippedResult() else mockSuccessResult(upToDate, fromCache)
        val descriptor = mock(TaskOperationDescriptor::class.java).apply { `when`(getTaskPath()).thenReturn(taskPath) }
        return mock(TaskFinishEvent::class.java).apply { `when`(getDescriptor()).thenReturn(descriptor); `when`(getResult()).thenReturn(result) }
    }

    private fun mockSuccessResult(upToDate: Boolean, fromCache: Boolean) = mock(TaskSuccessResult::class.java).apply {
        `when`(getStartTime()).thenReturn(1000L); `when`(getEndTime()).thenReturn(2000L)
        `when`(isUpToDate()).thenReturn(upToDate); `when`(isFromCache()).thenReturn(fromCache)
    }

    private fun mockFailedResult() = mock(TaskFailureResult::class.java).apply {
        `when`(getStartTime()).thenReturn(1000L); `when`(getEndTime()).thenReturn(2000L)
    }

    private fun mockSkippedResult() = mock(TaskSkippedResult::class.java).apply {
        `when`(getStartTime()).thenReturn(1000L); `when`(getEndTime()).thenReturn(2000L)
    }

    class TestBuildMetricsService(private val testParameters: BuildMetricsServiceParameters) : BuildMetricsService(testParameters) {
        override fun getParameters() = testParameters
    }
}
