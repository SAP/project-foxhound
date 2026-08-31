/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.logging

/**
 * TestLogging
 *
 * Why this is a global holder:
 * - We want logging to be automatic and consistent without polluting test code.
 * - Most helper calls flow through BasePage / BaseTest, and wiring a reporter through every
 *   page object constructor quickly becomes noisy boilerplate.
 *
 * Tradeoffs:
 * - A global is not "pure DI", but it's pragmatic for instrumentation tests where:
 *     - execution is already highly environment-dependent,
 *     - we care about minimizing friction for developers writing tests,
 *     - and we want fast iteration on the logging UX.
 *
 * Safety:
 * - reporter is set in BaseTest.setUp() and cleared in tearDown.
 * - The logger should never be allowed to fail a test; it is a debugging aid.
 *
 * Future direction:
 * - Once the logging approach stabilizes, we can replace this with dependency injection
 *   (or a per-test context object) without changing test code.
 */
object TestLogging {
    @Volatile
    var reporter: TimedReporter? = null
}
