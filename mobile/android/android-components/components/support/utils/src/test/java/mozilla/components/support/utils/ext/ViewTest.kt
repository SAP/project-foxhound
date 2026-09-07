/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import android.graphics.Rect
import android.view.View
import android.view.WindowInsets
import androidx.core.view.WindowInsetsCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn

@RunWith(AndroidJUnit4::class)
class ViewTest {
    val view: View = mock()

    @Test
    fun `getKeyboardHeight returns the keyboard height when keyboard is considered open`() {
        // Test the pure calculation logic directly
        val result = view.getKeyboardHeight(
            rootViewHeight = 1500,
            windowVisibleDisplayFrame = Rect(0, 0, 500, 1000),
            bottomInset = 0,
        )
        assertEquals(500, result)
    }

    @Test
    fun `getKeyboardHeight returns zero when keyboard is considered closed`() {
        // Test the pure calculation logic directly
        val result = view.getKeyboardHeight(
            rootViewHeight = 1000,
            windowVisibleDisplayFrame = Rect(0, 0, 500, 1000),
            bottomInset = 0,
        )
        assertEquals(0, result)
    }

    @Test
    fun `getWindowInsets returns null when the system insets don't exist`() {
        doReturn(null).`when`(view).rootWindowInsets
        assertEquals(null, view.getWindowInsets())
    }

    @Test
    fun `getWindowInsets returns the compat insets when the system insets exist`() {
        val rootInsets: WindowInsets = mock()
        doReturn(rootInsets).`when`(view).rootWindowInsets

        // Construct the expected object directly instead of mocking the static method
        val expectedInsets = WindowInsetsCompat.toWindowInsetsCompat(rootInsets)
        assertEquals(expectedInsets, view.getWindowInsets())
    }

    @Test
    fun `getKeyboardHeight accounts for status bar and navigation bar`() {
        val result = view.getKeyboardHeight(
            rootViewHeight = 1000,
            windowVisibleDisplayFrame = Rect(0, 50, 1000, 500),
            bottomInset = 50,
        )

        assertEquals(450, result)
    }
}
