/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.view.View
import androidx.coordinatorlayout.widget.CoordinatorLayout
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NavbarToolbarSyncBehaviorTest {
    private lateinit var navbar: View
    private lateinit var toolbar: View
    private lateinit var parent: CoordinatorLayout
    private lateinit var behavior: NavbarToolbarSyncBehavior

    @Before
    fun setup() {
        parent = CoordinatorLayout(testContext)
        navbar = View(testContext)
        toolbar = View(testContext)
        parent.addView(toolbar)
        parent.addView(navbar)
        behavior = NavbarToolbarSyncBehavior(testContext)
    }

    @Test
    fun `GIVEN composable toolbar WHEN layoutDependsOn is called THEN return true`() {
        toolbar.id = R.id.composable_toolbar

        val dependsOn = behavior.layoutDependsOn(parent, navbar, toolbar)

        assertTrue(dependsOn)
    }

    @Test
    fun `GIVEN non-composable toolbar WHEN layoutDependsOn is called THEN return false`() {
        toolbar.id = R.id.toolbar

        val dependsOn = behavior.layoutDependsOn(parent, navbar, toolbar)

        assertFalse(dependsOn)
    }

    @Test
    fun `GIVEN other view WHEN layoutDependsOn is called THEN return false`() {
        toolbar.id = View.NO_ID

        val dependsOn = behavior.layoutDependsOn(parent, navbar, toolbar)

        assertFalse(dependsOn)
    }

    @Test
    fun `GIVEN the navbar is visible WHEN the toolbar dependency is translated up THEN the navbar translates down by the same amount`() {
        toolbar.id = R.id.composable_toolbar
        navbar.visibility = View.VISIBLE
        toolbar.translationY = -50f

        val result = behavior.onDependentViewChanged(parent, navbar, toolbar)

        assertEquals(50f, navbar.translationY, 0.01f)
        assertTrue(result)
    }

    @Test
    fun `GIVEN the navbar is visible WHEN the toolbar dependency is translated down THEN the navbar translates up by the same amount`() {
        toolbar.id = R.id.composable_toolbar
        navbar.visibility = View.VISIBLE
        toolbar.translationY = 100f

        val result = behavior.onDependentViewChanged(parent, navbar, toolbar)

        assertEquals(-100f, navbar.translationY, 0.01f)
        assertTrue(result)
    }

    @Test
    fun `GIVEN the navbar is removed from layout WHEN the toolbar dependency is translated THEN the navbar translation doesn't change`() {
        toolbar.id = R.id.composable_toolbar
        navbar.visibility = View.GONE
        toolbar.translationY = -50f
        val originalTranslation = navbar.translationY

        val result = behavior.onDependentViewChanged(parent, navbar, toolbar)

        assertEquals(originalTranslation, navbar.translationY, 0.01f)
        assertFalse(result)
    }

    @Test
    fun `GIVEN toolbar at zero translation WHEN onDependentViewChanged THEN navbar also at zero translation`() {
        toolbar.id = R.id.composable_toolbar
        navbar.visibility = View.VISIBLE
        toolbar.translationY = 0f

        val result = behavior.onDependentViewChanged(parent, navbar, toolbar)

        assertEquals(0f, navbar.translationY, 0.01f)
        assertTrue(result)
    }

    @Test
    fun `GIVEN the navbar is invisible WHEN the toolbar dependency is translated THEN the navbar translation doesn't change`() {
        toolbar.id = R.id.composable_toolbar
        navbar.visibility = View.INVISIBLE
        toolbar.translationY = -50f

        val result = behavior.onDependentViewChanged(parent, navbar, toolbar)

        assertFalse(result)
    }
}
