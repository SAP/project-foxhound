/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.browser.autofill

import mozilla.components.feature.autofill.AbstractAutofillService
import mozilla.components.feature.autofill.AutofillConfiguration
import org.mozilla.samples.browser.ext.components

/**
 * Service responsible for implementing Android's Autofill framework.
 */
class AutofillService : AbstractAutofillService() {
    override val configuration: AutofillConfiguration by lazy { components.autofillConfiguration }
}
