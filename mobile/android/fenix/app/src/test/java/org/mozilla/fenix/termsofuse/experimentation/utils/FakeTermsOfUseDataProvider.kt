/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation.utils

/**
 * Fake implementation of [TermsOfUseDataProvider] for tests.
 */
class FakeTermsOfUseDataProvider(
    override val useStrictTrackingProtection: Boolean = false,
    override val shouldEnableGlobalPrivacyControl: Boolean = false,
    private val isIncreasedDohProtectionEnabled: Boolean = false,
    private val enabledHttpsOnlyMode: Boolean = false,
    override val showSponsoredShortcuts: Boolean = true,
    override val showShortcutsFeature: Boolean = true,
    override val showSponsoredStories: Boolean = true,
    override val showStoriesFeature: Boolean = true,
) : TermsOfUseDataProvider {
    override fun isIncreasedDohProtectionEnabled() = isIncreasedDohProtectionEnabled
    override fun enabledHttpsOnlyMode() = enabledHttpsOnlyMode
}
