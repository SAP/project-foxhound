/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.gradle.plugins

import com.android.build.api.variant.AndroidComponentsExtension
import com.android.build.gradle.LibraryPlugin
import okio.Buffer
import okio.ByteString
import okio.ByteString.Companion.encodeUtf8
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.InvalidUserDataException
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import org.gradle.kotlin.dsl.withType
import java.io.File
import java.util.TreeSet

/**
 * A self-contained, configuration-cache-compatible Gradle task to generate the Public Suffix List asset.
 */
abstract class GeneratePslAssetTask : DefaultTask() {

    @get:InputFile
    abstract val sourceFile: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun generate() {
        val source = sourceFile.get().asFile
        if (!source.exists()) {
            throw GradleException("Public Suffix List source file not found: ${source.absolutePath}")
        }

        val startTime = System.currentTimeMillis()
        logger.info("PublicSuffixList> Executing generatePslAsset: Reading Public Suffix List from ${source.path}")

        val listData = parsePublicSuffixList(source)
        val newContent = buildBinaryContent(listData)
        val destination = outputDir.file("publicsuffixes").get().asFile

        logger.info("PublicSuffixList> Writing new Public Suffix List asset...")
        destination.parentFile.mkdirs()
        destination.writeBytes(newContent.toByteArray())

        val duration = System.currentTimeMillis() - startTime
        logger.info("PublicSuffixList> Public Suffix List asset generation complete in ${duration}ms.")
    }

    private fun buildBinaryContent(data: PublicSuffixListData): ByteString {
        val buffer = Buffer()
        buffer.writeInt(data.totalRuleBytes)
        for (domain in data.sortedRules) {
            buffer.write(domain).writeByte('\n'.code)
        }
        buffer.writeInt(data.totalExceptionRuleBytes)
        for (domain in data.sortedExceptionRules) {
            buffer.write(domain).writeByte('\n'.code)
        }
        return buffer.readByteString()
    }

    private fun parsePublicSuffixList(sourceFile: File): PublicSuffixListData {
        val data = PublicSuffixListData()

        sourceFile.useLines { lines ->
            lines.filter { it.isNotBlank() && !it.startsWith("//") }
                .forEach { line ->
                    if (line.contains(WILDCARD_CHAR)) {
                        assertWildcardRule(line)
                    }

                    var rule = line.encodeUtf8()
                    if (rule.startsWith(EXCEPTION_RULE_MARKER)) {
                        rule = rule.substring(1)
                        // We use '\n' for end of value.
                        data.sortedExceptionRules.add(rule)
                        data.totalExceptionRuleBytes += rule.size + 1
                    } else {
                        data.sortedRules.add(rule)
                        // We use '\n' for end of value.
                        data.totalRuleBytes += rule.size + 1
                    }
                }
        }

        return data
    }

    @Suppress("ThrowsCount")
    private fun assertWildcardRule(rule: String) {
        if (!rule.startsWith(WILDCARD_CHAR)) {
            throw InvalidUserDataException("Wildcard is not in leftmost position")
        }
        if (rule.lastIndexOf(WILDCARD_CHAR) > 0) {
            throw InvalidUserDataException("Rule contains multiple wildcards")
        }

        if (rule.length == 1) {
            throw InvalidUserDataException("Rule wildcards the first level")
        }
    }

    companion object {
        private const val WILDCARD_CHAR = "*"
        private val EXCEPTION_RULE_MARKER = "!".encodeUtf8()
    }
}

abstract class PublicSuffixListExtension {
    @get:InputFile
    abstract val sourceFile: RegularFileProperty
}

class PublicSuffixListPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.plugins.withType<LibraryPlugin>().configureEach {
            val extension = project.extensions.create("publicSuffixList", PublicSuffixListExtension::class.java)

            val generateTaskProvider = project.tasks.register("generatePslAsset", GeneratePslAssetTask::class.java) {
                outputDir.set(project.layout.buildDirectory.dir("generated/assets/publicsuffixlist"))
                sourceFile.set(extension.sourceFile)
            }

            val androidComponents = project.extensions.getByType(AndroidComponentsExtension::class.java)
            androidComponents.onVariants(androidComponents.selector().all()) { variant ->
                variant.sources.assets?.addGeneratedSourceDirectory(generateTaskProvider, GeneratePslAssetTask::outputDir)
            }
        }
    }
}

private data class PublicSuffixListData(
    var totalRuleBytes: Int = 0,
    var totalExceptionRuleBytes: Int = 0,
    val sortedRules: TreeSet<ByteString> = TreeSet(),
    val sortedExceptionRules: TreeSet<ByteString> = TreeSet(),
)
