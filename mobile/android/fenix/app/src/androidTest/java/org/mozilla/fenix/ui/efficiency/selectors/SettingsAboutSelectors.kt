/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsAboutSelectors {

    val NAVIGATE_BACK_TOOLBAR_BUTTON = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_CONTENT_DESC,
        value = "Navigate up",
        description = "Navigate back toolbar button",
        groups = listOf("requiredForPage"),
    )

    val WHATS_NEW_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = "new in",
        description = "The Whats New Title",
        groups = listOf("aboutSection", "aboutFirefox", "whatsNew"),
    )

    val SUPPORT_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = "Support",
        description = "The Support Link",
        groups = listOf("aboutSection", "aboutFirefox", "supportItem"),
    )

    val CRASHES_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = "Crashes",
        description = "The Crashes Button",
        groups = listOf("aboutSection", "aboutFirefox", "crashes"),
    )

    val PRIVACY_NOTICE_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS,
        value = "Privacy Notice",
        description = "The Privacy Notice Button",
        groups = listOf("aboutSection", "aboutFirefox", "privacyNotice"),
    )

    val KNOW_YOUR_RIGHTS_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR2_BY_TEXT,
        value = "Know your rights",
        description = "The Know your rights Button",
        groups = listOf("Know your rights", "aboutFirefox", "knowYourRights"),
    )

    val LICENSING_INFORMATION_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR2_BY_TEXT,
        value = "Licensing information",
        description = "The Licensing Information Button",
        groups = listOf("requiresScroll", "aboutFirefox", "licensingInformation"),
    )

    val LIBRARIES_THAT_WE_USE_BUTTON = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR2_BY_TEXT,
        value = "Libraries that we use",
        description = "The Libraries that we use Button",
        groups = listOf("requiresScroll", "aboutFirefox", "librariesThatWeUse"),
    )

    val ABOUT_INFO_TEXTBOX = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_ID,
        value = "about_text",
        description = "The About Info Textbox",
        groups = listOf("aboutFirefox", "aboutInfo"),
    )

    val all = listOf(
        NAVIGATE_BACK_TOOLBAR_BUTTON,
        WHATS_NEW_BUTTON,
        SUPPORT_BUTTON,
        CRASHES_BUTTON,
        PRIVACY_NOTICE_BUTTON,
        KNOW_YOUR_RIGHTS_BUTTON,
        LICENSING_INFORMATION_BUTTON,
        LIBRARIES_THAT_WE_USE_BUTTON,
        ABOUT_INFO_TEXTBOX,
    )
}
