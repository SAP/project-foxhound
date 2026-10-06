package org.mozilla.fenix.ui

import androidx.test.espresso.Espresso.closeSoftKeyboard
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.helpers.FenixTestRule
import org.mozilla.fenix.helpers.HomeActivityTestRule
import org.mozilla.fenix.helpers.MatcherHelper
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestAssetHelper.promptAsset
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.navigationToolbar
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2
import mozilla.components.feature.prompts.R as promptsR

/**
 *  Tests for verifying basic functionality of prompts
 *
 *  Including:
 *  - beforeunload prompt
 */

class PromptTest {
    @get:Rule(order = 0)
    val fenixTestRule: FenixTestRule = FenixTestRule()

    private val mockWebServer get() = fenixTestRule.mockWebServer

    @get:Rule(order = 1)
    val composeTestRule =
        AndroidComposeTestRuleV2(
            HomeActivityTestRule.withDefaultSettingsOverrides(),
        ) { it.activity }

    @get:Rule(order = 2)
    val memoryLeaksRule = DetectMemoryLeaksRule(composeTestRule = { composeTestRule })

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/4025097
    @Test
    fun verifyBeforeUnloadPrompt() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)
        val promptWebPage = mockWebServer.promptAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(promptWebPage.url) {
            clickPageObject(composeTestRule, MatcherHelper.itemWithResId("nameInput"))
        }

        navigationToolbar(composeTestRule) {
            closeSoftKeyboard()
            waitForAppWindowToBeUpdated()
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
            verifyBeforeUnloadPromptExists()
        }
    }
}

private fun verifyBeforeUnloadPromptExists() =
    MatcherHelper.assertUIObjectExists(
        itemContainingText(
            getStringResource(
                promptsR.string.mozac_feature_prompt_before_unload_dialog_body,
            ),
        ),
    )
