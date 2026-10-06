/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.helpers

import android.Manifest
import android.os.Build
import androidx.test.rule.GrantPermissionRule
import mozilla.components.support.android.test.rules.MockWebServerRule
import org.junit.rules.RuleChain
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

/**
 * A composite JUnit [TestRule] that bundles the standard Focus test prerequisites:
 * notification permission grant, environment setup, and mock web server lifecycle.
 *
 * Declare it as the outermost rule in each test class:
 * ```
 * @get:Rule(order = 0)
 * val focusTestRule = FocusTestRule()
 * ```
 */
class FocusTestRule : TestRule {

    val testSetupRule = TestSetupRule()
    val mockWebServerRule = MockWebServerRule()

    override fun apply(base: Statement, description: Description): Statement =
        RuleChain
            .outerRule(
                if (Build.VERSION.SDK_INT >= 33) {
                    GrantPermissionRule.grant(
                        Manifest.permission.POST_NOTIFICATIONS,
                    )
                } else {
                    GrantPermissionRule.grant()
                },
            )
            .around(testSetupRule)
            .around(mockWebServerRule)
            .apply(base, description)
}
