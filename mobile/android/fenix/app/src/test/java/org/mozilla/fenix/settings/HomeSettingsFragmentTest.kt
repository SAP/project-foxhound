/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.SharedPreferences
import androidx.fragment.app.FragmentActivity
import androidx.preference.CheckBoxPreference
import androidx.preference.SwitchPreferenceCompat
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import mozilla.components.service.pocket.PocketStoriesService
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.Components
import org.mozilla.fenix.components.Core
import org.mozilla.fenix.components.appstate.AppAction.ContentRecommendationsAction
import org.mozilla.fenix.components.appstate.AppAction.SportsWidgetAction
import org.mozilla.fenix.ext.getPreferenceKey
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.home.pocket.ContentRecommendationsFeatureHelper
import org.mozilla.fenix.utils.Settings
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
internal class HomeSettingsFragmentTest {
    @get:Rule
    val gleanRule = FenixGleanTestRule(testContext)

    private lateinit var homeSettingsFragment: HomeSettingsFragment
    private lateinit var appSettings: Settings
    private lateinit var appPrefs: SharedPreferences
    private lateinit var appPrefsEditor: SharedPreferences.Editor
    private lateinit var pocketService: PocketStoriesService
    private lateinit var appStore: AppStore
    private lateinit var contentRecommendationsHelper: ContentRecommendationsFeatureHelper

    @Before
    fun setup() {
        appPrefsEditor = mockk(relaxed = true)
        appPrefs = mockk(relaxed = true) {
            every { edit() } returns appPrefsEditor
        }
        appSettings = mockk(relaxed = true) {
            every { preferences } returns appPrefs
        }
        appStore = mockk(relaxed = true)
        pocketService = mockk(relaxed = true)
        contentRecommendationsHelper = mockk(relaxed = true)
    }

    @Test
    fun `GIVEN the Pocket sponsored stories feature is disabled for the app WHEN accessing settings THEN the settings for it are not visible`() {
        every { contentRecommendationsHelper.isPocketSponsoredStoriesFeatureEnabled(any()) } returns false

        activateFragment()

        assertFalse(getSponsoredStoriesPreference().isVisible)
    }

    @Test
    fun `GIVEN the Pocket sponsored stories feature is enabled for the app WHEN accessing settings THEN the settings for it are visible`() {
        every { contentRecommendationsHelper.isPocketSponsoredStoriesFeatureEnabled(any()) } returns true

        activateFragment()

        assertTrue(getSponsoredStoriesPreference().isVisible)
    }

    @Test
    fun `GIVEN the Pocket sponsored stories preference is false WHEN accessing settings THEN the setting for it is unchecked`() {
        every { appSettings.showPocketSponsoredStories } returns false

        activateFragment()

        assertFalse(getSponsoredStoriesPreference().isChecked)
    }

    @Test
    fun `GIVEN the Pocket sponsored stories preference is true WHEN accessing settings THEN the setting for it is checked`() {
        every { appSettings.showPocketSponsoredStories } returns true

        activateFragment()

        assertTrue(getSponsoredStoriesPreference().isChecked)
    }

    @Test
    fun `GIVEN sponsored stories is disabled WHEN toggling the sponsored setting to enabled THEN start downloading sponsored stories`() {
        activateFragment()
        val result = getSponsoredStoriesPreference().callChangeListener(true)

        assertTrue(result)
        verify {
            appPrefsEditor.putBoolean(homeSettingsFragment.getString(R.string.pref_key_pocket_sponsored_stories), true)
            pocketService.startPeriodicSponsoredContentsRefresh()
        }
    }

    @Test
    fun `GIVEN sponsored stories is enabled WHEN toggling the sponsored stories setting to disabled THEN delete Pocket profile and remove sponsored contents from showing`() {
        activateFragment()
        val result = getSponsoredStoriesPreference().callChangeListener(false)

        assertTrue(result)
        verify {
            appPrefsEditor.putBoolean(homeSettingsFragment.getString(R.string.pref_key_pocket_sponsored_stories), false)
            pocketService.deleteUser()
            appStore.dispatch(
                ContentRecommendationsAction.SponsoredContentsChange(
                    sponsoredContents = emptyList(),
                ),
            )
        }
    }

    @Test
    fun `GIVEN the Homepage Sports Widget feature is disabled WHEN accessing settings THEN the World Cup toggle is not visible`() {
        every { appSettings.enableHomepageSportsWidget } returns false

        activateFragment()

        assertFalse(getSportsWidgetPreference().isVisible)
    }

    @Test
    fun `GIVEN the Homepage Sports Widget feature is enabled WHEN accessing settings THEN the World Cup toggle is visible`() {
        every { appSettings.enableHomepageSportsWidget } returns true
        every { appSettings.showHomepageSportsWidget } returns true

        activateFragment()

        assertTrue(getSportsWidgetPreference().isVisible)
        assertTrue(getSportsWidgetPreference().isChecked)
    }

    @Test
    fun `WHEN toggling the World Cup setting off THEN the preference is persisted and a VisibilityChanged action is dispatched`() {
        activateFragment()
        val result = getSportsWidgetPreference().callChangeListener(false)

        assertTrue(result)
        verify {
            appStore.dispatch(SportsWidgetAction.VisibilityChanged(isVisible = false))
            appPrefsEditor.putBoolean(
                homeSettingsFragment.getString(R.string.pref_key_show_homepage_sports_widget),
                false,
            )
        }
    }

    @Test
    fun `WHEN toggling the World Cup setting on THEN the preference is persisted and a VisibilityChanged action is dispatched`() {
        activateFragment()
        val result = getSportsWidgetPreference().callChangeListener(true)

        assertTrue(result)
        verify {
            appStore.dispatch(SportsWidgetAction.VisibilityChanged(isVisible = true))
            appPrefsEditor.putBoolean(
                homeSettingsFragment.getString(R.string.pref_key_show_homepage_sports_widget),
                true,
            )
        }
    }

    @Test
    fun `WHEN toggling the privacy report setting THEN events preference_toggled is recorded with the privacy_report key`() {
        activateFragment()

        val result = getPrivacyReportPreference().callChangeListener(true)

        assertTrue(result)
        val events = Events.preferenceToggled.testGetValue()!!
        assertEquals(1, events.size)
        assertEquals("privacy_report", events.single().extra?.get("preference_key"))
        assertEquals("true", events.single().extra?.get("enabled"))
    }

    private fun activateFragment() {
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).create().get()
        homeSettingsFragment = HomeSettingsFragment()

        val mockCore: Core = mockk {
            every { pocketStoriesService } returns this@HomeSettingsFragmentTest.pocketService
        }
        val mockComponents: Components = mockk(relaxed = true) {
            every { appStore } returns this@HomeSettingsFragmentTest.appStore
            every { core } returns mockCore
            every { settings } returns this@HomeSettingsFragmentTest.appSettings
        }

        homeSettingsFragment.fenixSettings = appSettings
        homeSettingsFragment.fenixComponents = mockComponents
        homeSettingsFragment.contentRecommendationsHelper = contentRecommendationsHelper

        activity.supportFragmentManager.beginTransaction()
            .add(homeSettingsFragment, "HomeSettingFragmentTest")
            .commitNow()
    }

    private fun getSponsoredStoriesPreference(): CheckBoxPreference =
        homeSettingsFragment.findPreference(
            homeSettingsFragment.getPreferenceKey(R.string.pref_key_pocket_sponsored_stories),
        )!!

    private fun getSportsWidgetPreference(): SwitchPreferenceCompat =
        homeSettingsFragment.findPreference(
            homeSettingsFragment.getPreferenceKey(R.string.pref_key_show_homepage_sports_widget),
        )!!

    private fun getPrivacyReportPreference(): SwitchPreferenceCompat =
        homeSettingsFragment.findPreference(
            homeSettingsFragment.getPreferenceKey(R.string.pref_key_privacy_report),
        )!!
}
