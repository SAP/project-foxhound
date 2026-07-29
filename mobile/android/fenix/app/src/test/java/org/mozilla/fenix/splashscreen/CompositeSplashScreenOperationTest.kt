/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.splashscreen

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CompositeSplashScreenOperationTest {

    @Test
    fun `GIVEN multiple operations WHEN run is called THEN all operations are executed`() = runTest {
        val op1 = FakeSplashScreenOperation("op1")
        val op2 = FakeSplashScreenOperation("op2")
        val composite = CompositeSplashScreenOperation(listOf(op1, op2))

        composite.run()

        assertTrue(op1.wasRun)
        assertTrue(op2.wasRun)
    }

    @Test
    fun `GIVEN a slow and a fast operation WHEN run is called THEN wait for both to complete`() = runTest {
        val slowGate = CompletableDeferred<Unit>()
        val fastOp = FakeSplashScreenOperation("fast")
        val slowOp = FakeSplashScreenOperation("slow", gate = slowGate)
        val composite = CompositeSplashScreenOperation(listOf(fastOp, slowOp))

        val job = launch { composite.run() }
        testScheduler.advanceUntilIdle()

        assertTrue(fastOp.wasRun)
        assertTrue(slowOp.wasRun)
        assertFalse(slowOp.dataFetched)
        assertFalse(composite.dataFetched)

        slowGate.complete(Unit)
        testScheduler.advanceUntilIdle()
        job.join()

        assertTrue(composite.dataFetched)
    }

    @Test
    fun `GIVEN multiple child operations WHEN checking the operation type THEN get the joined names of child operations`() {
        val composite = CompositeSplashScreenOperation(
            listOf(
                FakeSplashScreenOperation("alpha"),
                FakeSplashScreenOperation("beta"),
            ),
        )

        assertEquals("alpha+beta", composite.type)
    }

    @Test
    fun `GIVEN all operations finished fetching data WHEN checking the data fetch status THEN return true`() = runTest {
        val op1 = FakeSplashScreenOperation("op1")
        val op2 = FakeSplashScreenOperation("op2")
        val composite = CompositeSplashScreenOperation(listOf(op1, op2))

        composite.run()

        assertTrue(composite.dataFetched)
    }

    @Test
    fun `GIVEN one operation did not fetch data WHEN checking the data fetch status THEN return false`() {
        val op1 = FakeSplashScreenOperation("op1", reportDataFetched = true)
        val op2 = FakeSplashScreenOperation("op2", reportDataFetched = false)
        val composite = CompositeSplashScreenOperation(listOf(op1, op2))

        assertFalse(composite.dataFetched)
    }

    @Test
    fun `GIVEN multiple operations WHEN asked to dispose of current resources THEN all operations are disposed`() {
        val op1 = FakeSplashScreenOperation("op1")
        val op2 = FakeSplashScreenOperation("op2")
        val composite = CompositeSplashScreenOperation(listOf(op1, op2))

        composite.dispose()

        assertTrue(op1.wasDisposed)
        assertTrue(op2.wasDisposed)
    }

    @Test
    fun `GIVEN an empty operations list WHEN called to run THEN complete immediately without error`() = runTest {
        val composite = CompositeSplashScreenOperation(emptyList())

        composite.run()

        assertTrue(composite.dataFetched)
        assertEquals("", composite.type)
    }
}

private class FakeSplashScreenOperation(
    override val type: String,
    private val gate: CompletableDeferred<Unit>? = null,
    private val reportDataFetched: Boolean = true,
) : SplashScreenOperation {

    var wasRun = false
        private set
    var wasDisposed = false
        private set

    override var dataFetched: Boolean = false
        private set

    override suspend fun run() {
        wasRun = true
        gate?.await()
        dataFetched = reportDataFetched
    }

    override fun dispose() {
        wasDisposed = true
    }
}
