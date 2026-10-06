/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.apilint

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.TaskProvider
import org.gradle.api.tasks.compile.JavaCompile

class ApiLintPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        val extension = project.extensions.create("apiLint", ApiLintPluginExtension::class.java)

        project.pluginManager.withPlugin("com.android.library") {
            val docletJarFile = project.layout.buildDirectory.file("docletJar/apidoc-plugin.jar")
            val resourceName = "apidoc-plugin.jar"

            val copyDocletJarResource = project.tasks.register("copyDocletJarResource") { task ->
                task.inputs.property("resourceName", resourceName)
                task.outputs.file(docletJarFile)
                task.doLast {
                    val resourceStream = ApiLintPlugin::class.java.classLoader.getResourceAsStream(resourceName)
                        ?: throw RuntimeException("Java resource not found: $resourceName")
                    resourceStream.use { input ->
                        task.outputs.files.singleFile.outputStream().use { out ->
                            input.copyTo(out)
                        }
                    }
                }
            }

            // The compile classpath is taken from the variant's javac task, but AGP creates that
            // task after the onVariants callbacks run, so we defer wiring it until afterEvaluate.
            val apiGenerateTasks = mutableMapOf<String, TaskProvider<ApiCompatLintTask>>()

            val androidComponents =
                project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)
            androidComponents.onVariants(androidComponents.selector().all()) { variant ->
                val variantName = variant.name
                val name = variantName.replaceFirstChar { c -> c.titlecase() }

                // The generated API files used to live in the variant's javac output directory.
                // The new variant API does not expose that directory at configuration time, so we
                // write them to a dedicated, variant-scoped directory instead.
                val outputDir = project.layout.buildDirectory.dir("apilint/${variantName}")
                val apiFileProvider = outputDir.flatMap { dir -> extension.apiOutputFileName.map { dir.file(it) } }
                val jsonResultFileProvider =
                    outputDir.flatMap { dir -> extension.jsonResultFileName.map { dir.file(it) } }
                val currentApiFileProvider = project.layout.projectDirectory.file(extension.currentApiRelativeFilePath)
                val apiMapFileProvider = outputDir.flatMap { dir ->
                    extension.apiOutputFileName.map { dir.file("${it}.map") }
                }

                // sources.java.all covers the static sources plus the AGP-generated BuildConfig/AIDL
                // sources (replacing the legacy sourceSets/generateBuildConfig/aidlCompile accessors).
                // Generated non-API types (BuildConfig, R) are filtered by skipClassesRegex/exclude below.
                val javaSources = variant.sources.java ?: return@onVariants
                val sourceDirs = javaSources.all

                val apiGenerate = project.tasks.register("apiGenerate${name}", ApiCompatLintTask::class.java) { task ->
                    task.description = "Generates API file for build variant ${name}"
                    task.dependsOn(copyDocletJarResource)

                    task.setSource(sourceDirs)
                    task.exclude("**/R.java")
                    task.include("**/**.java")

                    task.sourcePath.from(sourceDirs)

                    task.rootDir.set(project.rootDir.absolutePath)
                    task.outputFile.set(apiFileProvider)
                    task.packageFilter.set(extension.packageFilter)
                    task.skipClassesRegex.set(extension.skipClassesRegex)
                    task.javadocDestinationDir.set(project.layout.buildDirectory.dir("tmp/javadoc/${variantName}"))
                    task.docletPath.set(docletJarFile)
                }
                apiGenerateTasks[variantName] = apiGenerate

                val apiLintSingle = project.tasks.register("apiLintSingle${name}", PythonExec::class.java) { task ->
                    task.description = "Runs API lint checks for variant ${name}"
                    task.dependsOn(apiGenerate)
                    task.scriptPath.set("apilint.py")

                    task.inputs.file(apiFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                    task.inputs.file(apiMapFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                    task.outputs.file(jsonResultFileProvider)

                    task.doFirst {
                        val apiFile = apiFileProvider.get().asFile
                        val jsonResultFile = jsonResultFileProvider.get().asFile
                        val apiMapFile = apiMapFileProvider.get().asFile

                        task.args(apiFile, "--result-json", jsonResultFile)
                        if (extension.lintFilters.isPresent) {
                            task.args("--filter-errors", *extension.lintFilters.get().toTypedArray())
                        }
                        if (extension.allowedPackages.isPresent) {
                            task.args("--allowed-packages", *extension.allowedPackages.get().toTypedArray())
                        }
                        if (extension.deprecationAnnotation.isPresent) {
                            task.args("--deprecation-annotation", extension.deprecationAnnotation.get())
                        }
                        if (extension.libraryVersion.isPresent) {
                            task.args("--library-version", extension.libraryVersion.get())
                        }
                        task.args("--api-map", apiMapFile)
                    }
                }

                val apiDiff = project.tasks.register("apiDiff${name}", PythonExec::class.java) { task ->
                    task.description = "Prints the diff between the existing API and the local API."
                    task.group = "Verification"
                    task.dependsOn(apiGenerate)
                    task.scriptPath.set("diff.py")

                    task.inputs.file(apiFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                    task.inputs.file(currentApiFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)

                    // diff exit value is != 0 if the files are different
                    task.isIgnoreExitValue = true

                    task.doFirst {
                        val apiFile = apiFileProvider.get().asFile
                        val currentApiFile = currentApiFileProvider.get().asFile

                        task.args("--existing", currentApiFile, "--local", apiFile, "--command", extension.helpCommand.get()(name))
                    }
                }

                val apiCompatLint = project.tasks.register("apiCompatLint${name}", PythonExec::class.java) { task ->
                    task.description = "Runs API compatibility lint checks for variant ${name}"
                    task.scriptPath.set("apilint.py")

                    task.inputs.file(apiFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                    task.inputs.file(currentApiFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                    task.inputs.file(apiMapFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                    task.outputs.file(jsonResultFileProvider)

                    task.dependsOn(apiLintSingle)
                    task.finalizedBy(apiDiff)

                    task.doFirst {
                        val apiFile = apiFileProvider.get().asFile
                        val jsonResultFile = jsonResultFileProvider.get().asFile
                        val currentApiFile = currentApiFileProvider.get().asFile
                        val apiMapFile = apiMapFileProvider.get().asFile

                        task.args("--show-noticed", apiFile, currentApiFile, "--result-json", jsonResultFile, "--append-json", "--api-map", apiMapFile)
                        if (extension.deprecationAnnotation.isPresent) {
                            task.args("--deprecation-annotation", extension.deprecationAnnotation.get())
                        }
                        if (extension.libraryVersion.isPresent) {
                            task.args("--library-version", extension.libraryVersion.get())
                        }
                    }
                }

                val lintDependency = if (extension.changelogFileName.isPresent) {
                    val changelogFileProvider = project.layout.projectDirectory.file(extension.changelogFileName)
                    project.tasks.register("apiChangelogCheck${name}", PythonExec::class.java) { changelogTask ->
                        changelogTask.description = "Checks that the API changelog has been updated."
                        changelogTask.group = "Verification"
                        changelogTask.scriptPath.set("changelog-check.py")

                        changelogTask.inputs.file(apiFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                        changelogTask.inputs.file(changelogFileProvider).withPathSensitivity(org.gradle.api.tasks.PathSensitivity.RELATIVE)
                        changelogTask.outputs.file(jsonResultFileProvider)

                        changelogTask.dependsOn(apiCompatLint)

                        changelogTask.doFirst {
                            val apiFile = apiFileProvider.get().asFile
                            val jsonResultFile = jsonResultFileProvider.get().asFile
                            val changelogFile = changelogFileProvider.get().asFile

                            changelogTask.args("--api-file", apiFile, "--changelog-file", changelogFile, "--result-json", jsonResultFile)
                        }
                    }
                } else {
                    apiCompatLint
                }

                val apiLint = project.tasks.register("apiLint${name}") { task ->
                    task.description = "Runs API lint checks for variant ${name}"
                    task.group = "Verification"
                    task.dependsOn(lintDependency)
                }

                project.tasks.named("check") {
                    it.dependsOn(apiLint)
                }

                project.tasks.register("apiUpdateFile${name}", Copy::class.java) { task ->
                    task.description = "Updates the API file from the local one for variant ${name}"
                    task.group = "Verification"
                    task.dependsOn(apiGenerate)
                    task.from(apiFileProvider)
                    task.into(currentApiFileProvider.map { it.asFile.parentFile })
                    task.rename { currentApiFileProvider.get().asFile.name }
                }
            }

            // AGP creates the variant javac tasks after onVariants runs, so wire each
            // apiGenerate task's classpath from the corresponding javac task here.
            project.afterEvaluate {
                apiGenerateTasks.forEach { (variantName, apiGenerate) ->
                    val name = variantName.replaceFirstChar { c -> c.titlecase() }
                    apiGenerate.configure { task ->
                        task.classpath = project.files(
                            project.tasks.named("compile${name}JavaWithJavac", JavaCompile::class.java)
                                .map { it.classpath },
                        )
                    }
                }
            }
        }
    }
}
