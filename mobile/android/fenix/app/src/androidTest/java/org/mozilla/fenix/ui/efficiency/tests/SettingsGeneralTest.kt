package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.util.FRENCH_FOLLOW_DEVICE_LANGUAGE_OPTION
import org.mozilla.fenix.ui.util.FRENCH_LANGUAGE_HEADER
import org.mozilla.fenix.ui.util.ROMANIAN_LANGUAGE_HEADER

class SettingsGeneralTest : BaseTest() {

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/516079
    @SmokeTest
    @Test
    fun setAppLanguageDifferentThanSystemLanguageTest() {
        val enLanguageHeaderText = getStringResource(R.string.preferences_language)

        on.settingsLanguage.navigateToPage()
        on.settingsLanguage
            .selectLanguage("Romanian")
            .verifyLanguageSettingHeaderIsTranslated(ROMANIAN_LANGUAGE_HEADER)
        on.settingsLanguage
            .selectLanguage("Français")
            .verifyLanguageSettingHeaderIsTranslated(FRENCH_LANGUAGE_HEADER)
        on.settingsLanguage
            .selectLanguage(FRENCH_FOLLOW_DEVICE_LANGUAGE_OPTION)
            .verifyLanguageSettingHeaderIsTranslated(enLanguageHeaderText)
    }
}
