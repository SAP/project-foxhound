/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.about

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.FrameLayout
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.settings.about.viewholders.AboutItemViewHolder
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AboutPageAdapterTest {
    private val aboutList: List<AboutPageItem> =
        listOf(
            AboutPageItem(
                AboutItem.ExternalLink(
                    AboutItemType.WHATS_NEW,
                    "https://mozilla.org",
                ),
                "Libraries",
            ),
            AboutPageItem(AboutItem.Libraries, "Libraries"),
            AboutPageItem(AboutItem.Crashes, "Crashes"),
        )
    private val listener: AboutPageListener = mockk(relaxed = true)

    @Test
    fun `getItemCount on a default instantiated Adapter should return 0`() {
        val adapter = AboutPageAdapter(listener)

        assertEquals(0, adapter.itemCount)
    }

    @Test
    fun `getItemCount after updateData() call should return the correct list size`() {
        val adapter = AboutPageAdapter(listener)

        adapter.submitList(aboutList)

        assertEquals(3, adapter.itemCount)
    }

    @Test
    fun `the adapter uses AboutItemViewHolder`() {
        val adapter = AboutPageAdapter(listener)
        val parentView: ViewGroup = mockk(relaxed = true)
        every { parentView.context } returns testContext

        val viewHolder = adapter.onCreateViewHolder(parentView, AboutItemViewHolder.LAYOUT_ID)

        assertEquals(AboutItemViewHolder::class, viewHolder::class)
    }

    @Test
    fun `the adapter binds the right item to a ViewHolder`() {
        val adapter = AboutPageAdapter(listener)
        val parentView = FrameLayout(testContext)

        val view = LayoutInflater.from(parentView.context)
            .inflate(AboutItemViewHolder.LAYOUT_ID, parentView, false)

        val viewHolder = spyk(AboutItemViewHolder(view, listener))

        adapter.submitList(aboutList)
        adapter.bindViewHolder(viewHolder, 1)

        verify(exactly = 1) { viewHolder.bind(aboutList[1]) }
    }
}
