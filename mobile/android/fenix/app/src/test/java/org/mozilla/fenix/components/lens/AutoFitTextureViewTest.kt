/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.lens

import android.view.View
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AutoFitTextureViewTest {

    @Test
    fun `GIVEN valid aspect dimensions WHEN setAspectRatio is called THEN dimensions are stored and requestLayout is invoked`() {
        val view = spyk(AutoFitTextureView(testContext))
        view.setAspectRatio(16, 9)

        assertEquals(16, view.ratioWidth)
        assertEquals(9, view.ratioHeight)
        verify { view.requestLayout() }
    }

    @Test
    fun `GIVEN zero aspect dimensions WHEN setAspectRatio is called THEN dimensions are stored`() {
        val view = AutoFitTextureView(testContext)
        view.setAspectRatio(0, 0)

        assertEquals(0, view.ratioWidth)
        assertEquals(0, view.ratioHeight)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `GIVEN a negative width WHEN setAspectRatio is called THEN IllegalArgumentException is thrown`() {
        val view = AutoFitTextureView(testContext)
        view.setAspectRatio(-1, 0)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `GIVEN a negative height WHEN setAspectRatio is called THEN IllegalArgumentException is thrown`() {
        val view = AutoFitTextureView(testContext)
        view.setAspectRatio(0, -1)
    }

    @Test
    fun `GIVEN a zero aspect ratio WHEN onMeasure is called THEN the original dimensions are used`() {
        val width = View.MeasureSpec.getSize(640)
        val height = View.MeasureSpec.getSize(480)

        val view = AutoFitTextureView(testContext)
        view.setAspectRatio(0, 0)
        view.measure(width, height)

        assertEquals(width, view.measuredWidth)
        assertEquals(height, view.measuredHeight)
    }

    @Test
    fun `GIVEN a width-constrained aspect ratio WHEN onMeasure is called THEN the measured height is adjusted`() {
        val width = View.MeasureSpec.getSize(300)
        val height = View.MeasureSpec.getSize(400)

        val view = AutoFitTextureView(testContext)
        view.setAspectRatio(4, 3)
        view.measure(width, height)

        assertEquals(width, view.measuredWidth)
        assertEquals(225, view.measuredHeight)
    }

    @Test
    fun `GIVEN a height-constrained aspect ratio WHEN onMeasure is called THEN the measured width is adjusted`() {
        val width = View.MeasureSpec.getSize(600)
        val height = View.MeasureSpec.getSize(300)

        val view = AutoFitTextureView(testContext)
        view.setAspectRatio(4, 3)
        view.measure(width, height)

        assertEquals(400, view.measuredWidth)
        assertEquals(height, view.measuredHeight)
    }
}
