/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class InstallManifestTest {
    @TempDir
    lateinit var tempDir: File

    private val FIELD_SEP = "\u001f"

    @Test
    fun `parses LINK records`() {
        val manifestFile = createManifestFile(
            "5",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
            "1${FIELD_SEP}dest/file2.txt${FIELD_SEP}src/file2.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(2, manifest.paths.size)
        assertEquals(listOf("src/file1.txt"), manifest.paths["dest/file1.txt"])
        assertEquals(listOf("src/file2.txt"), manifest.paths["dest/file2.txt"])
        assertTrue(manifest.patterns.isEmpty())
    }

    @Test
    fun `parses COPY records`() {
        val manifestFile = createManifestFile(
            "5",
            "2${FIELD_SEP}dest/copied.txt${FIELD_SEP}src/original.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
        assertEquals(listOf("src/original.txt"), manifest.paths["dest/copied.txt"])
    }

    @Test
    fun `skips REQUIRED_EXISTS records`() {
        val manifestFile = createManifestFile(
            "5",
            "3${FIELD_SEP}some/file.txt",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
        assertEquals(listOf("src/file1.txt"), manifest.paths["dest/file1.txt"])
    }

    @Test
    fun `skips OPTIONAL_EXISTS records`() {
        val manifestFile = createManifestFile(
            "5",
            "4${FIELD_SEP}some/optional.txt",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
    }

    @Test
    fun `parses PATTERN_LINK records`() {
        val manifestFile = createManifestFile(
            "5",
            "5${FIELD_SEP}dest/patterns/${FIELD_SEP}src/base${FIELD_SEP}**/*.js",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.patterns.size)
        val pattern = manifest.patterns["dest/patterns/"]
        assertNotNull(pattern)
        assertEquals("src/base", pattern?.base)
        assertEquals("**/*.js", pattern?.pattern)
    }

    @Test
    fun `parses PATTERN_COPY records`() {
        val manifestFile = createManifestFile(
            "5",
            "6${FIELD_SEP}dest/lib/${FIELD_SEP}src/native${FIELD_SEP}*.so",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.patterns.size)
        val pattern = manifest.patterns["dest/lib/"]
        assertNotNull(pattern)
        assertEquals("src/native", pattern?.base)
        assertEquals("*.so", pattern?.pattern)
    }

    @Test
    fun `parses PREPROCESS records without deps file`() {
        val manifestFile = createManifestFile(
            "5",
            "7${FIELD_SEP}dest/preprocessed.txt${FIELD_SEP}src/template.txt${FIELD_SEP}",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
        assertEquals(listOf("src/template.txt"), manifest.paths["dest/preprocessed.txt"])
    }

    @Test
    fun `parses PREPROCESS records with deps file`() {
        val depsFile = File(tempDir, "deps.txt")
        depsFile.writeText("/path/dest/preprocessed.txt: src/dep1.txt src/dep2.txt")

        val manifestFile = createManifestFile(
            "5",
            "7${FIELD_SEP}dest/preprocessed.txt${FIELD_SEP}src/template.txt${FIELD_SEP}${depsFile.absolutePath}",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
        val inputs = manifest.paths["dest/preprocessed.txt"]
        assertNotNull(inputs)
        assertEquals(3, inputs?.size)
        assertTrue(inputs!!.contains("src/template.txt"))
        assertTrue(inputs.contains("src/dep1.txt"))
        assertTrue(inputs.contains("src/dep2.txt"))
    }

    @Test
    fun `skips CONTENT records`() {
        val manifestFile = createManifestFile(
            "5",
            "8${FIELD_SEP}dest/content.txt${FIELD_SEP}some content",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
    }

    @Test
    fun `skips empty lines`() {
        val manifestFile = createManifestFile(
            "5",
            "",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
            "",
            "1${FIELD_SEP}dest/file2.txt${FIELD_SEP}src/file2.txt",
            "",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(2, manifest.paths.size)
    }

    @Test
    fun `handles multiple sources for same destination`() {
        val manifestFile = createManifestFile(
            "5",
            "1${FIELD_SEP}dest/file.txt${FIELD_SEP}src/file1.txt",
            "1${FIELD_SEP}dest/file.txt${FIELD_SEP}src/file2.txt"
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(1, manifest.paths.size)
        val sources = manifest.paths["dest/file.txt"]
        assertNotNull(sources)
        assertEquals(2, sources?.size)
        assertTrue(sources!!.contains("src/file1.txt"))
        assertTrue(sources.contains("src/file2.txt"))
    }

    @Test
    fun `supports older manifest versions`() {
        for (version in listOf("1", "2", "3", "4")) {
            val manifestFile = createManifestFile(
                version,
                "1${FIELD_SEP}dest/file.txt${FIELD_SEP}src/file.txt"
            )

            val manifest = InstallManifest(manifestFile.absolutePath)

            assertEquals(1, manifest.paths.size, "Failed for version $version")
        }
    }

    @Test
    fun `throws on unknown manifest version`() {
        val manifestFile = createManifestFile("99")

        val exception = assertThrows(IllegalArgumentException::class.java) {
            InstallManifest(manifestFile.absolutePath)
        }
        assertTrue(exception.message!!.contains("Unknown manifest version"))
    }

    @Test
    fun `throws on unknown record type`() {
        val manifestFile = createManifestFile(
            "5",
            "99${FIELD_SEP}dest/file.txt${FIELD_SEP}src/file.txt"
        )

        val exception = assertThrows(IllegalArgumentException::class.java) {
            InstallManifest(manifestFile.absolutePath)
        }
        assertTrue(exception.message!!.contains("Unknown record type"))
    }

    @Test
    fun `getInputFiles returns all unique source paths`() {
        val manifestFile = createManifestFile(
            "5",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
            "1${FIELD_SEP}dest/file2.txt${FIELD_SEP}src/file2.txt",
            "1${FIELD_SEP}dest/file3.txt${FIELD_SEP}src/file1.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        val inputFiles = manifest.getInputFiles()
        assertEquals(2, inputFiles.size)
        assertTrue(inputFiles.contains("src/file1.txt"))
        assertTrue(inputFiles.contains("src/file2.txt"))
    }

    @Test
    fun `getOutputFiles returns all destination files`() {
        val manifestFile = createManifestFile(
            "5",
            "1${FIELD_SEP}dest/file1.txt${FIELD_SEP}src/file1.txt",
            "1${FIELD_SEP}dest/file2.txt${FIELD_SEP}src/file2.txt",
            "1${FIELD_SEP}dest/subdir/file3.txt${FIELD_SEP}src/file3.txt",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        val outputFiles = manifest.getOutputFiles("/output/root")
        assertEquals(3, outputFiles.size)
        assertTrue(outputFiles.any { it.path.contains("file1.txt") })
        assertTrue(outputFiles.any { it.path.contains("file2.txt") })
        assertTrue(outputFiles.any { it.path.contains("file3.txt") })
    }

    @Test
    fun `handles manifest with mixed record types`() {
        val manifestFile = createManifestFile(
            "5",
            "1${FIELD_SEP}dest/linked.txt${FIELD_SEP}src/linked.txt",
            "2${FIELD_SEP}dest/copied.txt${FIELD_SEP}src/copied.txt",
            "3${FIELD_SEP}dest/required.txt",
            "4${FIELD_SEP}dest/optional.txt",
            "5${FIELD_SEP}dest/js/${FIELD_SEP}src/js${FIELD_SEP}*.js",
            "6${FIELD_SEP}dest/lib/${FIELD_SEP}src/lib${FIELD_SEP}*.so",
            "7${FIELD_SEP}dest/preprocessed.txt${FIELD_SEP}src/template.txt${FIELD_SEP}",
            "8${FIELD_SEP}dest/content.txt${FIELD_SEP}content here",
        )

        val manifest = InstallManifest(manifestFile.absolutePath)

        assertEquals(3, manifest.paths.size)
        assertEquals(2, manifest.patterns.size)
    }

    private fun createManifestFile(vararg lines: String): File {
        val file = File(tempDir, "test_manifest_${System.nanoTime()}.txt")
        file.writeText(lines.joinToString("\n"))
        return file
    }
}
