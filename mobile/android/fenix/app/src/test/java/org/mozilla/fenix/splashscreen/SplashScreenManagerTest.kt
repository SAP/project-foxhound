/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.splashscreen

import androidx.core.splashscreen.SplashScreen
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SplashScreenManagerTest {

    @Test
    fun `GIVEN splash screen already shown WHEN showSplashScreen is called THEN do not present splash screen`() = runTest {
        var result: SplashScreenManagerResult? = null
        val splashScreenManager = buildSplashScreen(
            isFirstSplashScreenShown = true,
            onSplashScreenFinished = { result = it },
        )

        assertNull(result)
        splashScreenManager.showSplashScreen()

        assertEquals(SplashScreenManagerResult.DidNotPresentSplashScreen, result)
    }

    @Test
    fun `GIVEN splash screen not yet shown WHEN showSplashScreen is called THEN present the splash screen`() = runTest {
        var splashScreenShown = false
        val splashScreenManager = buildSplashScreen(
            showSplashScreen = { _ -> splashScreenShown = true },
        )

        splashScreenManager.showSplashScreen()

        assertTrue(splashScreenShown)
    }

    @Test
    fun `GIVEN splash screen not yet shown WHEN showSplashScreen is called THEN present splash screen and update storage`() = runTest {
        var splashScreenShown = false
        val storage = object : SplashScreenStorage {
            override var isFirstSplashScreenShown = false
        }
        val splashScreenManager = buildSplashScreen(
            storage = storage,
            showSplashScreen = { _ -> splashScreenShown = true },
        )

        assertFalse(splashScreenShown)
        assertFalse(storage.isFirstSplashScreenShown)

        splashScreenManager.showSplashScreen()

        assertTrue(splashScreenShown)
        assertTrue(storage.isFirstSplashScreenShown)
    }

    @Test
    fun `GIVEN operation finishes before timeout WHEN showSplashScreen is called THEN return OperationFinished and dispose operation`() = runTest {
        val operationTime = 100L
        val splashScreenTimeout = 200L
        val operation = MockedSplashScreenOperation(operationTime)
        var result: SplashScreenManagerResult? = null
        val splashScreenManager = buildSplashScreen(
            splashScreenOperation = operation,
            splashScreenTimeout = splashScreenTimeout,
            onSplashScreenFinished = { result = it },
        )

        splashScreenManager.showSplashScreen()

        assertNull(result)
        testScheduler.advanceUntilIdle()
        assertTrue(operation.disposed)
        assertTrue(result is SplashScreenManagerResult.OperationFinished)
    }

    @Test
    fun `WHEN operation completes THEN operation is disposed`() = runTest {
        val operationTime = 100L
        val splashScreenTimeout = 200L
        val operation = MockedSplashScreenOperation(operationTime)
        var result: SplashScreenManagerResult? = null
        val splashScreenManager = buildSplashScreen(
            splashScreenOperation = operation,
            splashScreenTimeout = splashScreenTimeout,
            onSplashScreenFinished = { result = it },
        )

        splashScreenManager.showSplashScreen()

        assertNull(result)
        testScheduler.advanceUntilIdle()
        assertTrue(result is SplashScreenManagerResult.OperationFinished)
        assertTrue(operation.disposed)
    }

    internal class MockedSplashScreenOperation(
        val operationTimeMillis: Long,
    ) : SplashScreenOperation {
        var disposed: Boolean = false
        override val type: String
            get() = "mock"
        override val dataFetched: Boolean
            get() = false

        override suspend fun run() = delay(operationTimeMillis)

        override fun dispose() {
           disposed = true
        }
    }

    private fun TestScope.buildSplashScreen(
        splashScreenOperation: SplashScreenOperation = MockedSplashScreenOperation(100),
        splashScreenTimeout: Long = 200,
        isFirstSplashScreenShown: Boolean = false,
        showSplashScreen: (SplashScreen.KeepOnScreenCondition) -> Unit = { _ -> },
        onSplashScreenFinished: (SplashScreenManagerResult) -> Unit = { _ -> },
        storage: SplashScreenStorage = object : SplashScreenStorage {
            override var isFirstSplashScreenShown = isFirstSplashScreenShown
        },
    ): SplashScreenManager {
        return SplashScreenManager(
            splashScreenOperation = splashScreenOperation,
            splashScreenTimeout = splashScreenTimeout,
            storage = storage,
            scope = this,
            coroutineContext = this.coroutineContext,
            showSplashScreen = showSplashScreen,
            onSplashScreenFinished = onSplashScreenFinished,
        )
    }
}
