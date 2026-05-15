/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import android.content.ComponentName
import android.content.pm.PackageManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DefaultAppIconRepositoryTest {

    @Test
    fun `GIVEN an alternative app icon is the launcher WHEN getCurrentLauncherAliasSuffix is called THEN the alternative app icon alias suffix is returned`() {
        val defaultIcon = AppIcon.AppDefault
        val alternativeIcon = AppIcon.AppGradientNorthernLights
        val packageName = testContext.packageName
        val packageManager = testContext.packageManager
        val appIconRepository = DefaultAppIconRepository(DefaultPackageManagerWrapper(packageManager), packageName)

        assertEquals(defaultIcon, appIconRepository.selectedAppIcon)

        packageManager.setComponentEnabledSetting(
            ComponentName(packageName, "$packageName.${AppIcon.AppDefault.aliasSuffix}"),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )
        packageManager.setComponentEnabledSetting(
            ComponentName(packageName, "$packageName.${alternativeIcon.aliasSuffix}"),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )

        assertEquals(alternativeIcon, appIconRepository.selectedAppIcon)
    }

    @Test
    fun `GIVEN there is no active alias WHEN getCurrentLauncherAliasSuffix is called THEN the default app icon suffix is returned`() {
        val defaultIcon = AppIcon.AppDefault
        val packageName = testContext.packageName
        val packageManager = testContext.packageManager
        val packageManagerWrapper = DefaultPackageManagerWrapper(packageManager)
        val appIconRepository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        assertNotNull(packageManagerWrapper.getFenixLauncherName(packageName))

        packageManager.setComponentEnabledSetting(
            ComponentName(packageName, "$packageName.${AppIcon.AppDefault.aliasSuffix}"),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
        )

        assertNull(packageManagerWrapper.getFenixLauncherName(packageName))

        assertEquals(defaultIcon, appIconRepository.selectedAppIcon)
    }

    @Test
    fun `GIVEN the active alias is broken WHEN getCurrentLauncherAliasSuffix is called THEN the default app icon suffix is returned`() {
        val defaultIcon = AppIcon.AppDefault
        val packageName = "why.is.it.even.here"
        val packageManagerWrapper = TestPackageManagerWrapper(fenixLauncherName = packageName.plus("3cb7bc27e968627800f338fe1221a8764974b2f1"))
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        assertEquals(defaultIcon, repository.selectedAppIcon)
    }

    @Test
    fun `GIVEN name starts with packageName dot WHEN getCurrentLauncherAliasSuffix is called THEN the alias suffix is returned`() {
        val packageName = testContext.packageName
        val alias = AppIcon.AppGradientNorthernLights.aliasSuffix
        val packageManagerWrapper = TestPackageManagerWrapper(fenixLauncherName = "$packageName.$alias")
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        val result = repository.getCurrentLauncherAliasSuffix()

        assertEquals(alias, result)
    }

    @Test
    fun `GIVEN alias contains additional dots WHEN getCurrentLauncherAliasSuffix is called THEN the full alias suffix is returned`() {
        val packageName = testContext.packageName
        val alias = "App.Gradient.Northern.Lights"
        val packageManagerWrapper = TestPackageManagerWrapper(fenixLauncherName = "$packageName.$alias")
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        val result = repository.getCurrentLauncherAliasSuffix()

        assertEquals(alias, result)
    }

    @Test
    fun `GIVEN name does not contain packageName WHEN getCurrentLauncherAliasSuffix is called THEN the original name is returned`() {
        val packageName = testContext.packageName
        val alias = AppIcon.AppGradientNorthernLights.aliasSuffix
        val packageManagerWrapper = TestPackageManagerWrapper(fenixLauncherName = alias)
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        val result = repository.getCurrentLauncherAliasSuffix()

        assertEquals(alias, result)
    }

    @Test
    fun `GIVEN similar but non-matching prefix WHEN getCurrentLauncherAliasSuffix is called THEN the original name is returned`() {
        val packageName = testContext.packageName
        val oddName = "org.mozilla.fenixxx.AppGradientSunset"
        val packageManagerWrapper = TestPackageManagerWrapper(fenixLauncherName = oddName)
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        val result = repository.getCurrentLauncherAliasSuffix()

        assertEquals(oddName, result)
    }

    @Test
    fun `GIVEN name equals packageName dot only WHEN getCurrentLauncherAliasSuffix is called THEN empty string is returned`() {
        val packageName = testContext.packageName
        val packageManagerWrapper = TestPackageManagerWrapper(fenixLauncherName = "$packageName.")
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        val result = repository.getCurrentLauncherAliasSuffix()

        assertEquals("", result)
    }

    @Test
    fun `GIVEN launcher info is null WHEN getCurrentLauncherAliasSuffix is called THEN default alias suffix is returned`() {
        val packageName = testContext.packageName
        val packageManagerWrapper = TestPackageManagerWrapper(null)
        val repository = DefaultAppIconRepository(packageManagerWrapper, packageName)

        val result = repository.getCurrentLauncherAliasSuffix()

        assertEquals(AppIcon.AppDefault.aliasSuffix, result)
    }

    class TestPackageManagerWrapper(
        val fenixLauncherName: String?,
    ) : PackageManagerWrapper {
        override fun getFenixLauncherName(packageName: String): String? {
            return fenixLauncherName
        }
    }
}
