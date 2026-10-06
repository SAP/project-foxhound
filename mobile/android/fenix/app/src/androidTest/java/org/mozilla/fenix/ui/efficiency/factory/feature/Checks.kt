/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.feature

import org.mozilla.fenix.ui.efficiency.factory.steps.TestStep

/**
 * Represents a minimal "presence" validation in a feature spec.
 *
 * Each [SurfaceCheck] describes a single surface to visit and verify:
 * - Navigate to the surface (page, panel, menu)
 * - Verify that a group of expected UI elements is present
 *
 * These checks form the **Presence** tier in the factory test suite.
 *
 * @property navigateStep A [TestStep] responsible for reaching the page or surface.
 * @property verifyStep   A [TestStep] that verifies expected UI elements are visible.
 */
data class SurfaceCheck(
    val navigateStep: TestStep,
    val verifyStep: TestStep,
)

/**
 * Represents a simple "action and verify" flow in a feature spec.
 *
 * Each [InteractionCheck] performs:
 * - A navigation step
 * - One action step (tap/toggle/menu item)
 * - One verification step
 *
 * These checks make up the **Interaction** tier in the factory test suite.
 *
 * @property navigateStep Step that navigates to the correct page before interaction.
 * @property actionStep   Step that performs the user interaction to test responsiveness.
 * @property verifyStep   Step that validates the expected UI artifact after interaction.
 */
data class InteractionCheck(
    val navigateStep: TestStep,
    val actionStep: TestStep,
    val verifyStep: TestStep,
)

/**
 * Represents a multi-step scenario that validates feature behavior across pages.
 *
 * A [BehaviorCheck] follows a 3-phase structure:
 * 1. **Setup:** Prepare the feature state (e.g., enable a toggle)
 * 2. **Trigger:** Perform the action under test (e.g., visit a website)
 * 3. **Cross-page verification:** Confirm expected outcomes (e.g., history remains empty)
 *
 * These checks define the **Behavior** tier in the factory test suite.
 *
 * @property setupSteps           Steps that configure or prepare state for the scenario.
 * @property triggerSteps         Steps that trigger the feature logic being tested.
 * @property crossPageVerifySteps Steps that assert expected UI or data on other surfaces.
 */
data class BehaviorCheck(
    val setupSteps: List<TestStep>,
    val triggerSteps: List<TestStep>,
    val crossPageVerifySteps: List<TestStep>,
)
