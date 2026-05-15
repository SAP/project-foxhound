/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.textfield

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.ui.icons.R

/**
 * UI for a text field.
 *
 * @param value The input text in the text field.
 * @param onValueChange The callback triggered when the input text field changes.
 * @param placeholder The text displayed when the text field is empty.
 * @param errorText The message displayed when there is an error.
 * @param modifier Modifier to be applied to the text field layout.
 * @param supportingText Optional helper text that can be displayed below the input field.
 * @param label Optional text displayed as a header above the input field.
 * @param isError Whether there is an error with the input value. When set to true, error styling
 * will be applied to the text field.
 * @param isEnabled When set to false, the the text field cannot be edited.
 * @param singleLine When set to true, this text field becomes a single horizontally scrolling text
 * field instead of wrapping onto multiple lines. Note that maxLines parameter will be ignored as
 * the maxLines attribute will be automatically set to 1.
 * @param maxLines The maximum number of input lines visible to the user at once.
 * @param minLines The minimum number of input lines visible to the user at once.
 * @param trailingIcon The optional composable for adding a trailing icon at the end of the text field
 * container.
 * @param colors [TextFieldColors] to use for styling text field colors.
 * @param visualTransformation The visual transformation filter for changing the visual representation
 * of the input. By default no visual transformation is applied.
 * @param keyboardOptions Software keyboard options that contains configuration such as [KeyboardType] and [ImeAction].
 * @param keyboardActions When the input service emits an IME action, the corresponding callback is
 * called. Note that this IME action may be different from what you specified in
 * [KeyboardOptions.imeAction].
 */
@Composable
fun TextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    errorText: String,
    modifier: Modifier = Modifier,
    supportingText: String? = null,
    label: String? = null,
    isError: Boolean = false,
    isEnabled: Boolean = true,
    singleLine: Boolean = true,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    minLines: Int = 1,
    trailingIcon: @Composable (TrailingIconScope.() -> Unit)? = null,
    leadingIcon: @Composable (() -> Unit)? = null,
    colors: TextFieldColors = TextFieldDefaults.colors(),
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions(),
) {
    val labelComposable: @Composable (() -> Unit)? = label?.let {
        @Composable {
            Text(
                text = label,
                style = AcornTheme.typography.caption,
            )
        }
    }
    val placeholderComposable: @Composable () -> Unit = {
        Text(
            text = placeholder,
            style = AcornTheme.typography.body1,
        )
    }
    val supportingTextComposable: @Composable () -> Unit = {
            if (isError) {
                Text(
                    text = errorText,
                    style = AcornTheme.typography.caption,
                )
            } else {
                supportingText?.let {
                    Text(
                        text = it,
                        style = AcornTheme.typography.caption,
                    )
                }
            }
    }

    val trailingIconCompose: @Composable () -> Unit = {
        if (isError) {
            Spacer(modifier = Modifier.width(12.dp))

            Icon(
                painter = painterResource(R.drawable.mozac_ic_warning_fill_24),
                contentDescription = null,
            )
        } else if (trailingIcon != null) {
            Spacer(modifier = Modifier.width(12.dp))

            Row {
                with(TrailingIconScope(this)) {
                    trailingIcon.invoke(this)
                }
            }
        }
    }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth(),
        enabled = isEnabled,
        textStyle = AcornTheme.typography.body1,
        label = labelComposable,
        placeholder = placeholderComposable,
        leadingIcon = leadingIcon,
        trailingIcon = trailingIconCompose,
        supportingText = supportingTextComposable,
        isError = isError,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        singleLine = singleLine,
        maxLines = maxLines,
        minLines = minLines,
    )
}

private data class TextFieldPreviewState(
    val initialText: String,
    val label: String,
    val placeholder: String = "Placeholder",
    val errorText: String = "Error text",
    val supportingText: String? = "Supporting text",
    val isError: Boolean = false,
    val singleLine: Boolean = true,
    val maxLines: Int = Int.MAX_VALUE,
    val minLines: Int = 1,
    val trailingIcon: @Composable (TrailingIconScope.() -> Unit)? = null,
)

private class TextFieldParameterProvider : PreviewParameterProvider<TextFieldPreviewState> {
    override val values: Sequence<TextFieldPreviewState>
        get() = sequenceOf(
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, No error",
            ),
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, Error",
                isError = true,
            ),
            TextFieldPreviewState(
                initialText = "Typed",
                label = "Typed, No error",
            ),
            TextFieldPreviewState(
                initialText = "Typed",
                label = "Typed, Error",
                isError = true,
            ),
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, No error, Minimum lines is 2",
                singleLine = false,
                minLines = 2,
            ),
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, Error, Minimum lines is 2",
                isError = true,
                singleLine = false,
                minLines = 2,
            ),
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, No error, Maximum lines is 2",
                singleLine = false,
                maxLines = 2,
            ),
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, Error, Maximum lines is 2",
                isError = true,
                singleLine = false,
                maxLines = 2,
            ),
            TextFieldPreviewState(
                initialText = "Typed",
                label = "Typed, No error, 1 trailing icon",
                trailingIcon = { CrossTextFieldButton {} },
            ),
            TextFieldPreviewState(
                initialText = "Typed",
                label = "Typed, No error, 2 trailing icons",
                trailingIcon = {
                    EyeTextFieldButton {}
                    CrossTextFieldButton {}
                },
            ),
            TextFieldPreviewState(
                initialText = "Typed",
                label = "Typed, Error, 2 trailing icons",
                isError = true,
                trailingIcon = {
                    EyeTextFieldButton {}
                    CrossTextFieldButton {}
                },
            ),
            TextFieldPreviewState(
                initialText = "",
                label = "Empty, Supporting text, Maximum lines is 2",
                errorText = "Error text",
                supportingText = "Supporting text",
                isError = false,
                singleLine = false,
                maxLines = 2,
            ),
        )
}

@Preview
@Composable
private fun TextFieldPreview(
    @PreviewParameter(TextFieldParameterProvider::class) textFieldState: TextFieldPreviewState,
) {
    var text by remember { mutableStateOf(textFieldState.initialText) }

    AcornTheme {
        Surface(
            modifier = Modifier
                .padding(8.dp),
        ) {
            TextField(
                value = text,
                onValueChange = { text = it },
                placeholder = textFieldState.placeholder,
                errorText = textFieldState.errorText,
                supportingText = textFieldState.supportingText,
                modifier = Modifier.fillMaxWidth(),
                label = textFieldState.label,
                isError = textFieldState.isError,
                singleLine = textFieldState.singleLine,
                maxLines = textFieldState.maxLines,
                minLines = textFieldState.minLines,
                trailingIcon = textFieldState.trailingIcon,
            )
        }
    }
}
