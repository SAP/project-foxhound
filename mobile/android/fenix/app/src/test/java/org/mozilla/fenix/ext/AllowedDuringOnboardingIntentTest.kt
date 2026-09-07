/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ext

import android.content.ComponentName
import android.content.Intent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.metrics.MozillaProductDetector
import org.mozilla.fenix.customtabs.EXTRA_IS_SANDBOX_CUSTOM_TAB
import org.robolectric.RobolectricTestRunner

private const val AUTH_CUSTOM_TAB_ACTIVITY_CLASS_NAME = "org.mozilla.fenix.settings.account.AuthCustomTabActivity"

private val FIREFOX_PACKAGE_NAME = MozillaProductDetector.MozillaProducts.FIREFOX.productName

/**
 * The application ID of each Fenix build flavor (see app/build.gradle). The sync-auth check must
 * recognize the running build whichever flavor it is.
 */
private val BUILD_PACKAGE_NAMES = listOf(
    "org.mozilla.fenix.debug", // debug
    "org.mozilla.fenix", // nightly
    "org.mozilla.firefox_beta", // beta
    "org.mozilla.firefox", // release
)

@RunWith(RobolectricTestRunner::class)
class AllowedDuringOnboardingIntentTest {

    @Test
    fun `WHEN the sandbox custom tab extra is true THEN it is allowed during onboarding`() {
        val intent = Intent().putExtra(EXTRA_IS_SANDBOX_CUSTOM_TAB, true)

        assertTrue(intent.isAllowedDuringOnboardingIntent(packageName = "unused"))
    }

    @Test
    fun `WHEN the sandbox custom tab extra is false THEN it is not allowed during onboarding`() {
        val intent = Intent().putExtra(EXTRA_IS_SANDBOX_CUSTOM_TAB, false)

        assertFalse(intent.isAllowedDuringOnboardingIntent(packageName = "unused"))
    }

    @Test
    fun `WHEN the intent has no extras or component THEN it is not allowed during onboarding`() {
        assertFalse(Intent().isAllowedDuringOnboardingIntent(packageName = "unused"))
    }

    @Test
    fun `WHEN the component package is the running build and the class is the sync-auth activity THEN it is allowed during onboarding for each build`() {
        BUILD_PACKAGE_NAMES.forEach { packageName ->
            val intent = Intent().apply {
                component = ComponentName(packageName, AUTH_CUSTOM_TAB_ACTIVITY_CLASS_NAME)
            }

            assertTrue(intent.isAllowedDuringOnboardingIntent(packageName))
        }
    }

    @Test
    fun `WHEN the component class is the sync-auth activity but the package is not the running build THEN it is not allowed during onboarding`() {
        val intent = Intent().apply {
            component = ComponentName("wrong package", AUTH_CUSTOM_TAB_ACTIVITY_CLASS_NAME)
        }

        assertFalse(intent.isAllowedDuringOnboardingIntent(packageName = FIREFOX_PACKAGE_NAME))
    }

    @Test
    fun `WHEN the component package is the running build but the class is not the sync-auth activity THEN it is not allowed during onboarding`() {
        val intent = Intent().apply {
            component = ComponentName(FIREFOX_PACKAGE_NAME, "wrong class")
        }

        assertFalse(intent.isAllowedDuringOnboardingIntent(packageName = FIREFOX_PACKAGE_NAME))
    }

    @Test
    fun `WHEN the sandbox custom tab extra is true and the component is not the sync-auth activity THEN it is still allowed during onboarding`() {
        val intent = Intent().apply {
            putExtra(EXTRA_IS_SANDBOX_CUSTOM_TAB, true)
            component = ComponentName(FIREFOX_PACKAGE_NAME, "wrong class")
        }

        assertTrue(intent.isAllowedDuringOnboardingIntent(packageName = "unused"))
    }
}
