/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import mozilla.components.concept.passwords.file.PasswordsFileImporter

/**
 * [ViewModel] that owns the [PasswordsImporterStore] for the passwords import flow so that its state and
 * side-effects survive configuration changes.
 */
internal class PasswordsImporterViewModel(
    passwordsImporter: PasswordsFileImporter,
) : ViewModel() {
    val store = PasswordsImporterStore(
        initialState = PasswordsImporterState.Inert,
        reducer = ::passwordsImporterReducer,
        middleware = listOf(PasswordsImporterMiddleware(passwordsImporter, viewModelScope)),
    )

    companion object {
        fun factory(passwordsImporter: PasswordsFileImporter) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return PasswordsImporterViewModel(passwordsImporter) as T
            }
        }
    }
}
