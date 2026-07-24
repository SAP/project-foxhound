/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.tooling.nimbus

import org.gradle.api.GradleException
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.file.Directory
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.MapProperty
import org.gradle.api.provider.Property
import org.gradle.api.provider.Provider
import org.gradle.api.provider.ValueSource
import org.gradle.api.provider.ValueSourceParameters

abstract class ApplicationServicesVersionSource implements ValueSource<String, ApplicationServicesVersionSource.Parameters> {
    interface Parameters extends ValueSourceParameters {
        Property<String> getTopsrcdir()
        Property<String> getLocalPropertiesVersion()
    }

    @Override
    String obtain() {
        // Check for override from local properties first
        def localVersion = parameters.localPropertiesVersion.getOrNull()
        if (localVersion != null) {
            return localVersion
        }
        // Extract from a generated .kt file
        def topsrcdir = parameters.topsrcdir.get()
        def appServicesFile = new File(topsrcdir, "mobile/android/android-components/plugins/dependencies/src/main/java/ApplicationServices.kt")
        def versionLine = appServicesFile.readLines().find { it.startsWith("val VERSION = ") }
        if (versionLine) {
            // Extract version from: val VERSION = "143.20250816050436"
            return versionLine.split('"')[1]
        }
        throw new GradleException("Could not determine application-services version from ${appServicesFile.absolutePath}")
    }
}

abstract class NimbusPluginExtension {
    /**
     * The .fml.yaml manifest file.
     *
     * If absent this defaults to `nimbus.fml.yaml`.
     * If relative, it is relative to the project root.
     *
     * @return
     */
    abstract Property<String> getManifestFile()

    /**
     * The mapping between the build variant and the release channel.
     *
     * Variants that are not in this map are used literally.
     * @return
     */
    abstract MapProperty<String, String> getChannels()

    /**
     * The filename of the manifest ingested by Experimenter.
     *
     * If this is a relative name, it is taken to be relative to the project's root directory.
     *
     * If missing, this defaults to `.experimenter.json`.
     * @return
     */
    abstract Property<String> getExperimenterManifest()

    /**
     * The directory to which the generated files should be written.
     *
     * This defaults to the generated sources folder in the build directory.
     *
     * @return
     */
    abstract Property<String> getOutputDir()

    /**
     * The file(s) containing the version(s)/ref(s)/location(s) for additional repositories.
     *
     * This defaults to an empty list.
     *
     * @return
     */
    abstract ListProperty<String> getRepoFiles()

    /**
     * The directory where downloaded files are or where they should be cached.
     *
     * If missing, this defaults to the Nimbus cache folder in the build directory.
     *
     * @return
     */
    abstract Property<String> getCacheDir()

    /**
     * The directory where a local installation of application services can be found.
     *
     * This defaults to `null`, in which case the plugin will download a copy of the correct
     * nimbus-fml binary for this version of the plugin.
     *
     * @return
     */
    abstract Property<String> getApplicationServicesDir()
}

class NimbusPlugin implements Plugin<Project> {

    void apply(Project project) {
        def extension = project.extensions.create('nimbus', NimbusPluginExtension)

        // Configure default values ("conventions") for our
        // extension properties.
        extension.manifestFile.convention('nimbus.fml.yaml')
        extension.cacheDir.convention('nimbus-cache')

        def validateTask = setupValidateTask(project)

        // We need to locate our nimbus-fml tool - prior to app-services moving into mozilla-firefox, we
        // download this tool from taskcluster. After the move of app-services, we expect the tool to exist
        // locally having been built by `./mach build`.
        if (project.gradle.ext.mozconfig.substs.MOZ_APPSERVICES_IN_TREE) {
            // we assume the binary has been built and `gradle.ext.mozconfig.substs.NIMBUS_FML` tells us where to find it.
            def fmlBinaryFile = new File(project.gradle.mozconfig.substs.NIMBUS_FML)

            // Configure the task with proper file type
            validateTask.configure { task ->
                task.fmlBinary = fmlBinaryFile
            }

            // Set up Android variants for both application and library plugins
            setupAndroidVariants(project, validateTask) { generateTask ->
                generateTask.configure { task ->
                    task.fmlBinary = fmlBinaryFile
                    task.dependsOn validateTask
                }
            }
        } else {
            // building from an app-services artifact.
            def applicationServicesDir = project.nimbus.applicationServicesDir
            def assembleToolsTask = getOrCreateAssembleToolsTask(project.rootProject, applicationServicesDir)

            validateTask.configure {
                // Gradle tracks the dependency on the `nimbus-fml` binary that the
                // `assembleNimbusTools` task produces implicitly; we don't need an
                // explicit `dependsOn` here.
                fmlBinary = assembleToolsTask.flatMap { it.fmlBinary }
            }

            // Set up Android variants for both application and library plugins
            setupAndroidVariants(project, validateTask) { generateTask ->
                generateTask.configure {
                    fmlBinary = assembleToolsTask.flatMap { it.fmlBinary }
                    dependsOn validateTask
                }
            }
        }
    }

    private void setupAndroidVariants(Project project, def validateTask, Closure configureGenerateTask) {
        // Common variant setup logic for both application and library plugins
        def setupVariants = { androidComponents ->
            androidComponents.onVariants(androidComponents.selector().all()) { variant ->
                def generateTask = setupNimbusFeatureTasks(variant, project)
                configureGenerateTask(generateTask)
                variant.sources.java.addGeneratedSourceDirectory(generateTask) { it.outputDir }
            }
        }

        // Apply to both Android application and library plugins
        project.pluginManager.withPlugin('com.android.application') {
            def androidComponents = project.extensions.getByName('androidComponents')
            setupVariants(androidComponents)
        }

        project.pluginManager.withPlugin('com.android.library') {
            def androidComponents = project.extensions.getByName('androidComponents')
            setupVariants(androidComponents)
        }
    }

    // Everything below here is for downloading a binary.
    private def getOrCreateAssembleToolsTask(Project rootProject, Property<String> applicationServicesDir) {
        def taskName = 'assembleNimbusTools'

        // Check if task already exists, since we only want to download/extract once.
        def existingTask = rootProject.tasks.findByName(taskName)
        if (existingTask != null) {
            return rootProject.tasks.named(taskName)
        }

        def asVersionProvider = getProjectVersionProvider(rootProject)
        def topsrcdir = rootProject.gradle.mozconfig.topsrcdir
        def rootBuildDir = rootProject.layout.buildDirectory
        def rootProjectLayout = rootProject.layout

        return rootProject.tasks.register(taskName, NimbusAssembleToolsTask) { task ->
            group = "Nimbus"
            description = "Fetch the Nimbus FML tools from Application Services"

            def cacheDir = asVersionProvider.map { String version ->
                def cachePath = new File(topsrcdir, ".gradle/caches/nimbus-fml/$version")
                def relativePath = rootProjectLayout.projectDirectory.asFile.toPath().relativize(cachePath.toPath()).toString()
                rootProjectLayout.projectDirectory.dir(relativePath)
            }

            archiveFile = cacheDir.map { it.file('nimbus-fml.zip') }
            hashFile = cacheDir.map { it.file('nimbus-fml.sha256') }
            fmlBinary = rootBuildDir.flatMap { buildDir ->
                asVersionProvider.zip(platform) { version, plat ->
                    buildDir.dir("bin/nimbus/$version").file(NimbusAssembleToolsTask.getBinaryName(plat))
                }
            }
            cacheRoot = new File(topsrcdir, ".gradle/caches/nimbus-fml")

            fetch {
                // Try archive.mozilla.org release first
                archive = asVersionProvider.map { asVersion ->
                    "https://archive.mozilla.org/pub/app-services/releases/$asVersion/nimbus-fml.zip"
                }
                hash = asVersionProvider.map { asVersion ->
                    "https://archive.mozilla.org/pub/app-services/releases/$asVersion/nimbus-fml.sha256"
                }

                // Fall back to a nightly release
                fallback {
                    archive = asVersionProvider.map { asVersion ->
                        "https://firefox-ci-tc.services.mozilla.com/api/index/v1/task/project.application-services.v2.nimbus-fml.$asVersion/artifacts/public/build/nimbus-fml.zip"
                    }
                    hash = asVersionProvider.map { asVersion ->
                        "https://firefox-ci-tc.services.mozilla.com/api/index/v1/task/project.application-services.v2.nimbus-fml.$asVersion/artifacts/public/build/nimbus-fml.sha256"
                    }
                }
            }

            unzip {
                include "${platform.get()}*/release/nimbus-fml*"
            }

            onlyIf('`applicationServicesDir` == null') {
                applicationServicesDir.getOrNull() == null
            }
        }
    }

    Provider<String> getProjectVersionProvider(Project rootProject) {
        def topsrcdir = rootProject.gradle.mozconfig.topsrcdir
        def localPropertiesVersion = rootProject.gradle.hasProperty("localProperties.branchBuild.application-services.version")
            ? rootProject.gradle["localProperties.branchBuild.application-services.version"]
            : null

        return rootProject.providers.of(ApplicationServicesVersionSource) { spec ->
            spec.parameters.topsrcdir.set(topsrcdir)
            spec.parameters.localPropertiesVersion.set(localPropertiesVersion)
        }
    }

    private void configureCommonTaskProperties(task, Project project, String cacheDirSuffix) {
        task.repoFiles = project.files(project.nimbus.repoFiles)
        task.applicationServicesDir = project.nimbus.applicationServicesDir
        task.inputFile = project.layout.projectDirectory.file(project.nimbus.manifestFile)
        // Each task gets its own cache subdirectory because Gradle discourages
        // "overlapping outputs" which inhibit caching and parallelization
        // (https://github.com/gradle/gradle/issues/28394).
        task.cacheDir = project.layout.buildDirectory.dir(project.nimbus.cacheDir).map {
            it.dir(cacheDirSuffix)
        }
    }

    def setupNimbusFeatureTasks(Object variant, Project project) {
        return project.tasks.register("nimbusFeatures${variant.name.capitalize()}", NimbusFeaturesTask) {
            description = "Generate Kotlin data classes for Nimbus enabled features"
            group = "Nimbus"

            doFirst {
                logger.info("Nimbus FML generating Kotlin")
                logger.info("manifest             {}", inputFile.get().asFile)
                logger.info("cache dir            {}", cacheDir.get().asFile)
                logger.info("repo file(s)         {}", repoFiles.files.join())
                logger.info("channel              {}", channel.get())
            }

            doLast {
                logger.info("outputFile    {}", outputDir.get().asFile)
            }

            configureCommonTaskProperties(delegate, project, "features${variant.name.capitalize()}")
            channel = project.nimbus.channels.getting(variant.name).orElse(variant.name)
            outputDir = project.layout.buildDirectory.dir("generated/source/nimbus/${variant.name}/kotlin")
        }
    }

    def setupValidateTask(Project project) {
        return project.tasks.register('nimbusValidate', NimbusValidateTask) {
            description = "Validate the Nimbus feature manifest for the app"
            group = "Nimbus"

            doFirst {
                logger.info("Nimbus FML: validating manifest")
                logger.info("manifest             {}", inputFile.get().asFile)
                logger.info("cache dir            {}", cacheDir.get().asFile)
                logger.info("repo file(s)         {}", repoFiles.files.join())
            }

            configureCommonTaskProperties(delegate, project, 'validate')

            // `nimbusValidate` doesn't have any outputs, so Gradle will always
            // run it, even if its inputs haven't changed. This predicate tells
            // Gradle to ignore the outputs, and only consider the inputs, for
            // up-to-date checks.
            outputs.upToDateWhen { true }
        }
    }
}
