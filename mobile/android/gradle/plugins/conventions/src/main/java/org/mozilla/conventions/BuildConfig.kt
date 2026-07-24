/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

import com.charleskorn.kaml.Yaml
import kotlinx.serialization.Serializable
import org.gradle.api.Action
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.component.ProjectComponentIdentifier
import org.gradle.api.initialization.Settings
import org.gradle.api.logging.Logging
import java.io.File

@Serializable
data class BuildConfig(
    val projects: Map<String, ProjectConfig> = emptyMap(),
    val variants: List<VariantConfig> = emptyList(),
) {
    companion object {
        internal val logger = Logging.getLogger(BuildConfig::class.java)

        fun fromYml(file: File): BuildConfig {
            require(file.exists()) { "Build config file does not exist: ${file.absolutePath}" }
            return Yaml.default.decodeFromString(
                serializer(),
                file.readText(),
            )
        }
    }
}

@Serializable
data class ProjectConfig(
    val path: String? = null,
    val description: String? = null,
    val publish: Boolean? = null,
    val upstream_dependencies: List<String> = emptyList(),
)

@Serializable
data class VariantConfig(
    val name: String,
    val build_type: String,
    val apks: List<ApkConfig> = emptyList(),
)

@Serializable
data class ApkConfig(
    val abi: String,
    val fileName: String,
)

class BuildConfigPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.tasks.register("printProjectDependencies") {
            description = "Prints inter-project dependencies as JSON"
            val outputFile = File(project.projectDir, "build/printProjectDependencies.json")

            val allDeps = mutableMapOf<String, List<String>>()
            project.subprojects.forEach { subproject ->
                val name = subproject.path.removePrefix(":")
                val deps = mutableSetOf<String>()

                subproject.configurations
                    .filter { it.isCanBeResolved }
                    .forEach { config ->
                        config.incoming.resolutionResult.allComponents.forEach { component ->
                            val id = component.id
                            if (id is ProjectComponentIdentifier) {
                                val depPath = id.projectPath.removePrefix(":")
                                if (depPath != name) {
                                    deps.add(depPath)
                                }
                            }
                        }
                    }

                allDeps[name] = deps.sorted()
            }

            doLast {
                val json = groovy.json.JsonOutput.toJson(allDeps)
                outputFile.parentFile.mkdirs()
                outputFile.writeText(json)
                logger.debug("Wrote project dependencies to $outputFile")
            }
        }
    }
}

/**
 * Registers projects from a [BuildConfig] into the Gradle [Settings], optionally filtering
 * which projects to include via [shouldIncludeProject].
 *
 * @param settings the Gradle [Settings] instance to register projects into.
 * @param buildConfig the parsed [BuildConfig] containing project definitions.
 * @param baseDir the base directory that project paths in [buildConfig] are relative to.
 * @param shouldIncludeProject predicate to filter projects by name and config.
 */
fun includeProjects(
    settings: Settings,
    buildConfig: BuildConfig,
    baseDir: File,
    shouldIncludeProject: (String, ProjectConfig) -> Boolean = { _, _ -> true },
) {
    val componentsDir = File(baseDir, "components")
    if (componentsDir.exists()) {
        settings.include(":components")
        settings.project(":components").projectDir = componentsDir
    }

    val descriptions = mutableMapOf<String, String>()
    var includedCount = 0

    buildConfig.projects
        .filter { (name, config) -> shouldIncludeProject(name, config) }
        .forEach { (name, config) ->
            settings.include(":$name")

            config.path?.let { path ->
                settings.project(":$name").projectDir = File(baseDir, path)
            }

            config.description?.let { descriptions[":$name"] = it }
            includedCount++
        }

    if (descriptions.isNotEmpty()) {
        settings.gradle.beforeProject(Action {
            descriptions[path]?.let {
                extensions.extraProperties.set("description", it)
            }
        })
    }

    settings.gradle.projectsLoaded(Action {
        rootProject.extensions.extraProperties["buildConfig"] = buildConfig
    })

    BuildConfig.logger.debug("BuildConfig> Loaded $includedCount projects")
}
