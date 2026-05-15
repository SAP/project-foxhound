/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.sitepermissions

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.fragment.app.DialogFragment
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornDarkColorScheme
import mozilla.components.compose.base.theme.acornLightColorScheme
import mozilla.components.ui.icons.R as iconsR

/**
 * A dialog to be displayed to explain to the user why notification access is required.
 * It is intended to be shown when the application has already obtained site-level permission but also
 * needs the corresponding system-level permission.
 */
class NotificationPermissionDialogFragment(val positiveButtonAction: () -> Unit) :
    DialogFragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        with(requireBundle()) {
            val title = getString(KEY_TITLE_STRING, "")
            val message = getString(KEY_MESSAGE_STRING, "")
            val positiveButtonLabel = getString(KEY_POSITIVE_TEXT, "")
            val negativeButtonLabel = getString(KEY_NEGATIVE_TEXT, "")

            return ComposeView(requireContext()).apply {
                setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)

                setContent {
                    val colors =
                        if (isSystemInDarkTheme()) acornDarkColorScheme() else acornLightColorScheme()

                    AcornTheme(colorScheme = colors) {
                        PermissionDialog(
                            icon = iconsR.drawable.mozac_ic_notification_24,
                            title = title,
                            message = message,
                            positiveButtonLabel = positiveButtonLabel,
                            negativeButtonLabel = negativeButtonLabel,
                            onConfirmRequest = positiveButtonAction,
                            dialogAbuseMillisLimit = 500,
                            onDismissRequest = { dismiss() },
                        )
                    }
                }
            }
        }
    }

    /**
     * Static functionality of [NotificationPermissionDialogFragment].
     */
    companion object {
        /**
         * A builder method for creating a [NotificationPermissionDialogFragment]
         */
        fun newInstance(
            dialogTitleString: String,
            dialogMessageString: String,
            positiveButtonText: String,
            negativeButtonText: String,
            positiveButtonAction: () -> Unit,
        ): NotificationPermissionDialogFragment {
            val fragment = NotificationPermissionDialogFragment(positiveButtonAction)
            val arguments = fragment.arguments ?: Bundle()

            with(arguments) {
                putString(KEY_TITLE_STRING, dialogTitleString)

                putString(KEY_MESSAGE_STRING, dialogMessageString)

                putString(KEY_POSITIVE_TEXT, positiveButtonText)

                putString(KEY_NEGATIVE_TEXT, negativeButtonText)
            }

            fragment.arguments = arguments

            return fragment
        }

        private const val KEY_POSITIVE_TEXT = "KEY_POSITIVE_TEXT"

        private const val KEY_NEGATIVE_TEXT = "KEY_NEGATIVE_TEXT"

        private const val KEY_TITLE_STRING = "KEY_TITLE_STRING"

        private const val KEY_MESSAGE_STRING = "KEY_MESSAGE_STRING"

        const val FRAGMENT_TAG = "NOTIFICATION_PERMISSION_DIALOG_FRAGMENT"
    }

    private fun requireBundle(): Bundle {
        return arguments ?: throw IllegalStateException("Fragment $this arguments is not set.")
    }
}
