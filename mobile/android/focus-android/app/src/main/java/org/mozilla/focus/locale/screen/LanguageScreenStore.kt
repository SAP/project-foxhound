/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.locale.screen

import mozilla.components.lib.state.Action
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store

/**
 * A store for managing the state of the language selection screen.
 *
 * This store is responsible for handling the state ([LanguageScreenState]) and actions
 * ([LanguageScreenAction]) related to the language selection UI. It manages the list
 * of available languages and the currently selected language.
 *
 * On initialization, it automatically dispatches [LanguageScreenAction.InitLanguages]. This
 * action is intended to be intercepted by a [Middleware] to trigger the loading of language
 * data from a repository.
 *
 * @param initialState The initial state for the language screen.
 * @param middlewares A list of [Middleware]s to intercept actions and perform side effects,
 * such as fetching the language list.
 */
class LanguageScreenStore(
    initialState: LanguageScreenState,
    middlewares: List<Middleware<LanguageScreenState, LanguageScreenAction>> = emptyList(),
) : Store<LanguageScreenState, LanguageScreenAction>(
    initialState,
    ::languagesScreenStateReducer,
    middlewares,
) {
    init {
        dispatch(LanguageScreenAction.InitLanguages)
    }
}

/**
 * The state of the language selection screen
 *
 * @property languageList The full list of languages available
 * @property selectedLanguage The current selected language
 */
data class LanguageScreenState(
    val languageList: List<Language> = emptyList(),
    val selectedLanguage: Language? = null,
) : State

/**
 * Action to dispatch through the `LanguageScreenStore` to modify `LanguageScreenState` through the reducer.
 */
sealed class LanguageScreenAction : Action {
    /**
     * An action that signals the store to initialize the list of available languages.
     */
    object InitLanguages : LanguageScreenAction()

    /**
     * An action that represents the user selecting a new language from the list.
     *
     * @property selectedLanguage The language that the user has selected.
     */
    data class Select(val selectedLanguage: Language) : LanguageScreenAction()

    /**
     * An action to update the entire list of available languages and the currently
     * selected language.
     *
     * @property languageList The new, complete list of available languages.
     * @property selectedLanguage The language that should be marked as currently selected.
     */
    data class UpdateLanguages(
        val languageList: List<Language>,
        val selectedLanguage: Language,
    ) : LanguageScreenAction()
}

/**
 * Reduces the language state from the current state and an action performed on it.
 *
 * @param state the current locale state
 * @param action the action to perform
 * @return the new locale state
 */
private fun languagesScreenStateReducer(
    state: LanguageScreenState,
    action: LanguageScreenAction,
): LanguageScreenState {
    return when (action) {
        is LanguageScreenAction.Select -> {
            state.copy(selectedLanguage = action.selectedLanguage)
        }
        is LanguageScreenAction.UpdateLanguages -> {
            state.copy(languageList = action.languageList, selectedLanguage = action.selectedLanguage)
        }
        LanguageScreenAction.InitLanguages -> {
            throw IllegalStateException("You need to add LanguageMiddleware to your LanguageScreenStore. ($action)")
        }
    }
}
