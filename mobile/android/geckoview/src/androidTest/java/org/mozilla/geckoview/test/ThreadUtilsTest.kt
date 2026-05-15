/* -*- Mode: Java; c-basic-offset: 4; tab-width: 4; indent-tabs-mode: nil; -*-
 * Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.geckoview.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import junit.framework.TestCase.assertFalse
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.gecko.util.ThreadUtils

@MediumTest
@RunWith(AndroidJUnit4::class)
class ThreadUtilsTest {

    @Test
    fun assertOnHandlerThread() {
        var didThrow = false
        runBlocking {
            launch(Dispatchers.Main) {
                try {
                    ThreadUtils.assertOnHandlerThread()
                } catch (_: IllegalThreadStateException) {
                    didThrow = true
                    fail("Should not have thrown.")
                }
            }
        }
        assertFalse("Correctly worked on a handler thread.", didThrow)
    }

    @Test
    fun assertNotOnHandlerThread() {
        var didThrow = false
        runBlocking {
            launch(Dispatchers.IO) {
                try {
                    ThreadUtils.assertOnHandlerThread()
                    fail("Should have thrown.")
                } catch (_: IllegalThreadStateException) {
                    didThrow = true
                }
            }
        }
        assertTrue("Did correctly throw.", didThrow)
    }
}
