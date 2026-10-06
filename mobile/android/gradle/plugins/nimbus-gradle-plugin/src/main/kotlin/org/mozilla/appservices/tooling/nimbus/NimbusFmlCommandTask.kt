/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.appservices.tooling.nimbus

import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.file.ProjectLayout
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.Optional
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.process.ExecOperations
import org.gradle.process.ExecSpec
import javax.inject.Inject

/**
 * A base task to execute a `nimbus-fml` command.
 *
 * Subclasses can declare additional inputs and outputs, and override
 * `configureFmlCommand` to set additional command arguments.
 *
 * This task requires either `applicationServicesDir` to be set, or
 * the `fmlBinary` to exist. If `applicationServicesDir` is set,
 * the task will run `nimbus-fml` from the Application Services repo;
 * otherwise, it'll fall back to a prebuilt `fmlBinary`.
 */
abstract class NimbusFmlCommandTask : DefaultTask() {
    @get:Inject
    abstract val execOperations: ExecOperations

    @get:Inject
    abstract val projectLayout: ProjectLayout

    @get:Input
    @get:Optional
    abstract val applicationServicesDir: Property<String>

    // `@InputFiles` instead of `@InputFile` because we don't want
    // the task to fail if the `fmlBinary` file doesn't exist
    // (https://github.com/gradle/gradle/issues/2016).
    @get:InputFiles
    @get:Optional
    @get:PathSensitive(PathSensitivity.NONE)
    abstract val fmlBinary: RegularFileProperty

    /**
     * Configures the `nimbus-fml` command for this task.
     *
     * This method is invoked from the `@TaskAction` during the execution phase,
     * and so has access to the final values of the inputs and outputs.
     *
     * @param spec The specification for the `nimbus-fml` command.
     */
    abstract fun configureFmlCommand(spec: ExecSpec)

    @TaskAction
    fun execute() {
        execOperations.exec { spec ->
            spec.apply {
                val projDir = projectLayout.projectDirectory
                val localAppServices = applicationServicesDir.orNull
                if (localAppServices == null) {
                    val fmlBinaryFile = fmlBinary.orNull?.asFile
                    if (fmlBinaryFile == null || !fmlBinaryFile.exists()) {
                        throw GradleException(
                            "`nimbus-fml` binary not found" +
                            (if (fmlBinaryFile != null) " at $fmlBinaryFile" else "") +
                            " and `nimbus.applicationServicesDir` is not set. Either build the project " +
                            "with `./mach build` or set `autoPublish.application-services.dir` in local.properties."
                        )
                    }
                    workingDir(projDir)
                    commandLine(fmlBinaryFile)
                } else {
                    val cargoManifest = projDir.file("$localAppServices/$APPSERVICES_FML_HOME/Cargo.toml").asFile

                    commandLine("cargo")
                    args("run")
                    args("--manifest-path", cargoManifest)
                    args("--")
                }
            }
            configureFmlCommand(spec)
        }
    }

    companion object {
        const val APPSERVICES_FML_HOME = "components/support/nimbus-fml"
    }
}
