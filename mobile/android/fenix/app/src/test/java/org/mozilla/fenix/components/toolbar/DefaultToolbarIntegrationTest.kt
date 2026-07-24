/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.content.Context
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.ext.components
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DefaultToolbarIntegrationTest {
    private lateinit var feature: DefaultToolbarIntegration
    private lateinit var context: Context

    @Before
    fun setup() {
        context = spyk(testContext)

        every { context.components } returns mockk {
            every { core } returns mockk {
                every { store } returns BrowserStore()
            }
            every { publicSuffixList } returns mockk()
            every { settings } returns mockk(relaxed = true)
        }

        feature = DefaultToolbarIntegration(
            context = context,
            toolbar = mockk(relaxed = true),
            scrollableToolbar = mockk(relaxed = true),
            lifecycleOwner = mockk(),
            customTabId = null,
            isPrivate = false,
            interactor = mockk(),
        )
    }

    @Test
    fun `WHEN the feature starts THEN start the cfr presenter`() {
        feature.cfrPresenter = mockk(relaxed = true)

        feature.start()

        verify { feature.cfrPresenter.start() }
    }

    @Test
    fun `WHEN the feature stops THEN stop the cfr presenter`() {
        feature.cfrPresenter = mockk(relaxed = true)

        feature.stop()

        verify { feature.cfrPresenter.stop() }
    }
}
