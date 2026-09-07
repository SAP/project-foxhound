package org.mozilla.fenix.ui

import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.AppAndSystemHelper.isNetworkConnected
import org.mozilla.fenix.helpers.AppAndSystemHelper.runWithCondition
import org.mozilla.fenix.helpers.Constants
import org.mozilla.fenix.helpers.Constants.RETRY_COUNT
import org.mozilla.fenix.helpers.FenixTestRule
import org.mozilla.fenix.helpers.HomeActivityTestRule
import org.mozilla.fenix.helpers.RetryTestRule
import org.mozilla.fenix.helpers.RetryableComposeTestRule
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.homeScreen
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2

/**
 *  Tests for verifying the presence of the Pocket section and its elements
 */

class PocketTest {
    @get:Rule(order = 0)
    val fenixTestRule: FenixTestRule = FenixTestRule()

    @get:Rule(order = 1)
    val retryTestRule = RetryTestRule(3)

    @get:Rule(order = 2)
    val retryableComposeTestRule = RetryableComposeTestRule {
        AndroidComposeTestRuleV2(
            HomeActivityTestRule(
                isRecentTabsFeatureEnabled = false,
                isRecentlyVisitedFeatureEnabled = false,
            ),
        ) { it.activity }
    }

    private val composeTestRule get() = retryableComposeTestRule.current

    @get:Rule(order = 3)
    val memoryLeaksRule = DetectMemoryLeaksRule(composeTestRule = { composeTestRule })

    @Before
    fun setUp() {
        // Workaround to make sure the Pocket articles are populated before starting the tests.
        for (i in 1..RETRY_COUNT) {
            try {
                homeScreen(composeTestRule) {
                }.openThreeDotMenu {
                }.clickSettingsButton {
                }.goBack(composeTestRule) {
                    verifyThoughtProvokingStories(true)
                }

                break
            } catch (e: AssertionError) {
                if (i == RETRY_COUNT) {
                    throw e
                } else {
                    waitForAppWindowToBeUpdated()
                }
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2252509
    @Test
    fun verifyPocketSectionTest() {
        runWithCondition(isNetworkConnected()) {
            homeScreen(composeTestRule) {
                verifyThoughtProvokingStories(true)
                verifyPocketRecommendedStoriesItems()
                // Sponsored Pocket stories are only advertised for a limited time.
                // See also known issue https://bugzilla.mozilla.org/show_bug.cgi?id=1828629
                // verifyPocketSponsoredStoriesItems(2, 8)
            }.openThreeDotMenu {
            }.clickSettingsButton {
            }.openHomepageSubMenu {
                clickPocketButton()
            }.goBackToHomeScreen(composeTestRule) {
                verifyThoughtProvokingStories(false)
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2252513
    @Test
    fun openPocketStoryItemTest() {
        runWithCondition(isNetworkConnected()) {
            homeScreen(composeTestRule) {
                verifyThoughtProvokingStories(true)
            }.clickPocketStoryItem(1) {
                verifyUrl(Constants.STORIES_UTM_PARAM)
            }
        }
    }
}
