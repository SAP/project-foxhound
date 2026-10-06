/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.session

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.content.res.Resources
import android.os.Build
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.activity.OrientationDelegate
import mozilla.components.concept.engine.activity.OrientationDelegate.LockResult
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

class ScreenOrientationFeatureTest {
    @Test
    fun `WHEN the feature starts THEN register itself as a screen orientation delegate`() {
        val engine = mock<Engine>()
        val feature = ScreenOrientationFeature(engine, mock())

        feature.start()

        verify(engine).registerScreenOrientationDelegate(feature)
    }

    @Test
    fun `WHEN the feature stops THEN unregister itself as the screen orientation delegate`() {
        val engine = mock<Engine>()
        val feature = ScreenOrientationFeature(engine, mock())

        feature.stop()

        verify(engine).unregisterScreenOrientationDelegate()
    }

    @Test
    fun `WHEN asked to set a screen orientation THEN set it on the activity property and return SUCCESS`() {
        val activity = mock<Activity>()
        val configuration = Configuration()
        configuration.smallestScreenWidthDp = 320
        val resources = mock<Resources>()
        doReturn(configuration).`when`(resources).configuration
        doReturn(resources).`when`(activity).resources
        val feature = ScreenOrientationFeature(mock(), activity)

        val result = feature.onOrientationLock(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)

        verify(activity).requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        assertEquals(LockResult.SUCCESS, result)
    }

    @Test
    fun `WHEN asked to set a screen orientation on large screen Android 16+ THEN return NOT_SUPPORTED`() {
        val activity = mock<Activity>()
        val resources = mock<Resources>()
        val configuration = Configuration().apply {
            smallestScreenWidthDp = 700
        }

        whenever(activity.resources).thenReturn(resources)
        whenever(resources.configuration).thenReturn(configuration)

        val feature = ScreenOrientationFeature(
            engine = mock(),
            activity = activity,
            buildVersionProvider = { Build.VERSION_CODES.BAKLAVA },
        )

        val result = feature.onOrientationLock(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)

        assertEquals(LockResult.NOT_SUPPORTED, result)
        verify(activity, never()).requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
    }

    @Test
    fun `WHEN asked to reset screen orientation THEN set it to UNSPECIFIED`() {
        val activity = mock<Activity>()
        val feature = ScreenOrientationFeature(mock(), activity)

        feature.onOrientationUnlock()

        verify(activity).requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }
}
