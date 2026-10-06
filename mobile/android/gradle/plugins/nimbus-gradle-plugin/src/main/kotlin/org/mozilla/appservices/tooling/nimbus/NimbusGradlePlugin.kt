/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.appservices.tooling.nimbus

import com.android.build.api.variant.AndroidComponentsExtension
import com.android.build.gradle.AppPlugin
import com.android.build.gradle.LibraryPlugin
import org.gradle.api.GradleException
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.MapProperty
import org.gradle.api.provider.Property
import org.mozilla.conventions.isTruthy
import org.gradle.api.provider.Provider
import org.gradle.api.provider.ValueSource
import org.gradle.api.provider.ValueSourceParameters
import java.io.File

abstract class ApplicationServicesVersionSource : ValueSource<String, ApplicationServicesVersionSource.Parameters> {
    interface Parameters : ValueSourceParameters {
        val topsrcdir: Property<String>
        val localPropertiesVersion: Property<String>
    }

    override fun obtain(): String {
        // Check for override from local properties first
        val localVersion = parameters.localPropertiesVersion.orNull
        if (localVersion != null) {
            return localVersion
        }
        // Extract from a generated .kt file
        val topsrcdir = parameters.topsrcdir.get()
        val appServicesFile = File(topsrcdir, "mobile/android/android-components/plugins/dependencies/src/main/java/ApplicationServices.kt")
        val content = appServicesFile.readText()

        // Extract version from: val VERSION = "143.20250816050436"
        val versionRegex = Regex("""val VERSION = "([^"]+)"""")
        val matchResult = versionRegex.find(content)
            ?: throw GradleException("Could not determine application-services version from ${appServicesFile.absolutePath}")
        return matchResult.groupValues[1]
    }
}

abstract class NimbusPluginExtension {
    /**
     * The .fml.yaml manifest file.
     *
     * If absent this defaults to `nimbus.fml.yaml`.
     * If relative, it is relative to the project root.
     */
    abstract val manifestFile: Property<String>

    /**
     * The mapping between the build variant and the release channel.
     *
     * Variants that are not in this map are used literally.
     */
    abstract val channels: MapProperty<String, String>

    /**
     * The filename of the manifest ingested by Experimenter.
     *
     * If this is a relative name, it is taken to be relative to the project's root directory.
     *
     * If missing, this defaults to `.experimenter.json`.
     */
    abstract val experimenterManifest: Property<String>

    /**
     * The directory to which the generated files should be written.
     *
     * This defaults to the generated sources folder in the build directory.
     */
    abstract val outputDir: Property<String>

    /**
     * The file(s) containing the version(s)/ref(s)/location(s) for additional repositories.
     *
     * This defaults to an empty list.
     */
    abstract val repoFiles: ListProperty<String>

    /**
     * The directory where downloaded files are or where they should be cached.
     *
     * If missing, this defaults to the Nimbus cache folder in the build directory.
     */
    abstract val cacheDir: Property<String>

    /**
     * The directory where a local installation of application services can be found.
     *
     * This defaults to `null`, in which case the plugin will download a copy of the correct
     * nimbus-fml binary for this version of the plugin.
     */
    abstract val applicationServicesDir: Property<String>
}

class NimbusPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        val extension = project.extensions.create("nimbus", NimbusPluginExtension::class.java)

        // Configure default values ("conventions") for our
        // extension properties.
        extension.manifestFile.convention("nimbus.fml.yaml")
        extension.cacheDir.convention("nimbus-cache")

        val validateTask = setupValidateTask(project)

        // We need to locate our nimbus-fml tool - prior to app-services moving into mozilla-firefox, we
        // download this tool from taskcluster. After the move of app-services, we expect the tool to exist
        // locally having been built by `./mach build`.
        @Suppress("UNCHECKED_CAST")
        val mozconfig = project.gradle.extensions.extraProperties["mozconfig"] as? Map<String, Any>
        @Suppress("UNCHECKED_CAST")
        val mozconfigSubsts = mozconfig?.get("substs") as? Map<String, Any>

        if (mozconfigSubsts?.get("MOZ_APPSERVICES_IN_TREE").isTruthy()) {
            // This is subtle.  We capture `NIMBUS_FML` in the configuration cache as a `String`.
            // If we access `project.gradle...` in the `provider` `Callable` below, we capture the
            // `Project` in the configuration cache, which is not desirable.
            //
            // We can't produce a `File` immediately, because in some configurations, namely
            // `android-gradle-dependencies` tasks, `NIMBUS_FML` is legitimately unset (`null`).  So
            // we pass strings around and map to `File` types lazily "by hand".
            //
            // Finally: if this process fails, including with an exception, the framework swallows
            // the details and says something like `MissingValueException`, which can be hard to
            // interpret.  Hence, this explanation of the details.
            val nimbusFmlPath = mozconfigSubsts?.get("NIMBUS_FML") as? String

            val fmlBinaryString = project.providers.provider {
                nimbusFmlPath
            }

            // Configure the task with proper file type
            validateTask.configure {
                it.fmlBinary.set(project.layout.file(fmlBinaryString.map({ s -> File(s) })))
            }

            setupAndroidVariants(project, validateTask) { generateTask ->
                generateTask.configure {
                    it.fmlBinary.set(project.layout.file(fmlBinaryString.map({ s -> File(s) })))
                    it.dependsOn(validateTask)
                }
            }
        } else {
            // building from an app-services artifact.
            val fmlBinaryProvider = getOrCreateAssembleToolsFmlBinary(project.rootProject, extension.applicationServicesDir)

            validateTask.configure {
                // Gradle tracks the dependency on the `nimbus-fml` binary that the
                // `assembleNimbusTools` task produces implicitly; we don't need an
                // explicit `dependsOn` here.
                it.fmlBinary.set(fmlBinaryProvider)
            }

            setupAndroidVariants(project, validateTask) { generateTask ->
                generateTask.configure {
                    it.fmlBinary.set(fmlBinaryProvider)
                    it.dependsOn(validateTask)
                }
            }
        }
    }

    private fun setupAndroidVariants(
        project: Project,
        validateTask: org.gradle.api.tasks.TaskProvider<NimbusValidateTask>,
        configureGenerateTask: (org.gradle.api.tasks.TaskProvider<NimbusFeaturesTask>) -> Unit
    ) {
        project.plugins.withType(AppPlugin::class.java).configureEach {
            val androidComponents = project.extensions.getByType(AndroidComponentsExtension::class.java)
            setupVariantsForComponents(androidComponents, project, configureGenerateTask)
        }

        project.plugins.withType(LibraryPlugin::class.java).configureEach {
            val androidComponents = project.extensions.getByType(AndroidComponentsExtension::class.java)
            setupVariantsForComponents(androidComponents, project, configureGenerateTask)
        }
    }

    private fun setupVariantsForComponents(
        androidComponents: AndroidComponentsExtension<*, *, *>,
        project: Project,
        configureGenerateTask: (org.gradle.api.tasks.TaskProvider<NimbusFeaturesTask>) -> Unit
    ) {
        androidComponents.onVariants(androidComponents.selector().all()) { variant ->
            val generateTask = project.tasks.register(
                "nimbusFeatures${variant.name.replaceFirstChar { it.uppercase() }}",
                NimbusFeaturesTask::class.java
            ) { task ->
                task.description = "Generate Kotlin data classes for Nimbus enabled features"
                task.group = "Nimbus"

                task.doFirst {
                    task.logger.info("Nimbus FML generating Kotlin")
                    task.logger.info("manifest             {}", task.inputFile.get().asFile)
                    task.logger.info("cache dir            {}", task.cacheDir.get().asFile)
                    task.logger.info("repo file(s)         {}", task.repoFiles.files.joinToString())
                    task.logger.info("channel              {}", task.channel.get())
                }

                task.doLast {
                    task.logger.info("outputFile    {}", task.outputDir.get().asFile)
                }

                configureCommonTaskProperties(task, project, "features${variant.name.replaceFirstChar { it.uppercase() }}")
                val extension = project.extensions.getByType(NimbusPluginExtension::class.java)
                task.channel.set(extension.channels.getting(variant.name).orElse(variant.name))
                task.outputDir.set(project.layout.buildDirectory.dir("generated/source/nimbus/${variant.name}/kotlin"))
            }
            configureGenerateTask(generateTask)
            variant.sources.java?.addGeneratedSourceDirectory(generateTask, NimbusFeaturesTask::outputDir)
        }
    }

    // Everything below here is for downloading a binary.
    private fun getOrCreateAssembleToolsFmlBinary(
        rootProject: Project,
        applicationServicesDir: Property<String>
    ): Provider<org.gradle.api.file.RegularFile> {
        val taskName = "assembleNimbusTools"
        val propertyName = "nimbus.fmlBinaryProvider"

        if (rootProject.extensions.extraProperties.has(propertyName)) {
            @Suppress("UNCHECKED_CAST")
            return rootProject.extensions.extraProperties[propertyName] as Provider<org.gradle.api.file.RegularFile>
        }

        val asVersionProvider = getProjectVersionProvider(rootProject)
        @Suppress("UNCHECKED_CAST")
        val mozconfig = rootProject.gradle.extensions.extraProperties["mozconfig"] as? Map<String, Any>
        val topsrcdir = requireNotNull(mozconfig?.get("topsrcdir") as? String) {
            "topsrcdir not found in mozconfig"
        }
        val rootBuildDir = rootProject.layout.buildDirectory
        val rootProjectLayout = rootProject.layout

        val taskProvider = rootProject.tasks.register(taskName, NimbusAssembleToolsTask::class.java) { task ->
            task.group = "Nimbus"
            task.description = "Fetch the Nimbus FML tools from Application Services"

            val cacheDir = asVersionProvider.map { version: String ->
                val absoluteCachePath = File(topsrcdir, ".gradle/caches/nimbus-fml/$version")
                val relativeFromProject = rootProjectLayout.projectDirectory.asFile.toPath()
                    .relativize(absoluteCachePath.toPath())
                    .toString()
                rootProjectLayout.projectDirectory.dir(relativeFromProject)
            }

            task.archiveFile.set(cacheDir.map { it.file("nimbus-fml.zip") })
            task.hashFile.set(cacheDir.map { it.file("nimbus-fml.sha256") })
            task.fmlBinary.set(rootBuildDir.flatMap { buildDir ->
                asVersionProvider.zip(task.platform) { version, plat ->
                    buildDir.dir("bin/nimbus/$version").file(NimbusAssembleToolsTask.getBinaryName(plat))
                }
            })
            task.cacheRoot.set(File(topsrcdir, ".gradle/caches/nimbus-fml"))

            task.fetch { spec ->
                // Try archive.mozilla.org release first
                spec.archive.set(asVersionProvider.map { asVersion ->
                    "https://archive.mozilla.org/pub/app-services/releases/$asVersion/nimbus-fml.zip"
                })
                spec.hash.set(asVersionProvider.map { asVersion ->
                    "https://archive.mozilla.org/pub/app-services/releases/$asVersion/nimbus-fml.sha256"
                })

                // Fall back to a nightly release
                spec.fallback { fallbackSpec ->
                    fallbackSpec.archive.set(asVersionProvider.map { asVersion ->
                        "https://firefox-ci-tc.services.mozilla.com/api/index/v1/task/project.application-services.v2.nimbus-fml.$asVersion/artifacts/public/build/nimbus-fml.zip"
                    })
                    fallbackSpec.hash.set(asVersionProvider.map { asVersion ->
                        "https://firefox-ci-tc.services.mozilla.com/api/index/v1/task/project.application-services.v2.nimbus-fml.$asVersion/artifacts/public/build/nimbus-fml.sha256"
                    })
                }
            }

            task.unzip { spec ->
                spec.include("${task.platform.get()}*/release/nimbus-fml*")
            }

            task.onlyIf("`applicationServicesDir` == null") {
                applicationServicesDir.orNull == null
            }
        }

        val fmlBinaryProvider = taskProvider.flatMap { it.fmlBinary }
        rootProject.extensions.extraProperties[propertyName] = fmlBinaryProvider
        return fmlBinaryProvider
    }

    private fun getProjectVersionProvider(rootProject: Project): Provider<String> {
        @Suppress("UNCHECKED_CAST")
        val mozconfig = rootProject.gradle.extensions.extraProperties["mozconfig"] as? Map<String, Any>
        val topsrcdir = requireNotNull(mozconfig?.get("topsrcdir") as? String) {
            "topsrcdir not found in mozconfig"
        }
        val localPropertiesVersion = if (rootProject.gradle.extensions.extraProperties.has("localProperties.branchBuild.application-services.version")) {
            rootProject.gradle.extensions.extraProperties["localProperties.branchBuild.application-services.version"] as? String
        } else {
            null
        }

        return rootProject.providers.of(ApplicationServicesVersionSource::class.java) { spec ->
            spec.parameters.topsrcdir.set(topsrcdir)
            spec.parameters.localPropertiesVersion.set(localPropertiesVersion)
        }
    }

    private fun configureCommonTaskProperties(task: NimbusTask, project: Project, cacheDirSuffix: String) {
        val extension = project.extensions.getByType(NimbusPluginExtension::class.java)

        task.repoFiles.setFrom(project.files(extension.repoFiles))
        task.applicationServicesDir.set(extension.applicationServicesDir)
        task.inputFile.set(project.layout.projectDirectory.file(extension.manifestFile))
        // Each task gets its own cache subdirectory because Gradle discourages
        // "overlapping outputs" which inhibit caching and parallelization
        // (https://github.com/gradle/gradle/issues/28394).
        task.cacheDir.set(project.layout.buildDirectory.dir(extension.cacheDir).map {
            it.dir(cacheDirSuffix)
        })
    }

    private fun setupValidateTask(project: Project): org.gradle.api.tasks.TaskProvider<NimbusValidateTask> {
        return project.tasks.register("nimbusValidate", NimbusValidateTask::class.java) { task ->
            task.description = "Validate the Nimbus feature manifest for the app"
            task.group = "Nimbus"

            task.doFirst {
                task.logger.info("Nimbus FML: validating manifest")
                task.logger.info("manifest             {}", task.inputFile.get().asFile)
                task.logger.info("cache dir            {}", task.cacheDir.get().asFile)
                task.logger.info("repo file(s)         {}", task.repoFiles.files.joinToString())
            }

            configureCommonTaskProperties(task, project, "validate")

            // `nimbusValidate` doesn't have any outputs, so Gradle will always
            // run it, even if its inputs haven't changed. This predicate tells
            // Gradle to ignore the outputs, and only consider the inputs, for
            // up-to-date checks.
            task.outputs.upToDateWhen { true }
        }
    }
}
