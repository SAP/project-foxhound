/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.state.BrowserState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import java.util.Locale

class LocaleActionTest {
    @Test
    fun `WHEN a new locale is selected THEN it is updated in the store`() {
        var state = BrowserState()
        val locale1 = Locale.forLanguageTag("es")
        state = BrowserStateReducer.reduce(state, LocaleAction.UpdateLocaleAction(locale1))
        assertEquals(locale1, state.locale)
    }

    @Test
    fun `WHEN the state is restored from disk THEN the store receives the state`() {
        var state = BrowserState()

        val oldState = state
        state = BrowserStateReducer.reduce(state, LocaleAction.RestoreLocaleStateAction)
        assertSame(oldState, state)
    }
}
