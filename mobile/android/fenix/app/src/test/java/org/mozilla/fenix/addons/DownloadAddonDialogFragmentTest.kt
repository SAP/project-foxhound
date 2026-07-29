/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.concept.engine.webextension.InstallationMethod
import mozilla.components.support.test.robolectric.createAddedTestFragment
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.theme.Theme
import mozilla.components.feature.addons.R as addonsR

@RunWith(AndroidJUnit4::class)
class DownloadAddonDialogFragmentTest {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    private var fragment: DownloadAddonDialogFragment? = null

    @Test
    fun `GIVEN addon details WHEN valid THEN show header, addon details and cancel button`() {
        launchDialog()

        composeRule.onNodeWithText(headerText).assertIsDisplayed()
        composeRule.onNodeWithText(ADDON_NAME).assertIsDisplayed()
        composeRule.onNodeWithText(cancelText).assertIsDisplayed()
    }

    @Test
    fun `GIVEN addon name is null WHEN dialog is shown THEN show header and cancel but no addon details`() {
        launchDialog(addonName = null)

        composeRule.onNodeWithText(headerText).assertIsDisplayed()
        composeRule.onNodeWithText(cancelText).assertIsDisplayed()
        composeRule.onNodeWithText(ADDON_NAME).assertDoesNotExist()
    }

    @Test
    fun `GIVEN addon name is blank WHEN dialog is shown THEN show header and cancel but no addon details`() {
        launchDialog(addonName = "")

        composeRule.onNodeWithText(headerText).assertIsDisplayed()
        composeRule.onNodeWithText(cancelText).assertIsDisplayed()
        composeRule.onNodeWithText(ADDON_NAME).assertDoesNotExist()
    }

    @Test
    fun `GIVEN dialog is shown WHEN cancel button is tapped THEN invoke onCancelled and dismiss dialog`() {
        var cancelledCalls = 0
        launchDialog(onCancelled = { cancelledCalls++ })

        composeRule.onNodeWithText(cancelText).performClick()
        executePendingFragmentTransactions()
        composeRule.waitForIdle()

        assertEquals(1, cancelledCalls)
        composeRule.onNodeWithText(headerText).assertDoesNotExist()
        composeRule.onNodeWithText(ADDON_NAME).assertDoesNotExist()
        composeRule.onNodeWithText(cancelText).assertDoesNotExist()
    }

    @Test
    fun `GIVEN dialog is shown WHEN cancelled by system back THEN invoke onCancelled and dismiss dialog`() {
        var cancelledCalls = 0
        launchDialog(onCancelled = { cancelledCalls++ })

        // The system back calls the cancel() method on the dialog.
        fragment?.requireDialog()?.cancel()
        executePendingFragmentTransactions()
        composeRule.waitForIdle()

        assertEquals(1, cancelledCalls)
        composeRule.onNodeWithText(headerText).assertDoesNotExist()
        composeRule.onNodeWithText(ADDON_NAME).assertDoesNotExist()
        composeRule.onNodeWithText(cancelText).assertDoesNotExist()
    }

    private val headerText = testContext.getString(addonsR.string.mozac_extension_install_progress_caption)
    private val cancelText = testContext.getString(addonsR.string.mozac_feature_addons_install_addon_dialog_cancel)

    private fun launchDialog(
        downloadUrl: String = DOWNLOAD_URL,
        addonName: String? = ADDON_NAME,
        addonImageUrl: String? = ADDON_IMAGE_URL,
        installationMethod: InstallationMethod = InstallationMethod.RTAMO,
        onCancelled: () -> Unit = {},
    ) {
        val fragmentArgs = DownloadAddonDialogFragmentArgs(
            addonDownloadUrl = downloadUrl,
            addonName = addonName,
            addonImageUrl = addonImageUrl,
            addonInstallationSource = installationMethod,
        ).toBundle()

        fragment = createAddedTestFragment {
            DownloadAddonDialogFragment().apply {
                arguments = fragmentArgs
                this.onCancelled = onCancelled
                overriddenTheme = Theme.Dark
            }
        }

        composeRule.waitForIdle()
    }

    private fun executePendingFragmentTransactions() =
        fragment?.activity?.supportFragmentManager?.executePendingTransactions()

    private companion object {
        const val DOWNLOAD_URL = "https://example.com/addon.xpi"
        const val ADDON_NAME = "uBlock Origin"
        const val ADDON_IMAGE_URL = "https://example.com/icon.png"
    }
}
