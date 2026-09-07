/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.creditcards.ui

/**
 * Groups together all of the [CreditCardEditorStore] external dependencies.
 *
 * @property navigateBack used to navigate back.
 */
data class CreditCardEditorEnvironment(
    val navigateBack: () -> Unit,
) {

    internal companion object {
        val Default = CreditCardEditorEnvironment(navigateBack = {})
    }
}
