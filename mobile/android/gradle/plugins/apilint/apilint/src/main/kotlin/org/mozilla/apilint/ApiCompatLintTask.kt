/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.apilint

import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Classpath
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.javadoc.Javadoc
import org.gradle.external.javadoc.StandardJavadocDocletOptions

abstract class ApiCompatLintTask : Javadoc() {
    @get:OutputFile
    abstract val outputFile: RegularFileProperty

    @get:Input
    abstract val packageFilter: Property<String>

    @get:Input
    abstract val skipClassesRegex: ListProperty<String>

    @get:Input
    abstract val rootDir: Property<String>

    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val sourcePath: ConfigurableFileCollection

    @get:InputFile
    @get:PathSensitive(PathSensitivity.NONE)
    abstract val docletPath: RegularFileProperty

    @get:OutputDirectory
    abstract val javadocDestinationDir: DirectoryProperty

    @TaskAction
    override fun generate() {
        destinationDir = javadocDestinationDir.get().asFile

        val opts = options as StandardJavadocDocletOptions
        opts.doclet = "org.mozilla.doclet.ApiDoclet"
        opts.docletpath = listOf(docletPath.get().asFile)

        // Gradle sends -notimestamp automatically which is not compatible to
        // doclets, so we have to work around it here,
        // see: https://github.com/gradle/gradle/issues/11898
        opts.noTimestamp(false)

        opts.addStringOption("output", outputFile.get().asFile.absolutePath)
        opts.addStringOption("subpackages", packageFilter.get())
        opts.addPathOption("sourcepath").setValue(sourcePath.files.toList())
        opts.addStringOption("root-dir", rootDir.get())
        opts.addStringOption("skip-class-regex", skipClassesRegex.get().joinToString(":"))

        super.generate()
    }
}
