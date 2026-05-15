/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import com.android.build.api.artifact.SingleArtifact
import com.android.build.api.variant.AndroidComponentsExtension
import com.android.build.api.variant.BuiltArtifact
import com.android.build.api.variant.BuiltArtifactsLoader
import com.android.build.gradle.AppPlugin
import org.gradle.api.DefaultTask
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.InputDirectory
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.TaskAction
import org.gradle.kotlin.dsl.withType
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.file.Files

/**
 * This plugin generates a [ApkSizeTask] for each variant of the target
 * project dependant on the APK output artifacts.
 */
class ApkSizePlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.plugins.withType<AppPlugin>().configureEach {
            val androidComponents = project.extensions.getByType(AndroidComponentsExtension::class.java)
            androidComponents.onVariants { variant ->
                val taskName = "apkSize${variant.name.replaceFirstChar { it.uppercase() }}"
                val task = project.tasks.register(taskName, ApkSizeTask::class.java)
                task.configure {
                    artifactsDirectory.set(variant.artifacts.get(SingleArtifact.APK))
                    artifactsLoader.set(variant.artifacts.getBuiltArtifactsLoader())
                }
            }
        }
    }
}

/**
 * Gradle task for determining the size of APKs and logging them in a perfherder compatible format.
 */
abstract class ApkSizeTask : DefaultTask() {
    /**
     * Directory containing APKs that get built for the build variant.
     */
    @get:InputDirectory
    abstract val artifactsDirectory: DirectoryProperty

    /**
     * The apk directory has a metadata file indicating relevant files
     * and this loader processes that to give us the all the splits the
     * form the abstract artifact.
     */
    @get:Internal
    abstract val artifactsLoader: Property<BuiltArtifactsLoader>

    @TaskAction
    fun logApkSize() {
        val builtArtifacts = artifactsLoader.get().load(artifactsDirectory.get())
            ?: throw RuntimeException("Cannot load APK metadata")

        val variantName = builtArtifacts.variantName.replaceFirstChar { it.uppercase() }
        val apkSizes = determineApkSizes(builtArtifacts.elements)
        val json = buildPerfherderJson(variantName, apkSizes)

        val isAutomation = System.getenv("MOZ_AUTOMATION") == "1"
        val uploadPath = System.getenv("MOZ_PERFHERDER_UPLOAD")
        if (isAutomation && uploadPath != null) {
            println("PERFHERDER_DATA: $json")
            val outputFile = File(uploadPath)
            outputFile.parentFile?.mkdirs()
            outputFile.writeText(json.toString())
        }
    }

    private fun determineApkSizes(artifacts: Collection<BuiltArtifact>): Map<String, Long> {
        return artifacts.associate {
            val file = File(it.outputFile)
            file.name to Files.size(file.toPath())
        }
    }

    /**
     * Returns perfherder compatible JSON for tracking the file size of APKs.
     *
     * ```
     * {
     *   "framework": {
     *     "name": "build_metrics"
     *   },
     *   "suites": [
     *     {
     *       "name": "apk-size-[debug,nightly,beta,release]",
     *       "lowerIsBetter": true,
     *       "subtests": [
     *         { "name": "app-arm64-v8a-debug.apk", "value": 98855735 },
     *         { "name": "app-armeabi-v7a-debug.apk", "value": 92300031 },
     *         { "name": "app-x86-debug.apk", "value": 103410909 },
     *         { "name": "app-x86_64-debug.apk", "value": 102465675 }
     *       ],
     *       "value":98855735,
     *       "shouldAlert":false
     *     }
     *   ]
     * }
     * ```
     */
    private fun buildPerfherderJson(variantName: String, apkSize: Map<String, Long>): JSONObject {
        val data = JSONObject()

        val framework = JSONObject()
        framework.put("name", "build_metrics")
        data.put("framework", framework)

        val suites = JSONArray()

        val suite = JSONObject()
        suite.put("name", "apk-size-$variantName")
        suite.put("value", getSummarySize(apkSize))
        suite.put("lowerIsBetter", true)
        suite.put("alertChangeType", "absolute")
        suite.put("alertThreshold", 1024 * 1024)

        if (variantName.contains("debug", ignoreCase = true)) {
            suite.put("shouldAlert", false)
        }

        val subtests = JSONArray()
        apkSize.forEach { (apk, size) ->
            val subtest = JSONObject()
            subtest.put("name", apk)
            subtest.put("value", size)
            subtests.put(subtest)
        }
        suite.put("subtests", subtests)

        suites.put(suite)

        data.put("suites", suites)

        return data
    }
}

/**
 * Returns a summarized size for the APKs. This is the main value that is getting tracked. The size
 * of the individual APKs will be reported as "subtests".
 */
private fun getSummarySize(apkSize: Map<String, Long>): Long {
    val arm64size = apkSize.keys.find { it.contains("arm64") }?.let { apk -> apkSize[apk] }
    if (arm64size != null) {
        // If available we will report the size of the arm64 APK as the summary. This is the most
        // important and most installed APK.
        return arm64size
    }

    // If there's no arm64 APK then we calculate a simple average.
    return apkSize.values.sum() / apkSize.size
}
