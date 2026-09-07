/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

import org.gradle.api.Task
import org.gradle.api.tasks.Exec

abstract class MachExec : Exec() {
    companion object {
        @JvmStatic
        fun geckoBinariesOnlyIf(task: Task, mozconfig: Map<*, *>): Boolean {
            // Never when Gradle was invoked within `mach build`.
            if (System.getenv("GRADLE_INVOKED_WITHIN_MACH_BUILD") == "1") {
                task.logger.lifecycle("Skipping task ${task.path} because: within `mach build`")
                return false
            }

            val substs = mozconfig["substs"] as Map<*, *>

            // Never for official builds.
            if (substs["MOZILLA_OFFICIAL"].isTruthy()) {
                task.logger.lifecycle("Skipping task ${task.path} because: MOZILLA_OFFICIAL")
                return false
            }
            if (substs["ENABLE_MOZSEARCH_PLUGIN"].isTruthy()) {
                task.logger.lifecycle("Skipping task ${task.path} because: ENABLE_MOZSEARCH_PLUGIN")
                return false
            }

            // Multi-l10n builds set `AB_CD=multi`, which isn't a valid locale, and
            // `MOZ_CHROME_MULTILOCALE`.  To avoid failures, if Gradle is invoked with
            // either, we don't invoke Make at all; this allows a multi-locale omnijar
            // to be consumed without modification.
            if (System.getenv("AB_CD") == "multi" || System.getenv("MOZ_CHROME_MULTILOCALE").isTruthy()) {
                task.logger.lifecycle("Skipping task ${task.path} because: AB_CD=multi")
                return false
            }

            // Single-locale l10n repacks set `IS_LANGUAGE_REPACK=1` and handle resource
            // and code generation themselves.
            if (System.getenv("IS_LANGUAGE_REPACK") == "1") {
                task.logger.lifecycle("Skipping task ${task.path} because: IS_LANGUAGE_REPACK")
                return false
            }

            task.logger.lifecycle("Executing task ${task.path}")
            return true
        }
    }
}
