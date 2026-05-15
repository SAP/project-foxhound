/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.graphics.Bitmap
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.surfaceDimVariant
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.compose.list.IconListItem
import mozilla.components.ui.icons.R as iconsR

class MenuItemTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testIconListItemIconUntintedArgumentRespected() {
        with(composeTestRule) {
            setContent {
                Column(Modifier.background(color = MaterialTheme.colorScheme.surfaceDimVariant).padding(16.dp)) {
                    IconListItem(
                        label = "Test Label",
                        beforeIconPainter = painterResource(iconsR.drawable.mozac_ic_shield_slash_critical_24),
                        beforeIconTint = Color.Unspecified,
                        enabled = true,
                        modifier = Modifier.testTag("NoTint"),
                    )
                    IconListItem(
                        label = "Test Label",
                        beforeIconPainter = painterResource(iconsR.drawable.mozac_ic_shield_slash_critical_24),
                        enabled = true,
                        modifier = Modifier.testTag("DefaultTint"),
                    )
                }
            }
            val untintedIconListItem = onNode(hasTestTag("NoTint"), useUnmergedTree = true).captureToImage().asAndroidBitmap()
            val defaultTintedIconListItem = onNode(hasTestTag("DefaultTint"), useUnmergedTree = true).captureToImage().asAndroidBitmap()

            assertFalse(untintedIconListItem.sameColorsAs(defaultTintedIconListItem))
        }
    }

    fun Bitmap.sameColorsAs(other: Bitmap): Boolean {
        for (x in 0 until this.width) {
            for (y in 0 until this.height) {
                if (this.getColor(x, y) != other.getColor(x, y)) {
                    return false
                }
            }
        }
        return true
    }
}
