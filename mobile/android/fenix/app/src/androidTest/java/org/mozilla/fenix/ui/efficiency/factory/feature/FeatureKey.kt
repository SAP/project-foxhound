/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.factory.feature

/**
 * Identifies distinct features that can be described and executed by the
 * test factory framework.
 *
 * Each [FeatureKey] acts as a stable identifier for a feature specification.
 * It maps directly to the test suite name (e.g. `<FEATURE>.Presence`).
 *
 * Add new entries here when onboarding new feature specs (e.g., `GPC`, `HISTORY`).
 */
enum class FeatureKey {
    /** Private Browsing mode: UI state, toggles, and behavior isolation. */
    PRIVATE_BROWSING,
}
