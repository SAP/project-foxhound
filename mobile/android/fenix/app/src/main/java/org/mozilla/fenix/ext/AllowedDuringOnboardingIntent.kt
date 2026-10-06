/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ext

import android.content.Intent
import org.mozilla.fenix.customtabs.EXTRA_IS_SANDBOX_CUSTOM_TAB

private const val AUTH_CUSTOM_TAB_ACTIVITY_CLASS_NAME = "org.mozilla.fenix.settings.account.AuthCustomTabActivity"

/**
 * Returns whether this intent is allowed to proceed during onboarding without onboarding being
 * shown, namely a sandboxed custom tab or this build's sync-auth custom tab.
 *
 * @param packageName the running build's application id, used to match the sync-auth custom tab
 * component across build flavors.
 */
fun Intent.isAllowedDuringOnboardingIntent(packageName: String): Boolean {
    val isIntentSandboxedTab = getBooleanExtra(EXTRA_IS_SANDBOX_CUSTOM_TAB, false)

    return isIntentSandboxedTab || isIntentComponentSyncAuth(packageName)
}

/**
 * Note: Continuous onboarding will make this check irrelevant and should be removed when it becomes
 * the default in https://bugzilla.mozilla.org/show_bug.cgi?id=2046788.
 */
private fun Intent.isIntentComponentSyncAuth(packageName: String) =
    component?.className == AUTH_CUSTOM_TAB_ACTIVITY_CLASS_NAME && component?.packageName == packageName
