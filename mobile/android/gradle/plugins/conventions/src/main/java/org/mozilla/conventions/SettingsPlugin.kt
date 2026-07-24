/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

import org.gradle.api.Plugin
import org.gradle.api.initialization.Settings
import org.gradle.api.initialization.resolve.RepositoriesMode
import java.io.File

class SettingsPlugin : Plugin<Settings> {
    override fun apply(settings: Settings) {
        configureDependencyResolution(settings)
        loadBuildConfig(settings)

        settings.gradle.allprojects {
            pluginManager.apply(ProjectPlugin::class.java)
        }

        settings.gradle.rootProject {
            pluginManager.apply(BuildConfigPlugin::class.java)
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun configureDependencyResolution(settings: Settings) {
        val mozconfig = settings.gradle.extensions.extraProperties["mozconfig"] as Map<String, Any>
        val topobjdir = mozconfig["topobjdir"] as String
        val configureMavenRepositories = settings.gradle.extensions.extraProperties["configureMavenRepositories"] as groovy.lang.Closure<*>

        settings.dependencyResolutionManagement {
            repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
            repositories {
                configureMavenRepositories.call(this)
                maven { setUrl("${topobjdir}/gradle/maven") }
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun loadBuildConfig(settings: Settings) {
        val mozconfig = settings.gradle.extensions.extraProperties["mozconfig"] as Map<*, *>
        val topsrcdir = mozconfig["topsrcdir"] as String
        val rootDir = settings.rootDir.absolutePath

        val buildConfigFile = File(topsrcdir, "mobile/android/android-components/.buildconfig.yml")
        val baseDir = File(topsrcdir, "mobile/android/android-components")
        val buildConfig = BuildConfig.fromYml(buildConfigFile)

        // This could be improved by adding a `sample` flag (or similar) to
        // .buildconfig.yml so inclusion is driven by project metadata rather than
        // name-prefix matching.
        val shouldIncludeProject = { name: String, _: ProjectConfig ->
            rootDir.contains("android-components") || !name.startsWith("components:samples")
        }

        includeProjects(settings, buildConfig, baseDir, shouldIncludeProject)
    }
}
