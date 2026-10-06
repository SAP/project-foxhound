/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.helpers

import android.os.Build
import org.junit.rules.ExternalResource
import org.mozilla.focus.helpers.TestHelper.allowOrPreventSystemUIFromReadingTheClipboard
import org.mozilla.focus.helpers.TestHelper.mDevice

/**
 * A JUnit [ExternalResource] that performs the standard Focus test environment setup:
 * clipboard access prevention and status bar collapse.
 *
 * Intended to be composed inside [FocusTestRule] rather than used directly.
 */
class TestSetupRule : ExternalResource() {

    override fun before() {
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            allowOrPreventSystemUIFromReadingTheClipboard(allowToReadClipboard = false)
        }
        // Closes the notification tray if it's open, otherwise it's a no-op.
        mDevice.executeShellCommand("cmd statusbar collapse")
    }
}
