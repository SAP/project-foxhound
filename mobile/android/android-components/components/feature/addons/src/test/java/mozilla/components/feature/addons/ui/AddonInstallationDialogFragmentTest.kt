/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.addons.ui

import android.text.SpannableString
import android.text.style.ClickableSpan
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.text.getSpans
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentTransaction
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.addons.R
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.ext.getParcelableCompat
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doNothing
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

@RunWith(AndroidJUnit4::class)
class AddonInstallationDialogFragmentTest {

    @Test
    fun `build dialog`() {
        val addon = Addon(
            "id",
            translatableName = mapOf(Addon.DEFAULT_LOCALE to "my_addon"),
            permissions = listOf("privacy", "<all_urls>", "tabs"),
        )
        val fragment = createAddonInstallationDialogFragment(addon)
        assertSame(addon, fragment.arguments?.getParcelableCompat(KEY_INSTALLED_ADDON, Addon::class.java))

        doReturn(testContext).`when`(fragment).requireContext()
        val dialog = fragment.onCreateDialog(null)
        dialog.show()
        val name = addon.translateName(testContext)
        val titleTextView = dialog.findViewById<TextView>(R.id.title)
        val description = dialog.findViewById<TextView>(R.id.description)

        assertEquals(
            testContext.getString(R.string.mozac_feature_addons_installed_dialog_title_2, name),
            titleTextView.text,
        )
        assertEquals(
            testContext.getString(
                R.string.mozac_feature_addons_installed_dialog_description_3,
                testContext.getString(R.string.mozac_feature_addons_installed_dialog_description_link_text),
            ),
            // Force the description to be a string for the assertion to assert the content only.
            // This description is a spannable string (because it's text with an active link).
            description.text.toString(),
        )
    }

    @Test
    fun `dismissing the dialog notifies nothing`() {
        val addon = Addon("id", translatableName = mapOf(Addon.DEFAULT_LOCALE to "my_addon"))
        val fragment = createAddonInstallationDialogFragment(addon)

        doReturn(testContext).`when`(fragment).requireContext()

        doReturn(mockFragmentManager()).`when`(fragment).parentFragmentManager

        val dialog = fragment.onCreateDialog(null)
        dialog.show()
        fragment.onDismiss(mock())
    }

    @Test
    fun `WHEN calling onCancel THEN notifies onDismiss`() {
        val addon = Addon("id", translatableName = mapOf(Addon.DEFAULT_LOCALE to "my_addon"))
        val fragment = createAddonInstallationDialogFragment(addon)
        var onDismissedWasExecuted = false

        fragment.onDismissed = {
            onDismissedWasExecuted = true
        }

        doReturn(testContext).`when`(fragment).requireContext()

        doReturn(mockFragmentManager()).`when`(fragment).parentFragmentManager

        val dialog = fragment.onCreateDialog(null)
        dialog.show()
        fragment.onCancel(mock())
        assertTrue(onDismissedWasExecuted)
    }

    @Test
    fun `dialog must have all the styles of the feature promptsStyling object`() {
        val addon = Addon("id", translatableName = mapOf(Addon.DEFAULT_LOCALE to "my_addon"))
        val styling = AddonDialogFragment.PromptsStyling(Gravity.TOP, true)
        val fragment = createAddonInstallationDialogFragment(addon, styling)

        doReturn(testContext).`when`(fragment).requireContext()
        val dialog = fragment.onCreateDialog(null)
        val dialogAttributes = dialog.window!!.attributes

        assertTrue(dialogAttributes.gravity == Gravity.TOP)
        assertTrue(dialogAttributes.width == ViewGroup.LayoutParams.MATCH_PARENT)
    }

    @Test
    fun `allows state loss when committing`() {
        val addon = mock<Addon>()
        val fragment = createAddonInstallationDialogFragment(addon)

        val fragmentManager = mock<FragmentManager>()
        val fragmentTransaction = mock<FragmentTransaction>()
        `when`(fragmentManager.beginTransaction()).thenReturn(fragmentTransaction)

        fragment.show(fragmentManager, "test")
        verify(fragmentTransaction).commitAllowingStateLoss()
    }

    @Test
    fun `builds a description with a clickable link`() {
        val addon = Addon(id = "@ext-id")
        var onExtensionSettingsLinkClickedCalled = false
        val onExtensionSettingsLinkClicked: ((Addon) -> Unit) = {
            assertEquals(addon, it)
            onExtensionSettingsLinkClickedCalled = true
        }
        val fragment = createAddonInstallationDialogFragment(
            addon = addon,
            onExtensionSettingsLinkClicked = onExtensionSettingsLinkClicked,
        )
        doReturn(testContext).`when`(fragment).requireContext()
        val dialog = fragment.onCreateDialog(null)
        dialog.show()

        // Retrieve the clickable spans in the description text.
        val descriptionTextView = dialog.findViewById<TextView>(R.id.description)
        val spannableString = descriptionTextView.text as SpannableString
        val spans = spannableString.getSpans<ClickableSpan>()
        assertEquals(1, spans.size)
        val clickableSpan = spans[0]
        assertEquals(
            "Expected the correct localized string for the link",
            testContext.getString(R.string.mozac_feature_addons_installed_dialog_description_link_text),
            spannableString.substring(
                spannableString.getSpanStart(clickableSpan),
                spannableString.getSpanEnd(clickableSpan),
            ),
        )

        // Simulate a click on the link.
        val view = View(testContext)
        clickableSpan.onClick(view)
        view.performClick()
        assertTrue(onExtensionSettingsLinkClickedCalled)
    }

    private fun createAddonInstallationDialogFragment(
        addon: Addon,
        promptsStyling: AddonDialogFragment.PromptsStyling? = null,
        onExtensionSettingsLinkClicked: ((Addon) -> Unit)? = null,
    ): AddonInstallationDialogFragment {
        return spy(
            AddonInstallationDialogFragment.newInstance(
                addon,
                promptsStyling = promptsStyling,
                onExtensionSettingsLinkClicked = onExtensionSettingsLinkClicked,
            ),
        ).apply {
            doNothing().`when`(this).dismiss()
        }
    }

    private fun mockFragmentManager(): FragmentManager {
        val fragmentManager: FragmentManager = mock()
        val transaction: FragmentTransaction = mock()
        doReturn(transaction).`when`(fragmentManager).beginTransaction()
        return fragmentManager
    }
}
