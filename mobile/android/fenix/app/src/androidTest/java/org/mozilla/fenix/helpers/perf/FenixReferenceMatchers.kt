/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers.perf

import shark.AndroidReferenceMatchers.Companion.instanceFieldLeak
import shark.AndroidReferenceMatchers.Companion.staticFieldLeak
import shark.ReferenceMatcher

/**
 * Matchers to suppress known memory leaks, especially ones from 3rd party libraries & frameworks
 *
 * @property builder a builder lambda that takes a [MutableList] of [ReferenceMatcher] that can
 * be used to build the list of references to match the [FenixReferenceMatchers] entry.
 */
private enum class FenixReferenceMatchers(
    val builder: (references: MutableList<ReferenceMatcher>) -> Unit,
) {

    /**
     * Leaks discovered related to PopupLayout.
     *
     * Related google issues are:
     * 1. [https://issuetracker.google.com/issues/296891215#comment5](https://issuetracker.google.com/issues/296891215#comment5)
     * 2. [https://issuetracker.google.com/issues/274016293](https://issuetracker.google.com/issues/274016293)
     */
    COMPOSE_POPUP_LAYOUT(
        builder = { references ->
            references += instanceFieldLeak(
                className = "androidx.compose.ui.node.LayoutNode",
                fieldName = "nodes",
            )
            references += instanceFieldLeak(
                className = "androidx.compose.ui.node.LayoutNode",
                fieldName = "_modifier",
            )
            references += instanceFieldLeak(
                className = "androidx.compose.ui.node.LayoutNode",
                fieldName = "measurePolicy",
            )
            references += instanceFieldLeak(
                className = "androidx.compose.ui.node.LayoutNode",
                fieldName = "intrinsicsPolicy",
            )
            references += instanceFieldLeak(
                className = "androidx.compose.runtime.snapshots.SnapshotStateObserver",
                fieldName = "observedScopeMaps",
            )
        },
    ),

    /**
     * AndroidComposeUiTestEnvironment installs a WindowRecomposerFactory on the global
     * WindowRecomposerPolicy static and drives composition through a StandardTestDispatcher
     * whose scheduler is not drained at teardown. LeakCanary follows the chain
     * WindowRecomposerPolicy.factory -> env -> compositionCoroutineDispatcher ->
     * scheduler.events -> parked SuspendLambdas, reporting any fragment dismissed during the
     * test as an application leak. Suppress the static root so the chain is classified as a
     * library leak (and the assertion ignores it) until the test framework cleans up properly.
     */
    COMPOSE_WINDOW_RECOMPOSER_FACTORY(
        builder = { references ->
            references += staticFieldLeak(
                className = "androidx.compose.ui.platform.WindowRecomposerPolicy",
                fieldName = "factory",
            )
        },
    ),

    /**
     * Bottleneck suppression for the same root cause as COMPOSE_WINDOW_RECOMPOSER_FACTORY:
     * the StandardTestDispatcher backing the Compose UI test recomposer parks coroutine work
     * in TestCoroutineScheduler.events and the queue is not drained at teardown. Multiple GC
     * roots (the recomposer static, the InstrumentationThread's ThreadLocal coroutine context,
     * etc.) can reach the parked SuspendLambdas, so suppressing only the recomposer static
     * leaves alternate root paths reachable. Suppress the scheduler's events field directly
     * so any chain that traverses parked test-coroutine work is reclassified as a library leak.
     */
    COMPOSE_TEST_COROUTINE_SCHEDULER_EVENTS(
        builder = { references ->
            references += instanceFieldLeak(
                className = "kotlinx.coroutines.test.TestCoroutineScheduler",
                fieldName = "events",
            )
        },
    ),
}

/**
 * Builds the list of [ReferenceMatcher] known memory leaks.
 */
val knownLeaks: List<ReferenceMatcher>
    get() {
        val references = mutableListOf<ReferenceMatcher>()
        FenixReferenceMatchers.entries.forEach {
            it.builder(references)
        }
        return references.toList()
    }
