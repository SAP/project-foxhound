/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.core.net.toUri
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.navigationToolbar

class HTTPSFirstModeTest : TestSetup() {
    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    @Test
    fun httpsFirstModeImplicitSchemeTest() {
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("permission.site".toUri()) {
            verifyPageContent("permission.site")
        }.openSearch {
            verifyTypedToolbarText("https://permission.site/", exists = true)
        }
    }

    @Test
    fun httpsFirstModeExplicitSchemeTest() {
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("http://permission.site".toUri()) {
            verifyPageContent("permission.site")
        }.openSearch {
            verifyTypedToolbarText("http://permission.site/", exists = true)
        }.dismissSearchBar {
        }

        // Exception should persist
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("permission.site".toUri()) {
            verifyPageContent("permission.site")
        }.openSearch {
            verifyTypedToolbarText("http://permission.site/", exists = true)
        }
    }
}
