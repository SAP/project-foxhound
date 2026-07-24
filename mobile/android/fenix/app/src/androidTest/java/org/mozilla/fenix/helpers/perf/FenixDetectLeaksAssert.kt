/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers.perf

import android.content.Context
import android.os.Build
import android.os.Environment
import androidx.test.platform.app.InstrumentationRegistry
import leakcanary.AndroidDetectLeaksAssert
import leakcanary.DetectLeaksAssert
import leakcanary.HeapAnalysisReporter
import leakcanary.LeakAssertions
import leakcanary.NoLeakAssertionFailedError
import shark.HeapAnalysis
import shark.HeapAnalysisSuccess
import java.io.File

/**
 * Fenix implementation of [DetectLeaksAssert] that wraps around the default [AndroidDetectLeaksAssert]
 * implementation and provides a custom [HeapAnalysisReporter] that writes to an output file
 * specified by the params.
 *
 * @param filename Destination filename for the leak report if a leak occurs
 * @param directory Directory within the destination location to host the file if a leak occurs
 */
class FenixDetectLeaksAssert(
    private val filename: String,
    private val directory: String,
) : DetectLeaksAssert {

    private val delegateAssert: DetectLeaksAssert = AndroidDetectLeaksAssert(
        heapAnalysisReporter = MemoryLeaksFileOutputReporter(
            filename = filename,
            directory = directory,
        ),
    )

    override fun assertNoLeaks(tag: String) {
        delegateAssert.assertNoLeaks(tag)
    }

    companion object {

        /**
         * Asserts that there are no leaks detected. If any leak is detected, then the test is
         * failed and a leak trace is written to a file in a directory specified by the [directory] param within
         * the `/sdcard/googletest/test_outputfiles/` location.
         *
         * This is built upon the [LeakAssertions.assertNoLeaks] function from the library.
         *
         * @param tag The tag used to identify the calling code
         * @param filename The filename to be used for the memory leak trace in the event of
         */
        fun assertNoLeaks(tag: String, filename: String, directory: String = "memory_leaks") {
            DetectLeaksAssert.update(
                FenixDetectLeaksAssert(
                    filename = filename,
                    directory = directory,
                ),
            )

            LeakAssertions.assertNoLeaks(tag)
        }
    }
}

/**
 * Custom [HeapAnalysisReporter] that writes the leak trace to a file output
 * specified by [filename], [directory] and then calls the default analysis reporter.
 *
 * The reports are written into a directory specified by [directory], within the location that is
 * specified by the `additionalTestOutputDir` argument of the test runner argument.
 */
private class MemoryLeaksFileOutputReporter(
    private val filename: String,
    private val directory: String,
    private val defaultReporter: HeapAnalysisReporter = NoLeakAssertionFailedError.throwOnApplicationLeaks(),
) : HeapAnalysisReporter {
    override fun reportHeapAnalysis(heapAnalysis: HeapAnalysis) {
        heapAnalysis.writeToFile(filename = filename, directory = directory)
        defaultReporter.reportHeapAnalysis(heapAnalysis)
    }
}

private fun HeapAnalysis.writeToFile(
    filename: String,
    directory: String,
) {
    if (this is HeapAnalysisSuccess && this.applicationLeaks.isNotEmpty()) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext

        val outputDirectory =
            InstrumentationRegistry.getArguments().getString("additionalTestOutputDir")
                ?.let { File(it) }
                ?: getFallbackUsableDirectory(context)

        // delete any existing files in the directory
        outputDirectory.listFiles()?.forEach { file ->
            if (file.isFile) file.delete()
        }

        val leakDirectory = File(outputDirectory, directory)
        leakDirectory.mkdirs()

        val file = File(leakDirectory, "$filename.txt")
        if (file.createNewFile()) {
            file.writeText(toString())
        }
    }
}

/**
 * Gets the fallback usable directory. In the event that the test runner does not provide an
 * `additionalTestOutputDir` argument, the fallback directory is used.
 *
 * This is copied from how Android implements it in the macro benchmark library
 *
 * Source: [cs.android.com](https://cs.android.com/androidx/platform/frameworks/support/+/9bd4efdf8576ab9ce6654b0d115aadd6e1ea6ef5:benchmark/benchmark-common/src/main/java/androidx/benchmark/Outputs.kt;bpv=0)
 */
private fun getFallbackUsableDirectory(context: Context): File {
    val dirUsableByAppAndShell =
        when {
            Build.VERSION.SDK_INT >= 29 -> {
                // On Android Q+ we are using the media directory because that is
                // the directory that the shell has access to. Context: b/181601156
                // Additionally, Benchmarks append user space traces to the ones produced
                // by the Macro Benchmark run; and that is a lot simpler to do if we use the
                // Media directory. (b/216588251)
                @Suppress("DEPRECATION")
                context.externalMediaDirs.firstOrNull {
                    Environment.getExternalStorageState(it) == Environment.MEDIA_MOUNTED
                }
            }

            Build.VERSION.SDK_INT <= 22 -> {
                // prior to API 23, shell didn't have access to externalCacheDir
                context.cacheDir
            }

            else -> context.externalCacheDir
        }
            ?: throw IllegalStateException(
                "Unable to select a directory for writing files, " +
                        "additionalTestOutputDir argument required to declare output dir.",
            )

    if (Build.VERSION.SDK_INT in 21..22) {
        // By default, shell doesn't have access to app dirs on 21/22 so we need to modify
        // this so that the shell can output here too
        dirUsableByAppAndShell.setReadable(true, false)
        dirUsableByAppAndShell.setWritable(true, false)
        dirUsableByAppAndShell.setExecutable(true, false)
    }
    return dirUsableByAppAndShell
}
