/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko

import android.os.Handler
import android.os.Looper
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.GeckoResult
import org.robolectric.Shadows.shadowOf
import kotlin.test.assertIs

@RunWith(AndroidJUnit4::class)
class GeckoResultTest {

    private val mainHandler = Handler(Looper.getMainLooper())

    @Test
    fun awaitWithResult() = runTest {
        val geckoResult = GeckoResult.fromValue(42).withHandler(mainHandler)

        val deferred = async { geckoResult.await() }
        testScheduler.runCurrent()

        shadowOf(Looper.getMainLooper()).idle()

        assertEquals(42, deferred.await())
    }

    @Test(expected = IllegalStateException::class)
    fun awaitWithException() = runTest {
        val geckoResult =
            GeckoResult.fromException<Unit>(IllegalStateException()).withHandler(mainHandler)
        val deferred = async { geckoResult.await() }
        testScheduler.runCurrent()

        shadowOf(Looper.getMainLooper()).idle()
        deferred.await()
    }

    @Test
    fun fromResult() = runTest {
        val result = launchGeckoResult { 42 }.withHandler(mainHandler)

        testScheduler.runCurrent()

        shadowOf(Looper.getMainLooper()).idle()

        val chain = result.then<Int> {
            assertEquals(42, it)
            GeckoResult.fromValue(null)
        }.withHandler(mainHandler)

        val deferred = async { chain.await() }

        testScheduler.runCurrent()

        shadowOf(Looper.getMainLooper()).idle()
        deferred.await()
    }

    @Test
    fun fromException() = runTest {
        val result = launchGeckoResult { throw IllegalStateException() }

        val chain = result.then<Unit>(
            {
                assertTrue("Invalid branch", false)
                GeckoResult.fromValue(null)
            },
            {
                assertIs<IllegalStateException>(it)
                GeckoResult.fromValue(null)
            },
        ).withHandler(mainHandler)

        val deferred = async { chain.await() }

        testScheduler.runCurrent()

        shadowOf(Looper.getMainLooper()).idle()
        deferred.await()
    }

    @Test
    fun asCancellableOperation() = runTest {
        val geckoResult: GeckoResult<Int> = mock()
        val op = geckoResult.asCancellableOperation()

        val falseGeckoResult = GeckoResult.fromValue(false).withHandler(mainHandler)
        whenever(geckoResult.cancel()).thenReturn(falseGeckoResult)
        var deferred = async { op.cancel().await() }
        testScheduler.runCurrent()
        shadowOf(Looper.getMainLooper()).idle()

        assertFalse(deferred.await())

        val nullGeckoResult = GeckoResult.fromValue<Boolean>(null).withHandler(mainHandler)
        whenever(geckoResult.cancel()).thenReturn(nullGeckoResult)
        deferred = async { op.cancel().await() }
        testScheduler.runCurrent()
        shadowOf(Looper.getMainLooper()).idle()

        assertFalse(deferred.await())

        val trueGeckoResult = GeckoResult.fromValue(true).withHandler(mainHandler)
        whenever(geckoResult.cancel()).thenReturn(trueGeckoResult)
        deferred = async { op.cancel().await() }
        testScheduler.runCurrent()
        shadowOf(Looper.getMainLooper()).idle()

        assertTrue(deferred.await())
    }

    @Test(expected = IllegalStateException::class)
    fun asCancellableOperationException() = runTest {
        val geckoResult: GeckoResult<Int> = mock()
        val op = geckoResult.asCancellableOperation()

        val mainHandler = Handler(Looper.getMainLooper())

        whenever(geckoResult.cancel()).thenReturn(
            GeckoResult.fromException<Boolean>(IllegalStateException())
                .withHandler(mainHandler),
        )

        val deferred = async { op.cancel().await() }

        testScheduler.runCurrent()

        shadowOf(Looper.getMainLooper()).idle()

        deferred.await()
    }
}
