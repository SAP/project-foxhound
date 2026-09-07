/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.locale.screen

/**
 * The default implementation of the interactor for the language selection screen.
 * This class is responsible for handling user interactions and communicating them to the store.
 *
 * @param languageScreenStore The store responsible for managing the state of the language screen.
 */
class DefaultLanguageScreenInteractor(
    private val languageScreenStore: LanguageScreenStore,
) {

    /**
     * Handles the selection of a language from the list.
     *
     * If the selected language is the same as the one already selected, it does nothing.
     * Otherwise, it dispatches an action to the store to update the selected language.
     *
     * @param language The [Language] object that was selected by the user.
     */
    fun handleLanguageSelected(language: Language) {
        if (languageScreenStore.state.selectedLanguage == language) {
            return
        }
        languageScreenStore.dispatch(LanguageScreenAction.Select(selectedLanguage = language))
    }
}
