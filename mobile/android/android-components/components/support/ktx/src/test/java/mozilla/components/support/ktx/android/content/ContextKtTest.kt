/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.android.content

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.Window
import android.view.accessibility.AccessibilityManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.ext.getActivityWindow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowAccessibilityManager

@RunWith(AndroidJUnit4::class)
class ContextKtTest {

    lateinit var accessibilityManager: ShadowAccessibilityManager

    @Before
    fun setUp() {
        accessibilityManager = shadowOf(
            testContext
                .getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager,
        )
    }

    @Test
    fun `screen reader enabled`() {
        // Given
        accessibilityManager.setTouchExplorationEnabled(true)

        // When
        val isEnabled = testContext.isScreenReaderEnabled

        // Then
        assertTrue(isEnabled)
    }

    @Test
    fun `screen reader disabled`() {
        // Given
        accessibilityManager.setTouchExplorationEnabled(false)

        // When
        val isEnabled = testContext.isScreenReaderEnabled

        // Then
        assertFalse(isEnabled)
    }

    @Test
    fun `GIVEN an ancestor context is an Activity WHEN asking for the Window THEN return the Activity Window`() {
        val window: Window = mock()
        val activity: Activity = mock()
        doReturn(window).`when`(activity).window
        val context: ContextWrapper = mock()
        doReturn(activity).`when`(context).baseContext

        val result = context.getActivityWindow()

        assertEquals(window, result)
    }

    @Test
    fun `GIVEN no ancestor context is an Activity WHEN asking for the Window THEN return the Activity Window`() {
        val context: ContextWrapper = mock()
        doReturn(mock<Context>()).`when`(context).baseContext

        val result = context.getActivityWindow()

        assertNull(result)
    }
}
