/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.android.os

import android.os.Build
import android.os.VibrationEffect
import android.os.VibrationEffect.DEFAULT_AMPLITUDE
import android.os.Vibrator
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.mock
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.verify
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [Build.VERSION_CODES.O])
class VibratorTest {

    private lateinit var vibrator: Vibrator

    @Before
    fun setup() {
        vibrator = mock()
    }

    @Test
    fun `vibrateOneShot uses VibrationEffect`() {
        vibrator.vibrateOneShot(50L)

        verify(vibrator).vibrate(VibrationEffect.createOneShot(50L, DEFAULT_AMPLITUDE))
    }
}
