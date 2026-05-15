/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.preferences

import mozilla.components.browser.engine.gecko.preferences.GeckoPreferencesUtils.intoSetGeckoPreference
import mozilla.components.concept.engine.preferences.Branch
import mozilla.components.concept.engine.preferences.SetBrowserPreference
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.GeckoPreferenceController
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class GeckoPreferencesUtilsTest {
    @Test
    fun `intoSetGeckoPreference maps SetGeckoPreference correctly`() {
        val aCStringPref = SetBrowserPreference.setStringPref(
            pref = "my.string.pref",
            value = "hello-world",
            branch = Branch.USER,
        )
       val aCIntPref = SetBrowserPreference.setIntPref(
           pref = "my.int.pref",
           value = 1,
           branch = Branch.DEFAULT,
        )
        val aCBoolPref = SetBrowserPreference.setBoolPref(
            pref = "my.bool.pref",
            value = false,
            branch = Branch.USER,
        )

        val geckoStringPref = aCStringPref.intoSetGeckoPreference()
        assertEquals(geckoStringPref.pref, "my.string.pref")
        assertEquals(geckoStringPref.value, "hello-world")
        assertEquals(geckoStringPref.branch, GeckoPreferenceController.PREF_BRANCH_USER)

        val geckoIntPref = aCIntPref.intoSetGeckoPreference()
        assertEquals(geckoIntPref.pref, "my.int.pref")
        assertEquals(geckoIntPref.value, 1)
        assertEquals(geckoIntPref.branch, GeckoPreferenceController.PREF_BRANCH_DEFAULT)

        val geckoBoolPref = aCBoolPref.intoSetGeckoPreference()
        assertEquals(geckoBoolPref.pref, "my.bool.pref")
        assertEquals(geckoBoolPref.value, false)
        assertEquals(geckoBoolPref.branch, GeckoPreferenceController.PREF_BRANCH_USER)
    }
}
