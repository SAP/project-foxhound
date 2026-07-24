/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import groovy.json.JsonBuilder
import org.gradle.api.Plugin
import org.gradle.api.flow.FlowAction
import org.gradle.api.flow.FlowParameters
import org.gradle.api.flow.FlowProviders
import org.gradle.api.flow.FlowScope
import org.gradle.api.initialization.Settings
import org.gradle.api.invocation.Gradle
import org.gradle.api.provider.Property
import org.gradle.api.services.BuildService
import org.gradle.api.services.BuildServiceParameters
import org.gradle.api.tasks.Input
import org.gradle.build.event.BuildEventsListenerRegistry
import org.gradle.internal.scopeids.id.BuildInvocationScopeId
import org.gradle.kotlin.dsl.always
import org.gradle.tooling.events.FinishEvent
import org.gradle.tooling.events.OperationCompletionListener
import org.gradle.tooling.events.task.TaskFailureResult
import org.gradle.tooling.events.task.TaskFinishEvent
import org.gradle.tooling.events.task.TaskSkippedResult
import org.gradle.tooling.events.task.TaskSuccessResult
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Optional
import java.util.concurrent.atomic.AtomicReference
import javax.inject.Inject

// If you ever need to force a toolchain rebuild (taskcluster) then edit the following comment.
// FORCE REBUILD 2024-05-02

interface BuildMetricsServiceParameters : BuildServiceParameters {
    val outputDir: Property<String>
    val fileSuffix: Property<String>
}

abstract class BuildMetricsService @Inject constructor(
    private val parameters: BuildMetricsServiceParameters
) : BuildService<BuildMetricsServiceParameters>, OperationCompletionListener, AutoCloseable {
    private val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd-HH-mm-ss-SSS")
    private val taskRecords = mutableListOf<Map<String, Any>>()

    var invocationStart = 0L
    var configStart = 0L
    var configEnd = 0L

    override fun onFinish(event: FinishEvent) {
        if (event is TaskFinishEvent) {
            val result = event.result
            val startMs = result.startTime
            val stopMs = result.endTime

            val status = when (result) {
                is TaskFailureResult -> "FAILED"
                is TaskSkippedResult -> "SKIPPED"
                is TaskSuccessResult -> when {
                    result.isUpToDate -> "UP-TO-DATE"
                    result.isFromCache -> "FROM-CACHE"
                    else -> "EXECUTED"
                }
                else -> "UNKNOWN"
            }

            taskRecords += mapOf(
                "path" to event.descriptor.taskPath,
                "start" to dateFormatter.format(Instant.ofEpochMilli(startMs).atZone(ZoneId.systemDefault())),
                "stop" to dateFormatter.format(Instant.ofEpochMilli(stopMs).atZone(ZoneId.systemDefault())),
                "duration" to String.format("%.3f", (stopMs - startMs) / 1_000.0),
                "status" to status
            )
        }
    }

    override fun close() {
        val invocationEnd = System.currentTimeMillis()
        val invocationDuration = String.format("%.3f", (invocationEnd - invocationStart) / 1_000.0)

        val configStartFormatted = dateFormatter.format(Instant.ofEpochMilli(configStart).atZone(ZoneId.systemDefault()))
        val configEndFormatted = dateFormatter.format(Instant.ofEpochMilli(configEnd).atZone(ZoneId.systemDefault()))
        val configDuration = String.format("%.3f", (configEnd - configStart) / 1_000.0)

        val content = mapOf(
            "invocation" to mapOf(
                "start" to dateFormatter.format(Instant.ofEpochMilli(invocationStart).atZone(ZoneId.systemDefault())),
                "end" to dateFormatter.format(Instant.ofEpochMilli(invocationEnd).atZone(ZoneId.systemDefault())),
                "duration" to invocationDuration
            ),
            "configPhase" to mapOf(
                "start" to configStartFormatted,
                "end" to configEndFormatted,
                "duration" to configDuration
            ),
            "tasks" to taskRecords
        )

        val outputDir = File(parameters.outputDir.get()).apply { mkdirs() }
        val fileSuffix = parameters.fileSuffix.get()
        File(outputDir, "build-metrics-$fileSuffix.json").writeText(JsonBuilder(content).toPrettyString())
    }
}

/**
 * Print Gradle errors in such a way that Treeherder includes them in its "Failure Summary".  This
 * approach is technically complicated but is compatible with the Gradle configuration cache.
 *
 * The unusual output is recognized by Treeherder even when Gradle is directly invoked without
 * `mach` or `mozharness` logging.
 */
abstract class LogGradleErrorForTreeHerder : FlowAction<LogGradleErrorForTreeHerder.Parameters> {
    interface Parameters : FlowParameters {
        @get:Input
        val failure: Property<Optional<Throwable>>
    }

    companion object {
        private fun appendIndentedMessage(
            sb: StringBuilder,
            t: Throwable,
            indentStr: String,
        ) {
            val message: String = (t.message ?: "").replace("(?m)^".toRegex(), indentStr)
            if (message.isNotEmpty()) {
                // We don't want the first line indented.
                sb.append(message.substring(indentStr.length))
            }
            sb.append("\n")
            if (t.cause != null && t.cause != t) {
                sb.append(indentStr)
                sb.append("> ")
                appendIndentedMessage(sb, t.cause!!, indentStr + "  ")
            }
        }

        fun getIndentedMessage(t: Throwable): String {
            val sb = StringBuilder()
            appendIndentedMessage(sb, t, "")
            return sb.toString()
        }
    }

    /**
     * Print non-null `Throwable` with each line prefixed by "[gradle:error]: >".  Each `cause` is
     * printed indented, roughly matching Gradle's output.
     *
     * Treeherder recognizes such lines as errors and surfaces them in its "Failure Summary"; see
     * https://github.com/mozilla/treeherder/blob/b04b64185e189a2d9e4c088b4be98d898c658e00/treeherder/log_parser/parsers.py#L75.
     * Treeherder trims leading spaces; the extra ">" preserves indentation.
     */
    override fun execute(parameters: Parameters) {
        parameters.failure.get().map { t ->
            getIndentedMessage(t).split("\n").forEach {
                println("[gradle:error]: > ${it}")
            }
        }
    }
}

abstract class DependenciesPlugin : Plugin<Settings> {
    @get:Inject
    protected abstract val flowScope: FlowScope

    @get:Inject
    protected abstract val flowProviders: FlowProviders

    @get:Inject
    protected abstract val buildEventsListenerRegistry: BuildEventsListenerRegistry

    @get:Inject
    protected abstract val buildInvocationScopeId: BuildInvocationScopeId

    companion object {
        private val rootGradleBuild = AtomicReference<Gradle?>(null)
        @Volatile
        private var buildMetricsInitialized = false
    }

    override fun apply(settings: Settings) {
        flowScope.always(LogGradleErrorForTreeHerder::class) {
            parameters.failure.set(flowProviders.buildWorkResult.map { result -> result.failure })
        }

        // Initialize build metrics only if the buildMetrics property is set
        settings.gradle.projectsEvaluated {
            if (gradle.rootProject.hasProperty("buildMetrics")) {
                initializeBuildMetrics(settings)
            }
        }
    }

    private fun initializeBuildMetrics(settings: Settings) {
        val rootGradle = generateSequence(settings.gradle) { it.parent }.last()

        // Only initialize the shared service once from the root gradle build
        if (rootGradleBuild.compareAndSet(null, rootGradle)) {
                rootGradle.taskGraph.whenReady {
                    val provider = rootGradle.sharedServices.registrations.getByName("buildMetricsService")
                    val service = provider.service.get() as BuildMetricsService

                    service.invocationStart = System.currentTimeMillis()
                    service.configStart = System.currentTimeMillis()
                    service.configEnd = System.currentTimeMillis()
            }
        }

        // Register a task listener for all builds
        val buildMetricsProvider = rootGradle.sharedServices.registerIfAbsent(
            "buildMetricsService",
            BuildMetricsService::class.java
        ) {
            val outputDir = rootGradle.startParameter.projectProperties["buildMetricsOutputDir"]
                ?: throw IllegalStateException("buildMetricsOutputDir property is required when buildMetrics is enabled")
            val fileSuffix = rootGradle.startParameter.projectProperties["buildMetricsFileSuffix"]
                ?: buildInvocationScopeId.id.toString()

            parameters.outputDir.set(outputDir)
            parameters.fileSuffix.set(fileSuffix)
        }

        buildEventsListenerRegistry.onTaskCompletion(buildMetricsProvider)
    }
}

// Synchronized dependencies used by (some) modules
@Suppress("Unused", "MaxLineLength")
object ComponentsDependencies {
    val mozilla_appservices_ads_client = "${ApplicationServicesConfig.groupId}:ads-client:${ApplicationServicesConfig.version}"
    val mozilla_appservices_fxaclient = "${ApplicationServicesConfig.groupId}:fxaclient:${ApplicationServicesConfig.version}"
    val mozilla_appservices_nimbus = "${ApplicationServicesConfig.groupId}:nimbus:${ApplicationServicesConfig.version}"
    val mozilla_appservices_autofill = "${ApplicationServicesConfig.groupId}:autofill:${ApplicationServicesConfig.version}"
    val mozilla_appservices_logins = "${ApplicationServicesConfig.groupId}:logins:${ApplicationServicesConfig.version}"
    val mozilla_appservices_places = "${ApplicationServicesConfig.groupId}:places:${ApplicationServicesConfig.version}"
    val mozilla_appservices_syncmanager = "${ApplicationServicesConfig.groupId}:syncmanager:${ApplicationServicesConfig.version}"
    val mozilla_remote_settings = "${ApplicationServicesConfig.groupId}:remotesettings:${ApplicationServicesConfig.version}"
    val mozilla_appservices_push = "${ApplicationServicesConfig.groupId}:push:${ApplicationServicesConfig.version}"
    val mozilla_appservices_search = "${ApplicationServicesConfig.groupId}:search:${ApplicationServicesConfig.version}"
    val mozilla_appservices_tabs = "${ApplicationServicesConfig.groupId}:tabs:${ApplicationServicesConfig.version}"
    val mozilla_appservices_suggest = "${ApplicationServicesConfig.groupId}:suggest:${ApplicationServicesConfig.version}"
    val mozilla_appservices_httpconfig = "${ApplicationServicesConfig.groupId}:httpconfig:${ApplicationServicesConfig.version}"
    val mozilla_appservices_init_rust_components = "${ApplicationServicesConfig.groupId}:init_rust_components:${ApplicationServicesConfig.version}"
    val mozilla_appservices_full_megazord = "${ApplicationServicesConfig.groupId}:full-megazord:${ApplicationServicesConfig.version}"
    val mozilla_appservices_full_megazord_libsForTests = "${ApplicationServicesConfig.groupId}:full-megazord-libsForTests:${ApplicationServicesConfig.version}"

    val mozilla_appservices_errorsupport = "${ApplicationServicesConfig.groupId}:errorsupport:${ApplicationServicesConfig.version}"
    val mozilla_appservices_rust_log_forwarder = "${ApplicationServicesConfig.groupId}:rust-log-forwarder:${ApplicationServicesConfig.version}"
    val mozilla_appservices_sync15 = "${ApplicationServicesConfig.groupId}:sync15:${ApplicationServicesConfig.version}"
    val mozilla_appservices_fxrelay = "${ApplicationServicesConfig.groupId}:relay:${ApplicationServicesConfig.version}"
}
