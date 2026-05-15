/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experimentintegration

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.helpers.HomeActivityTestRule
import org.mozilla.fenix.helpers.TestHelper
import org.mozilla.fenix.ui.robots.homeScreen

class GenericExperimentIntegrationTest {
    private val experimentName = InstrumentationRegistry.getArguments().getString("EXP_NAME", "Viewpoint")

    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityTestRule(
                isPWAsPromptEnabled = false,
            ),
        ) { it.activity }

    @Before
    fun setUp() {
        TestHelper.appContext.settings().showSecretDebugMenuThisSession = true
    }

    @After
    fun tearDown() {
        TestHelper.appContext.settings().showSecretDebugMenuThisSession = false
    }

    @Test
    fun disableStudiesViaStudiesToggle() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openExperimentsMenu {
            verifyExperimentEnrolled(experimentName)
        }.goBack {
        }.openSettingsSubMenuDataCollection {
            clickStudiesOption()
            verifyStudiesToggle(true)
            clickStudiesToggle()
        }
    }

    @Test
    fun verifyStudiesAreDisabled() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDataCollection {
            clickStudiesOption()
            verifyStudiesToggle(false)
        }
    }

    @Test
    fun testExperimentEnrolled() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openExperimentsMenu {
            verifyExperimentEnrolled(experimentName)
        }
    }

    @Test
    fun testExperimentUnenrolled() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openExperimentsMenu {
            verifyExperimentExists(experimentName)
            verifyExperimentNotEnrolled(experimentName)
        }
    }

    @Test
    fun testExperimentUnenrolledViaSecretMenu() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openExperimentsMenu {
            verifyExperimentExists(experimentName)
            verifyExperimentEnrolled(experimentName)
            unenrollfromExperiment(experimentName)
            verifyExperimentNotEnrolled(experimentName)
        }
    }
}
