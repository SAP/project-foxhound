/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.apilint;

import org.gradle.api.tasks.Exec;
import org.gradle.api.tasks.Input;
import org.gradle.api.tasks.TaskAction;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

/** Executes a Python script embedded in the resources. */
abstract public class PythonExec extends Exec {
    /** Path to the script to execute */
    String mScriptPath;

    /** Path to the python command used to execute the script */
    String mPythonCommand = "python3";

    @TaskAction
    public void exec() {
        List<String> args = getArgs();

        File tempFile = copyResourceToTemp(mScriptPath);

        try {
            commandLine(mPythonCommand, tempFile);
            // Calling commandLine destroys the args param so we need to restore it here.
            args(args);

            super.exec();
        } finally {
            // Clean-up the temporary file
            tempFile.delete();
        }
    }

    public void setPythonCommand(String pythonCommand) {
        mPythonCommand = pythonCommand;
    }

    @Input
    public String getPythonCommand() {
        return mPythonCommand;
    }

    public void setScriptPath(String scriptPath) {
        mScriptPath = scriptPath;
    }

    @Input
    public String getScriptPath() {
        return mScriptPath;
    }

    private File copyResourceToTemp(String resource) {
        return copyResourceToTemp(resource, "script-", ".py");
    }

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
}
