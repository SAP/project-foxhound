/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.compose

import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.store.IPProtectionMenuState
import org.mozilla.fenix.components.menu.store.IPProtectionMenuStatus
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class IPProtectionMenuItemTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    private val toggleLabel: String
        get() = testContext.getString(R.string.ip_protection_toggle_label)

    @Test
    fun `WHEN IP protection is enabled THEN the toggle exposes the on state to screen readers`() {
        setContent(IPProtectionMenuStatus.Enabled)

        composeTestRule.onNodeWithText(toggleLabel).assert(
            hasStateDescription(testContext.getString(R.string.preferences_ip_protection_on)),
        )
    }

    @Test
    fun `WHEN IP protection is disabled THEN the toggle exposes the off state to screen readers`() {
        setContent(IPProtectionMenuStatus.Disabled)

        composeTestRule.onNodeWithText(toggleLabel).assert(
            hasStateDescription(testContext.getString(R.string.preferences_ip_protection_off)),
        )
    }

    @Test
    fun `WHEN IP protection is connecting THEN the connecting state is exposed to screen readers`() {
        setContent(IPProtectionMenuStatus.Activating)

        composeTestRule.onNodeWithText(toggleLabel).assert(
            hasStateDescription(testContext.getString(R.string.ip_protection_menu_connecting)),
        )
    }

    private fun hasStateDescription(value: String) =
        SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, value)

    private fun setContent(status: IPProtectionMenuStatus) {
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                IPProtectionMenuItem(
                    state = IPProtectionMenuState(status = status),
                    onToggle = {},
                    onNavigate = {},
                )
            }
        }
    }
}
