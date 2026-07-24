/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.prompt.ext

import mozilla.components.concept.storage.LoginHint
import org.mozilla.geckoview.Autocomplete

/**
 * Converts a GeckoView [Autocomplete.SelectOption.Hint] integer constant to a [LoginHint] enum value.
 *
 * @return The corresponding [LoginHint] enum value, or [LoginHint.NONE] if the hint is not recognized.
 */
fun @receiver:Autocomplete.SelectOption.SelectOptionHint Int.toLoginHint() = when (this) {
    Autocomplete.SelectOption.Hint.GENERATED -> LoginHint.GENERATED
    Autocomplete.SelectOption.Hint.INSECURE_FORM -> LoginHint.INSECURE_FORM
    Autocomplete.SelectOption.Hint.DUPLICATE_USERNAME -> LoginHint.DUPLICATE_USERNAME
    Autocomplete.SelectOption.Hint.MATCHING_ORIGIN -> LoginHint.MATCHING_ORIGIN
    Autocomplete.SelectOption.Hint.FIREFOX_RELAY -> LoginHint.EMAIL_MASK
    else -> LoginHint.NONE
}

/**
 * Converts a [LoginHint] enum value to a GeckoView [Autocomplete.SelectOption.Hint] integer constant.
 *
 * @return The corresponding [Autocomplete.SelectOption.Hint] integer constant.
 */
@Autocomplete.SelectOption.SelectOptionHint
fun LoginHint.toSelectOption() = when (this) {
    LoginHint.GENERATED -> Autocomplete.SelectOption.Hint.GENERATED
    LoginHint.INSECURE_FORM -> Autocomplete.SelectOption.Hint.INSECURE_FORM
    LoginHint.DUPLICATE_USERNAME -> Autocomplete.SelectOption.Hint.DUPLICATE_USERNAME
    LoginHint.MATCHING_ORIGIN -> Autocomplete.SelectOption.Hint.MATCHING_ORIGIN
    LoginHint.EMAIL_MASK -> Autocomplete.SelectOption.Hint.FIREFOX_RELAY
    LoginHint.NONE -> Autocomplete.SelectOption.Hint.NONE
}
