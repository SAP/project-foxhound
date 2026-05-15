/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.tooling.detekt.health

import io.gitlab.arturbosch.detekt.api.DetektVisitor
import io.gitlab.arturbosch.detekt.api.Detektion
import io.gitlab.arturbosch.detekt.api.FileProcessListener
import org.jetbrains.kotlin.com.intellij.openapi.util.Key
import org.jetbrains.kotlin.psi.KtAnnotationEntry
import org.jetbrains.kotlin.psi.KtCallExpression
import org.jetbrains.kotlin.psi.KtCollectionLiteralExpression
import org.jetbrains.kotlin.psi.KtExpression
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtStringTemplateExpression
import org.jetbrains.kotlin.resolve.BindingContext

/**
 * Detekt processor to track the rules that we suppress.
 */
internal class SuppressionCountProcessor : FileProcessListener {

    override fun onProcess(file: KtFile, bindingContext: BindingContext) {
        val visitor = AnnotationVisitor()
        file.accept(visitor)
        file.putUserData(suppressionKey, visitor.annotationsData)
    }

    override fun onFinish(files: List<KtFile>, result: Detektion, bindingContext: BindingContext) {
        val data: List<Map<String, Int>> = files.mapNotNull { it.getUserData(suppressionKey) }
        val merged = mutableMapOf<String, Int>()

        for (map in data) {
            for ((key, value) in map) {
                merged[key] = merged.getOrDefault(key, 0) + value
            }
        }

        val output = merged.entries
            .sortedByDescending { it.value }
            .associate { it.toPair() }

        result.addData(suppressionKey, output)
    }

    companion object {
        internal val suppressionKey: Key<Map<String, Int>> =
            Key<Map<String, Int>>("file_suppressions")
    }

    class AnnotationVisitor : DetektVisitor() {

        internal val annotationsData: MutableMap<String, Int> = mutableMapOf()

        override fun visitAnnotationEntry(annotationEntry: KtAnnotationEntry) {
            super.visitAnnotationEntry(annotationEntry)

            val annotation = annotationEntry.shortName?.identifier ?: return

            val supportedAnnotations = setOf("Suppress", "SuppressWarnings")
            if (annotation !in supportedAnnotations) return

            val args = annotationEntry.valueArguments.mapNotNull { arg ->
                arg.getArgumentExpression()
                    ?.getArguments()
            }.flatten()

            args.forEach { argument: String ->
                annotationsData[argument] = (annotationsData[argument] ?: 0) + 1
            }
        }

        private fun KtExpression.getArguments(): List<String>? {
            return when (this) {
                is KtStringTemplateExpression -> {
                    this.entries.mapNotNull { it.text }.joinToString("")
                        .removeSurrounding("\"")
                        .split(",")
                        .map { it.trim() }
                        .filter { it.isNotEmpty() }
                }

                is KtCollectionLiteralExpression -> {
                    this.innerExpressions.mapNotNull { it.getArguments() }.flatten()
                }

                is KtCallExpression -> {
                    valueArguments.mapNotNull { callArgument ->
                        callArgument.getArgumentExpression()?.getArguments()
                    }.flatten()
                }

                else -> null
            }
        }
    }
}
