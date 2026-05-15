/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.logging

import java.io.File

/**
 * Centralized accessor for the **current run's artifact root**.
 *
 * Factories and utilities (e.g., [ScreenshotTaker]) rely on this to know
 * *where* to write files. The directory is initialized by [LoggerFactory.create]
 * and remains valid for the lifetime of the test process.
 *
 * Directory layout:
 * ```
 * artifacts/<run-id>/summary.log
 * artifacts/<run-id>/details.jsonl
 * artifacts/<run-id>/<testId>/<leaf>/<files...>
 * ```
 *
 * Usage:
 * - [base] gives you `artifacts/<run-id>`
 * - [dirForTest(testId)] → `artifacts/<run-id>/<testId>/`
 * - [dirForTest(testId, leaf)] → `artifacts/<run-id>/<testId>/<leaf>/`
 *
 * All path segments are sanitized for filesystem safety.
 */
object ArtifactManager {
    @Volatile private var baseDir: File? = null

    /**
     * Sets the artifacts base directory (called exactly once in [LoggerFactory.create]).
     */
    fun init(root: File) {
        check(baseDir == null) { "ArtifactManager already initialized." }
        if (!root.exists()) root.mkdirs()
        baseDir = root
    }

    /**
     * Returns the initialized base directory for the current run.
     *
     * @throws IllegalStateException if [init] has not been called yet.
     */
    fun base(): File = requireNotNull(baseDir) {
        "ArtifactManager not initialized. Call LoggerFactory.create() first."
    }

    /** Ensures and returns `artifacts/<run-id>/<testId>/`. */
    fun dirForTest(testId: String): File = File(base(), sanitize(testId)).apply { mkdirs() }

    /** Ensures and returns `artifacts/<run-id>/<testId>/<leaf>/`. */
    fun dirForTest(testId: String, leaf: String): File =
        File(dirForTest(testId), sanitize(leaf)).apply { mkdirs() }

    /** Replaces characters that are unsafe for file/dir names with underscores. */
    private fun sanitize(s: String) = s.replace("""[^\w.\-]+""".toRegex(), "_")
}
