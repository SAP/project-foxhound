/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.pm.ShortcutInfoCompat
import kotlinx.coroutines.Job
import mozilla.components.concept.base.crash.Breadcrumb
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`
import org.mockito.MockitoAnnotations.openMocks
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ChangeAppLauncherIconTest {

    @Mock
    private lateinit var shortcutWrapper: ShortcutManagerWrapper
    private lateinit var shortcutsUpdater: ShortcutsUpdater
    private lateinit var fakeCrashReporter: CrashReporting

    @Before
    fun setup() {
        openMocks(this)
        fakeCrashReporter = TestCrashReporter()
        shortcutsUpdater = ShortcutsUpdaterDefault(testContext)
    }

    @Test
    fun `WHEN reset to default and user has default icon set THEN changeAppLauncherIcon makes no changes`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            true,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        verifyNoInteractions(shortcutWrapper)
    }

    @Test
    fun `WHEN reset to default and user has alternative icon set THEN changeAppLauncherIcon resets states to default config`() {
        val testShortcutManagerWrapper = TestShortcutManagerWrapper(testContext)
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )

        val shortcut = createShortcut(alternativeAppAlias)
        testShortcutManagerWrapper.testPinnedShortcuts = listOf(shortcut)

        assertFalse(testShortcutManagerWrapper.getPinnedShortcutsEvoked)
        assertTrue(testShortcutManagerWrapper.updateShortcutsCapture.isEmpty())

        changeAppLauncherIcon(
            testContext,
            testShortcutManagerWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            true,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT)

        val alternativeAppAliasState = packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT)

        assertTrue(testShortcutManagerWrapper.getPinnedShortcutsEvoked)

        val updatedShortcut = testShortcutManagerWrapper.updateShortcutsCapture.first()
        assertEquals(shortcut.shortLabel, updatedShortcut.shortLabel)
        assertEquals(shortcut.intent, updatedShortcut.intent)
        assertEquals(appAlias, updatedShortcut.activity)
    }

    @Test
    fun `WHEN should reset to default icon and getPinnedShortcuts throws THEN changeAppLauncherIcon makes no changes to shortcuts and components are the original state`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )

        `when`(shortcutWrapper.getPinnedShortcuts()).thenThrow(IllegalStateException())

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            true,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        verify(shortcutWrapper).getPinnedShortcuts()
        verify(shortcutWrapper, never()).updateShortcuts(any())
    }

    @Test
    fun `WHEN should reset to default icon and updateShortcuts throws THEN changeAppLauncherIcon makes no changes to shortcuts and components are the original state`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )

        `when`(shortcutWrapper.updateShortcuts(any())).thenThrow(IllegalArgumentException())

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            true,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        verify(shortcutWrapper).getPinnedShortcuts()
        verify(shortcutWrapper).updateShortcuts(any())
    }

    @Test
    fun `WHEN use alternative icon and user has default icon set THEN changeAppLauncherIcon updates states to alternative config`() {
        val testShortcutManagerWrapper = TestShortcutManagerWrapper(testContext)
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )

        val shortcut = createShortcut(appAlias)
        testShortcutManagerWrapper.testPinnedShortcuts = listOf(shortcut)

        assertFalse(testShortcutManagerWrapper.getPinnedShortcutsEvoked)
        assertTrue(testShortcutManagerWrapper.updateShortcutsCapture.isEmpty())

        changeAppLauncherIcon(
            testContext,
            testShortcutManagerWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            false,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        assertTrue(testShortcutManagerWrapper.getPinnedShortcutsEvoked)

        val updatedShortcut = testShortcutManagerWrapper.updateShortcutsCapture.first()
        assertEquals(shortcut.shortLabel, updatedShortcut.shortLabel)
        assertEquals(shortcut.intent, updatedShortcut.intent)
        assertEquals(alternativeAppAlias, updatedShortcut.activity)
    }

    @Test
    fun `WHEN use alternative and user has alternative icon already set THEN changeAppLauncherIcon makes no changes`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )

        `when`(shortcutWrapper.getPinnedShortcuts()).thenReturn(mock())

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            false,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        verifyNoInteractions(shortcutWrapper)
    }

    @Test
    fun `WHEN should use alternative icon and getPinnedShortcuts throws THEN changeAppLauncherIcon makes no changes to shortcuts and components are the original state`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )

        `when`(shortcutWrapper.getPinnedShortcuts()).thenThrow(IllegalStateException())

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            false,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        verify(shortcutWrapper).getPinnedShortcuts()
        verify(shortcutWrapper, never()).updateShortcuts(any())
    }

    @Test
    fun `WHEN should use alternative icon and updateShortcuts throws THEN changeAppLauncherIcon makes no changes to shortcuts and components are the original state`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )

        `when`(shortcutWrapper.updateShortcuts(any())).thenThrow(IllegalArgumentException())

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            false,
            fakeCrashReporter,
        )

        val appAliasState = packageManager.getComponentEnabledSetting(appAlias)
        assertTrue(appAliasState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)

        val alternativeAppAliasState =
            packageManager.getComponentEnabledSetting(alternativeAppAlias)
        assertTrue(alternativeAppAliasState == PackageManager.COMPONENT_ENABLED_STATE_DISABLED)

        verify(shortcutWrapper).getPinnedShortcuts()
        verify(shortcutWrapper).updateShortcuts(any())
    }

    // general changeAppLauncherIcon tests

    @Test
    fun `GIVEN updateShortcuts returns false WHEN changeAppLauncherIcon is called THEN new alias does not get enabled`() {
        val appAlias = ComponentName("test", "App")
        val newAppAlias = ComponentName("test", "AppAlternative")
        val packageManager = testContext.packageManager.apply {
            setComponentEnabledSetting(
                newAppAlias,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP,
            )
            setComponentEnabledSetting(
                appAlias,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP,
            )
        }

        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_ENABLED, packageManager.getComponentEnabledSetting(appAlias))
        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, packageManager.getComponentEnabledSetting(newAppAlias))

        changeAppLauncherIcon(
            packageManager = packageManager,
            shortcutManager = TestShortcutManagerWrapper(testContext),
            shortcutInfo = shortcutsUpdater,
            appAlias = appAlias,
            newAppAlias = newAppAlias,
            crashReporter = fakeCrashReporter,
            updateShortcuts = { _, _, _, _ -> false },
        )

        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_ENABLED, packageManager.getComponentEnabledSetting(appAlias))
        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, packageManager.getComponentEnabledSetting(newAppAlias))
    }

    @Test
    fun `GIVEN updateShortcuts returns true WHEN changeAppLauncherIcon is called THEN existing alias is disabled and new alias is enabled`() {
        val appAlias = ComponentName("test", "App")
        val newAppAlias = ComponentName("test", "AppAlternative")
        val packageManager = testContext.packageManager.apply {
            setComponentEnabledSetting(
                newAppAlias,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP,
            )
            setComponentEnabledSetting(
                appAlias,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP,
            )
        }

        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_ENABLED, packageManager.getComponentEnabledSetting(appAlias))
        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, packageManager.getComponentEnabledSetting(newAppAlias))

        changeAppLauncherIcon(
            packageManager = packageManager,
            shortcutManager = TestShortcutManagerWrapper(testContext),
            shortcutInfo = shortcutsUpdater,
            appAlias = appAlias,
            newAppAlias = newAppAlias,
            crashReporter = fakeCrashReporter,
            updateShortcuts = { _, _, _, _ -> true },
        )

        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, packageManager.getComponentEnabledSetting(appAlias))
        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_ENABLED, packageManager.getComponentEnabledSetting(newAppAlias))
    }

    // updateShortcutsComponentName tests

    @Test
    fun `GIVEN the shortcut manager throws IllegalStateException on getPinnedShortcuts WHEN updateShortcutsComponentName is called THEN it returns false`() {
        val throwingWrapper = object : ShortcutManagerWrapper {
            override fun getPinnedShortcuts(): List<ShortcutInfoCompat> {
                throw IllegalStateException()
            }

            override fun updateShortcuts(updatedShortcuts: List<ShortcutInfoCompat>) {
                // no-op
            }
        }

        assertFalse(
            updateShortcutsComponentName(
                shortcutManager = throwingWrapper,
                shortcutInfo = shortcutsUpdater,
                targetAlias = ComponentName("test", "AppAlternative"),
                crashReporter = fakeCrashReporter,
            ),
        )
    }

    @Test
    fun `GIVEN the shortcut manager throws IllegalArgumentException on updateShortcuts WHEN updateShortcutsComponentName is called THEN it returns false`() {
        val throwingWrapper = object : ShortcutManagerWrapper {
            override fun getPinnedShortcuts(): List<ShortcutInfoCompat> {
                // no-op
                return emptyList()
            }

            override fun updateShortcuts(updatedShortcuts: List<ShortcutInfoCompat>) {
                throw IllegalArgumentException()
            }
        }

        assertFalse(
            updateShortcutsComponentName(
                shortcutManager = throwingWrapper,
                shortcutInfo = shortcutsUpdater,
                targetAlias = ComponentName("test", "AppAlternative"),
                crashReporter = fakeCrashReporter,
            ),
        )
    }

    @Test
    fun `GIVEN the shortcut manager does not throw WHEN updateShortcutsComponentName is called THEN it returns true`() {
        assertTrue(
            updateShortcutsComponentName(
                shortcutManager = TestShortcutManagerWrapper(testContext),
                shortcutInfo = shortcutsUpdater,
                targetAlias = ComponentName("test", "AppAlternative"),
                crashReporter = fakeCrashReporter,
            ),
        )
    }

    // ShortcutInfoWrapperDefault tests

    @Test
    fun `WHEN updateShortcutComponentName is evoked for ShortcutInfoWrapperDefault class THEN shortcut alias gets updated with new alias`() {
        val defaultWrapper = ShortcutsUpdaterDefault(testContext)
        val appAlias = ComponentName("test", "App")
        val newAppAlias = ComponentName("test", "AppAlternative")
        val shortcut = createShortcut(appAlias)

        val result = defaultWrapper.buildUpdatedShortcuts(listOf(shortcut), newAppAlias).first()

        assertEquals(shortcut.shortLabel, result.shortLabel)
        assertEquals(shortcut.intent, result.intent)
        assertEquals(newAppAlias, result.activity)
    }

    @Test
    fun `GIVEN getPinnedShortcuts throws WHEN changeAppLauncherIcon is called THEN the error is submitted to a crash recorder`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val fakeCrashReporter = TestCrashReporter()
        val error = IllegalStateException("Pinned shortcuts were too fast to catch!")
        val shortcutWrapper = object : ShortcutManagerWrapper {
            override fun getPinnedShortcuts(): List<ShortcutInfoCompat> { throw error }
            override fun updateShortcuts(updatedShortcuts: List<ShortcutInfoCompat>) {}
        }

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            true,
            fakeCrashReporter,
        )

        assertTrue(fakeCrashReporter.submitCaughtExceptionInvoked)
        assertTrue(fakeCrashReporter.errors.contains(error))
    }

    @Test
    fun `GIVEN updateShortcuts throws WHEN changeAppLauncherIcon is called THEN the error is submitted to a crash recorder`() {
        val packageManager = testContext.packageManager
        val appAlias = ComponentName("test", "App")
        packageManager.setComponentEnabledSetting(
            appAlias,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        val alternativeAppAlias = ComponentName("test", "AppAlternative")
        packageManager.setComponentEnabledSetting(
            alternativeAppAlias,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        val fakeCrashReporter = TestCrashReporter()
        val error = IllegalArgumentException("Provided shortcuts were too cool to be updated!")
        val shortcutWrapper = object : ShortcutManagerWrapper {
            override fun getPinnedShortcuts(): List<ShortcutInfoCompat> { return emptyList() }
            override fun updateShortcuts(updatedShortcuts: List<ShortcutInfoCompat>) { throw error }
        }

        changeAppLauncherIcon(
            testContext,
            shortcutWrapper,
            shortcutsUpdater,
            appAlias,
            alternativeAppAlias,
            true,
            fakeCrashReporter,
        )

        assertTrue(fakeCrashReporter.submitCaughtExceptionInvoked)
        assertTrue(fakeCrashReporter.errors.contains(error))
    }
}

private fun createShortcut(componentName: ComponentName) =
    ShortcutInfoCompat.Builder(testContext, "1")
        .setShortLabel("1")
        .setIntent(Intent().apply { action = "TEST_ACTION" })
        .setActivity(componentName)
        .build()

private class TestShortcutManagerWrapper(context: Context) : ShortcutManagerWrapper {
    val defaultImplementation = ShortcutManagerWrapperDefault(context)
    var testPinnedShortcuts: List<ShortcutInfoCompat> = emptyList()
    var updateShortcutsCapture: List<ShortcutInfoCompat> = emptyList()
    var getPinnedShortcutsEvoked = false

    override fun getPinnedShortcuts(): List<ShortcutInfoCompat> {
        getPinnedShortcutsEvoked = true
        return testPinnedShortcuts
    }

    override fun updateShortcuts(updatedShortcuts: List<ShortcutInfoCompat>) {
        defaultImplementation.updateShortcuts(updatedShortcuts)
        updateShortcutsCapture = updatedShortcuts
    }
}

private class TestCrashReporter() : CrashReporting {
    var submitCaughtExceptionInvoked = false
    var errors: MutableList<Throwable> = mutableListOf()

    override fun submitCaughtException(throwable: Throwable): Job {
        submitCaughtExceptionInvoked = true
        errors.add(throwable)
        return Job().apply { complete() }
    }

    override fun recordCrashBreadcrumb(breadcrumb: Breadcrumb) {}
}
