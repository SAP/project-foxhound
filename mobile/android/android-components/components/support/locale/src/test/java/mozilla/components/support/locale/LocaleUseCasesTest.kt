/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.locale

import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.LocaleAction
import mozilla.components.browser.state.action.LocaleAction.UpdateLocaleAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Before
import org.junit.Test
import java.util.Locale

class LocaleUseCasesTest {

    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
    private lateinit var browserStore: BrowserStore

    @Before
    fun setup() {
        browserStore = BrowserStore()

        browserStore = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(captureActionsMiddleware),
        )
    }

    @Test
    fun `WHEN the locale is updated THEN the browser state reflects the change`() {
        val useCases = LocaleUseCases(browserStore)
        val locale = Locale.forLanguageTag("MyFavoriteLanguage")

        useCases.notifyLocaleChanged(locale)
        captureActionsMiddleware.assertFirstAction(UpdateLocaleAction::class) { action ->
            assert(action.locale == locale)
        }
    }

    @Test
    fun `WHEN state is restored THEN the browser state locale is restored`() {
        val useCases = LocaleUseCases(browserStore)
        useCases.restore()

        captureActionsMiddleware.findFirstAction(LocaleAction.RestoreLocaleStateAction::class)
    }
}
