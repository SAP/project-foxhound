/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.advanced

import android.app.Activity
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import io.mockk.verifyAll
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.SearchAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.locale.LocaleManager
import mozilla.components.support.locale.LocaleUseCases
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class LocaleSettingsControllerTest {

    val activity: Activity = Robolectric.buildActivity(Activity::class.java).setup().get()

    private val localeSettingsStore: LocaleSettingsStore = mockk(relaxed = true)
    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    private val browserStore = BrowserStore(middleware = listOf(captureActionsMiddleware))
    private val localeUseCases: LocaleUseCases = mockk(relaxed = true)
    private val mockState = LocaleSettingsState(emptyList(), emptyList(), mockk())

    private lateinit var controller: DefaultLocaleSettingsController

    @Before
    fun setup() {
        controller = spyk(
            DefaultLocaleSettingsController(
                activity,
                localeSettingsStore,
                browserStore,
                localeUseCases,
            ),
        )

        every { localeUseCases.notifyLocaleChanged(any()) } just Runs
    }

    @Test
    fun `don't set locale if same locale is chosen`() {
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        every { localeSettingsStore.state } returns mockState.copy(selectedLocale = selectedLocale)

        LocaleManager.setNewLocale(activity, locale = selectedLocale)

        controller.handleLocaleSelected(selectedLocale)

        verifyAll(inverse = true) {
            localeSettingsStore.dispatch(LocaleSettingsAction.Select(selectedLocale))
            browserStore.dispatch(SearchAction.RefreshSearchEnginesAction)
            controller.updateLocale(selectedLocale)
            controller.recreateActivity()
            controller.updateBaseConfiguration(activity, selectedLocale)
        }
    }

    @Test
    fun `set a new locale from the list if other locale is chosen`() {
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        val otherLocale: Locale = mockk()
        every { localeSettingsStore.state } returns mockState.copy(selectedLocale = otherLocale)

        controller.handleLocaleSelected(selectedLocale)

        verify { localeSettingsStore.dispatch(LocaleSettingsAction.Select(selectedLocale)) }
        captureActionsMiddleware.findFirstAction(SearchAction.RefreshSearchEnginesAction::class)
        controller.updateLocale(selectedLocale)
        controller.recreateActivity()
        verify { controller.updateBaseConfiguration(activity, selectedLocale) }
    }

    @Test
    fun `set a new locale from the list if default locale is not selected`() {
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        every { localeSettingsStore.state } returns mockState.copy(selectedLocale = selectedLocale)

        LocaleManager.setNewLocale(activity, locale = null)

        controller.handleLocaleSelected(selectedLocale)

        verify { localeSettingsStore.dispatch(LocaleSettingsAction.Select(selectedLocale)) }
        captureActionsMiddleware.findFirstAction(SearchAction.RefreshSearchEnginesAction::class)
        verify { controller.updateLocale(selectedLocale) }
        verify { controller.recreateActivity() }
        verify { controller.updateBaseConfiguration(activity, selectedLocale) }
    }

    @Test
    fun `don't set default locale if default locale is already chosen`() {
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        every { localeSettingsStore.state } returns mockState.copy(localeList = listOf(selectedLocale))
        LocaleManager.setNewLocale(activity, locale = null)

        controller.handleDefaultLocaleSelected()

        verifyAll(inverse = true) {
            localeSettingsStore.dispatch(LocaleSettingsAction.Select(selectedLocale))
            controller.resetToSystemDefault()
            controller.recreateActivity()
            controller.updateBaseConfiguration(activity, selectedLocale)
        }
        captureActionsMiddleware.assertNotDispatched(SearchAction.RefreshSearchEnginesAction::class)
    }

    @Test
    fun `set the default locale as the new locale`() {
        val selectedLocale = Locale.Builder().setLanguage("en").setRegion("UK").build()
        every { localeSettingsStore.state } returns mockState.copy(localeList = listOf(selectedLocale))

        controller.handleDefaultLocaleSelected()

        verify { localeSettingsStore.dispatch(LocaleSettingsAction.Select(selectedLocale)) }
        captureActionsMiddleware.findFirstAction(SearchAction.RefreshSearchEnginesAction::class)
        verify { controller.resetToSystemDefault() }
        verify { controller.recreateActivity() }
        verify { controller.updateBaseConfiguration(activity, selectedLocale) }
    }

    @Test
    fun `handle search query typed`() {
        val query = "Eng"

        controller.handleSearchQueryTyped(query)

        verify { localeSettingsStore.dispatch(LocaleSettingsAction.Search(query)) }
    }
}
