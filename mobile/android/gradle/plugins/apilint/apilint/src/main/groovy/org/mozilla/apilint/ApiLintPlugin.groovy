/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.apilint

import org.gradle.api.GradleException
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.Exec

class ApiLintPlugin implements Plugin<Project> {
    private File copyResourceToTemp(String resource, String prefix, String suffix) {
        File tempFile = null;

        try {
            InputStream script = getClass().getClassLoader().getResourceAsStream(resource);
            tempFile = File.createTempFile(prefix, suffix);
            Files.copy(script, Paths.get(tempFile.getAbsolutePath()), StandardCopyOption.REPLACE_EXISTING);

            return tempFile;
        } catch (IOException ex) {
            if (tempFile != null) {
                tempFile.delete();
            }
            throw new RuntimeException(ex);
        }
    }

    void apply(Project project) {
        def extension = project.extensions.create('apiLint', ApiLintPluginExtension)

        Plugin android = project.getPlugins().findPlugin('android-library')

        if (!android) {
            throw new GradleException('You need the Android Library plugin to run ApiLint.')
        }

        def copyDocletJarResource = project.task("copyDocletJarResource") {
            def resourceName = 'apidoc-plugin.jar'
            def destinationFile = "${project.buildDir}/docletJar/${resourceName}"

            outputs.file(destinationFile)

            doLast {
                def resourceStream = getClass().getClassLoader().getResourceAsStream(resourceName)
                if (resourceStream != null) {
                    outputs.files.singleFile.withOutputStream { out ->
                        out << resourceStream
                    }
                    resourceStream.close()
                } else {
                    throw new IOException("Java resource not found: $resourceName")
                }
            }
        }

        // TODO: support applications
        project.android.libraryVariants.all { variant ->
            def name = variant.name.capitalize()
            def apiFileName = "${variant.javaCompileProvider.get().destinationDirectory.get()}/${extension.apiOutputFileName}"
            def apiFile = project.file(apiFileName)
            def variantClasspath = variant.javaCompileProvider.get().classpath

            def currentApiFile = project.file(extension.currentApiRelativeFilePath)

            def apiGenerate = project.task("apiGenerate${name}", type: ApiCompatLintTask) {
                description = "Generates API file for build variant ${name}"
                doFirst {
                    classpath = variantClasspath
                }

                source = variant.sourceSets.collect({ it.java.srcDirs })
                exclude '**/R.java'
                include '**/**.java'

                sourcePath =
                    variant.sourceSets.collect({ it.java.srcDirs }).flatten() +
                    variant.generateBuildConfigProvider.get().sourceOutputDir.asFile.get() +
                    variant.aidlCompileProvider.get().sourceOutputDir.asFile.get()

                rootDir = project.rootDir
                outputFile = apiFile
                packageFilter = extension.packageFilter
                skipClassesRegex = extension.skipClassesRegex
                destinationDir = new File(destinationDir, variant.baseName)

                docletPath = copyDocletJarResource.outputs.files.singleFile
            }
            apiGenerate.dependsOn copyDocletJarResource
            apiGenerate.dependsOn variant.javaCompileProvider.get()
            apiGenerate.dependsOn variant.aidlCompileProvider.get()
            apiGenerate.dependsOn variant.generateBuildConfigProvider.get()

            def apiCompatLint = project.task("apiCompatLint${name}", type: PythonExec) {
                description = "Runs API compatibility lint checks for variant ${name}"
                workingDir '.'
                scriptPath = 'apilint.py'
                args '--show-noticed'
                args apiFile
                args currentApiFile
                args '--result-json'
                args project.file(
                        "${variant.javaCompileProvider.get().destinationDirectory.get()}/${extension.jsonResultFileName}")
                args '--append-json'
                args '--api-map'
                args project.file(apiFileName + ".map")
                if (extension.deprecationAnnotation != null) {
                    args '--deprecation-annotation'
                    args extension.deprecationAnnotation
                }
                if (extension.libraryVersion != null) {
                    args '--library-version'
                    args extension.libraryVersion
                }
            }

            apiCompatLint.dependsOn apiGenerate

            def apiLintSingle = project.task("apiLintSingle${name}", type: PythonExec) {
                description = "Runs API lint checks for variant ${name}"
                workingDir '.'
                scriptPath = 'apilint.py'
                args apiFile
                args '--result-json'
                args project.file(
                        "${variant.javaCompileProvider.get().destinationDirectory.get()}/${extension.jsonResultFileName}")
                if (extension.lintFilters != null) {
                    args '--filter-errors'
                    args extension.lintFilters
                }
                if (extension.allowedPackages != null) {
                    args '--allowed-packages'
                    args extension.allowedPackages
                }
                if (extension.deprecationAnnotation != null) {
                    args '--deprecation-annotation'
                    args extension.deprecationAnnotation
                }
                if (extension.libraryVersion != null) {
                    args '--library-version'
                    args extension.libraryVersion
                }
                args '--api-map'
                args project.file(apiFileName + ".map")
            }

            apiCompatLint.dependsOn apiLintSingle
            apiLintSingle.dependsOn apiGenerate

            def apiLint = project.task("apiLint${name}") {
                description = "Runs API lint checks for variant ${name}"
                group = 'Verification'
            }

            if (extension.changelogFileName) {
                def apiChangelogCheck = project.task("apiChangelogCheck${name}", type: PythonExec) {
                    description = "Checks that the API changelog has been updated."
                    group = 'Verification'
                    workingDir '.'
                    scriptPath = 'changelog-check.py'
                    args '--api-file'
                    args apiFile
                    args '--changelog-file'
                    args project.file(extension.changelogFileName)
                    args '--result-json'
                    args project.file(
                            "${variant.javaCompileProvider.get().destinationDirectory.get()}/${extension.jsonResultFileName}")
                }

                apiChangelogCheck.dependsOn apiGenerate
                apiChangelogCheck.dependsOn apiCompatLint
                apiLint.dependsOn apiChangelogCheck
            } else {
                apiLint.dependsOn apiLintSingle
            }

            project.tasks.check.dependsOn apiLint

            def apiDiff = project.task("apiDiff${name}", type: PythonExec) {
                description = "Prints the diff between the existing API and the local API."
                group = 'Verification'
                workingDir '.'
                scriptPath = 'diff.py'
                args '--existing', currentApiFile
                args '--local', apiFile
                args '--command', extension.helpCommand.call(name)

                // diff exit value is != 0 if the files are different
                ignoreExitValue = true
            }

            apiCompatLint.finalizedBy apiDiff

            def apiUpdate = project.task("apiUpdateFile${name}", type: Copy) {
                description = "Updates the API file from the local one for variant ${name}"
                group = 'Verification'
                from apiFile
                into currentApiFile.getParent()
                rename { apiFile.getName() }
            }

            apiUpdate.dependsOn apiGenerate
        }
    }
}
