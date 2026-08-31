/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.bundling.Zip
import org.gradle.api.tasks.testing.Test
import org.gradle.kotlin.dsl.register
import org.gradle.kotlin.dsl.withType

class ZipTestReportsPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        val isCi = project.providers.environmentVariable("MOZ_AUTOMATION")
        val reportsTestsDir = project.layout.buildDirectory.dir("reports/tests")
        val zipTask = project.tasks.register<Zip>("zipTestReports") {
            onlyIf { isCi.isPresent }
            from(reportsTestsDir) {
                includeEmptyDirs = false
            }
            archiveFileName.set("test-reports.zip")
            destinationDirectory.set(project.layout.buildDirectory.dir("reports"))
        }

        project.tasks.withType<Test>().configureEach {
            finalizedBy(zipTask)
        }
    }
}
