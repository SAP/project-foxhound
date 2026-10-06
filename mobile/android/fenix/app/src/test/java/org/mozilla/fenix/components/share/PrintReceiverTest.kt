/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.share

import android.content.Intent
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.feature.session.SessionUseCases
import mozilla.components.support.test.robolectric.testContext
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.ext.components
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PrintReceiverTest {

    private val context = spyk(testContext)
    private val mockPrintUseCase = mockk<SessionUseCases.PrintContentUseCase>(relaxed = true)

    @Before
    fun setUp() {
        every { context.components.useCases.sessionUseCases.printContent } returns mockPrintUseCase
    }

    @Test
    fun `GIVEN a valid tab id WHEN onReceive called THEN print use case is invoked with the id`() {
        val intent = Intent().apply { putExtra("tabID", "tab-456") }

        PrintReceiver().onReceive(context, intent)

        verify { mockPrintUseCase.invoke("tab-456") }
    }

    @Test
    fun `GIVEN no tab id WHEN onReceive called THEN print use case is not invoked`() {
        val intent = Intent()

        PrintReceiver().onReceive(context, intent)

        verify(exactly = 0) { mockPrintUseCase.invoke(any()) }
    }
}
