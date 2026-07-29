/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.apilint

import org.gradle.api.provider.Property
import org.gradle.api.tasks.Exec
import org.gradle.api.tasks.Input
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/** Executes a Python script embedded in the resources. */
abstract class PythonExec : Exec() {
    /** Path to the script to execute. */
    @get:Input
    abstract val scriptPath: Property<String>

    /** Path to the python command used to execute the script. */
    @get:Input
    abstract val pythonCommand: Property<String>

    init {
        pythonCommand.convention("python3")
    }

    override fun exec() {
        val capturedArgs = args
        val tempFile = copyResourceToTemp(scriptPath.get())

        try {
            val pythonCmd = pythonCommand.get()
            commandLine = listOf(pythonCmd, tempFile.absolutePath) + capturedArgs
            super.exec()
        } finally {
            tempFile.delete()
        }
    }

    private fun copyResourceToTemp(resource: String, prefix: String = "script-", suffix: String = ".py"): File {
        val stream = javaClass.classLoader.getResourceAsStream(resource)
            ?: throw RuntimeException("Java resource not found: $resource")

        var tempFile: File? = null
        return try {
            tempFile = File.createTempFile(prefix, suffix)
            stream.use {
                Files.copy(it, tempFile!!.toPath(), StandardCopyOption.REPLACE_EXISTING)
            }
            tempFile!!
        } catch (ex: IOException) {
            tempFile?.delete()
            throw RuntimeException(ex)
        }
    }
}
