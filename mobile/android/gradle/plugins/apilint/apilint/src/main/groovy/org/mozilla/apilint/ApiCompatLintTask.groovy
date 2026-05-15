/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.apilint

import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.javadoc.Javadoc

abstract class ApiCompatLintTask extends Javadoc {
    @OutputFile
    File outputFile

    @Input
    String packageFilter

    @Input
    List<String> skipClassesRegex

    @Input
    String rootDir

    @InputFiles
    List<File> sourcePath

    @InputFile
    File docletPath

    @TaskAction
    @Override
    protected void generate() {
        options.doclet = "org.mozilla.doclet.ApiDoclet"
        options.docletpath = List.of(docletPath)

        // Gradle sends -notimestamp automatically which is not compatible to
        // doclets, so we have to work around it here,
        // see: https://github.com/gradle/gradle/issues/11898
        options.noTimestamp(false)

        options.addStringOption('output', outputFile.absolutePath)
        options.addStringOption('subpackages', packageFilter)
        options.addPathOption('sourcepath').setValue(sourcePath)
        options.addStringOption('root-dir', rootDir)
        options.addStringOption('skip-class-regex', String.join(":", skipClassesRegex))

        super.generate()
    }
}
