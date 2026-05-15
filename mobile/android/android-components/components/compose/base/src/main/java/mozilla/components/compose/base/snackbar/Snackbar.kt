/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.snackbar

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SnackbarDefaults
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.R
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.privateColorPalette
import androidx.compose.material3.Snackbar as M3Snackbar
import androidx.compose.material3.SnackbarData as M3SnackbarData
import androidx.compose.material3.SnackbarVisuals as M3SnackbarVisuals
import mozilla.components.ui.icons.R as iconsR

private val SnackbarPadding = 12.dp
const val SNACKBAR_TEST_TAG = "snackbar"
const val SNACKBAR_BUTTON_TEST_TAG = "snackbar_button"

/**
 * Displays a Snackbar using the provided [SnackbarData].
 *
 * This composable creates a transient message at the bottom of the screen for
 * alerts and confirmation messages.
 *
 * @param snackbarData The data representing the message, action label, and dismiss behavior.
 * @param modifier The [Modifier] used to configure the layout or appearance of the Snackbar.
 * @param actionOnNewLine Whether to place the action button below the message instead of inline.
 */
@Composable
fun Snackbar(
    snackbarData: M3SnackbarData,
    modifier: Modifier = Modifier,
    actionOnNewLine: Boolean = false,
) {
    val dismissState = rememberSwipeToDismissBoxState()
    val actionLabel = snackbarData.visuals.actionLabel
    val actionComposable: (@Composable () -> Unit)? =
        actionLabel?.let {
            @Composable { SnackbarAction(actionLabel = it, onClick = snackbarData::performAction) }
        }

    val dismissActionComposable: (@Composable () -> Unit)? =
        if (snackbarData.visuals.withDismissAction) {
            @Composable { SnackbarDismissButton(onClick = snackbarData::dismiss) }
        } else {
            null
        }

    LaunchedEffect(dismissState.currentValue) {
        val value = dismissState.currentValue
        when (value) {
            SwipeToDismissBoxValue.StartToEnd, SwipeToDismissBoxValue.EndToStart -> {
                snackbarData.dismiss()
            }
            SwipeToDismissBoxValue.Settled -> {} // no-op
        }
    }

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {},
    ) {
        M3Snackbar(
            modifier = modifier
                .padding(SnackbarPadding)
                .semantics { testTagsAsResourceId = true }
                .testTag(SNACKBAR_TEST_TAG),
            action = actionComposable,
            dismissAction = dismissActionComposable,
            actionOnNewLine = actionOnNewLine,
        ) {
            Column {
                val visuals = snackbarData.visuals as? SnackbarVisuals
                Text(
                    text = snackbarData.visuals.message,
                    overflow = TextOverflow.Ellipsis,
                    maxLines = 2,
                    style = AcornTheme.typography.body2,
                )

                visuals?.subMessage?.let {
                    Text(
                        text = it,
                        overflow = visuals.subMessageTextOverflow,
                        maxLines = 1,
                        style = AcornTheme.typography.body2,
                    )
                }
            }
        }
    }
}

@Composable
private fun SnackbarAction(actionLabel: String, onClick: () -> Unit) {
    TextButton(
        text = actionLabel,
        onClick = onClick,
        modifier = Modifier.testTag(SNACKBAR_BUTTON_TEST_TAG),
        colors = ButtonDefaults.textButtonColors(
            contentColor = SnackbarDefaults.actionColor,
        ),
    )
}

@Composable
private fun SnackbarDismissButton(onClick: () -> Unit) {
    IconButton(onClick = onClick) {
        Icon(
            painter = painterResource(id = iconsR.drawable.mozac_ic_cross_24),
            contentDescription = stringResource(
                id = R.string.mozac_compose_base_snackbar_dismiss_content_description,
            ),
        )
    }
}

/**
 * Implementation of [M3SnackbarData] representing a Snackbar's state and behavior.
 *
 * @param visuals The visuals used to render the Snackbar.
 * @param dismiss A callback function invoked to dismiss the Snackbar.
 * @param performAction A callback function invoked when the Snackbar's action is performed.
 */
class SnackbarData(
    override val visuals: SnackbarVisuals,
    private val dismiss: () -> Unit,
    private val performAction: () -> Unit,
) : M3SnackbarData {
    override fun dismiss() {
        dismiss.invoke()
    }

    override fun performAction() {
        performAction.invoke()
    }
}

/**
 * Represents the visuals of one particular Snackbar as a piece of the SnackbarData.
 *
 * Extends [M3SnackbarVisuals] to support an optional sub-message shown below the main message.
 *
 * @param message The primary text content of the Snackbar.
 * @param subMessage Optional secondary text displayed below the main message.
 * @param subMessageTextOverflow How visual overflow for the subMessage should be handled.
 * @param actionLabel Optional label for the action button.
 * @param withDismissAction Whether to show a dismiss icon alongside the Snackbar.
 * @param duration The amount of time the Snackbar will be shown.
 */
open class SnackbarVisuals(
    override val message: String,
    open val subMessage: String? = null,
    open val subMessageTextOverflow: TextOverflow = TextOverflow.Ellipsis,
    override val actionLabel: String? = null,
    override val withDismissAction: Boolean = false,
    override val duration: SnackbarDuration = SnackbarDuration.Short,
) : M3SnackbarVisuals {

    /**
     * Creates a copy of this [SnackbarVisuals] with the option to override any of the existing values.
     *
     * @param message The updated primary text content.
     * @param subMessage The updated sub-message.
     * @param subMessageTextOverflow The updated overflow behavior for the sub-message.
     * @param actionLabel The updated label for the action button.
     * @param withDismissAction Whether to show a dismiss icon alongside the Snackbar.
     * @param duration The updated display duration for the Snackbar.
     * @return A new [SnackbarVisuals] instance with the provided values.
     */
    open fun copy(
        message: String = this.message,
        subMessage: String? = this.subMessage,
        subMessageTextOverflow: TextOverflow = this.subMessageTextOverflow,
        actionLabel: String? = this.actionLabel,
        withDismissAction: Boolean = this.withDismissAction,
        duration: SnackbarDuration = this.duration,
    ): SnackbarVisuals = SnackbarVisuals(
        message = message,
        subMessage = subMessage,
        subMessageTextOverflow = subMessageTextOverflow,
        actionLabel = actionLabel,
        withDismissAction = withDismissAction,
        duration = duration,
    )
}

private data class SnackbarPreviewState(
    override val message: String,
    override val subMessage: String? = null,
    override val subMessageTextOverflow: TextOverflow = TextOverflow.Ellipsis,
    override val actionLabel: String? = null,
    override val withDismissAction: Boolean = false,
    val actionOnNewLine: Boolean = false,
    override val duration: SnackbarDuration = SnackbarDuration.Short,
) : SnackbarVisuals(
    message = message,
)

private class SnackbarParameterProvider : PreviewParameterProvider<SnackbarPreviewState> {
    override val values: Sequence<SnackbarPreviewState>
        get() = sequenceOf(
            SnackbarPreviewState(
                message = "Regular snackbar",
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                actionLabel = "Action",
                withDismissAction = false,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "",
                withDismissAction = false,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "",
                actionLabel = "Action",
                withDismissAction = false,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "",
                actionLabel = "Longer action",
                withDismissAction = false,
                actionOnNewLine = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                actionLabel = "Action",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "",
                actionLabel = "Action",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "",
                actionLabel = "Longer action",
                withDismissAction = true,
                actionOnNewLine = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar with a very very long wrapping message",
            ),
            SnackbarPreviewState(
                message = "Regular snackbar with a very very long wrapping message",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar with a very very long wrapping message",
                actionLabel = "Action",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar with a very very long wrapping message",
                actionLabel = "Longer action",
                withDismissAction = true,
                actionOnNewLine = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "Submessage",
                actionLabel = "Action",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "Submessage with a very very long wrapping message",
                actionLabel = "Action",
                withDismissAction = true,
            ),
            SnackbarPreviewState(
                message = "Regular snackbar",
                subMessage = "Submessage with a very very long wrapping message ellipsized in the middle",
                subMessageTextOverflow = TextOverflow.MiddleEllipsis,
                actionLabel = "Action",
                withDismissAction = true,
            ),
        )
}

@Composable
@PreviewLightDark
private fun SnackbarPreview(
    @PreviewParameter(SnackbarParameterProvider::class) snackbarState: SnackbarPreviewState,
) {
    AcornTheme {
        Snackbar(
            snackbarData = SnackbarData(
                visuals = snackbarState,
                dismiss = {},
                performAction = {},
            ),
            modifier = Modifier,
            actionOnNewLine = snackbarState.actionOnNewLine,
        )
    }
}

@Composable
@Preview
private fun PrivateSnackbarPreview(
    @PreviewParameter(SnackbarParameterProvider::class) snackbarState: SnackbarPreviewState,
) {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Snackbar(
            snackbarData = SnackbarData(
                visuals = snackbarState,
                dismiss = {},
                performAction = {},
            ),
            modifier = Modifier,
            actionOnNewLine = snackbarState.actionOnNewLine,
        )
    }
}
