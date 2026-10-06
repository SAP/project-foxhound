/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

import java.io.File

/**
 * Representation of an install manifest.
 */
class InstallManifest(manifestPath: String) {
    data class Pattern(val base: String, val pattern: String)

    val paths: MutableMap<String, MutableList<String>> = mutableMapOf()
    val patterns: MutableMap<String, Pattern> = mutableMapOf()

    companion object {
        private const val FIELD_SEPARATOR = "\u001f"

        // https://searchfox.org/firefox-main/source/python/mozbuild/mozpack/manifests.py#94-101
        private const val LINK = 1
        private const val COPY = 2
        private const val REQUIRED_EXISTS = 3
        private const val OPTIONAL_EXISTS = 4
        private const val PATTERN_LINK = 5
        private const val PATTERN_COPY = 6
        private const val PREPROCESS = 7
        private const val CONTENT = 8
    }

    init {
        val lines = File(manifestPath).readLines()

        val version = lines[0].trim()
        if (version !in listOf("1", "2", "3", "4", "5")) {
            throw IllegalArgumentException("Unknown manifest version: $version")
        }

        lines.drop(1).forEach { line ->
            if (line.trim().isEmpty()) {
                return@forEach
            }

            val fields = line.split(FIELD_SEPARATOR)
            val recordType = fields[0].toIntOrNull() ?: return@forEach

            when (recordType) {
                LINK, COPY -> {
                    val dest = fields[1]
                    val src = fields[2]
                    paths.getOrPut(dest) { mutableListOf() }.add(src)
                }
                REQUIRED_EXISTS, OPTIONAL_EXISTS -> {
                }
                PATTERN_LINK, PATTERN_COPY -> {
                    val dest = fields[1]
                    val base = fields[2]
                    val pattern = fields[3]
                    patterns[dest] = Pattern(base, pattern)
                }
                PREPROCESS -> {
                    val dest = fields[1]
                    val src = fields[2]
                    val inputs = mutableListOf(src)

                    if (fields.size >= 4 && fields[3].isNotEmpty()) {
                        try {
                            File(fields[3]).bufferedReader().use { reader ->
                                val depPaths = reader.readLine().split(" ")
                                if (!depPaths[0].endsWith("/${dest}:")) {
                                    throw IllegalStateException("Bad deps file: ${depPaths[0]} does not end with '/${dest}:'")
                                }
                                inputs.addAll(depPaths.drop(1))
                            }
                        } catch (e: java.io.IOException) {
                            // Deps file may not exist after only `mach configure`
                        }
                    }

                    paths.getOrPut(dest) { mutableListOf() }.addAll(inputs)
                }
                CONTENT -> {
                }
                else -> {
                    if (recordType >= 0) {
                        throw IllegalArgumentException("Unknown record type: $recordType")
                    }
                }
            }
        }
    }

    /**
     * Get all input file paths from this manifest.
     *
     * @return Set of input file paths
     */
    fun getInputFiles(): Set<String> {
        val pathSet = mutableSetOf<String>()
        for (pathList in paths.values) {
            pathSet.addAll(pathList)
        }
        return pathSet
    }

    /**
     * Get all output file paths from this manifest.
     *
     * @param root The root directory for destination paths
     * @return Set of output files
     */
    fun getOutputFiles(root: String): Set<File> {
        return paths.keys.map { dest -> File(root, dest) }.toSet()
    }
}
