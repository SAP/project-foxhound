/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import androidx.core.graphics.Insets
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsCompat.Type.displayCutout
import androidx.core.view.WindowInsetsCompat.Type.mandatorySystemGestures
import androidx.core.view.WindowInsetsCompat.Type.systemBars
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WindowInsetsCompatTest {
    private lateinit var windowInsetsCompat: WindowInsetsCompat
    private lateinit var insets: Insets
    private lateinit var mandatorySystemGestureInsets: Insets

    @Before
    fun setUp() {
        insets = Insets.of(3, 1, 2, 4)
        mandatorySystemGestureInsets = Insets.of(5, 6, 7, 8)

        windowInsetsCompat = WindowInsetsCompat.Builder()
            .setInsetsIgnoringVisibility(systemBars() or displayCutout(), insets)
            .setInsets(mandatorySystemGestures(), mandatorySystemGestureInsets)
            .build()
    }

    @Test
    fun testTop() {
        assertEquals(insets.top, windowInsetsCompat.top())
    }

    @Test
    fun testRight() {
        assertEquals(insets.right, windowInsetsCompat.right())
    }

    @Test
    fun testLeft() {
        assertEquals(insets.left, windowInsetsCompat.left())
    }

    @Test
    fun testBottom() {
        assertEquals(insets.bottom, windowInsetsCompat.bottom())
    }

    @Test
    fun testMandatorySystemGestureInsets() {
        assertEquals(mandatorySystemGestureInsets, windowInsetsCompat.mandatorySystemGestureInsets())
    }
}
