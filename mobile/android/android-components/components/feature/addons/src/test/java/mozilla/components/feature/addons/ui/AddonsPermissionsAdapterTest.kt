/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.addons.ui

import android.view.View
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.feature.addons.ui.AddonPermissionsAdapter.PermissionViewHolder
import mozilla.components.feature.addons.ui.AddonPermissionsAdapter.Style
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.whenever
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.verify
import mozilla.components.feature.addons.R as addonsR
import mozilla.components.ui.colors.R as colorsR

@RunWith(AndroidJUnit4::class)
class AddonsPermissionsAdapterTest {

    @Test
    fun `bind permissions`() {
        val textView: TextView = mock()
        val view = View(testContext)
        val permissions = listOf("permission")
        val style = Style(itemsTextColor = colorsR.color.photonBlue40)
        val viewHolder = PermissionViewHolder(view, textView)

        whenever(textView.context).thenReturn(testContext)

        val adapter = AddonPermissionsAdapter(permissions, style)

        adapter.onBindViewHolder(viewHolder, 0)

        verify(textView).text = "permission"
        verify(textView).contentDescription = testContext.getString(
            addonsR.string.mozac_feature_addons_permissions_content_description_item,
            "permission",
            1,
            1,
        )
        verify(textView).setTextColor(ContextCompat.getColor(testContext, style.itemsTextColor!!))
    }
}
