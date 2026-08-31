/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

/**
 * The 'surface' that the Terms of Use (ToU) was displayed on,
 * e.g. during onboarding, on the homepage or within the browser.
 *
 * This may refer to the ToU onboarding page or an in-app prompt.
 */
enum class Surface {
    ONBOARDING,
    HOMEPAGE_NEW_TAB,
    BROWSER,
    ;

    val metricLabel = name.lowercase()
}
