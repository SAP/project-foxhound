/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.sitepermissions

import android.view.Gravity.TOP
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.feature.sitepermissions.SitePermissionsFeature.PromptsStyling
import mozilla.components.support.ktx.util.PromptAbuserDetector
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doNothing
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import androidx.core.R as coreR

@RunWith(AndroidJUnit4::class)
class SitePermissionsDialogFragmentTest {

    private val permissionRequestId = "permissionID"
    private val titleIcon = coreR.drawable.notification_icon_background

    @Before
    fun setUp() {
        PromptAbuserDetector.validationsEnabled = false
    }

    @After
    fun tearDown() {
        PromptAbuserDetector.validationsEnabled = true
    }

    @Test
    fun `build dialog`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = true,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()
        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val checkBox = dialog.findViewById<CheckBox>(R.id.do_not_ask_again)

        assertTrue("Checkbox should be displayed", checkBox.isVisible)
        assertFalse("Checkbox shouldn't be checked", checkBox.isChecked)
        assertFalse("User selection property should be false", fragment.userSelectionCheckBox)
    }

    @Test
    fun `display dialog with unselected 'don't ask again'`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = true,
                shouldSelectDoNotAskAgainCheckBox = false,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()
        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val checkBox = dialog.findViewById<CheckBox>(R.id.do_not_ask_again)

        assertTrue("Checkbox should be displayed", checkBox.isVisible)
        assertFalse("Checkbox shouldn't be checked", checkBox.isChecked)
        assertFalse("User selection property should be false", fragment.userSelectionCheckBox)
    }

    @Test
    fun `display dialog with preselected 'don't ask again'`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = true,
                shouldSelectDoNotAskAgainCheckBox = true,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()
        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val checkBox = dialog.findViewById<CheckBox>(R.id.do_not_ask_again)

        assertTrue("Checkbox should be displayed", checkBox.isVisible)
        assertTrue("Checkbox should be checked", checkBox.isChecked)
        assertTrue("User selection property should be true", fragment.userSelectionCheckBox)
    }

    @Test
    fun `dialog with shouldShowDoNotAskAgainCheckBox equals false should not have a checkbox`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = false,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val checkBox = dialog.findViewById<CheckBox>(R.id.do_not_ask_again)

        assertFalse("Checkbox shouldn't be displayed", checkBox.isVisible)
        assertFalse("User selection property should be false", fragment.userSelectionCheckBox)
    }

    @Test
    fun `dialog with a default null message should not have a message section`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = false,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val message = dialog.findViewById<TextView>(R.id.message)

        assertFalse("Message shouldn't be displayed", message.isVisible)
    }

    @Test
    fun `dialog with passed in message should display that message`() {
        val expectedMessage = "This is just a test"
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = false,
                message = expectedMessage,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val message = dialog.findViewById<TextView>(R.id.message)

        assertTrue("Message should be displayed", message.isVisible)
        assertEquals(expectedMessage, message.text)
    }

    @Test
    fun `dialog with DO NOT ASK AGAIN checkbox label passed in should display that label`() {
        val expectedCheckboxLabel = "Don't show anymore"
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                sessionId = "sessionId",
                title = "title",
                titleIcon = titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = true,
                doNotAskAgainCheckBoxLabel = expectedCheckboxLabel,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val checkbox = dialog.findViewById<CheckBox>(R.id.do_not_ask_again)

        assertTrue("Checkbox should be visible", checkbox.isVisible)
        assertEquals(expectedCheckboxLabel, checkbox.text)
    }

    @Test
    fun `dialog with a default shouldShowLearnMoreLink being equal to false should not have a Learn more link`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = false,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val learnMoreLink = dialog.findViewById<TextView>(R.id.learn_more)

        assertFalse("Learn more link shouldn't be displayed", learnMoreLink.isVisible)
    }

    @Test
    fun `dialog with shouldShowLearnMoreLink equals true should show a properly configured Learn more link`() {
        val feature: SitePermissionsFeature = mock()
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = feature,
                shouldShowDoNotAskAgainCheckBox = false,
                learnMoreLink = "https://mozilla.org",
            ),
        )
        doNothing().`when`(fragment).dismiss()
        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val learnMoreLink = dialog.findViewById<TextView>(R.id.learn_more)

        assertTrue("Learn more link shouldn't be displayed", learnMoreLink.isVisible)
        assertFalse("Learn more link should not be long clickable", learnMoreLink.isLongClickable)
        learnMoreLink.callOnClick()
        verify(fragment).dismiss()
        verify(feature).onLearnMorePress(
            permissionId = permissionRequestId,
            sessionId = "sessionId",
            learnMoreLink = "https://mozilla.org",
        )
    }

    @Test
    fun `clicking on positive button notifies the feature (temporary)`() {
        val mockFeature: SitePermissionsFeature = mock()
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mockFeature,
                shouldShowDoNotAskAgainCheckBox = false,
                shouldSelectDoNotAskAgainCheckBox = false,
            ),
        )
        doNothing().`when`(fragment).dismiss()
        fragment.feature = mockFeature

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val positiveButton = dialog.findViewById<Button>(R.id.allow_button)
        positiveButton.performClick()
        verify(mockFeature).onPositiveButtonPress(
            eq(permissionRequestId),
            eq("sessionId"),
            eq(false),
            any(),
        )
    }

    @Test
    fun `dismissing the dialog notifies the feature`() {
        val mockFeature: SitePermissionsFeature = mock()
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mockFeature,
                shouldShowDoNotAskAgainCheckBox = false,
                shouldSelectDoNotAskAgainCheckBox = false,
            ),
        )
        doNothing().`when`(fragment).dismiss()

        fragment.feature = mockFeature

        doReturn(testContext).`when`(fragment).requireContext()

        doReturn(mockFragmentManager()).`when`(fragment).parentFragmentManager

        fragment.onDismiss(mock())

        verify(mockFeature).onDismiss(permissionRequestId, "sessionId")
    }

    @Test
    fun `dialog with passed in text for the negative button should use it`() {
        val expectedText = "This is just a test"
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = false,
                negativeButtonText = expectedText,
            ),
        )
        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val negativeButton = dialog.findViewById<Button>(R.id.deny_button)
        assertEquals(expectedText, negativeButton.text)
    }

    @Test
    fun `dialog with a text for the negative button not passed has a default available`() {
        val expectedText = testContext.getString(R.string.mozac_feature_sitepermissions_not_allow)
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = false,
            ),
        )
        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val negativeButton = dialog.findViewById<Button>(R.id.deny_button)
        assertEquals(expectedText, negativeButton.text)
    }

    @Test
    fun `clicking on negative button notifies the feature (temporary)`() {
        val mockFeature: SitePermissionsFeature = mock()
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mockFeature,
                shouldShowDoNotAskAgainCheckBox = false,
                shouldSelectDoNotAskAgainCheckBox = false,
            ),
        )
        doNothing().`when`(fragment).dismiss()

        fragment.feature = mockFeature

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val positiveButton = dialog.findViewById<Button>(R.id.deny_button)
        positiveButton.performClick()
        verify(mockFeature)
            .onNegativeButtonPress(permissionRequestId, "sessionId", false)
    }

    @Test
    fun `clicking on positive button notifies the feature (permanent)`() {
        val mockFeature: SitePermissionsFeature = mock()
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mockFeature,
                shouldShowDoNotAskAgainCheckBox = false,
                shouldSelectDoNotAskAgainCheckBox = true,
            ),
        )
        doNothing().`when`(fragment).dismiss()

        fragment.feature = mockFeature

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val positiveButton = dialog.findViewById<Button>(R.id.allow_button)
        positiveButton.performClick()
        verify(mockFeature).onPositiveButtonPress(
            eq(permissionRequestId),
            eq("sessionId"),
            eq(true),
            any(),
        )
    }

    @Test
    fun `clicking on negative button notifies the feature (permanent)`() {
        val mockFeature: SitePermissionsFeature = mock()
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mockFeature,
                shouldShowDoNotAskAgainCheckBox = false,
                shouldSelectDoNotAskAgainCheckBox = true,
            ),
        )
        doNothing().`when`(fragment).dismiss()

        fragment.feature = mockFeature

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val positiveButton = dialog.findViewById<Button>(R.id.deny_button)
        positiveButton.performClick()
        verify(mockFeature)
            .onNegativeButtonPress(permissionRequestId, "sessionId", true)
    }

    @Test
    fun `dialog must have all the styles of the feature promptsStyling object`() {
        val mockFeature: SitePermissionsFeature = mock()

        doReturn(PromptsStyling(TOP, true)).`when`(mockFeature).promptsStyling

        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mockFeature,
                shouldShowDoNotAskAgainCheckBox = false,
            ),
        )

        fragment.feature = mockFeature

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)

        val dialogAttributes = dialog.window!!.attributes

        assertTrue(dialogAttributes.gravity == TOP)
        assertTrue(dialogAttributes.width == ViewGroup.LayoutParams.MATCH_PARENT)
    }

    @Test
    fun `dialog with isNotificationRequest equals true should not have a checkbox`() {
        val fragment = spy(
            SitePermissionsDialogFragment.newInstance(
                "sessionId",
                "title",
                titleIcon,
                permissionRequestId = permissionRequestId,
                feature = mock(),
                shouldShowDoNotAskAgainCheckBox = true,
                shouldSelectDoNotAskAgainCheckBox = false,
                isNotificationRequest = true,
            ),
        )

        doReturn(testContext).`when`(fragment).requireContext()

        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        val checkBox = dialog.findViewById<CheckBox>(R.id.do_not_ask_again)

        assertFalse("Checkbox shouldn't be displayed", checkBox.isVisible)
        assertTrue("User selection property should be true", fragment.userSelectionCheckBox)
    }

    private fun mockFragmentManager(): FragmentManager {
        val fragmentManager: FragmentManager = mock()
        val transaction: FragmentTransaction = mock()
        doReturn(transaction).`when`(fragmentManager).beginTransaction()
        return fragmentManager
    }
}
