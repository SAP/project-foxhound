/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding

/**
 * The reason the user is being onboarded. These values are sent in metrics related to onboarding.
 */
enum class OnboardingReason(val value: String) {
    NEW_USER("new_user"),
    EXISTING_USER("existing_user"),
}
