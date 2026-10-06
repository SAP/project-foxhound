/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import mozilla.components.lib.state.Action
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import mozilla.components.support.base.log.logger.Logger

/**
 * A simple generic middleware that will log actions that pass through the Store it is attached to.
 * Default implementations will use [Logger], which should output through logcat in debug builds.
 *
 * NOTE: when [shouldIncludeDetailedData] is true, potentially sensitive data will be recorded even
 * in release builds. It will not be sent to logcat by default, but it may still be extractable
 * by external tools. Use caution when enabling this.
 */
class LogMiddleware<S : State, A : Action>(
    val tag: String = "Unspecified",
    val shouldIncludeDetailedData: () -> Boolean = { false },
    val logger: Logger = Logger("LogMiddleware - $tag"),
    val logAction: (Action) -> Unit = {
        if (shouldIncludeDetailedData()) {
            logger.info(it.toString())
        } else {
            logger.info(it::class.java.name)
        }
    },
) : Middleware<S, A> {
    override fun invoke(
        store: Store<S, A>,
        next: (A) -> Unit,
        action: A,
    ) {
        next(action)
        logAction(action)
    }
}
