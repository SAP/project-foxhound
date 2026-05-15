/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.geckoview.test

import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import androidx.test.filters.SdkSuppress
import androidx.test.platform.app.InstrumentationRegistry
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertTrue
import org.hamcrest.Matchers.equalTo
import org.junit.Assume.assumeThat
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.GeckoRuntimeSettings

@RunWith(AndroidJUnit4::class)
@MediumTest
class IsolatedProcessTest : BaseSessionTest() {
    private val uiAutomation = InstrumentationRegistry.getInstrumentation().uiAutomation

    /**
     * Structure to hold ps command data.
     */
    data class Process(val user: String, val pid: String)

    /**
     * Get results from ps command. Filtered on org.mozilla.geckoview.test.
     *
     * Key is process name.
     */
    fun getTestRunnerProcesses(): Map<String, Process> {
        val shellCommand = uiAutomation.executeShellCommand(
            "ps -A -o USER,PID,NAME",
        )
        val result = mutableMapOf<String, Process>()
        ParcelFileDescriptor.AutoCloseInputStream(shellCommand).use { inputStream ->
            inputStream.bufferedReader(Charsets.UTF_8).lines().forEach { line ->
                val cols = line.split("\\s+".toRegex())
                val name = cols.last()
                val user = cols.first()
                val pid = cols[1]
                // Grep doesn't seem to work with executeShellCommand, so manually pulling out items of interest.
                if (name.isNotBlank() && name.contains("org.mozilla.geckoview.test")) {
                    result[name] = Process(user, pid)
                }
            }
        }
        return result
    }

    @Test
    fun isolatedProcessSetting() {
        val settingsEnabled = GeckoRuntimeSettings.Builder().isolatedProcessEnabled(true).build()

        assertTrue(
            "Isolated content process should be enabled by settings",
            settingsEnabled.isolatedProcessEnabled,
        )

        val settingsDisabled = GeckoRuntimeSettings.Builder().isolatedProcessEnabled(false).build()
        assertFalse(
            "Isolated content process should be disabled by settings",
            settingsDisabled.isolatedProcessEnabled,
        )
    }

    @Test
    fun isolatedProcessEnabled() {
        assumeThat(sessionRule.env.isIsolatedProcess, equalTo(true))

        assertTrue(
            "Isolated content process is enabled on runtime settings",
            sessionRule.runtime.settings.isolatedProcessEnabled,
        )
    }

    @Test
    fun isolatedProcessDisabled() {
        assumeThat(sessionRule.env.isIsolatedProcess, equalTo(false))

        assertFalse(
            "Isolated content process is disabled on runtime settings",
            sessionRule.runtime.settings.isolatedProcessEnabled,
        )
    }

    @Test
    fun appZygoteSetting() {
        val settingsEnabled = GeckoRuntimeSettings.Builder().appZygoteProcessEnabled(true).build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            assertTrue(
                "App Zygote preloading should be enabled by settings",
                settingsEnabled.appZygoteProcessEnabled,
            )
        } else {
            assertFalse(
                "App Zygote preloading should not be enabled by settings on Android 9 or below.",
                settingsEnabled.appZygoteProcessEnabled,
            )
        }

        val settingsDisabled = GeckoRuntimeSettings.Builder().appZygoteProcessEnabled(false).build()
        assertFalse(
            "App Zygote preloading process should be disabled by settings",
            settingsDisabled.appZygoteProcessEnabled,
        )
    }

    @Test
    fun appZygoteEnabled() {
        assumeThat(sessionRule.env.isAppZygoteProcess, equalTo(true))

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            assertTrue(
                "App Zygote preloading process is enabled on runtime settings",
                sessionRule.runtime.settings.appZygoteProcessEnabled,
            )
        } else {
            assertFalse(
                "App Zygote preloading should not be enabled by settings on Android 9 or below.",
                sessionRule.runtime.settings.appZygoteProcessEnabled,
            )
        }
    }

    @Test
    fun appZygoteDisabled() {
        assumeThat(sessionRule.env.isAppZygoteProcess, equalTo(false))

        assertFalse(
            "App Zygote preloading is disabled on runtime settings",
            sessionRule.runtime.settings.appZygoteProcessEnabled,
        )
    }

    @Test
    fun conventionalProcessBehavior() {
        assumeThat("Isolated process is not enabled", sessionRule.env.isIsolatedProcess, equalTo(false))
        assumeThat("App Zygote preloading is not enabled", sessionRule.env.isAppZygoteProcess, equalTo(false))

        val processes = getTestRunnerProcesses()
        assertFalse("App Zygote process is not present.", processes.containsKey("org.mozilla.geckoview.test_zygote"))

        var contentProc: Process? = null
        for (process in processes) {
            if (process.key.contains("tab", ignoreCase = false)) {
                assertTrue("User ID does not indicate process isolation.", process.value.user.contains("u0_a"))
                contentProc = process.value
                break
            }
        }
        assertNotNull("Content process successfully identified.", contentProc)
    }

    @Test
    fun isolatedProcessBehavior() {
        assumeThat("Isolated process is enabled", sessionRule.env.isIsolatedProcess, equalTo(true))
        assumeThat("App Zygote preloading is not enabled", sessionRule.env.isAppZygoteProcess, equalTo(false))

        val processes = getTestRunnerProcesses()
        assertFalse("App Zygote process is not present.", processes.containsKey("org.mozilla.geckoview.test_zygote"))

        var contentProc: Process? = null
        for (process in processes) {
            if (process.key.contains("isolatedTab")) {
                assertTrue("User ID indicates process isolation.", process.value.user.contains("u0_i"))
                contentProc = process.value
                break
            }
        }
        assertNotNull("Content process successfully identified.", contentProc)
    }

    @Test
    @SdkSuppress(minSdkVersion = Build.VERSION_CODES.Q)
    fun appZygoteProcessBehavior() {
        assumeThat("Isolated process is not enabled", sessionRule.env.isIsolatedProcess, equalTo(false))
        assumeThat("App Zygote preloading is enabled", sessionRule.env.isAppZygoteProcess, equalTo(true))

        mainSession.loadTestPath(HELLO_HTML_PATH)
        mainSession.waitForPageStop()

        // Check for Zygote process
        val processes = getTestRunnerProcesses()
        assertTrue("App Zygote process is present.", processes.containsKey("org.mozilla.geckoview.test_zygote"))

        // Check for isolated process + Zygote naming
        var contentProc: Process? = null
        for (process in processes) {
            if (process.key.contains("isolatedTabWithZygote")) {
                assertTrue("User ID indicates process isolation.", process.value.user.contains("u0_i"))
                contentProc = process.value
                break
            }
        }
        assertNotNull("Content process successfully identified.", contentProc)
    }
}
