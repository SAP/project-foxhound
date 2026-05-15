/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.widgets.behavior

import android.view.View
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.concept.engine.EngineView
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.ui.widgets.behavior.DependencyGravity.Bottom
import mozilla.components.ui.widgets.behavior.DependencyGravity.Top
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn

@RunWith(AndroidJUnit4::class)
class EngineViewScrollingBehaviorFactoryTest {
    private val engineView: EngineView = mock()

    @Before
    fun setUp() {
        doReturn(View(testContext)).`when`(engineView).asView()
    }

    @Test
    fun `GIVEN should use scroll data and dependency is at bottom WHEN building a scrolling behavior THEN return one using scroll data`() {
        val result = EngineViewScrollingBehaviorFactory(true).build(
            engineView = engineView,
            dependency = mock(),
            dependencyGravity = Bottom,
        )

        assertTrue(result is EngineViewScrollingDataBehavior)
    }

    @Test
    fun `GIVEN should not use scroll data and dependency is at bottom WHEN building a scrolling behavior THEN return one using scroll gestures`() {
        val result = EngineViewScrollingBehaviorFactory(false).build(
            engineView = engineView,
            dependency = mock(),
            dependencyGravity = Bottom,
        )

        assertTrue(result is EngineViewScrollingGesturesBehavior)
    }

    @Test
    fun `GIVEN should use scroll data and dependency is at top WHEN building a scrolling behavior THEN return one using scroll gestures`() {
        val result = EngineViewScrollingBehaviorFactory(true).build(
            engineView = engineView,
            dependency = mock(),
            dependencyGravity = Top,
        )

        assertTrue(result is EngineViewScrollingGesturesBehavior)
    }

    @Test
    fun `GIVEN should not use scroll data and dependency is at top WHEN building a scrolling behavior THEN return one using scroll gestures`() {
        val result = EngineViewScrollingBehaviorFactory(false).build(
            engineView = engineView,
            dependency = mock(),
            dependencyGravity = Top,
        )

        assertTrue(result is EngineViewScrollingGesturesBehavior)
    }
}
