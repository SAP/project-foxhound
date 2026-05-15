package org.mozilla.fenix.ui

import android.os.Build
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.filters.SdkSuppress
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.dismissSetAsDefaultBrowserOnboardingDialog
import org.mozilla.fenix.helpers.AppAndSystemHelper.runWithCondition
import org.mozilla.fenix.helpers.AppAndSystemHelper.runWithLauncherIntent
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.homeScreen

class OnboardingTest : TestSetup() {

    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(launchActivity = false),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2122321
    @Ignore("Failing: https://bugzilla.mozilla.org/show_bug.cgi?id=2021112")
    @Test
    fun verifyFirstOnboardingCardItemsTest() {
        // Run UI test only on devices with Android version lower than 10
        // because on Android 10 and above, the default browser dialog is shown and the first onboarding card is skipped
        runWithCondition(Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            runWithLauncherIntent(composeTestRule) {
                homeScreen(composeTestRule) {
                    verifyFirstOnboardingCard()
                }
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2122334
    @Ignore("Failing: https://bugzilla.mozilla.org/show_bug.cgi?id=2021112")
    @Test
    fun verifyFirstOnboardingCardItemsFunctionalityTest() {
        // Run UI test only on devices with Android version lower than 10
        // because on Android 10 and above, the default browser dialog is shown and the first onboarding card is skipped
        runWithCondition(Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            runWithLauncherIntent(composeTestRule) {
                homeScreen(composeTestRule) {
                    clickDefaultCardNotNowOnboardingButton()
                    verifySecondOnboardingCard()
                    swipeSecondOnboardingCardToRight()
                }.clickSetAsDefaultBrowserOnboardingButton {
                    verifyAndroidDefaultAppsMenuAppears()
                }.goBackToOnboardingScreen(composeTestRule) {
                    verifySecondOnboardingCard()
                }
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2122343
    @Ignore("Failing: https://bugzilla.mozilla.org/show_bug.cgi?id=2021112")
    @Test
    fun verifySecondOnboardingCardItemsTest() {
        runWithLauncherIntent(composeTestRule) {
            homeScreen(composeTestRule) {
                // Check if the device is running on Android version lower than 10
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    // If true, click the "Not Now" button from the first onboarding card
                    clickDefaultCardNotNowOnboardingButton()
                }
                dismissSetAsDefaultBrowserOnboardingDialog()
                verifySecondOnboardingCard()
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2122344
    @Ignore("Failing: https://bugzilla.mozilla.org/show_bug.cgi?id=2021112")
    @SmokeTest
    @Test
    fun verifyThirdOnboardingCardSignInFunctionalityTest() {
        runWithLauncherIntent(composeTestRule) {
            homeScreen(composeTestRule) {
                // Check if the device is running on Android version lower than 10
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    // If true, click the "Not Now" button from the first onboarding card
                    clickDefaultCardNotNowOnboardingButton()
                }
                dismissSetAsDefaultBrowserOnboardingDialog()
                verifySecondOnboardingCard()
                clickAddSearchWidgetNotNowOnboardingButton()
                verifyThirdOnboardingCard()
            }.clickSignInOnboardingButton {
                verifyTurnOnSyncMenu()
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2609732
    @SdkSuppress(minSdkVersion = 29)
    @Ignore("Failing: https://bugzilla.mozilla.org/show_bug.cgi?id=2021112")
    @SmokeTest
    @Test
    fun verifySetAsDefaultBrowserDialogWhileFirefoxIsNotSetAsDefaultBrowserTest() {
        runWithLauncherIntent(composeTestRule) {
            homeScreen(composeTestRule) {
                verifySetAsDefaultBrowserDialogWhileFirefoxIsNotSetAsDefaultBrowser()
            }
        }
    }
}
