/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.customtabs.feature

import mozilla.components.browser.state.state.CustomTabSessionState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.concept.toolbar.Toolbar
import mozilla.components.concept.toolbar.fake.FakeToolbar
import org.junit.Assert.assertEquals
import org.junit.Test

class CustomTabSessionTitleObserverTest {

    @Test
    fun `show title only if not empty`() {
        val toolbar: Toolbar = FakeToolbar()
        val observer = CustomTabSessionTitleObserver(toolbar)
        val url = "https://www.mozilla.org"
        val title = "Internet for people, not profit - Mozilla"

        observer.onTab(createCustomTab(url, title = ""))
        assertEquals("", toolbar.title)

        observer.onTab(createCustomTab(url, title = title))
        assertEquals(title, toolbar.title)
    }

    @Test
    fun `Will use URL as title if title was shown once and is now empty`() {
        val toolbar: Toolbar = FakeToolbar()
        var tab = createCustomTab("https://mozilla.org")
        val observer = CustomTabSessionTitleObserver(toolbar)

        observer.onTab(tab)
        assertEquals("", toolbar.title)

        tab = tab.withUrl("https://www.mozilla.org/en-US/firefox/")
        observer.onTab(tab)
        assertEquals("", toolbar.title)

        tab = tab.withTitle("Firefox - Protect your life online with privacy-first products")
        observer.onTab(tab)
        assertEquals("Firefox - Protect your life online with privacy-first products", toolbar.title)

        tab = tab.withUrl("https://github.com/mozilla-mobile/android-components")
        observer.onTab(tab)
        assertEquals("Firefox - Protect your life online with privacy-first products", toolbar.title)

        tab = tab.withTitle("")
        observer.onTab(tab)
        assertEquals("https://github.com/mozilla-mobile/android-components", toolbar.title)

        tab = tab.withTitle("A collection of Android libraries to build browsers or browser-like applications.")
        observer.onTab(tab)
        assertEquals("A collection of Android libraries to build browsers or browser-like applications.", toolbar.title)

        tab = tab.withTitle("")
        observer.onTab(tab)
        assertEquals("https://github.com/mozilla-mobile/android-components", toolbar.title)
    }
}

private fun CustomTabSessionState.withTitle(title: String) = copy(
    content = content.copy(title = title),
)

private fun CustomTabSessionState.withUrl(url: String) = copy(
    content = content.copy(url = url),
)
