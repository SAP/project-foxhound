/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.steps

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.ui.efficiency.factory.logging.StepLogger
import org.mozilla.fenix.ui.efficiency.helpers.PageContext

/**
 * Immutable, per-execution context passed into every [TestStep].
 *
 * Encapsulates the minimal set of services needed by steps:
 * - [rule]: Compose rule + activity rule for driving UI and synchronization
 * - [on]: typed access to page objects (e.g., `on.home`, `on.history`)
 * - [logger]: the active [StepLogger] for summary + JSONL output
 *
 * Keeping this bundle small and explicit improves test readability and makes
 * steps easy to unit-test (you can fake or stub each dependency).
 */
data class StepContext(
    val rule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>,
    val on: PageContext,
    val logger: StepLogger,
)
