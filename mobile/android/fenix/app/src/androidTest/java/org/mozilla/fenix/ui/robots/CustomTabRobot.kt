/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.ui.robots

import android.net.Uri
import android.util.Log
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiSelector
import mozilla.components.compose.browser.toolbar.concept.BrowserToolbarTestTags.ADDRESSBAR_URL_BOX
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.MenuDialogTestTag.DESKTOP_SITE_OFF
import org.mozilla.fenix.components.menu.MenuDialogTestTag.DESKTOP_SITE_ON
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.helpers.MatcherHelper.assertUIObjectExists
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithDescription
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdAndText
import org.mozilla.fenix.helpers.TestAssetHelper
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestHelper.appName
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.TestHelper.waitForObjects
import mozilla.components.feature.customtabs.R as customtabsR

/**
 *  Implementation of the robot pattern for Custom tabs
 */
class CustomTabRobot(private val composeTestRule: ComposeTestRule) {

    fun verifyCustomTabsSiteInfoButton() {
        Log.i(TAG, "verifyCustomTabsSiteInfoButton: Trying to verify that the site info button is displayed")
        composeTestRule.onNodeWithContentDescription("Site information").assertIsDisplayed()
        Log.i(TAG, "verifyCustomTabsSiteInfoButton: Verified that the site info button is displayed")
    }

    fun verifyMainMenuButton() {
        Log.i(TAG, "verifyMainMenuButton: Trying to verify that the main menu button is displayed")
        composeTestRule.onNodeWithContentDescription("More options").assertIsDisplayed()
        Log.i(TAG, "verifyMainMenuButton: Verified that the main menu button is displayed")
    }

    fun verifyDesktopSiteButtonExists() {
        Log.i(TAG, "verifyDesktopSiteButtonExists: Trying to verify that the request desktop site button is displayed")
        desktopSiteButton().check(matches(isDisplayed()))
        Log.i(TAG, "verifyDesktopSiteButtonExists: Verified that the request desktop site button is displayed")
    }

    fun verifyFindInPageButtonExists() {
        Log.i(TAG, "verifyFindInPageButtonExists: Trying to verify that the find in page button is displayed")
        findInPageButton().check(matches(isDisplayed()))
        Log.i(TAG, "verifyFindInPageButtonExists: Verified that the find in page button is displayed")
    }

    fun verifyPoweredByTextIsDisplayed() =
        assertUIObjectExists(itemContainingText("POWERED BY $appName"))

    fun verifyOpenInBrowserButtonExists() {
        Log.i(TAG, "verifyOpenInBrowserButtonExists: Trying to verify that the \"Open in Firefox\" button is displayed")
        openInBrowserButton().check(matches(isDisplayed()))
        Log.i(TAG, "verifyOpenInBrowserButtonExists: Verified that the \"Open in Firefox\" button is displayed")
    }

    fun verifyOpenInBrowserComposeButtonExists() {
        Log.i(TAG, "verifyOpenInBrowserComposeButtonExists: Trying to verify that the \"Open in Firefox\" button is displayed")
        composeTestRule.openInBrowserButtonFromRedesignedToolbar().assertIsDisplayed()
        Log.i(TAG, "verifyOpenInBrowserComposeButtonExists: Verified that the \"Open in Firefox\" button is displayed")
    }

    fun verifyBackButtonExists() = assertUIObjectExists(itemWithDescription("Back"))

    fun verifyForwardButtonExists() = assertUIObjectExists(itemWithDescription("Forward"))

    fun verifyRefreshButtonExists() = assertUIObjectExists(itemWithDescription("Refresh"))

    fun verifyCustomMenuItem(label: String) = assertUIObjectExists(itemContainingText(label))

    fun verifyCustomTabCloseButton() {
        Log.i(TAG, "verifyCustomTabCloseButton: Trying to verify that the close custom tab button is displayed")
        composeTestRule.onNodeWithContentDescription(getStringResource(customtabsR.string.mozac_feature_customtabs_exit_button)).assertIsDisplayed()
        Log.i(TAG, "verifyCustomTabCloseButton: Verified that the close custom tab button is displayed")
    }

    fun verifyCustomTabToolbarTitle(title: String) {
        Log.i(TAG, "verifyCustomTabToolbarTitle: Trying to verify that the custom tab title: $title is displayed")
        composeTestRule.onNodeWithText(title, substring = true, useUnmergedTree = true).assertIsDisplayed()
        Log.i(TAG, "verifyCustomTabToolbarTitle: Verified that the custom tab title: $title is displayed")
    }

    fun verifyCustomTabUrl(url: String) {
        val uri = Uri.parse(url)
        val expectedText = uri.host ?: url // fallback if host is null
        Log.i(TAG, "verifyCustomTabUrl: Trying to verify that the custom tab url: $expectedText is displayed")
        composeTestRule.onNodeWithText(expectedText, substring = true, useUnmergedTree = true).assertIsDisplayed()
        Log.i(TAG, "verifyCustomTabUrl: Verified that the custom tab url: $expectedText is displayed")
    }

    fun longClickAndCopyToolbarUrl() {
        Log.i(TAG, "longClickAndCopyToolbarUrl: Trying to long click the custom tab toolbar")
        composeTestRule.onAllNodes(hasTestTag(ADDRESSBAR_URL_BOX)).onFirst().performTouchInput {
            down(center)
            advanceEventTime(10000)
            up()
        }
        Log.i(TAG, "longClickAndCopyToolbarUrl: Long clicked the custom tab toolbar")
        Log.i(TAG, "longClickAndCopyToolbarUrl: Waiting for compose rule to be idle")
        composeTestRule.waitForIdle()
        Log.i(TAG, "longClickAndCopyToolbarUrl: Waited for compose rule to be idle")
        Log.i(TAG, "longClickAndCopyToolbarUrl: Trying to click the \"Copy\" option")
        composeTestRule.onNodeWithText("Copy", useUnmergedTree = true).performClick()
        Log.i(TAG, "longClickAndCopyToolbarUrl: Clicked the \"Copy\" option")
    }

    fun fillAndSubmitLoginCredentials(userName: String, password: String) {
        Log.i(TAG, "fillAndSubmitLoginCredentials: Waiting for device to be idle for $waitingTime ms")
        mDevice.waitForIdle(waitingTime)
        Log.i(TAG, "fillAndSubmitLoginCredentials: Waited for device to be idle for $waitingTime ms")
        setPageObjectText(composeTestRule, itemWithResId("username"), userName)
        waitForAppWindowToBeUpdated()
        setPageObjectText(composeTestRule, itemWithResId("password"), password)
        waitForAppWindowToBeUpdated()
        clickPageObject(composeTestRule, itemWithResId("submit"))
        mDevice.waitForObjects(
            mDevice.findObject(UiSelector().resourceId("$packageName:id/save_confirm")),
            waitingTime,
        )
    }

    fun waitForPageToLoad(pageLoadWaitingTime: Long = waitingTime) {
        Log.i(TAG, "waitForPageToLoad: Waiting for $waitingTime ms until progress bar is gone")
        progressBar().waitUntilGone(pageLoadWaitingTime)
        Log.i(TAG, "waitForPageToLoad: Waited for $waitingTime ms until progress bar was gone")
    }

    fun clickCustomTabCloseButton() {
        Log.i(TAG, "clickCustomTabCloseButton: Trying to click close custom tab button")
        composeTestRule.onNodeWithContentDescription(getStringResource(customtabsR.string.mozac_feature_customtabs_exit_button)).performClick()
        Log.i(TAG, "clickCustomTabCloseButton: Clicked close custom tab button")
    }

    fun verifyCustomTabActionButton(customTabActionButtonDescription: String) {
        Log.i(TAG, "verifyCustomTabActionButton: Trying to verify that the custom tab action button is displayed")
        composeTestRule.onNodeWithContentDescription(customTabActionButtonDescription).assertIsDisplayed()
        Log.i(TAG, "verifyCustomTabActionButton: Verified that the custom tab action button is displayed")
    }

    fun verifyPDFReaderToolbarItems() =
        assertUIObjectExists(
            itemWithResIdAndText("download", "Download"),
        )

    fun verifyCustomTabsMainMenuItems(customMenuItem: String, exist: Boolean, waitingTime: Long = TestAssetHelper.waitingTime) =
        assertUIObjectExists(
            itemContainingText(getStringResource(R.string.browser_menu_back)),
            itemContainingText(getStringResource(R.string.browser_menu_forward)),
            itemContainingText(getStringResource(R.string.browser_menu_refresh)),
            itemContainingText(getStringResource(R.string.browser_menu_share)),
            itemWithDescription("Open in $appName"),
            itemWithDescription(getStringResource(R.string.browser_menu_find_in_page)),
            itemWithDescription(getStringResource(R.string.browser_menu_desktop_site)),
            itemContainingText(customMenuItem),
            itemContainingText("Powered by $appName"),
            exists = exist,
            waitingTime = waitingTime,
        )

    fun verifySwitchToDesktopSiteButton() {
        Log.i(TAG, "verifySwitchToDesktopSiteButton: Trying to verify that the \"Desktop site\" button is displayed.")
        composeTestRule.desktopSiteButton().assertIsDisplayed()
        Log.i(TAG, "verifySwitchToDesktopSiteButton: Verified that the \"Switch to desktop site\" button is displayed.")
    }

    fun verifyDesktopSiteButtonState(isEnabled: Boolean) {
        if (isEnabled) {
            Log.i(TAG, "verifyDesktopSiteButtonState: Trying to verify that the \"Desktop site\" button is set to \"On\".")
            composeTestRule.enabledDesktopSiteButton().assertIsDisplayed()
            Log.i(TAG, "verifyDesktopSiteButtonState: Verified that the \"Desktop site\" button is set to \"On\".")
        } else {
            Log.i(TAG, "verifyDesktopSiteButtonState: Trying to verify that the \"Desktop site\" button is set to \"Off\".")
            composeTestRule.disabledDesktopSiteButton().assertIsDisplayed()
            Log.i(TAG, "verifyDesktopSiteButtonState: Verified that the \"Desktop site\" button is set to \"Off\".")
        }
    }

    fun clickSwitchToDesktopSiteButton() {
        Log.i(TAG, "clickSwitchToDesktopSiteButton: Trying to click the \"Desktop site\" button.")
        composeTestRule.desktopSiteButton().performClick()
        Log.i(TAG, "clickSwitchToDesktopSiteButton: Clicked the \"Desktop site\" button.")
    }

    class Transition(private val composeTestRule: ComposeTestRule) {
        fun openMainMenu(interact: CustomTabRobot.() -> Unit): Transition {
            Log.i(TAG, "openMainMenu: Trying to click the main menu button")
            composeTestRule.onNodeWithContentDescription(getStringResource(R.string.content_description_menu)).performClick()
            Log.i(TAG, "openMainMenu: Clicked the main menu button")

            CustomTabRobot(composeTestRule).interact()
            return Transition(composeTestRule)
        }

        fun clickOpenInBrowserButton(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "clickOpenInBrowserButton: Trying to click the \"Open in Firefox\" button")
            openInBrowserButton().perform(click())
            Log.i(TAG, "clickOpenInBrowserButton: Clicked the \"Open in Firefox\" button")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun clickOpenInBrowserButtonFromRedesignedToolbar(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "clickOpenInBrowserButtonFromRedesignedToolbar: Trying to click the \"Open in Firefox\" button")
            composeTestRule.openInBrowserButtonFromRedesignedToolbar().performClick()
            Log.i(TAG, "clickOpenInBrowserButtonFromRedesignedToolbar: Clicked the \"Open in Firefox\" button")
            Log.i(TAG, "clickOpenInBrowserButtonFromRedesignedToolbar: Waiting for device to be idle to be idle")
            mDevice.waitForIdle(waitingTime)
            Log.i(TAG, "clickOpenInBrowserButtonFromRedesignedToolbar: Waited for device to be idle")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun clickShareButton(interact: ShareOverlayRobot.() -> Unit): ShareOverlayRobot.Transition {
            Log.i(TAG, "clickShareButton: Trying to click the share button")
            itemWithDescription(getStringResource(customtabsR.string.mozac_feature_customtabs_share_link)).waitForExists(waitingTime)
            itemWithDescription(getStringResource(customtabsR.string.mozac_feature_customtabs_share_link)).click()
            Log.i(TAG, "clickShareButton: Clicked the share button")

            ShareOverlayRobot().interact()
            return ShareOverlayRobot.Transition()
        }

        fun clickShareButtonFromRedesignedMenu(interact: ShareOverlayRobot.() -> Unit): ShareOverlayRobot.Transition {
            Log.i(TAG, "clickShareButtonFromRedesignedMenu: Trying to click the redesigned main menu share button from custom tab")
            composeTestRule.shareButton().performClick()
            Log.i(TAG, "clickShareButtonFromRedesignedMenu: Clicked the redesigned main menu share button from custom tab")

            ShareOverlayRobot().interact()
            return ShareOverlayRobot.Transition()
        }

        fun clickFindInPageButton(interact: FindInPageRobot.() -> Unit): FindInPageRobot.Transition {
            Log.i(TAG, "clickFindInPageButton: Trying to click the \"Find In Page\" button from the new main menu design.")
            composeTestRule.findInPageButton().performClick()
            Log.i(TAG, "clickFindInPageButton: Clicked the \"Find In Page\" button from the new main menu design.")

            FindInPageRobot().interact()
            return FindInPageRobot.Transition()
        }

        fun clickOutsideTheMainMenu(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "clickOutsideTheMainMenu: Trying to click outside the main menu.")
            itemWithResId("$packageName:id/touch_outside").clickTopLeft()
            Log.i(TAG, "clickOutsideTheMainMenu: Clicked click outside the main menu.")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun clickBackButtonFromMenu(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "clickBackButtonFromMenu: Trying to click the \"Back\" button from custom tab main menu.")
            composeTestRule.backButton().performClick()
            Log.i(TAG, "clickBackButtonFromMenu: Clicked the \"Back\" button from custom tab main menu.")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun clickForwardButtonFromMenu(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "clickForwardButtonFromMenu: Trying to click the \"Forward\" button from custom tab main menu.")
            composeTestRule.forwardButton().performClick()
            Log.i(TAG, "clickForwardButtonFromMenu: Clicked the \"Forward\" button from custom tab main menu.")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun clickRefreshButton(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "clickRefreshButton: Trying to click the \"Refresh\" button from custom tab main menu.")
            composeTestRule.refreshButton().performClick()
            Log.i(TAG, "clickRefreshButton: Clicked the \"Refresh\" button from custom tab main menu.")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun openUnifiedTrustPanel(interact: UnifiedTrustPanelRobot.() -> Unit): UnifiedTrustPanelRobot.Transition {
            Log.i(TAG, "openSiteSecuritySheet: Trying to click the site security toolbar button and wait for $waitingTime ms for a new window")
            composeTestRule.onNodeWithContentDescription("Site information").performClick()
            Log.i(TAG, "openSiteSecuritySheet: Clicked the site security toolbar button and waited for $waitingTime ms for a new window")
            waitForAppWindowToBeUpdated()

            UnifiedTrustPanelRobot().interact()
            return UnifiedTrustPanelRobot.Transition()
        }
    }
}

fun customTabScreen(composeTestRule: ComposeTestRule, interact: CustomTabRobot.() -> Unit): CustomTabRobot.Transition {
    CustomTabRobot(composeTestRule).interact()
    return CustomTabRobot.Transition(composeTestRule)
}

private fun mainMenuButton() = itemWithResId("$packageName:id/mozac_browser_toolbar_menu")

private fun mainMenuButtonFromRedesignedToolbar() =
    itemWithDescription(getStringResource(R.string.content_description_menu))

private fun desktopSiteButton() = onView(withId(R.id.switch_widget))

private fun findInPageButton() = onView(withText("Find in page"))

private fun openInBrowserButton() = onView(withText("Open in $appName"))

private fun ComposeTestRule.openInBrowserButtonFromRedesignedToolbar() = onNodeWithContentDescription("Open in $appName")

private fun closeButton() = onView(withContentDescription("Return to previous app"))

private fun customTabToolbar() = mDevice.findObject(By.res("$packageName:id/toolbar"))

private fun progressBar() =
    mDevice.findObject(
        UiSelector().resourceId("$packageName:id/mozac_browser_toolbar_progress"),
    )
private fun ComposeTestRule.desktopSiteButton() = onNodeWithContentDescription(getStringResource(R.string.browser_menu_desktop_site), substring = true)

private fun ComposeTestRule.enabledDesktopSiteButton() = onNodeWithTag(DESKTOP_SITE_ON)

private fun ComposeTestRule.disabledDesktopSiteButton() = onNodeWithTag(DESKTOP_SITE_OFF)

private fun ComposeTestRule.findInPageButton() = onNodeWithContentDescription(getStringResource(R.string.browser_menu_find_in_page))

private fun ComposeTestRule.backButton() = onNodeWithText("Back")

private fun ComposeTestRule.forwardButton() = onNodeWithText("Forward")

private fun ComposeTestRule.refreshButton() = onNodeWithText("Refresh")

private fun ComposeTestRule.shareButton() = onNodeWithText("Share")
