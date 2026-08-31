/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.splashscreen

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

/**
 * A [SplashScreenOperation] that runs multiple child operations concurrently and completes
 * when all of them have finished.
 *
 * @param operations The list of operations to run in parallel.
 */
class CompositeSplashScreenOperation(
    private val operations: List<SplashScreenOperation>,
) : SplashScreenOperation {

    override val type: String
        get() = operations.joinToString("+") { it.type }

    override val dataFetched: Boolean
        get() = operations.all { it.dataFetched }

    override suspend fun run() = coroutineScope {
        operations.map { op -> async { op.run() } }.awaitAll()
        Unit
    }

    override fun dispose() {
        operations.forEach { it.dispose() }
    }
}
