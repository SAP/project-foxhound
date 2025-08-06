/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
@file:Suppress("DEPRECATION")

package org.mozilla.fenix.helpers

import android.Manifest
import android.app.ActivityManager
import android.app.LocaleManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.LocaleList
import android.os.storage.StorageManager
import android.os.storage.StorageVolume
import android.provider.Settings
import android.util.Log
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.Espresso
import androidx.test.espresso.IdlingRegistry
import androidx.test.espresso.IdlingResource
import androidx.test.espresso.intent.Intents.intended
import androidx.test.espresso.intent.matcher.IntentMatchers.toPackage
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.ActivityTestRule
import androidx.test.runner.permission.PermissionRequester
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiObject
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import junit.framework.AssertionFailedError
import kotlinx.coroutines.runBlocking
import mozilla.appservices.places.BookmarkRoot
import mozilla.components.browser.storage.sync.PlacesBookmarksStorage
import mozilla.components.browser.storage.sync.PlacesHistoryStorage
import mozilla.components.support.locale.LocaleManager.resetToSystemDefault
import mozilla.components.support.locale.LocaleManager.setNewLocale
import org.junit.Assert
import org.junit.Assert.assertEquals
import org.mozilla.fenix.Config
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.components.PermissionStorage
import org.mozilla.fenix.customtabs.ExternalAppBrowserActivity
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.helpers.Constants.PackageName.PIXEL_LAUNCHER
import org.mozilla.fenix.helpers.Constants.PackageName.YOUTUBE_APP
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdContainingText
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeShort
import org.mozilla.fenix.helpers.TestHelper.appContext
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.ext.waitNotNull
import org.mozilla.fenix.helpers.idlingresource.NetworkConnectionIdlingResource
import org.mozilla.fenix.ui.robots.BrowserRobot
import org.mozilla.gecko.util.ThreadUtils
import java.io.File
import java.util.Locale
import java.util.regex.Pattern

object AppAndSystemHelper {

    private val bookmarksStorage = PlacesBookmarksStorage(appContext.applicationContext)
    suspend fun bookmarks() = bookmarksStorage.getTree(BookmarkRoot.Mobile.id)?.children
    fun getPermissionAllowID(): String {
        Log.i(TAG, "getPermissionAllowID: Trying to get the permission button resource ID based on API.")
        return when
            (Build.VERSION.SDK_INT > Build.VERSION_CODES.P) {
            true -> {
                Log.i(TAG, "getPermissionAllowID: Getting the permission button resource ID for API ${Build.VERSION.SDK_INT}.")
                "com.android.permissioncontroller"
            }
            false -> {
                Log.i(TAG, "getPermissionAllowID: Getting the permission button resource ID for API ${Build.VERSION.SDK_INT}.")
                "com.android.packageinstaller"
            }
        }
    }

    /**
     * Checks if a specific download file is inside the device storage and deletes it.
     * Different implementation needed for newer API levels,
     * as Environment.getExternalStorageDirectory() is deprecated starting with API 29.
     *
     */
    fun deleteDownloadedFileOnStorage(fileName: String) {
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.Q) {
            Log.i(TAG, "deleteDownloadedFileOnStorage: Trying to delete file from API ${Build.VERSION.SDK_INT}.")
            val storageManager: StorageManager? =
                appContext.getSystemService(Context.STORAGE_SERVICE) as StorageManager?
            val storageVolumes = storageManager!!.storageVolumes
            val storageVolume: StorageVolume = storageVolumes[0]
            val file = File(storageVolume.directory!!.path + "/Download/" + fileName)
            try {
                if (file.exists()) {
                    Log.i(TAG, "deleteDownloadedFileOnStorage: The file exists. Trying to delete $fileName, try 1.")
                    file.delete()
                    Assert.assertFalse("$TAG deleteDownloadedFileOnStorage: The $fileName file was not deleted", file.exists())
                    Log.i(TAG, "deleteDownloadedFileOnStorage: Verified the $fileName file was deleted.")
                }
            } catch (e: AssertionError) {
                Log.i(TAG, "deleteDownloadedFileOnStorage: AssertionError caught.  Retrying to delete the file.")
                file.delete()
                Log.i(TAG, "deleteDownloadedFileOnStorage: Retrying to delete $fileName.")
                Assert.assertFalse("$TAG deleteDownloadedFileOnStorage: The file was not deleted", file.exists())
                Log.i(TAG, "deleteDownloadedFileOnStorage: Verified the $fileName file was deleted, try 2.")
            }
        } else {
            runBlocking {
                Log.i(TAG, "deleteDownloadedFileOnStorage: Trying to delete file from API ${Build.VERSION.SDK_INT}.")
                val downloadedFile = File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    fileName,
                )

                if (downloadedFile.exists()) {
                    Log.i(TAG, "deleteDownloadedFileOnStorage: The file exists. Trying to delete the file.")
                    downloadedFile.delete()
                    Log.i(TAG, "deleteDownloadedFileOnStorage: $downloadedFile deleted.")
                }
            }
        }
    }

    /**
     * Checks if there are download files inside the device storage and deletes all of them.
     * Different implementation needed for newer API levels, as
     * Environment.getExternalStorageDirectory() is deprecated starting with API 29.
     */
    fun clearDownloadsFolder() {
        Log.i(TAG, "clearDownloadsFolder: Detected API ${Build.VERSION.SDK_INT}")
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.Q) {
            val storageManager: StorageManager? =
                appContext.getSystemService(Context.STORAGE_SERVICE) as StorageManager?
            val storageVolumes = storageManager!!.storageVolumes
            val storageVolume: StorageVolume = storageVolumes[0]
            val downloadsFolder = File(storageVolume.directory!!.path + "/Download/")

            // Check if the downloads folder exists
            if (downloadsFolder.exists() && downloadsFolder.isDirectory) {
                Log.i(TAG, "clearDownloadsFolder: Verified that \"DOWNLOADS\" folder exists.")
                var files = downloadsFolder.listFiles()

                // Check if the folder is not empty
                if (files != null && files.isNotEmpty()) {
                    Log.i(
                        TAG,
                        "clearDownloadsFolder: Before cleanup: Downloads storage contains: ${files.size} file(s).",
                    )
                    // Delete all files in the folder
                    for (file in files!!) {
                        Log.i(
                            TAG,
                            "clearDownloadsFolder: Trying to delete $file from \"DOWNLOADS\" folder.",
                        )
                        file.delete()
                        Log.i(
                            TAG,
                            "clearDownloadsFolder: Deleted $file from \"DOWNLOADS\" folder.",
                        )
                        files = downloadsFolder.listFiles()
                        Log.i(
                            TAG,
                            "clearDownloadsFolder: After cleanup: Downloads storage contains: ${files?.size} file(s).",
                        )
                    }
                } else {
                    Log.i(
                        TAG,
                        "clearDownloadsFolder: Downloads storage is empty.",
                    )
                }
            }
        } else {
            runBlocking {
                Log.i(TAG, "clearDownloadsFolder: Verifying if any download files exist.")
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    .listFiles()?.forEach {
                        Log.i(TAG, "clearDownloadsFolder: Trying to delete from storage: $it.")
                        it.delete()
                        Log.i(TAG, "clearDownloadsFolder: Download file $it deleted.")
                    }
            }
        }
    }

    suspend fun deleteHistoryStorage() {
        val historyStorage = PlacesHistoryStorage(appContext.applicationContext)
        Log.i(
            TAG,
            "deleteHistoryStorage before cleanup: History storage contains: ${historyStorage.getVisited()}",
        )
        if (historyStorage.getVisited().isNotEmpty()) {
            Log.i(TAG, "deleteHistoryStorage: Trying to delete all history storage.")
            historyStorage.deleteEverything()
            Log.i(
                TAG,
                "deleteHistoryStorage after cleanup: History storage contains: ${historyStorage.getVisited()}",
            )
        }
    }

    suspend fun deleteBookmarksStorage() {
        val bookmarks = bookmarks()
        Log.i(TAG, "deleteBookmarksStorage before cleanup: Bookmarks storage contains: $bookmarks")
        if (bookmarks?.isNotEmpty() == true) {
            bookmarks.forEach {
                Log.i(
                    TAG,
                    "deleteBookmarksStorage: Trying to delete $it bookmark from storage.",
                )
                bookmarksStorage.deleteNode(it.guid)
                Log.i(
                    TAG,
                    "deleteBookmarksStorage: Bookmark deleted. Bookmarks storage contains: ${bookmarks()}",
                )
            }
        }
    }

    suspend fun deletePermissionsStorage() {
        val permissionStorage = PermissionStorage(appContext.applicationContext)
        Log.i(
            TAG,
            "deletePermissionsStorage: Trying to delete permissions. Permissions storage contains: ${permissionStorage.getSitePermissionsPaged()}",
        )
        permissionStorage.deleteAllSitePermissions()
        Log.i(
            TAG,
            "deletePermissionsStorage: Permissions deleted. Permissions storage contains: ${permissionStorage.getSitePermissionsPaged()}",
        )
    }

    fun setNetworkEnabled(enabled: Boolean) {
        val networkDisconnectedIdlingResource = NetworkConnectionIdlingResource(false)
        val networkConnectedIdlingResource = NetworkConnectionIdlingResource(true)

        when (enabled) {
            true -> {
                Log.i(
                    TAG,
                    "setNetworkEnabled: Trying to enable the network connection.",
                )
                mDevice.executeShellCommand("svc data enable")
                Log.i(
                    TAG,
                    "setNetworkEnabled: Data network connection enable command sent.",
                )
                mDevice.executeShellCommand("svc wifi enable")
                Log.i(
                    TAG,
                    "setNetworkEnabled: Wifi network connection enable command sent.",
                )

                // Wait for network connection to be completely enabled
                Log.i(TAG, "setNetworkEnabled: Waiting for connection to be enabled.")
                IdlingRegistry.getInstance().register(networkConnectedIdlingResource)
                Espresso.onIdle {
                    IdlingRegistry.getInstance().unregister(networkConnectedIdlingResource)
                }
                Log.i(TAG, "setNetworkEnabled: Network connection was enabled.")
            }

            false -> {
                Log.i(
                    TAG,
                    "setNetworkEnabled: Trying to disable the network connection.",
                )
                mDevice.executeShellCommand("svc data disable")
                Log.i(
                    TAG,
                    "setNetworkEnabled: Data network connection disable command sent.",
                )
                mDevice.executeShellCommand("svc wifi disable")
                Log.i(
                    TAG,
                    "setNetworkEnabled: Wifi network connection disable command sent.",
                )

                // Wait for network connection to be completely disabled
                Log.i(TAG, "setNetworkEnabled: Waiting for connection to be disabled.")
                IdlingRegistry.getInstance().register(networkDisconnectedIdlingResource)
                Espresso.onIdle {
                    IdlingRegistry.getInstance().unregister(networkDisconnectedIdlingResource)
                }
                Log.i(TAG, "setNetworkEnabled: Network connection was disabled.")
            }
        }
    }

    fun isPackageInstalled(packageName: String): Boolean {
        Log.i(TAG, "isPackageInstalled: Trying to verify that $packageName is installed")
        return try {
            val packageManager = InstrumentationRegistry.getInstrumentation().context.packageManager
            packageManager.getApplicationInfo(packageName, 0).enabled
            Log.i(TAG, "isPackageInstalled: $packageName is installed.")
            true
        } catch (e: PackageManager.NameNotFoundException) {
            Log.i(TAG, "isPackageInstalled: $packageName is not installed - ${e.message}")
            false
        }
    }

    fun assertAppWithPackageNameOpens(appPackageName: String) {
        if (isPackageInstalled(appPackageName)) {
            try {
                Log.i(TAG, "assertAppWithPackageNameOpens: Trying to check the intent sent.")
                intended(toPackage(appPackageName))
                Log.i(TAG, "assertAppWithPackageNameOpens: Matched open intent to $appPackageName.")
            } catch (e: AssertionFailedError) {
                Log.i(TAG, "assertAppWithPackageNameOpens: Intent match failure. ${e.message}")
            } finally {
                if (appPackageName != packageName) {
                    // Stop the app from running in the background
                    forceCloseApp(appPackageName)
                }
            }
        } else {
            Log.i(TAG, "assertAppWithPackageNameOpens: Trying to verify the \"Could not open file\" message.")
            mDevice.waitNotNull(
                Until.findObject(By.text("Could not open file")),
                waitingTime,
            )
            Log.i(TAG, "assertAppWithPackageNameOpens: Verified \"Could not open file\" message")
        }
    }

    fun assertNativeAppOpens(appPackageName: String, url: String = "") {
        if (isPackageInstalled(appPackageName)) {
            Log.i(TAG, "assertNativeAppOpens: Waiting for the device to be idle $waitingTimeShort ms.")
            mDevice.waitForIdle(waitingTimeShort)
            Log.i(TAG, "assertNativeAppOpens: Waited for the device to be idle $waitingTimeShort ms.")
            Log.i(TAG, "assertNativeAppOpens: Trying to match the app package name is matched.")
            Assert.assertTrue(
                "$TAG $appPackageName not found",
                mDevice.findObject(UiSelector().packageName(appPackageName))
                    .waitForExists(waitingTime),
            )
            Log.i(TAG, "assertNativeAppOpens: App package name matched.")

            // Stop the app from running in the background
            forceCloseApp(appPackageName)
        } else {
            Log.i(TAG, "assertNativeAppOpens: Trying to verify the page redirect URL.")
            BrowserRobot().verifyUrl(url)
            Log.i(TAG, "assertNativeAppOpens: Verified the page redirect URL.")
        }
    }

    fun assertYoutubeAppOpens() {
        Log.i(TAG, "assertYoutubeAppOpens: Trying to check the intent to YouTube.")
        intended(toPackage(YOUTUBE_APP))
        Log.i(TAG, "assertYoutubeAppOpens: Verified the intent matches YouTube.")

        // Stop the app from running in the background
        forceCloseApp(YOUTUBE_APP)
    }

    /**
     * Force stops the app from running in the background.
     *
     * @param appPackageName The package name of the app to be stopped.
     */
    fun forceCloseApp(appPackageName: String) {
        Log.i(TAG, "forceCloseApp: Trying to stop the $appPackageName app from running in the background.")
        mDevice.executeShellCommand("am force-stop $appPackageName")
        Log.i(TAG, "forceCloseApp: Force-stopped the $appPackageName app.")
    }

    /**
     * Checks whether the latest activity of the application is used for custom tabs or PWAs.
     *
     * @return Boolean value that helps us know if the current activity supports custom tabs or PWAs.
     */
    fun isExternalAppBrowserActivityInCurrentTask(): Boolean {
        val activityManager = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager

        Log.i(TAG, "isExternalAppBrowserActivityInCurrentTask: Waiting for the device to be idle for $waitingTimeShort ms")
        mDevice.waitForIdle(waitingTimeShort)
        Log.i(TAG, "isExternalAppBrowserActivityInCurrentTask: Waited for the device to be idle for $waitingTimeShort ms")

        Log.i(
            TAG,
            "isExternalAppBrowserActivityInCurrentTask: Trying to verify that the latest activity of the application is used for custom tabs or PWAs",
        )
        return activityManager.appTasks[0].taskInfo.topActivity!!.className == ExternalAppBrowserActivity::class.java.name
    }

    /**
     * Run test with automatically registering idling resources and cleanup.
     *
     * @param idlingResources zero or more [IdlingResource] to be used when running [testBlock].
     * @param testBlock test code to execute.
     */
    fun registerAndCleanupIdlingResources(
        vararg idlingResources: IdlingResource,
        testBlock: () -> Unit,
    ) {
        idlingResources.forEach {
            Log.i(TAG, "registerAndCleanupIdlingResources: Trying to register idling resource $it.")
            IdlingRegistry.getInstance().register(it)
            Log.i(TAG, "registerAndCleanupIdlingResources: Registered idling resource $it.")
        }

        try {
            testBlock()
        } finally {
            idlingResources.forEach {
                Log.i(TAG, "registerAndCleanupIdlingResources: Trying to unregister idling resource $it.")
                IdlingRegistry.getInstance().unregister(it)
                Log.i(TAG, "registerAndCleanupIdlingResources: Unregistered idling resource $it.")
            }
        }
    }

    // Permission allow dialogs differ on various Android APIs
    fun grantSystemPermission() {
        val whileUsingTheAppPermissionButton: UiObject =
            mDevice.findObject(UiSelector().textContains("While using the app"))

        val allowPermissionButton: UiObject =
            mDevice.findObject(
                UiSelector()
                    .textContains("Allow")
                    .className("android.widget.Button"),
            )

        if (Build.VERSION.SDK_INT >= 23) {
            if (whileUsingTheAppPermissionButton.waitForExists(waitingTimeShort)) {
                Log.i(TAG, "grantSystemPermission: Trying to click the \"While using the app\" button.")
                whileUsingTheAppPermissionButton.click()
                Log.i(TAG, "grantSystemPermission: Clicked the \"While using the app\" button.")
            } else if (allowPermissionButton.waitForExists(waitingTimeShort)) {
                Log.i(TAG, "grantSystemPermission: Trying to click the \"Allow\" button.")
                allowPermissionButton.click()
                Log.i(TAG, "grantSystemPermission: Clicked the \"Allow\" button.")
            }
        }
    }

    // Permission deny dialogs differ on various Android APIs
    fun denyPermission() {
        Log.i(TAG, "denyPermission: Waiting $waitingTime ms for the negative camera system permission button to exist.")
        itemWithResId("com.android.permissioncontroller:id/permission_deny_button").waitForExists(waitingTime)
        Log.i(TAG, "denyPermission: Waited for $waitingTime ms for the negative camera system permission button to exist.")
        Log.i(TAG, "denyPermission: Trying to click the negative camera system permission button.")
        itemWithResId("com.android.permissioncontroller:id/permission_deny_button").click()
        Log.i(TAG, "denyPermission: Clicked the negative camera system permission button.")
    }

    fun clickSystemHomeScreenShortcutAddButton() {
        when (Build.VERSION.SDK_INT) {
            in Build.VERSION_CODES.O..Build.VERSION_CODES.R -> clickAddAutomaticallyButton()
            in Build.VERSION_CODES.S..Build.VERSION_CODES.UPSIDE_DOWN_CAKE -> clickAddToHomeScreenButton()
        }
    }

    fun clickAddAutomaticallyButton() {
        Log.i(TAG, "clickAddAutomaticallyButton: Waiting for $waitingTime ms until finding \"Add automatically\" system dialog button")
        mDevice.wait(
            Until.findObject(
                By.text(
                    Pattern.compile("Add Automatically", Pattern.CASE_INSENSITIVE),
                ),
            ),
            waitingTime,
        )
        Log.i(TAG, "clickAddAutomaticallyButton: Waited for $waitingTime ms until \"Add automatically\" system dialog button was found")
        Log.i(TAG, "clickAddAutomaticallyButton: Trying to click \"Add automatically\" system dialog button")
        itemContainingText("add automatically").click()
        Log.i(TAG, "clickAddAutomaticallyButton: Clicked \"Add automatically\" system dialog button")
    }

    fun clickAddToHomeScreenButton() {
        Log.i(TAG, "clickAddToHomeScreenButton: Waiting for $waitingTime ms for the \"Add to home screen\" system dialog button to exist")
        itemContainingText("Add to home screen").waitForExists(waitingTime)
        Log.i(TAG, "clickAddToHomeScreenButton: Waited for $waitingTime ms for the \"Add to home screen\" system dialog button to exist")
        Log.i(TAG, "clickAddToHomeScreenButton: Trying to click the \"Add to home screen\" system dialog button and wait for $waitingTimeShort ms for a new window")
        itemContainingText("Add to home screen").clickAndWaitForNewWindow(waitingTimeShort)
        Log.i(TAG, "clickAddToHomeScreenButton: Clicked the \"Add to home screen\" system dialog button and wait for $waitingTimeShort ms for a new window")
    }

    fun isTestLab(): Boolean {
        return Settings.System.getString(TestHelper.appContext.contentResolver, "firebase.test.lab").toBoolean()
    }

    /**
     * Changes the default language of the entire device, not just the app.
     * Runs the test in its testBlock.
     * Cleans up and sets the default locale after it's done.
     */
    fun runWithSystemLocaleChanged(locale: Locale, testRule: ActivityTestRule<HomeActivity>, testBlock: () -> Unit) {
        val defaultLocale = Locale.getDefault()
        Log.i(TAG, "runWithSystemLocaleChanged: Storing the default locale $defaultLocale.")

        try {
            Log.i(TAG, "runWithSystemLocaleChanged: Trying to set the locale.")
            setSystemLocale(locale)
            // We need to recreate the activity to apply the new locale
            Log.i(TAG, "runWithSystemLocaleChanged: Recreating the activity to apply the new locale.")
            ThreadUtils.runOnUiThread { testRule.activity.recreate() }
            Log.i(TAG, "runWithSystemLocaleChanged: Running the test block.")
            testBlock()
            Log.i(TAG, "runWithSystemLocaleChanged: Test block finished.")
        } catch (e: Exception) {
            Log.i(TAG, "runWithSystemLocaleChanged: The test block has thrown an exception.${e.message}")
            e.printStackTrace()
            throw e
        } finally {
            Log.i(TAG, "runWithSystemLocaleChanged final block: Trying to reset the locale to default $defaultLocale.")
            setSystemLocale(defaultLocale)
            // We need to recreate the activity to apply the new locale
            Log.i(TAG, "runWithSystemLocaleChanged final block: Recreating the activity to apply the new locale.")
            ThreadUtils.runOnUiThread { testRule.activity.recreate() }
            Log.i(TAG, "runWithSystemLocaleChanged final block: Locale set back to default $defaultLocale.")
        }
    }

    /**
     * Changes the default language of the system, not just the app.
     * We can only use this if we're running on a debug build, otherwise it will change the permission manifests in release builds.
     */
    private fun setSystemLocale(locale: Locale) {
        if (Config.channel.isDebug) {
            /* Sets permission to change device language */
            Log.i(
                TAG,
                "setSystemLocale: Requesting permission to change system locale to $locale.",
            )
            PermissionRequester().apply {
                addPermissions(
                    Manifest.permission.CHANGE_CONFIGURATION,
                )
                requestPermissions()
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Log.i(
                    TAG,
                    "setSystemLocale: Trying to change system locale to $locale on API ${Build.VERSION.SDK_INT}.",
                )

                val localeManager = appContext.getSystemService(Context.LOCALE_SERVICE) as LocaleManager
                localeManager.applicationLocales = LocaleList(locale)
            } else {
                Log.i(
                    TAG,
                    "setSystemLocale: Trying to change system locale to $locale on API ${Build.VERSION.SDK_INT}.",
                )
                val activityManagerNative = Class.forName("android.app.ActivityManagerNative")
                val am = activityManagerNative.getMethod("getDefault", *arrayOfNulls(0))
                    .invoke(activityManagerNative, *arrayOfNulls(0))
                val config =
                    InstrumentationRegistry.getInstrumentation().context.resources.configuration
                config.javaClass.getDeclaredField("locale")[config] = locale
                config.javaClass.getDeclaredField("userSetLocale").setBoolean(config, true)
                am.javaClass.getMethod(
                    "updateConfiguration",
                    Configuration::class.java,
                ).invoke(am, config)
            }
            Log.i(
                TAG,
                "setSystemLocale: Changed system locale to $locale.",
            )
        }
    }

    /**
     * Changes the app language, different then the system default.
     * Runs the test in its testBlock.
     * Cleans up and sets the system locale after it's done.
     */
    fun runWithAppLocaleChanged(locale: Locale, testRule: ActivityTestRule<HomeActivity>, testBlock: () -> Unit) {
        val localeUseCases = appContext.components.useCases.localeUseCases
        val defaultLocale = Locale.getDefault()
        Log.i(TAG, "runWithSystemLocaleChanged: Storing the system default locale $defaultLocale.")

        try {
            Log.i(TAG, "runWithAppLocaleChanged: Trying to set the locale to $locale.")
            setNewLocale(appContext, localeUseCases, locale)
            // We need to recreate the activity to apply the new locale
            Log.i(TAG, "runWithAppLocaleChanged: Recreating the activity to apply the new locale.")
            ThreadUtils.runOnUiThread { testRule.activity.recreate() }
            Log.i(TAG, "runWithAppLocaleChanged: Running the test block.")
            testBlock()
            Log.i(TAG, "runWithAppLocaleChanged: Test block finished.")
        } catch (e: Exception) {
            Log.i(TAG, "runWithAppLocaleChanged: The test block has thrown an exception.${e.message}")
            e.printStackTrace()
            throw e
        } finally {
            Log.i(TAG, "runWithAppLocaleChanged final block: Trying to reset the locale to system default $defaultLocale.")
            resetToSystemDefault(appContext, appContext.components.useCases.localeUseCases)
            Log.i(TAG, "runWithAppLocaleChanged finally block: Recreating the activity to apply the new locale.")
            ThreadUtils.runOnUiThread { testRule.activity.recreate() }
            Log.i(TAG, "runWithAppLocaleChanged final block: Locale reset to system default $defaultLocale.")
        }
    }

    fun putAppToBackground() {
        Log.i(TAG, "putAppToBackground: Trying to press the device Recent apps button.")
        mDevice.pressRecentApps()
        Log.i(TAG, "putAppToBackground: Pressed the device Recent apps button.")
        Log.i(TAG, "putAppToBackground: Waiting for the app to be gone for $waitingTime ms.")
        mDevice.findObject(UiSelector().resourceId("${TestHelper.packageName}:id/container")).waitUntilGone(
            waitingTime,
        )
        Log.i(TAG, "putAppToBackground: Waited for the app to be gone for $waitingTime ms.")
        Log.i(TAG, "putAppToBackground: Trying to press device home button")
        mDevice.pressHome()
        Log.i(TAG, "putAppToBackground: Pressed the device home button")
    }

    /**
     * Brings the app to foregorund by clicking it in the recent apps tray.
     * The package name is related to the home screen experience for the Pixel phones produced by Google.
     * The recent apps tray on API 30 will always display only 2 apps, even if previously were opened more.
     * The index of the most recent opened app will always have index 2, meaning that the previously opened app will have index 1.
     */
    fun bringAppToForeground() {
        Log.i(TAG, "bringAppToForeground: Trying to press the device Recent apps button.")
        mDevice.pressRecentApps()
        Log.i(TAG, "bringAppToForeground: Pressed the device Recent apps button.")
        Log.i(TAG, "bringAppToForeground: Trying to select the app from the recent apps tray and wait for $waitingTime ms for a new window")
        mDevice.findObject(UiSelector().index(2).packageName(PIXEL_LAUNCHER))
            .clickAndWaitForNewWindow(waitingTimeShort)
        Log.i(TAG, "bringAppToForeground: Selected the app from the recent apps tray.")
        Log.i(TAG, "bringAppToForeground: Waiting for $waitingTime ms for $packageName window to be updated")
        mDevice.waitForWindowUpdate(packageName, waitingTime)
        Log.i(TAG, "bringAppToForeground: Waited for $waitingTime ms for $packageName window to be updated")
    }

    fun verifyKeyboardVisibility(isExpectedToBeVisible: Boolean = true) {
        Log.i(TAG, "verifyKeyboardVisibility: Waiting for the device to be idle.")
        mDevice.waitForIdle()
        Log.i(TAG, "verifyKeyboardVisibility: Waited for the device to be idle.")

        Log.i(TAG, "verifyKeyboardVisibility: Trying to verify the keyboard is visible.")
        assertEquals(
            "Keyboard not shown",
            isExpectedToBeVisible,
            mDevice
                .executeShellCommand("dumpsys input_method | grep mInputShown")
                .contains("mInputShown=true"),
        )
        Log.i(TAG, "verifyKeyboardVisibility: Verified the keyboard is visible.")
    }

    fun openAppFromExternalLink(url: String) {
        val context = InstrumentationRegistry.getInstrumentation().getTargetContext()
        val intent = Intent().apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(url)
            `package` = TestHelper.packageName
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        try {
            Log.i(TAG, "openAppFromExternalLink: Trying to start the activity from an external intent.")
            context.startActivity(intent)
            Log.i(TAG, "openAppFromExternalLink: Activity started from an external intent.")
        } catch (ex: ActivityNotFoundException) {
            Log.i(TAG, "openAppFromExternalLink: Exception caught. Trying to start the activity from a null intent.")
            intent.setPackage(null)
            context.startActivity(intent)
            Log.i(TAG, "openAppFromExternalLink: Started the activity from a null intent.")
        }
    }

    /**
     * Wrapper for tests to run only when certain conditions are met.
     * For example: this method will avoid accidentally running a test on GV versions where the feature is disabled.
     */
    fun runWithCondition(condition: Boolean, testBlock: () -> Unit) {
        Log.i(TAG, "runWithCondition: Trying to run the test based on condition. The condition is: $condition.")
        if (condition) {
            Log.i(TAG, "runWithCondition: The condition was true. Running the test.")
            testBlock()
        } else {
            Log.i(TAG, "runWithCondition: The condition was false. Skipping the test.")
        }
    }

    /**
     * Wrapper to launch the app using the launcher intent.
     */
    fun runWithLauncherIntent(
        activityTestRule: AndroidComposeTestRule<HomeActivityIntentTestRule, HomeActivity>,
        testBlock: () -> Unit,
    ) {
        val launcherIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        Log.i(TAG, "runWithLauncherIntent: Trying to launch the activity from an intent: $launcherIntent.")
        activityTestRule.activityRule.withIntent(launcherIntent).launchActivity(launcherIntent)
        Log.i(TAG, "runWithLauncherIntent: Launched the activity from an intent: $launcherIntent.")
        try {
            Log.i(TAG, "runWithLauncherIntent: Trying run the test block.")
            testBlock()
            Log.i(TAG, "runWithLauncherIntent: Finished running the test block.")
        } catch (e: Exception) {
            Log.i(TAG, "runWithLauncherIntent: Exception caught while running the test block: ${e.message}")
            e.printStackTrace()
        }
    }

    fun dismissSetAsDefaultBrowserOnboardingDialog() {
        Log.i(TAG, "dismissSetAsDefaultBrowserOnboardingDialog: Detected API ${Build.VERSION.SDK_INT}")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            Log.i(TAG, "dismissSetAsDefaulltBrowserOnboardingDialog: Trying to click the \"Cancel\" dialog button.")
            itemWithResIdContainingText("android:id/button2", "Cancel").click()
            Log.i(TAG, "dismissSetAsDefaulltBrowserOnboardingDialog: Clicked the \"Cancel\" dialog button.")
        }
    }

    // Prevent or allow the System UI from reading the clipboard content
    // By preventing, the quick share or nearby share dialog will not be displayed
    fun allowOrPreventSystemUIFromReadingTheClipboard(allowToReadClipboard: Boolean) {
        if (allowToReadClipboard) {
            Log.i(TAG, "allowOrPreventSystemUIFromReadingTheClipboard: Trying to allow the System UI from reading the clipboard content")
            mDevice.executeShellCommand("appops set com.android.systemui READ_CLIPBOARD allow")
            Log.i(TAG, "TestSetup: Successfully allowed the System UI from reading the clipboard content")
        } else {
            Log.i(TAG, "allowOrPreventSystemUIFromReadingTheClipboard: Trying to prevent the System UI from reading the clipboard content")
            mDevice.executeShellCommand("appops set com.android.systemui READ_CLIPBOARD deny")
            Log.i(TAG, "TestSetup: Successfully prevented the System UI from reading the clipboard content")
        }
    }

    // Enable or disable the back gesture from the edge of the screen on the device.
    fun enableOrDisableBackGestureNavigationOnDevice(backGestureNavigationEnabled: Boolean) {
        if (backGestureNavigationEnabled) {
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Trying to enable the back gesture navigation from the right edge of the screen on the device")
            mDevice.executeShellCommand("settings put secure back_gesture_inset_scale_right 1")
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Successfully enabled the back gesture navigation from the right edge of the screen on the device")
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Trying to enable the back gesture navigation from the left edge of the screen on the device")
            mDevice.executeShellCommand("settings put secure back_gesture_inset_scale_left 1")
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Successfully enabled the back gesture navigation from the left edge of the screen on the device on the device")
        } else {
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Trying to disable the back gesture navigation from the right edge of the screen on the device")
            mDevice.executeShellCommand("settings put secure back_gesture_inset_scale_right 0")
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Successfully disabled the back gesture navigation from the right edge of the screen on the device")
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Trying to disable the back gesture navigation from the left edge of the screen on the device")
            mDevice.executeShellCommand("settings put secure back_gesture_inset_scale_left 0")
            Log.i(TAG, "enableOrDisableBackGestureNavigationOnDevice: Successfully disabled the back gesture navigation from the left edge of the screen on the device on the device")
        }
    }

    fun isNetworkConnected(): Boolean {
        val connectivityManager =
            appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val network = connectivityManager.activeNetwork
        val networkCapabilities = connectivityManager.getNetworkCapabilities(network)
        val isConnected =
            networkCapabilities != null &&
                networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

        Log.i(TAG, "isNetworkConnected: Checking if network is connected: $isConnected")
        return isConnected
    }
}
