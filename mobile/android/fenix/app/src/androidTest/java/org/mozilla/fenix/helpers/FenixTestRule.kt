/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import android.Manifest
import android.os.Build
import androidx.test.rule.GrantPermissionRule
import mockwebserver3.MockWebServer
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.android.test.rules.MockWebServerRule
import org.junit.rules.RuleChain
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

/**
 * A composite JUnit [TestRule] that bundles the standard Fenix test prerequisites:
 * notification permission grant, environment setup, and mock web server lifecycle.
 *
 * Declare it as the outermost rule in each test class:
 * ```
 * @get:Rule(order = 0)
 * val fenixTestRule = FenixTestRule()
 * ```
 */
class FenixTestRule(private val grantNotifications: Boolean = true) : TestRule {

    val testSetupRule = TestSetupRule()
    val mockWebServerRule = MockWebServerRule()

    val mockWebServer: MockWebServer get() = mockWebServerRule.server
    val browserStore: BrowserStore get() = testSetupRule.browserStore

    override fun apply(base: Statement, description: Description): Statement {
        val permissionRule = if (grantNotifications && Build.VERSION.SDK_INT >= 33) {
            GrantPermissionRule.grant(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            GrantPermissionRule.grant()
        }

        return RuleChain
            .outerRule(permissionRule)
            .around(testSetupRule)
            .around(mockWebServerRule)
            .apply(base, description)
    }
}
