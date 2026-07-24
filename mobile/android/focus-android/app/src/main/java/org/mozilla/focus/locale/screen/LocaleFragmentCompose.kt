/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.locale.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import org.mozilla.focus.R
import org.mozilla.focus.ui.theme.FocusTheme
import org.mozilla.focus.ui.theme.focusColors

@Composable
@Preview
private fun LanguagesListComposablePreview() {
    FocusTheme {
        val listState = rememberLazyListState()

        val fakeLanguages = remember {
            listOf(
                Language("Română", "ro", 0),
                Language("Slovenčina", "sk", 1),
                Language("Português (Brasil)", "pt-BR", 2),
                Language("Nederlands", "nl", 3),
                Language("Magyar", "hu", 4),
                Language("Lietuvių", "lt", 5),
            )
        }

        var selectedTag by remember { mutableStateOf("ro") }

        LanguagesList(
            languages = fakeLanguages,
            selectedTag = selectedTag,
            onLanguageSelected = { language ->
                selectedTag = language.tag
            },
            listState = listState,
        )
    }
}

/**
 * Displays a lazily-loaded list of languages.
 *
 * This composable is optimized for performance by processing each language item only when it's
 * about to be displayed. It also handles the special case for the "System Default" language
 * by resolving its display name from string resources.
 *
 * @param languages The list of [Language] data to display.
 * @param selectedTag The tag of the currently selected language, used to highlight the correct item.
 * @param onLanguageSelected A callback invoked with the selected [Language] object when an item is clicked.
 * @param listState The [LazyListState] for controlling and observing the scroll state of the list.
 */
@Composable
fun LanguagesList(
    languages: List<Language>,
    selectedTag: String,
    onLanguageSelected: (Language) -> Unit,
    listState: LazyListState,
) {
    FocusTheme {
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(horizontal = 12.dp),
        ) {
            items(languages, key = { it.tag }) { language ->
                // By performing this logic here, inside the `items` block, we ensure
                // that the work is only done for visible items, making the list fast.
                val languageForDisplay = if (language.tag == LanguageStorage.LOCALE_SYSTEM_DEFAULT) {
                    language.copy(displayName = stringResource(R.string.preference_language_systemdefault))
                } else {
                    language
                }

                LanguageNameAndTagItem(
                    language = languageForDisplay,
                    isSelected = selectedTag == language.tag,
                    onClick = { onLanguageSelected(language) },
                )
            }
        }
    }
}

@Composable
private fun LanguageNameAndTagItem(
    language: Language,
    isSelected: Boolean,
    onClick: (Language) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .wrapContentHeight()
            .clickable { onClick(language) },
        horizontalArrangement = Arrangement.Start,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LanguageRadioButton(
            isSelected = isSelected,
            onClick = { onClick(language) },
        )
        Spacer(modifier = Modifier.width(18.dp))
        language.displayName?.let {
            LanguageDisplayName(
                language = language,
                onClick = onClick,
            )
        }
    }
}

/**
 * Displays a single language radiobutton
 *
 * @param isSelected check or uncheck the radioButton if the language is selected or not
 * @param onClick Callback when the user taps on Language
 */
@Composable
private fun LanguageRadioButton(
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    RadioButton(
        selected = isSelected,
        colors = RadioButtonDefaults.colors(selectedColor = focusColors.radioButtonSelected),
        onClick = onClick,
    )
}

/**
 * Displays a single language Text
 *
 * @param language of the item to be display in the textView
 * @param onClick Callback when the user taps on Language text , the same like on the radioButton
 */
@Composable
private fun LanguageDisplayName(language: Language, onClick: (Language) -> Unit) {
    Text(
        text = AnnotatedString(language.displayName!!),
        style = MaterialTheme.typography.bodyLarge,
        modifier = Modifier
            .padding(10.dp)
            .clickable { onClick(language) },
    )
}
