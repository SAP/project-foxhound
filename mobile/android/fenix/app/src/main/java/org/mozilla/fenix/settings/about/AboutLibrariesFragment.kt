/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.about

import mozilla.components.support.license.LibrariesListFragment
import org.mozilla.fenix.R
import org.mozilla.fenix.e2e.SystemInsetsPaddedFragment
import org.mozilla.fenix.ext.showToolbar

/**
 * Displays the licenses of all the libraries used by Fenix.
 */
class AboutLibrariesFragment : LibrariesListFragment(), SystemInsetsPaddedFragment {

    override val licenseData = LicenseData(
        licenses = R.raw.third_party_licenses,
        metadata = R.raw.third_party_license_metadata,
    )

    override fun onResume() {
        super.onResume()
        val appName = getString(R.string.app_name)
        showToolbar(getString(R.string.open_source_licenses_title, appName))
    }
}
