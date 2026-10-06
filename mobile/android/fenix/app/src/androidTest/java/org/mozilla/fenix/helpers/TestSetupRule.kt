/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import android.os.Build
import android.util.Log
import kotlinx.coroutines.runBlocking
import mozilla.components.browser.state.store.BrowserStore
import org.junit.rules.ExternalResource
import org.mozilla.fenix.BuildConfig
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.helpers.AppAndSystemHelper.allowOrPreventSystemUIFromReadingTheClipboard
import org.mozilla.fenix.helpers.AppAndSystemHelper.clearDownloadsFolder
import org.mozilla.fenix.helpers.AppAndSystemHelper.deleteBookmarksStorage
import org.mozilla.fenix.helpers.AppAndSystemHelper.deleteHistoryStorage
import org.mozilla.fenix.helpers.AppAndSystemHelper.deletePermissionsStorage
import org.mozilla.fenix.helpers.AppAndSystemHelper.disableDebugDrawer
import org.mozilla.fenix.helpers.AppAndSystemHelper.enableDataSaverSystemSetting
import org.mozilla.fenix.helpers.AppAndSystemHelper.enableOrDisableBackGestureNavigationOnDevice
import org.mozilla.fenix.helpers.AppAndSystemHelper.runWithCondition
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.NetworkConnectionStatusHelper.getNetworkDetails
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.setPortraitDisplayOrientation
import org.mozilla.fenix.ui.robots.notificationShade

/**
 * A JUnit [ExternalResource] that performs the standard Fenix test environment setup and
 * teardown: device orientation, storage cleanup, notification dismissal, and browser state
 * initialization.
 *
 * Intended to be used alongside [MockWebServerRule][mozilla.components.support.android.test.rules.MockWebServerRule] and a [androidx.test.rule.GrantPermissionRule].
 */
class TestSetupRule : ExternalResource() {

    lateinit var browserStore: BrowserStore
        private set

    override fun before() {
        Log.i(TAG, "TestSetupRule: Starting before()")

        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            allowOrPreventSystemUIFromReadingTheClipboard(allowToReadClipboard = false)
        }

        enableOrDisableBackGestureNavigationOnDevice(backGestureNavigationEnabled = true)

        setPortraitDisplayOrientation()

        runBlocking {
            // Check and clear the downloads folder, in case the after() method is not executed.
            // This will only work in case of a RetryTestRule execution.
            clearDownloadsFolder()

            // Currently disabled due to network connection problems encountered on Firebase
            // despite having all UI tests that interact with network connection settings disabled
            // AppAndSystemHelper.setNetworkEnabled(true)

            enableDataSaverSystemSetting(enabled = false)
            // Clear bookmarks left after a failed test, before a retry.
            deleteBookmarksStorage()
            // Clear history left after a failed test, before a retry.
            deleteHistoryStorage()
            // Clear permissions left after a failed test, before a retry.
            deletePermissionsStorage()
            disableDebugDrawer()
            runWithCondition(BuildConfig.DEBUG) {
                getNetworkDetails()
            }
        }

        Log.i(TAG, "TestSetupRule: Initializing browserStore")
        browserStore = TestHelper.appContext.components.core.store
        Log.i(TAG, "TestSetupRule: browserStore initialized")

        notificationShade {
            cancelAllShownNotifications()
            Log.i(TAG, "TestSetupRule: Closing notification tray")
            mDevice.executeShellCommand("cmd statusbar collapse")
        }
    }

    override fun after() {
        Log.i(TAG, "TestSetupRule: Starting after()")
        runBlocking {
            clearDownloadsFolder()
        }
        runWithCondition(BuildConfig.DEBUG) {
            getNetworkDetails()
        }
    }
}
